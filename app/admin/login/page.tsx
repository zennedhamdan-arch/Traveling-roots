import { Suspense } from "react";

import LoginForm from "./LoginForm";

export default function AdminLoginPage(): React.JSX.Element {
  return (
    <main className="admin-shell admin-centered">
      <div className="admin-card admin-narrow">
        <p className="admin-eyebrow">Traveling Roots</p>
        <h1 className="admin-title">Sign in</h1>
        <Suspense fallback={<p className="admin-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
