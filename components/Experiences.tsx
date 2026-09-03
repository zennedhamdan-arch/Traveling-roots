import { SECTION_IDS, experiences } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import styles from "./Experiences.module.css";

/** Only what the restaurant publishes about itself or what visitors
    consistently report. Nothing invented. Server-rendered. */
export default function Experiences(): React.JSX.Element {
  const hours = restaurant.hours[0];

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
          {experiences.items.map((item) => (
            <li key={item.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
