import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_STATIONS } from "@/lib/mock-data";
import { SuburbPageClient } from "./client";

interface Props {
  params: Promise<{ state: string; suburb: string }>;
}

function toTitleCase(s: string): string {
  return s
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, suburb } = await params;
  const suburbName = toTitleCase(suburb);
  const stateUpper = state.toUpperCase();

  return {
    title: `Cheapest Fuel in ${suburbName} ${stateUpper} — ServoMap`,
    description: `Compare petrol and diesel prices at all stations in ${suburbName}, ${stateUpper}. Find the cheapest U91, U95, U98, E10 and Diesel near you.`,
    openGraph: {
      title: `Cheapest Fuel in ${suburbName} ${stateUpper}`,
      description: `Compare fuel prices at all ${suburbName} stations.`,
    },
  };
}

export default async function SuburbPage({ params }: Props) {
  const { state, suburb } = await params;
  const suburbName = toTitleCase(suburb);

  // TODO: 替换为真实 API，按 state + suburb 过滤
  const stations = MOCK_STATIONS.filter(
    (s) =>
      s.state === state &&
      s.suburb.toLowerCase().replace(/\s/g, "-") === suburb.toLowerCase(),
  );

  if (stations.length === 0) notFound();

  // 找到最便宜的 U91 价格
  const cheapestU91 = Math.min(
    ...stations
      .flatMap((s) => s.prices)
      .filter((p) => p.fuel === "U91")
      .map((p) => p.price),
  );

  // JSON-LD
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
