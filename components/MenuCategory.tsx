import type { MenuCategoryData } from "@/data/menu";
import MenuItemCard from "./MenuItem";
import styles from "./MenuCategory.module.css";

type MenuCategoryProps = Readonly<{
  category: MenuCategoryData;
  /** Suppresses prices while the data is still a layout placeholder. */
  hidePrices?: boolean;
}>;

export default function MenuCategory({
  category,
  hidePrices = false,
}: MenuCategoryProps): React.JSX.Element {
  return (
    <div className={styles.category}>
      <header className={styles.header}>
        <h3 className={styles.title}>{category.category}</h3>
        {category.intro ? <p className={styles.intro}>{category.intro}</p> : null}
      </header>

      <ul className={styles.items}>
        {category.items.map((item) => (
          <MenuItemCard key={item.id} item={item} hidePrice={hidePrices} />
        ))}
      </ul>
    </div>
  );
}
