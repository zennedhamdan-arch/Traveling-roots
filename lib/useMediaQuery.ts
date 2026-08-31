"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/** `useLayoutEffect` on the client, `useEffect` on the server — no SSR warning. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Subscribes to a media query. SSR-safe: returns `false` until mounted, then
 * settles synchronously on the client before paint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const list = window.matchMedia(query);
    const update = (): void => setMatches(list.matches);

    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export type MotionMode = "pending" | "full" | "reduced";

/**
 * Resolves the visitor's motion preference *before the first browser paint*.
 *
 * Starts as "pending" so the server and the first client render agree, then
 * settles in a layout effect — so a reduced-motion visitor never sees a flash
 * of the animated treatment.
 */
export function useMotionMode(): MotionMode {
  const [mode, setMode] = useState<MotionMode>("pending");

  useIsomorphicLayoutEffect(() => {
    const list = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setMode(list.matches ? "reduced" : "full");

    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);

  return mode;
}

/** True when the visitor has asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
