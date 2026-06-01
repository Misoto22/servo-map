import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AUSTRALIAN_STATES, type AustralianState } from "@servo-map/shared";
import { getStations, getMetadata } from "@/lib/api";
import { latestUpdatedAt, liveStates, STATE_LABELS } from "@/lib/coverage";
import { SITE_URL } from "@/lib/site";
import { uniqueSuburbs } from "@/lib/seo";
import { FreshnessBadge } from "@/components/stations/FreshnessBadge";
import { timeAgo } from "@/lib/utils";

// ISR: regenerate at most every 15 minutes, generate unknown states on demand.
export const revalidate = 900;
export const dynamicParams = true;

interface Props {
  params: Promise<{ state: string }>;
}

/** State hubs are generated on demand via ISR — none are prebuilt at build time. */
export function generateStaticParams() {
  return [];
}

/** Whether a given path segment is a real state code AND currently has live data. */
async function loadIfLive(state: string): Promise<{
  live: boolean;
  lastUpdated: string | null;
}> {
  if (!AUSTRALIAN_STATES.includes(state as AustralianState)) {
    return { live: false, lastUpdated: null };
  }
  try {
    const { data } = await getMetadata();
    const live = liveStates(data).includes(state as AustralianState);
    return { live, lastUpdated: latestUpdatedAt(data, [state as AustralianState]) };
  } catch {
    return { live: false, lastUpdated: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const stateUpper = state.toUpperCase();

  return {
    title: `${stateUpper} Fuel Prices by Suburb — ServoMap`,
    description: `Browse live petrol and diesel prices across every ${stateUpper} suburb. Find the cheapest U91, E10, U95, U98 and Diesel near you.`,
    alternates: { canonical: `/fuel/${state.toLowerCase()}` },
    openGraph: {
      title: `${stateUpper} Fuel Prices by Suburb`,
      description: `Live fuel prices across ${stateUpper} suburbs on ServoMap.`,
    },
  };
}

export default async function StateHubPage({ params }: Props) {
  const { state } = await params;
  const stateLower = state.toLowerCase();
  const stateUpper = state.toUpperCase();

  // 仅对真实有数据的州渲染 hub —— 避免对空州过度声明覆盖（与 §honest coverage 一致）
  const { live, lastUpdated } = await loadIfLive(stateLower);
  if (!live) notFound();

  let suburbs: ReturnType<typeof uniqueSuburbs> = [];
  try {
    const { data } = await getStations({ state: stateLower, limit: 500 });
    suburbs = uniqueSuburbs(data.filter((s) => s.state === stateLower));
  } catch {
    suburbs = [];
  }
  if (suburbs.length === 0) notFound();

  const stationTotal = suburbs.reduce((sum, s) => sum + s.stationCount, 0);
  const stateLabel = STATE_LABELS[stateLower as AustralianState] ?? stateUpper;

  // BreadcrumbList JSON-LD: Home › State hub
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: `${stateLabel} Fuel Prices`,
        item: `${SITE_URL}/fuel/${stateLower}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="min-h-screen bg-bg">
        {/* Header — 面包屑 Map › 州 hub */}
        <header className="border-b border-border-subtle">
          <nav
            aria-label="Breadcrumb"
            className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-text-secondary"
          >
            <Link
              href="/"
              className="flex items-center gap-2 hover:text-text transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              <span>Map</span>
            </Link>
            <span className="text-text-muted" aria-hidden="true">
              /
            </span>
            <span className="text-text" aria-current="page">
              {stateLabel}
            </span>
          </nav>
        </header>

        {/* Hero */}
        <section className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-4 py-12 animate-slide-up">
            <p className="text-xs font-semibold uppercase tracking-wider text-ochre mb-2">
              Fuel Prices
            </p>
            <h1 className="font-display font-bold text-4xl md:text-5xl text-text">
              {stateLabel} Fuel Prices by Suburb
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <p className="text-text-secondary text-lg">
                {suburbs.length} suburb{suburbs.length !== 1 ? "s" : ""} &middot;{" "}
                {stationTotal} station{stationTotal !== 1 ? "s" : ""}
              </p>
              {lastUpdated && <FreshnessBadge lastUpdated={lastUpdated} />}
            </div>
            <p className="text-sm text-text-secondary mt-4 max-w-2xl leading-relaxed">
              Live petrol and diesel prices across {stateLabel}, sourced from the
              official {stateUpper} government fuel-price feed and refreshed every
              15 minutes. Pick a suburb to compare U91, E10, U95, U98 and Diesel,
              or open the{" "}
              <Link
                href="/"
                className="text-ochre hover:text-ochre-dim transition-colors"
              >
                live map
              </Link>
              .
            </p>
          </div>
        </section>

        {/* 郊区列表 — 链接到每个 /fuel/<state>/<suburb> */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
            All suburbs
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-slide-up delay-1">
            {suburbs.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/fuel/${stateLower}/${s.slug}`}
                  className="flex items-baseline justify-between gap-2 px-4 py-2.5 rounded-[var(--radius-card)] bg-surface border border-border-subtle text-sm text-text hover:border-ochre/40 hover:bg-surface-hover transition-colors"
                >
                  <span className="font-medium truncate">{s.name}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {s.stationCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle mt-16">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
              <p>
                Prices sourced from state government fuel-price feeds.
                {lastUpdated ? ` Last updated ${timeAgo(lastUpdated)}.` : ""}{" "}
                <Link
                  href="/about"
                  className="text-ochre hover:text-ochre-dim transition-colors"
                >
                  How it works
                </Link>
              </p>
              <Link
                href="/"
                className="text-ochre hover:text-ochre-dim transition-colors"
              >
                ServoMap &mdash; Find cheap fuel across Australia
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
