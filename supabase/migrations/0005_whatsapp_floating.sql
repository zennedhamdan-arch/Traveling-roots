-- =============================================================================
-- 0005 — Floating WhatsApp button settings
--
-- The public site shows a persistent floating WhatsApp button (bottom-right)
-- on every public page. Two things about it are content, not code:
-- whether it is shown, and the message that pre-fills the chat.
--
-- Both live in site_settings, which is already world-readable (so the public
-- site can read them through the anon key) and admin-only writable. The
-- WhatsApp NUMBER itself is not stored here — it lives in business_info
-- (Business → Business info in the dashboard), which the button reads through
-- the same loader the rest of the site uses.
--
-- Defaults preserve today's behaviour: enabled, with the restaurant's
-- standard greeting.
-- =============================================================================

alter table public.site_settings
  add column if not exists whatsapp_floating_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists whatsapp_default_message text;

comment on column public.site_settings.whatsapp_floating_enabled is
  'When false, the public site renders no floating WhatsApp button.';
comment on column public.site_settings.whatsapp_default_message is
  'Text pre-filled into the WhatsApp chat when a guest taps the floating button. NULL keeps the built-in default greeting.';

-- Grants are table-level in 0002 (grant select on site_settings to anon),
-- so the new columns are already readable by the public and writable by
-- admins — nothing further to grant. Stated here because column-level grants
-- elsewhere in this schema make that worth confirming, not assuming.
