"use client";

import { useEffect } from "react";

/**
 * Smooth in-page anchor scrolling — deliberately as an interceptor, not as
 * CSS `scroll-behavior: smooth` on <html>.
 *
 * Why: the homepage pins sections with GSAP ScrollTrigger, which measures
 * pin spacing by scrolling the page during load and on resize. With global
 * smooth scrolling, those internal measurement scrolls are *animated* too —
 * the page visibly flies to ~300vh on load, especially on mobile. Scroll
 * behavior that only the user initiates should be smooth; programmatic
 * scrolls should be instant. CSS cannot tell them apart; this can.
 *
 * Accessibility parity with native anchors: unmodified clicks only, focus
 * moves to the target, the URL keeps its hash, and prefers-reduced-motion
 * falls back to an instant jump.
 */
export default function SmoothAnchors(): null {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onClick(event: MouseEvent): void {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.(
        "a[href^='#']",
      );
      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      // "#" alone is a placeholder, never a destination — leave it alone.
      if (!hash || hash === "#") return;

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start",
      });
      // Move focus with the viewport, as a native anchor jump would.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      // Keep the URL shareable without triggering a second (instant) jump.
      history.pushState(null, "", hash);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
