import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAdminUser } from "@/lib/supabase/server";

/** /admin is just a doorway: signed in goes to the dashboard, otherwise login. */
export default async function AdminIndexPage(): Promise<never> {
  if (!isSupabaseConfigured) redirect("/admin/unavailable");
  const session = await getAdminUser();
  redirect(session ? "/admin/dashboard" : "/admin/login");
}
