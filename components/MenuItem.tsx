import Image from "next/image";

import type { MenuItem } from "@/data/menu";
import styles from "./MenuItem.module.css";

type MenuItemProps = Readonly<{
  item: MenuItem;
  layout: "cards" | "list";
  headingLevel: "h4" | "h5";
}>;

/**
 * A single dish.
 *
 * "list"  — editorial price list: name, leader, price. The right choice for a
 *           long menu with no photography.
 * "cards" — photo card, used automatically once dishes have images.
 */
export default function MenuItemRow({
  item,
  layout,
  headingLevel,
}: MenuItemProps): React.JSX.Element {
  const Heading = headingLevel;
  const hasVariants = item.variants != null && item.variants.length > 0;

  return (
    <li className={styles.item} data-layout={layout} id={item.id}>
      {layout === "cards" ? (
        <div className={styles.media}>
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className={styles.image}
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 40vw, 88vw"
              loading="lazy"
            />
          ) : (
            <span className={styles.mediaFallback} aria-hidden="true">
              {item.name.charAt(0)}
            </span>
          )}
        </div>
      ) : null}

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <Heading className={styles.name}>{item.name}</Heading>
          <span className={styles.leader} aria-hidden="true" />
          {item.price !== null ? <p className={styles.price}>{item.price}</p> : null}
        </div>

        {item.description ? (
          <p className={styles.description}>{item.description}</p>
        ) : null}

        {hasVariants ? (
          <ul className={styles.variants}>
            {item.variants?.map((variant) => (
              <li key={variant.label} className={styles.variant}>
                <span className={styles.variantLabel}>{variant.label}</span>
                <span className={styles.variantLeader} aria-hidden="true" />
                <span className={styles.variantPrice}>{variant.price}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {item.availability ? (
          <p className={styles.availability}>{item.availability}</p>
        ) : null}

        {item.dietary && item.dietary.length > 0 ? (
          <ul className={styles.tags}>
            {item.dietary.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
