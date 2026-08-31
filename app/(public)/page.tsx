import dynamic from "next/dynamic";

import { SECTION_IDS } from "@/data/site";
import { getHeroVideo, getMenu, getExperiences } from "@/lib/content";
import { formatPrice } from "@/lib/content";
import HeroVideo from "@/components/HeroVideo";
import StorySection from "@/components/StorySection";
import Experiences, { type ExperienceItem } from "@/components/Experiences";
import Menu from "@/components/Menu";
import Gallery from "@/components/Gallery";
import ReservationCTA from "@/components/ReservationCTA";
import LocationSection from "@/components/LocationSection";
import Footer from "@/components/Footer";

/**
 * The frame sequence is now the FALLBACK hero, not the primary one.
 *
 * It is still loaded lazily and still client-only (canvas, GSAP, window).
 * Everything below the hero is server rendered, so the story, menu, contact
 * details and calls to action are in the initial HTML — available to search
 * engines, and readable even if no hero media loads at all.
 */
const CinematicSequence = dynamic(() => import("@/components/CinematicSequence"));

/**
 * The homepage is a Server Component so the menu and hero come from the
 * database without shipping a query to the browser.
 *
 * Which hero renders is a content decision, made by the owner in the admin
 * dashboard rather than in code:
 *
 *   an active hero_media row with a video  ->  <HeroVideo>
 *   otherwise                              ->  the 29-frame sequence
 *
 * Keeping the sequence as the fallback is deliberate. It means uploading a
 * video is reversible, an upload that fails leaves a working hero rather than
 * a black rectangle, and the site still works with no Supabase at all.
 */
/**
 * Revalidate the cached homepage every 60 seconds.
 *
 * Content loads through the cookie-less public client, so this page stays
 * statically rendered and is served from the CDN. An edit in the dashboard
 * appears within a minute — the right trade for a restaurant site, where
 * every guest getting instant HTML matters more than a price change being
 * visible in the same second.
 */
export const revalidate = 60;

export default async function HomePage(): Promise<React.JSX.Element> {
  const [heroVideo, menu, experienceRows] = await Promise.all([
    getHeroVideo(),
    getMenu(),
    getExperiences(),
  ]);

  /* Database rows when they exist; the component falls back to the verified
     static set when the table is empty or Supabase is not configured. */
  const experiences: readonly ExperienceItem[] = experienceRows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.description ?? "",
    ...(row.image_url ? { image: row.image_url } : {}),
    ...(row.duration ? { duration: row.duration } : {}),
    ...(row.price !== null ? { price: formatPrice(row.price) } : {}),
  }));

  return (
    <>
      <span id={SECTION_IDS.hero} />
      <main id="main">
        {heroVideo ? (
          <section id={SECTION_IDS.cinematic} aria-label="Traveling Roots">
            <HeroVideo content={heroVideo} scrollTargetId={SECTION_IDS.story} />
          </section>
        ) : (
          <CinematicSequence />
        )}
        <StorySection />
        <Experiences items={experiences} />
        <Menu categories={menu} />
        <Gallery />
        <ReservationCTA />
        <LocationSection />
      </main>
      <Footer />
    </>
  );
}
