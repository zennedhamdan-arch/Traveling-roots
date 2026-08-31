"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BusinessInfoRow, SocialLinkRow } from "@/lib/supabase/types";
import type { OpeningHourRow } from "@/lib/supabase/types";

/**
 * Business settings.
 *
 * Three blocks, one page: the details (name, phone, WhatsApp, email, address,
 * directions link), opening hours, and the social links shown in the footer
 * and contact areas.
 *
 * Empty means "keep the default": the public site falls back field-by-field to
 * the verified values in data/restaurant.ts, so clearing a field here can
 * never blank the phone number off the internet.
 */

type Props = Readonly<{
  initialInfo: BusinessInfoRow | null;
  initialSocials: readonly SocialLinkRow[];
}>;

export default function BusinessSettingsManager({
  initialInfo,
  initialSocials,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: initialInfo?.name ?? "",
    phone: initialInfo?.phone ?? "",
    whatsapp: initialInfo?.whatsapp ?? "",
    email: initialInfo?.email ?? "",
    street: initialInfo?.street ?? "",
    city: initialInfo?.city ?? "",
    directions_url: initialInfo?.directions_url ?? "",
  });

  const [hours, setHours] = useState<OpeningHourRow[]>(
    initialInfo?.opening_hours?.length ? initialInfo.opening_hours : [],
  );

  const [socials, setSocials] = useState<readonly SocialLinkRow[]>(initialSocials);
  const [newSocial, setNewSocial] = useState({ platform: "", label: "", url: "" });

  const set = (key: keyof typeof form, value: string): void =>
    setForm((current) => ({ ...current, [key]: value }));

  async function saveInfo(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const clean = (value: string): string | null => (value.trim().length > 0 ? value.trim() : null);
      const { error: updateError } = await supabase
        .from("business_info")
        .update({
          name: clean(form.name) ?? undefined,
          phone: clean(form.phone),
          whatsapp: clean(form.whatsapp),
          email: clean(form.email),
          street: clean(form.street),
          city: clean(form.city),
          directions_url: clean(form.directions_url),
          opening_hours: hours,
        })
        .eq("id", 1);
      if (updateError) throw updateError;
      setStatus("Business info saved — the site picks it up within a minute.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addSocial(): Promise<void> {
    if (newSocial.url.trim().length === 0 || newSocial.label.trim().length === 0) {
      setError("A social link needs at least a label and a URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nextSort = socials.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
      const { data: inserted, error: insertError } = await supabase
        .from("social_links")
        .insert({
          platform: newSocial.platform.trim() || newSocial.label.trim(),
          label: newSocial.label.trim(),
          url: newSocial.url.trim(),
          active: true,
          sort_order: nextSort,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setSocials((current) => [...current, inserted]);
      setNewSocial({ platform: "", label: "", url: "" });
      setStatus("Social link added.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Adding failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSocial(id: string, patch: Partial<SocialLinkRow>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("social_links")
        .update(patch)
        .eq("id", id);
      if (updateError) throw updateError;
      setSocials((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
      setStatus("Social link saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSocial(row: SocialLinkRow): Promise<void> {
    if (!window.confirm(`Remove the ${row.label} link?`)) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase.from("social_links").delete().eq("id", row.id);
      if (deleteError) throw deleteError;
      setSocials((current) => current.filter((item) => item.id !== row.id));
      setStatus("Social link removed.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Removing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="admin-success" role="status">
          {status}
        </p>
      ) : null}

      <div className="admin-card">
        <h2 className="admin-card-title">Details</h2>
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Restaurant name</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Phone (E.164, e.g. +250794317286)</span>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
          </label>
          <label className="admin-field">
            <span className="admin-label">WhatsApp number (E.164)</span>
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              inputMode="tel"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Street</span>
            <input value={form.street} onChange={(e) => set("street", e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-label">City</span>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Google Maps directions URL</span>
            <input
              value={form.directions_url}
              onChange={(e) => set("directions_url", e.target.value)}
              placeholder="https://www.google.com/maps/dir/…"
            />
          </label>
        </div>
        <div className="admin-row">
          <button type="button" className="admin-button" disabled={busy} onClick={() => void saveInfo()}>
            Save details
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Opening hours</h2>
        <p className="admin-muted">
          Shown in the location section and the footer. Times are 24-hour, e.g.
          12:00 and 22:00. Leave empty to use the site&apos;s verified default
          (Monday – Sunday, 12:00–22:00).
        </p>
        {hours.map((row, index) => (
          <div className="admin-hours-row" key={index}>
            <label className="admin-field">
              <span className="admin-label">Days</span>
              <input
                value={row.day}
                onChange={(e) =>
                  setHours((current) =>
                    current.map((h, i) => (i === index ? { ...h, days: e.target.value } : h)),
                  )
                }
                placeholder="Monday – Sunday"
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">Opens</span>
              <input
                value={row.opens}
                onChange={(e) =>
                  setHours((current) =>
                    current.map((h, i) => (i === index ? { ...h, opens: e.target.value } : h)),
                  )
                }
                placeholder="12:00"
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">Closes</span>
              <input
                value={row.closes}
                onChange={(e) =>
                  setHours((current) =>
                    current.map((h, i) => (i === index ? { ...h, closes: e.target.value } : h)),
                  )
                }
                placeholder="22:00"
              />
            </label>
            <button
              type="button"
              className="admin-button admin-button-danger"
              onClick={() => setHours((current) => current.filter((_, i) => i !== index))}
              aria-label={`Remove ${row.day} hours`}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="admin-row">
          <button
            type="button"
            className="admin-button admin-button-quiet"
            onClick={() => setHours((current) => [...current, { day: "", opens: "", closes: "" }])}
          >
            + Add a row
          </button>
          <button type="button" className="admin-button" disabled={busy} onClick={() => void saveInfo()}>
            Save hours
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Social links</h2>
        <p className="admin-muted">
          Shown in the footer and contact areas. With none set, the site shows
          its verified Instagram and Facebook links.
        </p>

        {socials.length === 0 ? (
          <p className="admin-muted">None configured — the verified defaults are in use.</p>
        ) : (
          <ul className="admin-list">
            {socials.map((row) => (
              <li key={row.id} className="admin-list-item">
                <div className="admin-list-item-row">
                  <div className="admin-list-body">
                    <div className="admin-item-grid">
                      <label className="admin-field">
                        <span className="admin-label">Label</span>
                        <input
                          value={row.label}
                          onChange={(e) =>
                            setSocials((current) =>
                              current.map((s) =>
                                s.id === row.id ? { ...s, label: e.target.value } : s,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="admin-field admin-field-wide">
                        <span className="admin-label">URL</span>
                        <input
                          value={row.url}
                          onChange={(e) =>
                            setSocials((current) =>
                              current.map((s) =>
                                s.id === row.id ? { ...s, url: e.target.value } : s,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="admin-row">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busy}
                        onClick={() =>
                          void saveSocial(row.id, {
                            label: row.label.trim(),
                            url: row.url.trim(),
                          })
                        }
                      >
                        Save
                      </button>
                      <label className="admin-check admin-check-inline">
                        <input
                          type="checkbox"
                          checked={row.active}
                          disabled={busy}
                          onChange={(e) => void saveSocial(row.id, { active: e.target.checked })}
                        />
                        Shown
                      </label>
                      <div className="admin-row-gap">
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          disabled={busy}
                          onClick={() => void removeSocial(row)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Platform (e.g. Instagram)</span>
            <input
              value={newSocial.platform}
              onChange={(e) => setNewSocial((c) => ({ ...c, platform: e.target.value }))}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Label *</span>
            <input
              value={newSocial.label}
              onChange={(e) => setNewSocial((c) => ({ ...c, label: e.target.value }))}
              placeholder="Instagram"
            />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">URL *</span>
            <input
              value={newSocial.url}
              onChange={(e) => setNewSocial((c) => ({ ...c, url: e.target.value }))}
              placeholder="https://www.instagram.com/…"
            />
          </label>
        </div>
        <div className="admin-row">
          <button type="button" className="admin-button" disabled={busy} onClick={() => void addSocial()}>
            Add social link
          </button>
        </div>
      </div>
    </div>
  );
}
