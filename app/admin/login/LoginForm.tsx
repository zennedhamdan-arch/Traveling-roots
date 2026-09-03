"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeAdminPath } from "@/lib/safeRedirect";

/**
 * Admin sign-in: password, then a TOTP challenge — nothing less opens the
 * dashboard.
 *
 * Three deliberate properties:
 *
 * 1. Errors stay vague. "Those details didn't work" never reveals whether the
 *    email or the password was the wrong half; the TOTP step says "didn't
 *    verify", not which digit was off. Nothing here distinguishes a real
 *    admin's account from anyone else's.
 *
 * 2. Signing in is not the same as being allowed in. Supabase Auth will
 *    happily authenticate any account; whether that account may change the
 *    site is decided by the `admin_users` allow-list and enforced by RLS. A
 *    successful sign-in that is not on the list is signed straight back out.
 *
 * 3. A password alone is AAL1, and AAL1 sees no dashboard. After the password
 *    step the session must clear a TOTP challenge (AAL2). The very first
 *    sign-in has no authenticator yet, so it offers enrollment once — scan a
 *    QR, type the six digits, and from then on every sign-in asks for them.
 *
 * The `next` parameter is sanitized to an internal /admin path: no scheme, no
 * protocol-relative `//`, no `\`, no control characters — anything else falls
 * back to /admin/dashboard.
 */

type Step =
  | { kind: "password" }
  | { kind: "challenge"; factorId: string; challengeId: string }
  | {
      kind: "enroll";
      factorId: string;
      qrSvg: string;
      secret: string;
    };

type AuthenticatorAssuranceLevel = {
  currentLevel: "aal1" | "aal2";
  nextLevel?: "aal1" | "aal2";
};

const GENERIC_PASSWORD_ERROR = "Those details didn't work. Please try again.";
const GENERIC_CODE_ERROR =
  "That code didn't verify. Check your authenticator app and try again.";

export default function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeAdminPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "password" });

  function finishSignIn(): void {
    // Full reload, not router.push alone: the server needs to re-read the new
    // session cookie (now carrying AAL2) before rendering the dashboard.
    router.push(nextPath);
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (step.kind === "password") return submitPassword();
    if (step.kind === "challenge") return submitChallenge(step);
    return submitEnrollment(step);
  }

  /** Step 1 — password. On success, decides between challenge / enroll / in. */
  async function submitPassword(): Promise<void> {
    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        // Deliberately vague: distinguishing "no such account" from "wrong
        // password" tells an attacker which emails are real.
        setError(GENERIC_PASSWORD_ERROR);
        return;
      }

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!admin) {
        await supabase.auth.signOut();
        setError("This account doesn't have access to the dashboard.");
        return;
      }

      // Already past a TOTP challenge in this session (e.g. re-auth after a
      // timeout): nothing further to prove.
      const { data: assurance } = (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()) as {
        data: AuthenticatorAssuranceLevel | null;
      };
      if (assurance?.currentLevel === "aal2") {
        finishSignIn();
        return;
      }

      // Verified TOTP factors only — unverified leftovers from an abandoned
      // enrollment can never satisfy a challenge.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0] ?? null;

      if (hasVerifiedTotp(totp)) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totp.id,
        });
        if (challengeError || !challenge) {
          setError("Sign-in could not continue. Please try again.");
          return;
        }
        setStep({ kind: "challenge", factorId: totp.id, challengeId: challenge.id });
        return;
      }

      // No verified factor anywhere: first sign-in, offer enrollment. Stale
      // unverified factors from an interrupted attempt are cleaned up first —
      // Supabase caps factors and rejects duplicate names.
      for (const stale of factors?.all ?? []) {
        if (stale.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: stale.id });
        }
      }

      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Traveling Roots admin",
      });
      if (enrollError || !enrollment) {
        setError("Sign-in could not continue. Please try again.");
        return;
      }
      setStep({
        kind: "enroll",
        factorId: enrollment.id,
        qrSvg: enrollment.totp.qr_code,
        secret: enrollment.totp.secret,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  /** Step 2a — the account has an authenticator: prove it. */
  async function submitChallenge(step: Extract<Step, { kind: "challenge" }>): Promise<void> {
    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: step.factorId,
        challengeId: step.challengeId,
        code,
      });

      if (verifyError) {
        // An un-entered challenge expires; a fresh one is issued silently.
        if (/expired/i.test(verifyError.message)) {
          const { data: challenge } = await supabase.auth.mfa.challenge({
            factorId: step.factorId,
          });
          if (challenge) {
            setStep({ kind: "challenge", factorId: step.factorId, challengeId: challenge.id });
            setCode("");
            setError("That window closed — enter the code showing now.");
            return;
          }
        }
        setError(GENERIC_CODE_ERROR);
        setCode("");
        return;
      }

      finishSignIn();
    } catch {
      setError(GENERIC_CODE_ERROR);
      setCode("");
    } finally {
      setIsBusy(false);
    }
  }

  /** Step 2b — first sign-in: pair an authenticator, then verify it live. */
  async function submitEnrollment(step: Extract<Step, { kind: "enroll" }>): Promise<void> {
    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: step.factorId,
        code,
      });

      if (verifyError) {
        // Unverified factors expire after a few minutes; restart the pairing
        // rather than leaving the user staring at a dead QR code.
        if (/expired/i.test(verifyError.message)) {
          await supabase.auth.mfa.unenroll({ factorId: step.factorId }).catch(() => undefined);
          const { data: enrollment } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: "Traveling Roots admin",
          });
          if (enrollment) {
            setStep({
              kind: "enroll",
              factorId: enrollment.id,
              qrSvg: enrollment.totp.qr_code,
              secret: enrollment.totp.secret,
            });
            setCode("");
            setNotice("The setup window closed — scan this new code instead.");
            return;
          }
        }
        setError(GENERIC_CODE_ERROR);
        setCode("");
        return;
      }

      finishSignIn();
    } catch {
      setError(GENERIC_CODE_ERROR);
      setCode("");
    } finally {
      setIsBusy(false);
    }
  }

  const busyLabel = isBusy ? "Verifying…" : step.kind === "password" ? "Signing in…" : undefined;

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
      {step.kind === "password" ? (
        <>
          <label className="admin-field">
            <span className="admin-label">Email</span>
            <input
              className="admin-input"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Password</span>
            <input
              className="admin-input"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </>
      ) : step.kind === "challenge" ? (
        <p className="admin-muted mfa-intro">
          Open your authenticator app and enter the six-digit code for Traveling
          Roots.
        </p>
      ) : (
        <>
          <p className="admin-muted mfa-intro">
            One-time setup: protect the dashboard with an authenticator app
            (Google Authenticator, Authy, 1Password…). Scan this code, then
            enter the six digits it shows. You&apos;ll be asked for a fresh code
            at every sign-in — keep the device safe.
          </p>
          <div
            className="mfa-qr"
            // Supabase returns the QR as an inline SVG string, shown as a data
            // URL — same origin-free data: scheme, no external image host.
            dangerouslySetInnerHTML={{
              __html: `<img src="data:image/svg+xml;utf8,${encodeURIComponent(
                step.qrSvg,
              )}" alt="QR code to scan with your authenticator app" width="180" height="180" />`,
            }}
          />
          <p className="admin-muted mfa-secret">
            Can&apos;t scan? Type this secret into the app:
            <span className="mfa-secret-value">{step.secret}</span>
          </p>
        </>
      )}

      {step.kind !== "password" ? (
        <label className="admin-field">
          <span className="admin-label">Six-digit code</span>
          <input
            className="admin-input admin-input-code"
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            // Stripping non-digits keeps typing honest and pasting (spaces,
            // hyphens, a stray letter) working.
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={isBusy}
          />
        </label>
      ) : null}

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-muted" role="status">
          {notice}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isBusy}>
        {busyLabel ??
          (step.kind === "password"
            ? "Sign in"
            : step.kind === "challenge"
              ? "Verify code"
              : "Enable and sign in")}
      </button>
    </form>
  );
}

/** Narrowing guard: a factor row exists and carries an id to challenge. */
function hasVerifiedTotp(
  factor: { id: string; status: string } | undefined | null,
): factor is { id: string; status: string } {
  return !!factor && typeof factor.id === "string" && factor.id.length > 0;
}
