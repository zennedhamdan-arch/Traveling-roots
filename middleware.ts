import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Gates and session-refreshes /admin — and does NOTHING else.
 *
 * Public pages must not perform Supabase Auth work merely to render. Every
 * non-admin request returns immediately, before any Supabase client exists:
 * no `auth.getUser()` round-trip on the critical path of `/`, `/gallery`,
 * `/reservation`, `/order` or the API routes. (Public content is fetched
 * cookie-less with the anon key by lib/content — no session is involved —
 * and only /admin pages ever read the admin's session cookie, so nothing on
 * the public side depended on the refresh this middleware used to do there.)
 *
 * For /admin routes, two jobs, in this order:
 *
 *  1. Server Components cannot write cookies, so an expiring access token can
 *     only be refreshed here. Without this, an admin gets silently signed out
 *     mid-edit.
 *  2. Bounce anonymous visitors away from /admin before the page renders.
 *
 * This is a first gate, NOT the security boundary. Middleware only sees the
 * cookie; the real checks are `getAdminUser()` on every admin page and RLS in
 * the database, which a forged cookie cannot get past.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Defense in depth: the matcher below already limits this middleware to
  // /admin, but if it is ever widened again, public requests must still skip
  // all Supabase work — so the check lives here too, not only in the matcher.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Without Supabase the admin area cannot work at all — say so plainly
  // rather than rendering a login form that can never succeed.
  if (!isSupabaseConfigured && pathname !== "/admin/unavailable") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/unavailable";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Revalidates the token with Supabase and writes a refreshed cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = pathname === "/admin/login";

  if (!isLoginRoute && pathname !== "/admin/unavailable" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Send them back where they were going once they sign in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // NOTE: a signed-in user on /admin/login is NOT bounced to the dashboard
  // here. "Signed in" only means AAL1 (a password); the dashboard requires
  // AAL2 (password + TOTP). Bouncing here would ping-pong an AAL1 session
  // between this route and the dashboard's own check, forever. The login
  // page itself redirects fully-verified (AAL2) admins — see its getAdminUser
  // call — which is the only session that has nothing left to prove.

  return response;
}

export const config = {
  matcher: [
    /*
     * Admin routes only. Middleware used to run on every non-static path,
     * which put a blocking supabase.auth.getUser() round-trip in front of
     * every public page; now public pages, the API routes and all static
     * assets never invoke middleware at all. (The in-code isAdminRoute guard
     * above keeps public requests safe even if this list is ever widened.)
     * `/admin/:path*` also matches `/admin` itself — `:path*` is zero-or-more.
     */
    "/admin/:path*",
  ],
};
