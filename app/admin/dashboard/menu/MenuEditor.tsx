"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MenuCategoryRow, MenuItemRow, MenuSectionRow } from "@/lib/supabase/types";

type MenuEditorProps = Readonly<{
  categories: readonly MenuCategoryRow[];
  sections: readonly MenuSectionRow[];
  items: readonly MenuItemRow[];
}>;

/**
 * Menu editor.
 *
 * One category at a time, matching how the public menu is browsed and how a
 * phone screen works. Edits save per item rather than as one giant form, so a
 * dropped connection loses one price, not an evening of work.
 */
export default function MenuEditor({
  categories,
  sections,
  items,
}: MenuEditorProps): React.JSX.Element {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sectionsForCategory = useMemo(
    () => sections.filter((section) => section.category_id === activeCategory),
    [sections, activeCategory],
  );

  const itemsBySection = useMemo(() => {
    const map = new Map<string, MenuItemRow[]>();
    for (const item of items) {
      const list = map.get(item.section_id) ?? [];
      list.push(item);
      map.set(item.section_id, list);
    }
    return map;
  }, [items]);

  async function save(item: MenuItemRow, patch: Partial<MenuItemRow>): Promise<void> {
    setBusyId(item.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("menu_items")
        .update(patch)
        .eq("id", item.id);
      if (updateError) throw updateError;
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusyId(null);
    }
  }

  if (categories.length === 0) {
    return (
      <p className="admin-muted">
        No menu in the database yet. Run <code>supabase/seed.sql</code> to load
        the current menu.
      </p>
    );
  }

  return (
    <div className="admin-stack">
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-tabs" role="tablist" aria-label="Menu categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={category.id === activeCategory}
            className="admin-tab"
            data-selected={category.id === activeCategory ? "true" : "false"}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
            {!category.published ? " (hidden)" : ""}
          </button>
        ))}
      </div>

      {sectionsForCategory.map((section) => (
        <section key={section.id} className="admin-card">
          {section.title ? <h2 className="admin-subtitle">{section.title}</h2> : null}
          <ul className="admin-list admin-list-compact">
            {(itemsBySection.get(section.id) ?? []).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isBusy={busyId === item.id}
                onSave={(patch) => void save(item, patch)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type ItemRowProps = Readonly<{
  item: MenuItemRow;
  isBusy: boolean;
  onSave: (patch: Partial<MenuItemRow>) => void;
}>;

function ItemRow({ item, isBusy, onSave }: ItemRowProps): React.JSX.Element {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(item.price === null ? "" : String(item.price));

  const isDirty =
    name !== item.name ||
    description !== (item.description ?? "") ||
    price !== (item.price === null ? "" : String(item.price));

  return (
    <li className="admin-list-item admin-list-item-row">
      <div className="admin-item-grid">
        <label className="admin-field">
          <span className="admin-label">Name</span>
          <input
            className="admin-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="admin-field">
          <span className="admin-label">Price (RWF)</span>
          <input
            className="admin-input"
            // inputMode numeric brings up the number pad on a phone without
            // type="number"'s spinner arrows and scroll-wheel accidents.
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={item.variants.length > 0 ? "Priced by size" : "0"}
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
          />
        </label>

        <label className="admin-field admin-field-wide">
          <span className="admin-label">Description</span>
          <input
            className="admin-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      {item.variants.length > 0 ? (
        <p className="admin-hint">
          Sizes:{" "}
          {item.variants
            .map((v) => `${v.label} — ${v.price?.toLocaleString("en-US") ?? "?"} RWF`)
            .join(", ")}
        </p>
      ) : null}

      <div className="admin-row">
        <label className="admin-check admin-check-inline">
          <input
            type="checkbox"
            checked={item.available}
            disabled={isBusy}
            onChange={(event) => onSave({ available: event.target.checked })}
          />
          <span>Available</span>
        </label>

        <button
          type="button"
          className="admin-button admin-button-quiet"
          disabled={isBusy || !isDirty}
          onClick={() =>
            onSave({
              name: name.trim(),
              description: description.trim() || null,
              price: price === "" ? null : Number.parseInt(price, 10),
            })
          }
        >
          {isBusy ? "Saving…" : isDirty ? "Save" : "Saved"}
        </button>
      </div>
    </li>
  );
}
