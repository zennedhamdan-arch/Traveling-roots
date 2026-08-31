import { SECTION_IDS, experiences } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import styles from "./Experiences.module.css";

/**
 * Experiences — admin-controlled when the database has rows, with the
 * verified static set as the fallback so the section is never empty.
 *
 * Only fields the restaurant actually publishes are shown: a photo if one has
 * been uploaded, a duration or price only if set. Nothing invented.
 */

export type ExperienceItem = Readonly<{
  id: string;
  title: string;
  body: string;
  image?: string;
  duration?: string;
  price?: string | null;
}>;

type Props = Readonly<{ items?: readonly ExperienceItem[] }>;

export default function Experiences({ items }: Props): React.JSX.Element {
  const hours = restaurant.hours[0];
  const list: readonly ExperienceItem[] =
    items && items.length > 0
      ? items
      : experiences.items.map((item) => ({ id: item.id, title: item.title, body: item.body }));

  return (
    <section
      id={SECTION_IDS.experiences}
      className={styles.section}
      aria-labelledby="experiences-heading"
    >
      <div className="shell">
        <div className={styles.head}>
          <p className="eyebrow">{experiences.eyebrow}</p>
          <h2 id="experiences-heading" className={styles.headline}>
            {experiences.headline}
          </h2>
          {hours ? (
            <p className={styles.hours}>
              Open {hours.days} · {hours.opens}–{hours.closes}
            </p>
          ) : null}
        </div>

        <ul className={styles.grid}>
          {list.map((item) => (
            <li key={item.id} className={styles.card}>
              {item.image ? (
                <>
                  {/* Admin-uploaded photo on Supabase's CDN; plain img keeps
                      the card a Server Component with no loader config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.cardImage}
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                  />
                </>
              ) : null}
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.body}</p>
                {item.duration || item.price ? (
                  <p className={styles.cardMeta}>
                    {item.duration ? <span>{item.duration}</span> : null}
                    {item.duration && item.price ? <span aria-hidden="true"> · </span> : null}
                    {item.price ? <span>{item.price}</span> : null}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
