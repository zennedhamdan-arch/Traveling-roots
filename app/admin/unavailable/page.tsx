import Link from "next/link";

/**
 * Shown when Supabase environment variables are missing.
 *
 * Rendering a login form that cannot possibly succeed would waste the owner's
 * time guessing at their password. This says what is actually wrong.
 */
export default function AdminUnavailablePage(): React.JSX.Element {
  return (
    <main className="admin-shell admin-centered">
      <div className="admin-card admin-narrow">
        <h1 className="admin-title">Admin isn&apos;t connected yet</h1>
        <p className="admin-muted">
          This dashboard needs a Supabase project. Two environment variables are
          missing:
        </p>
        <pre className="admin-code">
          NEXT_PUBLIC_SUPABASE_URL{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY
        </pre>
        <p className="admin-muted">
          Add them in your Vercel project settings, then redeploy. The public
          website is unaffected and is running normally from its committed
          content.
        </p>
        <Link className="admin-button" href="/">
          Back to the website
        </Link>
      </div>
    </main>
  );
}
