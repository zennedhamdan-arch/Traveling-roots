import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExperienceRow } from "@/lib/supabase/types";
import ExperienceManager from "./ExperienceManager";

export default async function ExperiencesPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("experiences")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ExperienceRow[]>();

  return (
    <>
      <h1 className="admin-title">Experiences</h1>
      <p className="admin-muted admin-lede">
        The cards shown in the “More than a meal” section — garden dining, theme
        nights, and whatever else the restaurant actually offers. Photos are
        optional; duration and price appear only when you set them.
      </p>
      <ExperienceManager initial={data ?? []} />
    </>
  );
}
