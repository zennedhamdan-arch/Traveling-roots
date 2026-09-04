import { addressLine, restaurant, telHref } from "@/data/restaurant";
import { SECTION_IDS, legal, navLinks } from "@/data/site";
import { directionsAction } from "@/lib/actions";
import BrandMark from "./BrandMark";
import styles from "./Footer.module.css";

export default function Footer(): React.JSX.Element {
  const year = new Date().getFullYear();
  const brandBlurb = restaurant.about[0];

  return (
    <footer id={SECTION_IDS.contact} className={styles.footer}>
      <div className="shell">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <BrandMark size="footer" stacked />
            <p className={styles.tagline}>{restaurant.tagline}</p>
            {brandBlurb ? <p className={styles.blurb}>{brandBlurb}</p> : null}
          </div>

          <nav className={styles.linkCol} aria-label="Footer">
            <h2 className={styles.colTitle}>Explore</h2>
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.linkCol} aria-label="Plan your visit">
            <h2 className={styles.colTitle}>Plan your visit</h2>
            <ul>
              <li>
                <a href="/reservation" className={styles.link}>
                  Reserve a table
                </a>
              </li>
              <li>
                <a href={`#${SECTION_IDS.location}`} className={styles.link}>
                  Location &amp; map
                </a>
              </li>
              <li>
                <a href="/gallery" className={styles.link}>
                  Gallery
                </a>
              </li>
              <li>
                <a href="/order" className={styles.link}>
                  Order pickup
                </a>
              </li>
            </ul>
          </nav>

          <div className={styles.contactCol}>
            <h2 className={styles.colTitle}>Contact</h2>
            <ul>
              {restaurant.phone && telHref ? (
                <li>
                  <a href={telHref} className={styles.link}>
                    {restaurant.phone.display}
                  </a>
                </li>
              ) : null}
              {restaurant.whatsapp ? (
                <li>
                  <a
                    href={restaurant.whatsapp.href}
                    className={styles.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp {restaurant.whatsapp.display}
                  </a>
                </li>
              ) : null}
              {restaurant.email ? (
                <li>
                  <a href={`mailto:${restaurant.email}`} className={styles.link}>
                    {restaurant.email}
                  </a>
                </li>
              ) : null}
              {restaurant.socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    className={styles.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.a11yLabel}
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.visitCol}>
            <h2 className={styles.colTitle}>Visit</h2>
            <address className={styles.address}>
              {restaurant.name}
              <br />
              {addressLine}
            </address>
            <ul className={styles.hours}>
              {restaurant.hours.map((row) => (
                <li key={row.days}>
                  <span>{row.days}</span>
                  <span className={styles.hoursTime}>
                    {row.opens}–{row.closes}
                  </span>
                </li>
              ))}
            </ul>
            {directionsAction ? (
              <a
                href={directionsAction.href}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {directionsAction.label}
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {year} {restaurant.legalName}. {restaurant.city},{" "}
            {restaurant.country}.
          </p>
          <ul className={styles.legal}>
            <li>
              <a href={legal.privacyHref} className={styles.link}>
                Privacy
              </a>
            </li>
            <li>
              <a href={legal.termsHref} className={styles.link}>
                Terms
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
