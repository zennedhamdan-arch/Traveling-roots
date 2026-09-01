import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BusinessInfoRow, SiteSettingsRow, SocialLinkRow } from "@/lib/supabase/types";
import BusinessSettingsManager from "./BusinessSettingsManager";

export default async function BusinessPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [info, socials, settings] = await Promise.all([
    supabase.from("business_info").select("*").eq("id", 1).maybeSingle().returns<BusinessInfoRow>(),
    supabase.from("social_links").select("*").order("sort_order").returns<SocialLinkRow[]>(),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().returns<SiteSettingsRow>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Business info</h1>
      <p className="admin-muted admin-lede">
        These values feed the public site — the contact section, the footer, the
        location panel and every Call / WhatsApp button. Each field overrides the
        verified defaults built into the site; leave a field empty to keep the
        default. Changes appear on the site within about a minute.
      </p>
      <BusinessSettingsManager
        initialInfo={info.data ?? null}
        initialSocials={socials.data ?? []}
        initialSettings={settings.data ?? null}
      />
    </>
  );
}
