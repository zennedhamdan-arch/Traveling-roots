import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HeroMediaRow, SiteSettingsRow } from "@/lib/supabase/types";
import HeroManager from "./HeroManager";

export default async function HeroPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [media, settings] = await Promise.all([
    supabase
      .from("hero_media")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<HeroMediaRow[]>(),
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle<SiteSettingsRow>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Hero video</h1>
      <p className="admin-muted admin-lede">
        The video at the top of the homepage. Uploading a new one does not
        publish it — you choose which is live, and you can switch back at any
        time. With no active video the homepage falls back to the image
        sequence.
      </p>

      <HeroManager
        initialMedia={media.data ?? []}
        heroVideoEnabled={settings.data?.hero_video_enabled ?? true}
      />
    </>
  );
}
