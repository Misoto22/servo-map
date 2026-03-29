import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_STATIONS } from "@/lib/mock-data";
import { StationPageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // TODO: 替换为真实 API
  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) return { title: "Station Not Found — ServoMap" };

  return {
    title: `${station.name} Fuel Prices — ServoMap`,
    description: `Live fuel prices at ${station.name}, ${station.suburb} ${station.state.toUpperCase()}. Compare petrol and diesel prices.`,
    openGraph: {
      title: `${station.name} — ServoMap`,
      description: `Live fuel prices at ${station.name}, ${station.suburb}.`,
    },
  };
}

export default async function StationPage({ params }: Props) {
  const { id } = await params;
  // TODO: 替换为真实 API
  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) notFound();

  // JSON-LD 结构化数据
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
