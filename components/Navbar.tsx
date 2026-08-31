"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { SECTION_IDS, navLinks } from "@/data/site";
import { reserveAction } from "@/lib/actions";
import BrandMark from "./BrandMark";
import ButtonLink from "./Button";
import styles from "./Navbar.module.css";

/** Scroll distance (px) after which the bar leaves its transparent state. */
const SOLID_AFTER = 120;

export default function Navbar(): React.JSX.Element {
  const [isSolid, setIsSolid] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /* Transparent over the cinematic sequence, solid once past it. Passive
     listener + rAF coalescing so this never competes with the scrub. */
  useEffect(() => {
    let ticking = false;

    const onScroll = (): void => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setIsSolid(window.scrollY > SOLID_AFTER);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  /* Escape closes the mobile panel and returns focus to the toggle. */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close();
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Lock the page behind the panel without breaking native scrolling
    // anywhere else on the site.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  return (
    <header
      className={styles.header}
      data-solid={isSolid ? "true" : "false"}
      data-open={isOpen ? "true" : "false"}
    >
      <nav className={styles.bar} aria-label="Primary">
        <a href={`#${SECTION_IDS.hero}`} className={styles.brand} onClick={close}>
          <BrandMark size="nav" />
          <span className="visuallyHidden">Traveling Roots — back to top</span>
        </a>

        {/* --- desktop --- */}
        <ul className={styles.links}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.link}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          {reserveAction ? (
            <ButtonLink
              href={reserveAction.href}
              variant="secondary"
              size="md"
              className={styles.reserve}
              {...(reserveAction.hint ? { "aria-label": reserveAction.hint } : {})}
            >
              Reserve
            </ButtonLink>
          ) : null}

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className={styles.toggleBars} aria-hidden="true">
              <span />
              <span />
            </span>
            <span className={styles.toggleLabel}>{isOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </nav>

      {/* --- mobile panel --- */}
      <div id={panelId} className={styles.panel} hidden={!isOpen}>
        <ul className={styles.panelLinks}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.panelLink} onClick={close}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        {reserveAction ? (
          <ButtonLink
            href={reserveAction.href}
            variant="primary"
            size="lg"
            className={styles.panelCta}
            onClick={close}
            {...(reserveAction.hint ? { "aria-label": reserveAction.hint } : {})}
          >
            {reserveAction.label}
          </ButtonLink>
        ) : null}
      </div>
    </header>
  );
}
