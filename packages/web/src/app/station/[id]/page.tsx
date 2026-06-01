import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Station } from "@servo-map/shared";
import { getStation } from "@/lib/api";
import { StationPageClient } from "./client";

// ISR: regenerate at most every 15 minutes, generate unknown stations on demand.
export const revalidate = 900;
export const dynamicParams = true;

interface Props {
  params: Promise<{ id: string }>;
}

/** Stations are generated on demand via ISR — none are prebuilt at build time. */
export function generateStaticParams() {
  return [];
}

/** Fetch a single station. Returns null on 404 / API failure. */
async function loadStation(id: string): Promise<Station | null> {
  try {
    const { data } = await getStation(id);
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = await loadStation(id);
  if (!station) return { title: "Station Not Found — ServoMap" };

  return {
    title: `${station.name} Fuel Prices — ServoMap`,
    description: `Live fuel prices at ${station.name}, ${station.suburb} ${station.state.toUpperCase()}. Compare petrol and diesel prices.`,
    alternates: { canonical: `/station/${id}` },
    openGraph: {
      title: `${station.name} — ServoMap`,
      description: `Live fuel prices at ${station.name}, ${station.suburb}.`,
    },
  };
}

export default async function StationPage({ params }: Props) {
  const { id } = await params;
  const station = await loadStation(id);
  if (!station) notFound();

  // JSON-LD: GasStation with geo + current fuel offers (price per litre, AUD).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GasStation",
    name: station.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: station.address,
      addressLocality: station.suburb,
      addressRegion: station.state.toUpperCase(),
      postalCode: station.postcode,
      addressCountry: "AU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: station.lat,
      longitude: station.lng,
    },
    makesOffer: station.prices.map((p) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: `${p.fuel} fuel` },
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: (p.price / 100).toFixed(3),
        priceCurrency: "AUD",
        unitCode: "LTR",
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StationPageClient station={station} />
    </>
  );
}
