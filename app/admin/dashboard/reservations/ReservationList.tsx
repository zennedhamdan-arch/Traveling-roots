"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReservationRequestRow, ReservationStatus } from "@/lib/supabase/types";
import { formatRestaurantDateTime } from "@/lib/time";

const STATUSES: readonly ReservationStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "declined",
  "archived",
];

export default function ReservationList({
  initial,
}: Readonly<{ initial: readonly ReservationRequestRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [filter, setFilter] = useState<ReservationStatus | "all">("new");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible =
    filter === "all" ? initial : initial.filter((row) => row.status === filter);

  async function setStatus(id: string, status: ReservationStatus): Promise<void> {
    setBusyId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("reservation_requests").update({ status }).eq("id", id);
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
                  <strong>{row.name}</strong>
                  <span>
                    {row.party_size} {row.party_size === 1 ? "guest" : "guests"}
                  </span>
                  <span>
                    {/* Restaurant-local by design: staff read the same
                        wall-clock the guest picked, wherever this browser is. */}
                    {formatRestaurantDateTime(row.preferred_at)}
                  </span>
                </p>

                <p className="admin-muted">
                  {/* Tappable on a phone: the whole point is to call them back. */}
                  <a className="admin-inline-link" href={`tel:${row.phone}`}>
                    {row.phone}
                  </a>
                  {row.email ? (
                    <>
                      {" · "}
                      <a className="admin-inline-link" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                    </>
                  ) : null}
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

                {row.notes ? <p className="admin-quote">{row.notes}</p> : null}

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
