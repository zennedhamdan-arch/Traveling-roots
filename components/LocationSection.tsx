import { addressLine, restaurant, telHref } from "@/data/restaurant";
import { SECTION_IDS, locationSection } from "@/data/site";
import { whatsappAction } from "@/lib/actions";
import ButtonLink from "./Button";
import styles from "./LocationSection.module.css";

/**
 * The location section — the client's own Google Maps embed, verbatim, in a
 * responsive cinematic frame. The map is lazy-loaded by the browser
 * (loading="lazy") so it never competes with the hero for bandwidth.
 *
 * Every button is real, verified data from data/restaurant.ts (or the
 * database override): nothing here is invented.
 */

const MAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.4418618780305!2d29.629875400000003!3d-1.5050644999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dc5b3d5e754b3d%3A0x9b1fed8cf1d85458!2sTraveling%20Roots%20Ltd!5e0!3m2!1sen!2srw!4v1788210761982!5m2!1sen!2srw";

export default function LocationSection(): React.JSX.Element {
  const hours = restaurant.hours[0];

  return (
    <section
      id={SECTION_IDS.location}
      className={styles.section}
      aria-labelledby="location-heading"
    >
      <div className="shell">
        <div className={styles.head}>
          <p className="eyebrow">{locationSection.eyebrow}</p>
          <h2 id="location-heading" className={styles.headline}>
            {locationSection.headline}
          </h2>
        </div>

        <div className={styles.grid}>
          <div className={styles.mapFrame}>
            <iframe
              src={MAPS_EMBED_SRC}
              title={`Map showing ${restaurant.name} in ${restaurant.city}, ${restaurant.country}`}
              className={styles.map}
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Visit us</h3>
            <address className={styles.address}>
              {restaurant.name}
              <br />
              {addressLine}
              {restaurant.plusCode ? (
                <>
                  <br />
                  Plus code {restaurant.plusCode}
                </>
              ) : null}
            </address>

            {hours ? (
              <p className={styles.hours}>
                Open {hours.days} · {hours.opens}–{hours.closes}
              </p>
            ) : null}

            <div className={styles.actions}>
              {restaurant.directionsUrl ? (
                <ButtonLink
                  href={restaurant.directionsUrl}
                  variant="primary"
                  external
                  aria-label={`Get directions to ${restaurant.name}`}
                >
                  Get Directions
                </ButtonLink>
              ) : null}
              {telHref && restaurant.phone ? (
                <ButtonLink href={telHref} variant="secondary" aria-label={`Call ${restaurant.phone.display}`}>
                  Call
                </ButtonLink>
              ) : null}
              {whatsappAction ? (
                <ButtonLink
                  href={whatsappAction.href}
                  variant="secondary"
                  external
                  {...(whatsappAction.hint ? { "aria-label": whatsappAction.hint } : {})}
                >
                  WhatsApp
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
