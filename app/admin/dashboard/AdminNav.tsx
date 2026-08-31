"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import SignOutButton from "./SignOutButton";

/**
 * Dashboard navigation: a grouped sidebar on desktop, a hamburger + slide-out
 * drawer on phones. The owner manages this site from a kitchen — the nav must
 * work one-handed on a small screen, which a row of tabs never does.
 *
 * Sections group related pages so the list stays scannable as features are
 * added. Only pages that exist are listed — a nav item that 404s is worse
 * than no nav item.
 */

type NavItem = Readonly<{ href: string; label: string; icon: React.ReactNode }>;

type NavGroup = Readonly<{ title: string; items: readonly NavItem[] }>;

/* 20×20 stroke icons — inline SVG, no icon library, no extra dependency. */
const icon = (path: React.ReactNode): React.ReactNode => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ICONS = {
  overview: icon(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  hero: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3z" />
    </>,
  ),
  menu: icon(
    <>
      <path d="M7 3v8a2.5 2.5 0 0 0 5 0V3" />
      <path d="M9.5 11v10" />
      <path d="M16.5 3c1.8 1.2 2.5 3 2.5 5.5V21" />
    </>,
  ),
  experiences: icon(
    <>
      <path d="M12 21c4.5-2 7-5.5 7-10V5l-7-2-7 2v6c0 4.5 2.5 8 7 10z" />
    </>,
  ),
  gallery: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4.5L14 17l3-3 4 4" />
    </>,
  ),
  offers: icon(
    <>
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
      <path d="M2 9h20l-1.2-3.4A2 2 0 0 0 18.9 4H5.1a2 2 0 0 0-1.9 1.6L2 9z" />
    </>,
  ),
  testimonials: icon(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </>,
  ),
  business: icon(
    <>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-6h6v6" />
    </>,
  ),
  reservations: icon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>,
  ),
  orders: icon(
    <>
      <path d="M5 21V11a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10" />
      <path d="M13 21V11a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18" />
    </>,
  ),
} as const;

const GROUPS: readonly NavGroup[] = [
  {
    title: "Dashboard",
    items: [{ href: "/admin/dashboard", label: "Overview", icon: ICONS.overview }],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/dashboard/hero", label: "Hero video", icon: ICONS.hero },
      { href: "/admin/dashboard/menu", label: "Menu", icon: ICONS.menu },
      { href: "/admin/dashboard/experiences", label: "Experiences", icon: ICONS.experiences },
      { href: "/admin/dashboard/gallery", label: "Gallery", icon: ICONS.gallery },
      { href: "/admin/dashboard/offers", label: "Offers", icon: ICONS.offers },
      { href: "/admin/dashboard/testimonials", label: "Testimonials", icon: ICONS.testimonials },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/admin/dashboard/business", label: "Business info", icon: ICONS.business },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/dashboard/reservations", label: "Reservations", icon: ICONS.reservations },
      { href: "/admin/dashboard/orders", label: "Pickup orders", icon: ICONS.orders },
    ],
  },
];

export default function AdminNav({ email }: Readonly<{ email: string }>): React.JSX.Element {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  /* Close the drawer on navigation, on Escape, and lock body scroll. */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isActive = (href: string): boolean =>
    href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Top bar — always visible; the hamburger only shows on phones. */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-button"
          aria-expanded={isOpen ? "true" : "false"}
          aria-controls="admin-sidebar"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <Link className="admin-brand" href="/admin/dashboard">
          Traveling Roots
        </Link>
        <div className="admin-topbar-right">
          <span className="admin-who">{email}</span>
          <Link className="admin-link" href="/" target="_blank" rel="noreferrer">
            View site
          </Link>
        </div>
      </header>

      {isOpen ? (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <nav
        id="admin-sidebar"
        className="admin-sidebar"
        data-open={isOpen ? "true" : "false"}
        aria-label="Dashboard sections"
      >
        {GROUPS.map((group) => (
          <section key={group.title} className="admin-nav-group">
            <h2 className="admin-nav-group-title">{group.title}</h2>
            <ul className="admin-nav-list">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    className="admin-nav-link-item"
                    href={item.href}
                    data-active={isActive(item.href) ? "true" : "false"}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="admin-nav-group admin-nav-group-system">
          <h2 className="admin-nav-group-title">System</h2>
          <ul className="admin-nav-list">
            <li>
              <span className="admin-nav-signout">
                <SignOutButton />
              </span>
            </li>
          </ul>
        </section>
      </nav>
    </>
  );
}
