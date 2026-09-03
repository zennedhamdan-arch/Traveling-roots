"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget (managed mode).
 *
 * The SITE key is public by design; the SECRET lives only on the server and
 * the token this widget produces is verified server-side in
 * app/api/reservations and app/api/orders before anything is written. A
 * browser-supplied "passed" is never trusted on its own.
 *
 * No third-party React wrapper: the script is loaded once on demand and the
 * widget rendered with the official API — one less dependency, the same
 * behaviour, and it stays out of the bundle for every page that doesn't use it.
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact";
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoaded?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    window.onTurnstileLoaded = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile loaded without an API"));
    };
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = Readonly<{
  siteKey: string;
  onToken: (token: string | null) => void;
}>;

export default function Turnstile({ siteKey, onToken }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;

    void loadTurnstile()
      .then((turnstile) => {
        if (disposed || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setFailed(false);
            onToken(token);
          },
          "error-callback": () => {
            setFailed(true);
            onToken(null);
          },
          "expired-callback": () => {
            // A token is single-use and short-lived: the guest must re-pass.
            onToken(null);
          },
          theme: "auto",
          size: "compact",
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* already gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  if (failed) {
    return (
      <p className="captcha-note" role="alert">
        The anti-bot check failed to load. Please refresh the page, or call us —
        the number is next to this form.
      </p>
    );
  }

  return <div ref={containerRef} className="captcha-slot" aria-label="Anti-bot check" />;
}
