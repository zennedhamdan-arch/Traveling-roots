import { restaurant, locationLabel } from "@/data/restaurant";
import { SECTION_IDS, story } from "@/data/site";
import styles from "./StorySection.module.css";

/**
 * The landing after the cinematic sequence. Deliberately quiet: one idea,
 * the restaurant's own words, then room to breathe before the menu.
 * Server-rendered — no client JavaScript.
 */
export default function StorySection(): React.JSX.Element {
  return (
    <section
      id={SECTION_IDS.story}
      className={styles.section}
      aria-labelledby="story-heading"
    >
      <div className="shell">
        <div className={styles.intro}>
          <p className="eyebrow">{story.eyebrow}</p>
          <h2 id="story-heading" className={styles.headline}>
            {story.headline}
          </h2>
          <div className={styles.body}>
            {restaurant.about.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
          <p className={styles.place}>
            <span className={styles.placeLine} aria-hidden="true" />
            {locationLabel}
          </p>
        </div>

        <ul className={styles.pillars}>
          {story.pillars.map((pillar, index) => (
            <li key={pillar.id} className={styles.pillar}>
              <span className={styles.pillarIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.pillarTitle}>{pillar.title}</h3>
              <p className={styles.pillarBody}>{pillar.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
