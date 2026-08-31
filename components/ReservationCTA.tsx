import { SECTION_IDS, reservation } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import { primaryActions, secondaryActions } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import ButtonLink from "./Button";
import ReservationForm from "./ReservationForm";
import styles from "./ReservationCTA.module.css";

/**
 * The conversion moment. One headline, two paths: the fast path for people
 * who want to talk now (call / WhatsApp), and — when the database is
 * connected — a request form for people who prefer to type. No fake booking
 * confirmation either way: a submitted form is a request until a human
 * calls back.
 */
export default function ReservationCTA(): React.JSX.Element {
  const hours = restaurant.hours[0];
  const formEnabled = isSupabaseConfigured;

  return (
    <section
      id={SECTION_IDS.reserve}
      className={styles.section}
      aria-labelledby="reserve-heading"
    >
      <div className="shell">
        <div className={styles.inner}>
          <h2 id="reserve-heading" className={styles.headline}>
            {reservation.headline}
          </h2>
          <p className={styles.body}>{reservation.body}</p>

          <div className={styles.actions}>
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

          <ul className={styles.secondary}>
            {secondaryActions.map((action) => (
              <li key={action.id}>
                <ButtonLink
                  href={action.href}
                  variant="ghost"
                  external={action.external}
                  {...(action.hint ? { "aria-label": action.hint } : {})}
                >
                  {action.label}
                </ButtonLink>
              </li>
            ))}
          </ul>

          {hours ? (
            <p className={styles.meta}>
              {restaurant.city}, {restaurant.country} · {hours.days}{" "}
              {hours.opens}–{hours.closes}
            </p>
          ) : null}

          {formEnabled ? (
            <div className={styles.formWrap}>
              <p className={styles.formDivider} aria-hidden="true">
                — or send a request —
              </p>
              <ReservationForm />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
