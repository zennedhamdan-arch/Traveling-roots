import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MenuCategoryRow, MenuItemRow, MenuSectionRow } from "@/lib/supabase/types";
import MenuEditor from "./MenuEditor";

export default async function AdminMenuPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [categories, sections, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .order("sort_order")
      .returns<MenuCategoryRow[]>(),
    supabase.from("menu_sections").select("*").order("sort_order").returns<MenuSectionRow[]>(),
    supabase.from("menu_items").select("*").order("sort_order").returns<MenuItemRow[]>(),
  ]);

  return (
    <>
      <h1 className="admin-title">Menu</h1>
      <p className="admin-muted admin-lede">
        Prices are in Rwandan francs, whole numbers only. Turning an item off
        hides it from the website immediately without deleting it — use that
        when the kitchen runs out.
      </p>
      <MenuEditor
        categories={categories.data ?? []}
        sections={sections.data ?? []}
        items={items.data ?? []}
      />
    </>
  );
}
