import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie and gates /admin.
 *
 * Two jobs, in this order:
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
  const isAdminRoute = pathname.startsWith("/admin");

  // Without Supabase the admin area cannot work at all — say so plainly
  // rather than rendering a login form that can never succeed.
  if (!isSupabaseConfigured) {
    if (isAdminRoute && pathname !== "/admin/unavailable") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/unavailable";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
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

  if (isAdminRoute && !isLoginRoute && pathname !== "/admin/unavailable" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Send them back where they were going once they sign in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets. The sequence frames and images must not
     * pay for a middleware invocation — on Vercel that is billed per request
     * and adds latency to every frame.
     */
    "/((?!_next/static|_next/image|favicon.ico|sequence/|images/|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|mp4|webm|ico)$).*)",
  ],
};
