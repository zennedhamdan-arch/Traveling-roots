import dynamic from "next/dynamic";

import { SECTION_IDS } from "@/data/site";
import StorySection from "@/components/StorySection";
import Experiences from "@/components/Experiences";
import Menu from "@/components/Menu";
import ReservationCTA from "@/components/ReservationCTA";
import Footer from "@/components/Footer";

/**
 * The cinematic sequence is the only part of the page that needs the browser
 * (canvas, GSAP, ScrollTrigger, window). Everything below it is server
 * rendered, so the story, menu, contact details and calls to action are in
 * the initial HTML — available to search engines, and readable even if the
 * animation never loads.
 */
const CinematicSequence = dynamic(() => import("@/components/CinematicSequence"));

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <span id={SECTION_IDS.hero} />
      <main id="main">
        <CinematicSequence />
        <StorySection />
        <Experiences />
        <Menu />
        <ReservationCTA />
      </main>
      <Footer />
    </>
  );
}
