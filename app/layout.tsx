import type { Metadata, Viewport } from "next";

import "./globals.css";
import { restaurant, locationLabel } from "@/data/restaurant";
import { seo } from "@/data/site";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: {
    default: seo.title,
    template: `%s | ${restaurant.name}`,
  },
  description: seo.description,
  keywords: [...seo.keywords],
  applicationName: restaurant.name,
  authors: [{ name: restaurant.legalName }],
  category: "restaurant",
  openGraph: {
    type: "website",
    title: seo.title,
    description: seo.description,
    siteName: restaurant.name,
    locale: "en_RW",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "geo.placename": locationLabel,
    "geo.region": "RW",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1a13",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skipLink">
          Skip to content
        </a>
        {children}
        <StructuredData />
      </body>
    </html>
  );
}
