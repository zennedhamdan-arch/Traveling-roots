"use client";

import { useMemo, useState } from "react";

import Turnstile from "./Turnstile";
import type { PickupOrderDraftLine } from "@/lib/supabase/types";
import type { OrderableCategory, OrderableItem } from "@/lib/content";
import styles from "./PickupOrderForm.module.css";

/**
 * The public pickup-order form.
 *
 * Security posture, because it is easy to get wrong: the prices rendered here
 * are a courtesy. The browser is untrusted — a guest can edit anything it
 * sends — so the lines carry only menu_item_id / quantity / variant_label and
 * the DATABASE reprices the order from the live menu when the row is inserted
 * (see supabase/migrations/0004_pickup_orders.sql). The total shown here can
 * differ from the stored one only if the menu changed between render and
 * submit, in which case the database is right.
 */

type Selection = {
  itemId: string;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  qty: number;
};

const selectionKey = (itemId: string, variantLabel: string | null): string =>
  `${itemId}::${variantLabel ?? ""}`;

const rwf = (amount: number): string => `${amount.toLocaleString("en-US")} RWF`;

type Props = Readonly<{
  categories: readonly OrderableCategory[];
  /** Public Turnstile site key, supplied by the server page. Empty = not configured. */
  turnstileSiteKey: string;
}>;

export default function PickupOrderForm({
  categories,
  turnstileSiteKey: siteKey,
}: Props): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [selections, setSelections] = useState<readonly Selection[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  /* Search spans every category; when active it replaces the category view. */
  const searching = query.trim().length > 0;

  const visibleItems = useMemo<readonly OrderableItem[]>(() => {
    const flat: OrderableItem[] = [];
    if (searching) {
      const needle = query.trim().toLowerCase();
      for (const category of categories) {
        for (const section of category.sections) {
          for (const item of section.items) {
            if (item.name.toLowerCase().includes(needle)) flat.push(item);
          }
        }
      }
      return flat;
    }
    const category = categories.find((c) => c.slug === activeCategory) ?? categories[0];
    for (const section of category?.sections ?? []) {
      flat.push(...section.items);
    }
    return flat;
  }, [categories, activeCategory, query, searching]);

  const total = useMemo(
    () => selections.reduce((sum, s) => sum + s.unitPrice * s.qty, 0),
    [selections],
  );

  const lineCount = useMemo(
    () => selections.reduce((sum, s) => sum + s.qty, 0),
    [selections],
  );

  function adjust(item: OrderableItem, variantLabel: string | null, delta: number): void {
    setSelections((current) => {
      const key = selectionKey(item.id, variantLabel);
      const existing = current.find((s) => selectionKey(s.itemId, s.variantLabel) === key);

      if (!existing) {
        if (delta <= 0) return current;
        const unitPrice = variantLabel
          ? (item.variants.find((v) => v.label === variantLabel)?.price ?? null)
          : item.price;
        if (unitPrice === null) return current;
        return [
          ...current,
          { itemId: item.id, name: item.name, variantLabel, unitPrice, qty: delta },
        ];
      }

      const nextQty = existing.qty + delta;
      if (nextQty <= 0) {
        return current.filter((s) => s !== existing);
      }
      return current.map((s) => (s === existing ? { ...s, qty: Math.min(nextQty, 20) } : s));
    });
  }

  const qtyOf = (item: OrderableItem, variantLabel: string | null): number => {
    const found = selections.find(
      (s) => selectionKey(s.itemId, s.variantLabel) === selectionKey(item.id, variantLabel),
    );
    return found?.qty ?? 0;
  };

  const canSubmit =
    status !== "submitting" &&
    selections.length > 0 &&
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    (siteKey.length === 0 || turnstileToken !== null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setErrorMessage(null);

    const lines: readonly PickupOrderDraftLine[] = selections.map((s) => ({
      menu_item_id: s.itemId,
      quantity: s.qty,
      ...(s.variantLabel ? { variant_label: s.variantLabel } : {}),
    }));

    /* Via our API route: the anti-bot token is verified server-side, the
       database still reprices everything, and the pickup time is interpreted
       as restaurant-local (Africa/Kigali) on the server — never the
       browser's zone. */
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          phone: phone.trim(),
          note: note.trim().length > 0 ? note.trim() : null,
          pickup_at: pickupAt || null,
          items: lines,
          turnstileToken,
        }),
      });

      const outcome = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !outcome?.ok) {
        throw new Error(outcome?.error ?? "The order could not be sent.");
      }
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : "The order could not be sent.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneMark} aria-hidden="true">
          ✓
        </p>
        <h2 className={styles.doneTitle}>Order received</h2>
        <p className={styles.doneBody}>
          We have your order and will call or WhatsApp <strong>{phone.trim()}</strong> shortly to
          confirm the time and the total. Payment happens at pickup.
        </p>
        <ul className={styles.doneLines}>
          {selections.map((s) => (
            <li key={selectionKey(s.itemId, s.variantLabel)}>
              {s.qty} × {s.name}
              {s.variantLabel ? ` (${s.variantLabel})` : ""}
              <span className={styles.doneLinePrice}>{rwf(s.unitPrice * s.qty)}</span>
            </li>
          ))}
        </ul>
        <p className={styles.doneTotal}>
          Total <strong>{rwf(total)}</strong> — finalised by us when we confirm.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.grid} onSubmit={(e) => void submit(e)}>
      <section className={styles.picker} aria-label="Choose dishes">
        <div className={styles.pickerControls}>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Search the menu</span>
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. tilapia, ribs, tea"
            />
          </label>
        </div>

        {!searching ? (
          <div className={styles.tabs} role="tablist" aria-label="Menu categories">
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                role="tab"
                aria-selected={category.slug === activeCategory}
                className={styles.tab}
                data-selected={category.slug === activeCategory ? "true" : "false"}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        <ul className={styles.itemList}>
          {visibleItems.map((item) => (
            <ItemRow key={item.id} item={item} qtyOf={qtyOf} onAdjust={adjust} />
          ))}
          {visibleItems.length === 0 ? (
            <li className={styles.empty}>Nothing on the menu matches that search.</li>
          ) : null}
        </ul>
      </section>

      <aside className={styles.summary} aria-label="Your order">
        <h2 className={styles.summaryTitle}>Your order</h2>

        {selections.length === 0 ? (
          <p className={styles.summaryEmpty}>Nothing picked yet — tap ＋ next to a dish.</p>
        ) : (
          <ul className={styles.summaryLines}>
            {selections.map((s) => (
              <li key={selectionKey(s.itemId, s.variantLabel)}>
                <span>
                  {s.qty} × {s.name}
                  {s.variantLabel ? ` (${s.variantLabel})` : ""}
                </span>
                <span className={styles.summaryLinePrice}>{rwf(s.unitPrice * s.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.total} aria-live="polite">
          Total <strong>{rwf(total)}</strong>
          <span className={styles.totalNote}>
            {lineCount} {lineCount === 1 ? "item" : "items"} · final total is confirmed when we
            call
          </span>
        </p>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Your name *</span>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={120}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Phone (we call or WhatsApp to confirm) *</span>
            <input
              className={styles.fieldInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+250 7…"
              required
              maxLength={40}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Pickup time (optional — blank means ASAP)</span>
            <input
              className={styles.fieldInput}
              value={pickupAt}
              onChange={(e) => setPickupAt(e.target.value)}
              type="datetime-local"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Notes (allergies, spice, landmarks)</span>
            <textarea
              className={styles.fieldTextarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>
        </div>

        {status === "error" && errorMessage !== null ? (
          <p className={styles.error} role="alert">
            {errorMessage} You can also order by phone — the number is at the bottom of the page.
          </p>
        ) : null}

        {siteKey ? <Turnstile siteKey={siteKey} onToken={setTurnstileToken} /> : null}

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {status === "submitting" ? "Sending…" : "Send order"}
        </button>
        <p className={styles.finePrint}>
          Nothing is charged online. We confirm every order by phone or WhatsApp; you pay at
          pickup.
        </p>
      </aside>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

type RowProps = Readonly<{
  item: OrderableItem;
  qtyOf: (item: OrderableItem, variantLabel: string | null) => number;
  onAdjust: (item: OrderableItem, variantLabel: string | null, delta: number) => void;
}>;

function ItemRow({ item, qtyOf, onAdjust }: RowProps): React.JSX.Element {
  const hasVariants = item.variants.length > 0;
  const defaultVariant = hasVariants ? (item.variants[0]?.label ?? null) : null;
  const [variantLabel, setVariantLabel] = useState<string | null>(defaultVariant);

  /* No base price and no priced variants: the dish cannot be ordered online. */
  const orderable =
    (hasVariants && item.variants.some((v) => v.price !== null)) || item.price !== null;

  const activeVariant = hasVariants
    ? (item.variants.find((v) => v.label === variantLabel) ?? item.variants[0])
    : null;

  const qty = qtyOf(item, activeVariant?.label ?? null);
  const displayPrice = activeVariant ? activeVariant.price : item.price;

  return (
    <li className={styles.item} data-orderable={orderable ? "true" : "false"}>
      <div className={styles.itemInfo}>
        <p className={styles.itemName}>
          {item.name}
          {item.dietary.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </p>

        {hasVariants ? (
          <label className={styles.variantField}>
            <span className={styles.visuallyHidden}>Size for {item.name}</span>
            <select
              className={styles.variantSelect}
              value={activeVariant?.label ?? ""}
              onChange={(e) => setVariantLabel(e.target.value)}
              disabled={!orderable}
            >
              {item.variants.map((variant) => (
                <option key={variant.label} value={variant.label}>
                  {variant.label}
                  {variant.price !== null ? ` — ${rwf(variant.price)}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <p className={styles.itemPrice}>
          {displayPrice !== null ? rwf(displayPrice) : "Order by phone"}
        </p>
      </div>

      {orderable ? (
        <div className={styles.stepper} aria-label={`Quantity for ${item.name}`}>
          <button
            type="button"
            className={styles.stepButton}
            onClick={() => onAdjust(item, activeVariant?.label ?? null, -1)}
            disabled={qty === 0}
            aria-label={`Remove one ${item.name}`}
          >
            −
          </button>
          <span className={styles.stepValue} aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            className={styles.stepButton}
            onClick={() => onAdjust(item, activeVariant?.label ?? null, 1)}
            disabled={qty >= 20}
            aria-label={`Add one ${item.name}`}
          >
            ＋
          </button>
        </div>
      ) : null}
    </li>
  );
}
