import type { MenuCategoryData } from "@/data/menu";
import MenuItemRow from "./MenuItem";
import styles from "./MenuCategory.module.css";

type MenuCategoryProps = Readonly<{
  category: MenuCategoryData;
}>;

/**
 * Renders one menu category.
 *
 * Layout adapts to the data rather than being configured by hand: a category
 * whose dishes have photography becomes a card grid, one without becomes an
 * editorial price list — which is how a real menu of this length should read.
 */
export default function MenuCategory({
  category,
}: MenuCategoryProps): React.JSX.Element {
  const hasImages = category.sections.some((section) =>
    section.items.some((item) => item.image),
  );
  const layout = hasImages ? "cards" : "list";

  return (
    <div className={styles.category}>
      <header className={styles.header}>
        <h3 className={styles.title}>{category.category}</h3>
        {category.intro ? <p className={styles.intro}>{category.intro}</p> : null}
      </header>

      {category.sections.map((section) => (
        <section key={section.id} className={styles.section}>
          {section.title ? (
            <h4 className={styles.sectionTitle}>{section.title}</h4>
          ) : null}
          {section.note ? <p className={styles.note}>{section.note}</p> : null}

          <ul className={styles.items} data-layout={layout}>
            {section.items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                layout={layout}
                // Keep the heading outline correct: items sit one level below
                // a section title when the category has named sections.
                headingLevel={section.title ? "h5" : "h4"}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
