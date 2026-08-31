"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Email + password sign-in.
 *
 * Signing in is not the same as being allowed in. Supabase Auth will happily
 * authenticate any account; whether that account may change the site is
 * decided by the `admin_users` allow-list and enforced by RLS. So a successful
 * sign-in that is not on the list is signed straight back out here, rather
 * than being dropped into a dashboard where every action would silently fail.
 */
export default function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
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
        setError("Those details didn't work. Please try again.");
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

      // Full reload, not router.push: the server needs to re-read the new
      // session cookie before rendering the dashboard.
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit} noValidate>
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

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isBusy}>
        {isBusy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
