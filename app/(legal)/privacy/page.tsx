import LegalPage, { legalMetadata } from "../LegalPage";
import { restaurant, telHref } from "@/data/restaurant";

export const metadata = legalMetadata(
  "Privacy",
  `How ${restaurant.name} handles information on this website.`,
);

/**
 * Describes what this website actually does — no analytics, no cookies, no
 * forms, no tracking. Nothing here is boilerplate copied from elsewhere.
 */
export default function Privacy(): React.JSX.Element {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <p>
        This website is a simple, static site. It does not ask you for any
        personal information and it does not try to identify you.
      </p>

      <h2>What we collect</h2>
      <p>
        Nothing. There are no contact forms, no accounts, no newsletter
        sign-ups and no payment processing on this site.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        This site sets no cookies and runs no analytics or advertising
        trackers. Your browser may cache images and fonts to make return
        visits faster — that data stays on your device.
      </p>

      <h2>Links to other services</h2>
      <p>
        Some buttons take you to services we don&apos;t control — WhatsApp,
        Google Maps and our social pages. Once you follow one of those links,
        that company&apos;s own privacy policy applies.
      </p>

      <h2>Hosting</h2>
      <p>
        Like almost all websites, our host records standard server logs (such
        as IP address, browser type and the page requested) to serve pages and
        keep the site secure.
      </p>

      <h2>Questions</h2>
      <p>
        Contact {restaurant.legalName} in {restaurant.city},{" "}
        {restaurant.country}
        {restaurant.phone && telHref ? (
          <>
            {" "}
            on <a href={telHref}>{restaurant.phone.display}</a>
          </>
        ) : null}
        {restaurant.email ? (
          <>
            {" "}
            or by email at{" "}
            <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
          </>
        ) : null}
        .
      </p>
    </LegalPage>
  );
}
