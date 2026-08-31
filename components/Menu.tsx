"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MENU_STATUS, dietaryLegend, menu } from "@/data/menu";
import { SECTION_IDS } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import MenuCategory from "./MenuCategory";
import styles from "./Menu.module.css";

/**
 * The real, on-site menu. Never a redirect, never an embed.
 *
 * One category is shown at a time via a proper ARIA tablist: arrow keys move
 * between tabs, Home/End jump to the ends, and the panel is labelled by its
 * tab. On mobile the tablist becomes a horizontally scrollable strip.
 */
export default function Menu(): React.JSX.Element {
  const [activeId, setActiveId] = useState<string>(menu[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();

  const tabId = useCallback(
    (categoryId: string) => `${baseId}-tab-${categoryId}`,
    [baseId],
  );
  const panelId = useCallback(
    (categoryId: string) => `${baseId}-panel-${categoryId}`,
    [baseId],
  );

  /* Keep the active tab in view on narrow screens. */
  useEffect(() => {
    const list = tabsRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeId]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      const index = menu.findIndex((c) => c.id === activeId);
      if (index === -1) return;

      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % menu.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + menu.length) % menu.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = menu.length - 1;
      else return;

      event.preventDefault();
      const target = menu[next];
      if (!target) return;
      setActiveId(target.id);
      document.getElementById(tabId(target.id))?.focus();
    },
    [activeId, tabId],
  );

  return (
    <section id={SECTION_IDS.menu} className={styles.section} aria-labelledby="menu-heading">
      <div className="shell">
        <div className={styles.head}>
          <p className="eyebrow">The Menu</p>
          <h2 id="menu-heading" className={styles.headline}>
            Cuisines that travelled, cooked where they landed.
          </h2>
          <p className={styles.lede}>
            Inspired by kitchens around the world, grown as much as possible in
            our own chef&apos;s garden here in {restaurant.city}.
          </p>
        </div>

        {MENU_STATUS.isPlaceholder ? (
          <p className={styles.notice} role="status">
            {MENU_STATUS.notice}
          </p>
        ) : null}

        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Menu categories"
          aria-orientation="horizontal"
          className={styles.tabs}
          onKeyDown={onKeyDown}
        >
          {menu.map((category) => {
            const selected = category.id === activeId;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                id={tabId(category.id)}
                aria-selected={selected}
                aria-controls={panelId(category.id)}
                tabIndex={selected ? 0 : -1}
                className={styles.tab}
                onClick={() => setActiveId(category.id)}
              >
                {category.category}
              </button>
            );
          })}
        </div>

        {menu.map((category) => (
          <div
            key={category.id}
            role="tabpanel"
            id={panelId(category.id)}
            aria-labelledby={tabId(category.id)}
            hidden={category.id !== activeId}
            tabIndex={0}
            className={styles.panel}
          >
            <MenuCategory category={category} hidePrices={MENU_STATUS.isPlaceholder} />
          </div>
        ))}

        {dietaryLegend.length > 0 ? (
          <div className={styles.legend}>
            <h3 className={styles.legendTitle}>Dietary</h3>
            <ul className={styles.legendList}>
              {dietaryLegend.map((tag) => (
                <li key={tag} className={styles.legendItem}>
                  {tag}
                </li>
              ))}
            </ul>
            <p className={styles.legendNote}>
              Tell us about any allergies or dietary needs when you order — the
              kitchen will work with you.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
