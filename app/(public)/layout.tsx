import Navbar from "@/components/Navbar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

/**
 * The public site's chrome.
 *
 * The Navbar lives HERE, in a route group, and deliberately not in the root
 * layout. It is `position: fixed` (it floats over the cinematic hero), so
 * rendering it from the root layout made it overlap the admin dashboard —
 * "MENU / RESERVE" floating on top of /admin.
 *
 * A route group ((public) adds nothing to the URL) is the structural fix:
 * every page inside it — /, /privacy, /terms — gets the navbar, and nothing
 * under /admin ever does, without a pathname check in a server component
 * (which the App Router does not support) or a client-side hack.
 *
 * The floating WhatsApp button is a global conversion element, so it rides
 * along here too — and on the standalone utility pages (/order, /reservation)
 * via their own layouts. Never on /admin.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <>
      <Navbar />
      {children}
      <FloatingWhatsApp />
    </>
  );
}
