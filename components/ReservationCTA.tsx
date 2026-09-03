import { SECTION_IDS, reservation } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import { primaryActions, secondaryActions } from "@/lib/actions";
import ButtonLink from "./Button";
import styles from "./ReservationCTA.module.css";

/**
 * The conversion moment. Deliberately simple: one headline, two decisions.
 * No fake booking form — reservations really are taken by phone and WhatsApp.
 */
export default function ReservationCTA(): React.JSX.Element {
  const hours = restaurant.hours[0];

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
        </div>
      </div>
    </section>
  );
}
