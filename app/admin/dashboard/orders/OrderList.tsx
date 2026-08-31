"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PickupOrderRow, PickupOrderStatus } from "@/lib/supabase/types";

const STATUSES: readonly PickupOrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const rwf = (amount: number): string => `${amount.toLocaleString("en-US")} RWF`;

export default function OrderList({
  initial,
}: Readonly<{ initial: readonly PickupOrderRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [filter, setFilter] = useState<PickupOrderStatus | "all">("new");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible =
    filter === "all" ? initial : initial.filter((row) => row.status === filter);

  async function setStatus(id: string, status: PickupOrderStatus): Promise<void> {
    setBusyId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("pickup_orders").update({ status }).eq("id", id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-stack">
      <div className="admin-tabs" role="tablist" aria-label="Filter by status">
        {(["all", ...STATUSES] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className="admin-tab"
            data-selected={filter === value ? "true" : "false"}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="admin-muted">Nothing here.</p>
      ) : (
        <ul className="admin-list">
          {visible.map((row) => (
            <li key={row.id} className="admin-list-item">
              <div className="admin-list-body">
                <p className="admin-list-meta">
                  <span className="admin-badge">{row.status}</span>
                  <strong>{row.customer_name}</strong>
                  <span>
                    {row.pickup_at === null
                      ? "ASAP"
                      : `pickup ${new Date(row.pickup_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}`}
                  </span>
                </p>

                <p className="admin-muted">
                  {/* Tappable on a phone: the whole point is to confirm by call. */}
                  <a className="admin-inline-link" href={`tel:${row.phone}`}>
                    {row.phone}
                  </a>
                  {" · "}
                  <a
                    className="admin-inline-link"
                    href={`https://wa.me/${row.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </p>

                <ul className="admin-order-lines">
                  {row.items.map((line, index) => (
                    <li key={`${line.menu_item_id}-${line.variant_label ?? ""}-${index}`}>
                      {line.quantity} × {line.name}
                      {line.variant_label ? ` (${line.variant_label})` : ""}
                      <span className="admin-order-line-price">
                        {rwf(line.unit_price * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="admin-order-total">
                  Total <strong>{rwf(row.total)}</strong>
                  <span className="admin-muted">
                    {" "}
                    · placed{" "}
                    {new Date(row.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>

                {row.note ? <p className="admin-quote">{row.note}</p> : null}
                {row.admin_notes ? (
                  <p className="admin-muted">Staff note: {row.admin_notes}</p>
                ) : null}

                <div className="admin-row">
                  {STATUSES.filter((s) => s !== row.status).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="admin-button admin-button-quiet"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
