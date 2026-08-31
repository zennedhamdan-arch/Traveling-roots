import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TestimonialRow } from "@/lib/supabase/types";
import TestimonialManager from "./TestimonialManager";

export default async function TestimonialsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<TestimonialRow[]>();

  return (
    <>
      <h1 className="admin-title">Testimonials</h1>
      <p className="admin-muted admin-lede">
        Guest quotes. Only publish quotes from real guests — name, what they
        said, and optionally where they said it and a rating out of 5.
      </p>
      <TestimonialManager initial={data ?? []} />
    </>
  );
}
