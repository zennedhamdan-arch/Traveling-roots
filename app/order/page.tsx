import Link from "next/link";

import BrandMark from "@/components/BrandMark";
import PickupOrderForm from "@/components/PickupOrderForm";
import ButtonLink from "@/components/Button";
import { getOrderMenu } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { primaryActions } from "@/lib/actions";
import { restaurant } from "@/data/restaurant";
import styles from "./page.module.css";

/**
 * The public pickup-order page.
 *
 * It is a separate route rather than a section on the homepage on purpose:
 * the homepage is a cinematic single scroll, and an ordering form is a task,
 * not a mood. The menu section links here.
 *
 * Resilience follows the site-wide rule, adjusted for the one thing an order
 * genuinely needs: a database to submit into. Without Supabase configured
 * there is nowhere for an order to go, so instead of a form that can never
 * succeed the guest gets the phone and WhatsApp buttons — the same channels
 * the reservation section offers.
 */
export const revalidate = 60;

export const metadata = {
  title: "Order pickup — Traveling Roots",
  description:
    "Build a pickup order from the Traveling Roots menu. We confirm every order by phone or WhatsApp.",
};

export default async function OrderPage(): Promise<React.JSX.Element> {
  const menu = await getOrderMenu();
  const orderable = isSupabaseConfigured && menu !== null;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.home} aria-label="Traveling Roots — home">
            <BrandMark />
          </Link>
          <Link href="/" className={styles.back}>
            ← Back to the site
          </Link>
        </div>
      </header>

      <main id="main" className={styles.main}>
        <div className={`shell ${styles.inner}`}>
          <p className={styles.eyebrow}>Takeaway</p>
          <h1 className={styles.headline}>Order for pickup</h1>
          <p className={styles.lede}>
            Build your order from the live menu. Nothing is charged online — we
            confirm every order by phone or WhatsApp, and you pay at pickup.
          </p>

          {orderable && menu ? (
            <PickupOrderForm categories={menu} turnstileSiteKey={turnstileSiteKey} />
          ) : (
            <div className={styles.fallback}>
              <h2 className={styles.fallbackTitle}>Online ordering is not switched on yet</h2>
              <p className={styles.fallbackBody}>
                The kitchen still takes orders the reliable way — call or message
                us and your food will be ready for pickup.
                {restaurant.hours[0]
                  ? ` We are open ${restaurant.hours[0].days}, ${restaurant.hours[0].opens}–${restaurant.hours[0].closes}.`
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
                <ButtonLink href="/#menu" variant="ghost" size="lg">
                  Browse the menu
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
