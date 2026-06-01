import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { StationWithDistance } from "@servo-map/shared";
import { getStations } from "@/lib/api";
import { SuburbPageClient } from "./client";

// ISR: regenerate at most every 15 minutes, generate unknown suburbs on demand.
export const revalidate = 900;
export const dynamicParams = true;

interface Props {
  params: Promise<{ state: string; suburb: string }>;
}

function toTitleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Suburb slug (kebab) → comparable form, e.g. "umina-beach" → "umina beach" */
function slugToSuburb(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** Suburbs are generated on demand via ISR — none are prebuilt at build time. */
export function generateStaticParams() {
  return [];
}

/** Fetch the stations in one suburb. Returns [] on API failure or no match. */
async function loadSuburbStations(
  state: string,
  suburb: string,
): Promise<StationWithDistance[]> {
  try {
    const { data } = await getStations({
      state,
      suburb: slugToSuburb(suburb),
      limit: 500,
    });
    // The API does a substring match; narrow to the exact suburb slug.
    return data.filter(
      (s) =>
        s.state === state &&
        s.suburb.toLowerCase().replace(/\s+/g, "-") === suburb.toLowerCase(),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, suburb } = await params;
  const suburbName = toTitleCase(suburb);
  const stateUpper = state.toUpperCase();

  return {
    title: `Cheapest Fuel in ${suburbName} ${stateUpper} — ServoMap`,
    description: `Compare petrol and diesel prices at all stations in ${suburbName}, ${stateUpper}. Find the cheapest U91, U95, U98, E10 and Diesel near you.`,
    alternates: { canonical: `/fuel/${state}/${suburb}` },
    openGraph: {
      title: `Cheapest Fuel in ${suburbName} ${stateUpper}`,
      description: `Compare fuel prices at all ${suburbName} stations.`,
    },
  };
}

export default async function SuburbPage({ params }: Props) {
  const { state, suburb } = await params;
  const suburbName = toTitleCase(suburb);

  const stations = await loadSuburbStations(state, suburb);
  if (stations.length === 0) notFound();

  // Cheapest U91 across the suburb — null if no station sells U91.
  const u91Prices = stations
    .flatMap((s) => s.prices)
    .filter((p) => p.fuel === "U91")
    .map((p) => p.price);
  const cheapestU91 = u91Prices.length ? Math.min(...u91Prices) : null;

  // JSON-LD: ItemList of GasStations, each with current fuel offers.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Fuel Stations in ${suburbName}, ${state.toUpperCase()}`,
    itemListElement: stations.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "GasStation",
        name: s.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: s.address,
          addressLocality: s.suburb,
          addressRegion: s.state.toUpperCase(),
          postalCode: s.postcode,
          addressCountry: "AU",
        },
        makesOffer: s.prices.map((p) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Product", name: `${p.fuel} fuel` },
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: (p.price / 100).toFixed(3),
            priceCurrency: "AUD",
            unitCode: "LTR",
          },
        })),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SuburbPageClient
        suburbName={suburbName}
        stateName={state.toUpperCase()}
        stations={stations}
        cheapestU91={cheapestU91}
      />
    </>
  );
}
