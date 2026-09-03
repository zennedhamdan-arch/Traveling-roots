import { addressLine, restaurant } from "@/data/restaurant";
import { seo } from "@/data/site";
import { serializeJsonLd } from "@/lib/jsonld";

/**
 * schema.org Restaurant data.
 *
 * Only verified fields are emitted. Anything unknown (menu URL, geo
 * coordinates, ratings) is left out entirely rather than guessed — bad
 * structured data is worse than none.
 */
export default function StructuredData(): React.JSX.Element {
  const openingHours = restaurant.hours.map((row) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: row.schemaDays,
    opens: row.opens,
    closes: row.closes,
  }));

  const sameAs = restaurant.socials.map((s) => s.href);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.legalName,
    alternateName: restaurant.name,
    description: seo.description,
    address: {
      "@type": "PostalAddress",
      ...(restaurant.streetAddress ? { streetAddress: restaurant.streetAddress } : {}),
      addressLocality: restaurant.city,
      addressCountry: "RW",
    },
    servesCuisine: [...restaurant.cuisine],
    priceRange: restaurant.priceRange,
    openingHoursSpecification: openingHours,
  };

  if (restaurant.phone) data.telephone = restaurant.phone.e164;
  if (restaurant.email) data.email = restaurant.email;
  if (restaurant.website) data.url = restaurant.website;
  if (restaurant.directionsUrl) data.hasMap = restaurant.directionsUrl;
  if (sameAs.length > 0) data.sameAs = sameAs;

  return (
    <script
      type="application/ld+json"
      // Serialized safely for an HTML script context (see lib/jsonld.ts):
      // <, > and & become short-form Unicode escapes — identical JSON, inert
      // in HTML, so no value can ever terminate the script element.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export { addressLine };
