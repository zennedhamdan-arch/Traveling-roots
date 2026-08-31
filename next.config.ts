import type { NextConfig } from "next";

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
