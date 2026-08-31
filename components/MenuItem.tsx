import Image from "next/image";

import type { MenuItem } from "@/data/menu";
import styles from "./MenuItem.module.css";

type MenuItemProps = Readonly<{
  item: MenuItem;
  hidePrice?: boolean;
}>;

/**
 * A single dish. Photography is optional — with no image the card falls back
 * to a typographic tile rather than a broken frame or a stock photo.
 */
export default function MenuItemCard({
  item,
  hidePrice = false,
}: MenuItemProps): React.JSX.Element {
  const showPrice = !hidePrice && item.price !== null;

  return (
    <li className={styles.item} id={item.id}>
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
        {item.signature ? <span className={styles.signature}>House speciality</span> : null}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h4 className={styles.name}>{item.name}</h4>
          {showPrice ? (
            <p className={styles.price}>{item.price}</p>
          ) : (
            <p className={styles.priceMuted} aria-hidden="true">
              —
            </p>
          )}
        </div>

        <p className={styles.description}>{item.description}</p>

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
