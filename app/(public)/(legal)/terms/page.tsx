import LegalPage, { legalMetadata } from "../LegalPage";
import { restaurant, telHref } from "@/data/restaurant";

export const metadata = legalMetadata(
  "Terms",
  `Terms of use for the ${restaurant.name} website.`,
);

export default function Terms(): React.JSX.Element {
  return (
    <LegalPage title="Terms" updated="August 2026">
      <p>
        These terms cover your use of this website. They do not create a
        booking, an order or any other contract with{" "}
        {restaurant.legalName}.
      </p>

      <h2>Menu and availability</h2>
      <p>
        Dishes, ingredients and prices shown here are for information and can
        change without notice. Availability depends on the day and on what the
        garden and our suppliers can provide. Please confirm with us when you
        order.
      </p>

      <h2>Reservations</h2>
      <p>
        This site does not take bookings. Reservations are arranged directly
        with us
        {restaurant.phone && telHref ? (
          <>
            {" "}
            by phone on <a href={telHref}>{restaurant.phone.display}</a>
          </>
        ) : null}
        {restaurant.whatsapp ? (
          <>
            {" "}
            or on{" "}
            <a
              href={restaurant.whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </>
        ) : null}
        . A reservation is only confirmed once we have confirmed it to you.
      </p>

      <h2>Allergies and dietary needs</h2>
      <p>
        Dietary labels on this site are a guide. Our kitchen handles many
        ingredients, so if you have an allergy or intolerance, please tell us
        directly when you order so we can advise you properly.
      </p>

      <h2>Content</h2>
      <p>
        The text, photography and design on this site belong to{" "}
        {restaurant.legalName} unless stated otherwise. Please ask before
        reusing them.
      </p>

      <h2>External links</h2>
      <p>
        We link to third-party services such as WhatsApp and Google Maps for
        your convenience. We are not responsible for their content or
        availability.
      </p>
    </LegalPage>
  );
}
