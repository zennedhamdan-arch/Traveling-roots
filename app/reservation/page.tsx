import Link from "next/link";

import BrandMark from "@/components/BrandMark";
import ButtonLink from "@/components/Button";
import ReservationForm from "@/components/ReservationForm";
import { getRestaurant } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { primaryActions } from "@/lib/actions";
import styles from "./page.module.css";

export const revalidate = 60;

export const metadata = {
  title: "Reserve a table — Traveling Roots",
  description:
    "Request a table at Traveling Roots in Musanze. Choose your date, time and party size — we confirm every request by phone or WhatsApp.",
};

/**
 * The dedicated reservation page — the single destination of every "Reserve"
 * CTA on the site.
 *
 * It is deliberately a standalone page, not a homepage section: booking is a
 * task, and a task deserves an unhindered page with a clear way back. Like
 * /order it renders NO public navbar — just the brand and a real link home —
 * so nothing on this page scrolls the guest away mid-form.
 */
export default async function ReservationPage(): Promise<React.JSX.Element> {
  const restaurant = await getRestaurant();
  const formEnabled = isSupabaseConfigured;

  /* Real opening hours (database override or verified defaults), turned into
     bookable half-hour slots. Guests can only pick times we are open. */
  const hours = restaurant.hours[0];
  const timeSlots = buildTimeSlots(hours?.opens ?? "12:00", hours?.closes ?? "22:00");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.home} aria-label="Traveling Roots — home">
            <BrandMark />
          </Link>
          {/* A real anchor: works without JavaScript, after a direct visit,
              on every screen size, and the browser Back button behaves. */}
          <Link href="/" className={styles.back}>
            ← Back to the site
          </Link>
        </div>
      </header>

      <main id="main" className={styles.main}>
        <div className={`shell ${styles.inner}`}>
          <p className={styles.eyebrow}>Reservations</p>
          <h1 className={styles.headline}>Reserve a table</h1>
          <p className={styles.lede}>
            Pick a date, a time and how many of you there are. This sends a
            request — we confirm every table by phone or WhatsApp, and you will
            hear from us shortly.
          </p>

          {formEnabled ? (
            <ReservationForm timeSlots={timeSlots} />
          ) : (
            <div className={styles.fallback}>
              <h2 className={styles.fallbackTitle}>Online booking is not switched on yet</h2>
              <p className={styles.fallbackBody}>
                The fastest way to a table is still the reliable one — call or
                message us and we will hold it for you.
                {hours
                  ? ` We are open ${hours.days}, ${hours.opens}–${hours.closes}.`
                  : null}
              </p>
              <div className={styles.fallbackActions}>
                {primaryActions.map((action, index) => (
                  <ButtonLink
                    key={action.id}
                    href={action.href}
                    variant={index === 0 ? "primary" : "secondary"}
                    size="lg"
                    external={action.external}
                    {...(action.hint ? { "aria-label": action.hint } : {})}
                  >
                    {action.label}
                  </ButtonLink>
                ))}
              </div>
            </div>
          )}

          <p className={styles.aside}>
            Prefer to talk? Call {restaurant.phone?.display ?? "us"}
            {restaurant.whatsapp ? ` or WhatsApp ${restaurant.whatsapp.display}` : ""}.
          </p>
        </div>
      </main>
    </div>
  );
}

/** Half-hour slots from opening to closing, e.g. 12:00 → "12:00","12:30",… */
function buildTimeSlots(opens: string, closes: string): string[] {
  const toMinutes = (value: string): number => {
    const parts = value.split(":");
    const h = parts[0] !== undefined ? Number(parts[0]) : NaN;
    const m = parts[1] !== undefined ? Number(parts[1]) : NaN;
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    return h * 60 + (m >= 30 ? 30 : 0);
  };

  const start = toMinutes(opens);
  const end = toMinutes(closes);
  if (start < 0 || end <= start) return [];

  const slots: string[] = [];
  for (let t = start; t <= end; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}
