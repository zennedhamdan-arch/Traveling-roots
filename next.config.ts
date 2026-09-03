import type { NextConfig } from "next";

/**
 * Production security headers.
 *
 * The CSP below is evidence-based: every source in it corresponds to
 * something the site actually loads —
 *
 *   script-src   'self'            — Next.js chunks, self-hosted fonts CSS
 *               'unsafe-inline'   — Next.js App Router inline bootstrap +
 *                                   RSC streaming scripts (self.__next_f)
 *               challenges.cloudflare.com — the Turnstile api.js on the
 *                                   reservation and order forms
 *   style-src    'unsafe-inline'   — inline style attributes + Turnstile-
 *                                   injected styles
 *   img-src      data:             — the inline SVG QR code at admin TOTP
 *                                   enrollment; https://*.supabase.co — menu,
 *                                   gallery and hero imagery from Supabase
 *                                   Storage; 'self' — /_next/image and
 *                                   /sequence frames
 *   media-src    https://*.supabase.co — the admin-controlled hero video
 *   connect-src  https://*.supabase.co — Supabase Auth + PostgREST + Storage
 *                                   from the browser (admin dashboard, forms)
 *   frame-src    www.google.com    — the client's own Google Maps embed
 *               challenges.cloudflare.com — the Turnstile widget iframe
 *
 * Deliberately absent: 'unsafe-eval' (nothing needs it in production), and
 * any wildcard beyond the two partners the site really talks to. If a future
 * feature needs a new source, add it here — never widen an existing one.
 *
 * To audit a change without enforcing it, duplicate the header key as
 * "Content-Security-Policy-Report-Only" temporarily.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.supabase.co",
  "media-src 'self' https://*.supabase.co",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co",
  "frame-src https://www.google.com https://challenges.cloudflare.com",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // No content-type sniffing on responses that opted out of one.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-origin, a full URL same-origin, nothing else.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The dashboard and the public site may frame themselves; nobody else.
  // (frame-ancestors in the CSP says the same thing for modern browsers.)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Nothing here needs device access — say so before anything asks.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // The public site opens no windows that need a cross-origin opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HTTPS-only hosting (Vercel) — commit browsers to it for this host.
  // No includeSubDomains/preload: the apex domain is not ours to speak for.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Keep the ladder tight: fewer generated variants, smaller cache, faster mobile.
    deviceSizes: [360, 414, 768, 1024, 1440, 1920],
    imageSizes: [96, 160, 240, 320, 480],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // The 29 frames are immutable content-addressed assets in practice:
        // cache them hard so a repeat visit never re-downloads the sequence.
        source: "/sequence/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
