import type { Metadata } from "next";
import Link from "next/link";
import type { AustralianState } from "@servo-map/shared";
import { getMetadata } from "@/lib/api";
import { liveStates, STATE_LABELS } from "@/lib/coverage";
import { SITE_URL } from "@/lib/site";

// 内容随覆盖范围变化，但变动缓慢 —— 1 小时 ISR 足够。
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About ServoMap — How We Source Fuel Prices",
  description:
    "ServoMap aggregates official state government fuel-price feeds into one Australia-wide map. Learn our methodology and per-state data provenance.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About ServoMap — How We Source Fuel Prices",
    description:
      "How ServoMap sources, normalises and refreshes Australian fuel prices.",
  },
};

/**
 * 各州数据出处（provenance）。仅展示当前 live 的州，但出处文案为所有州预置，
 * 便于上线新州时无需改动此页。来源名称需与官方计划一致以建立可信度。
 */
const PROVENANCE: Record<
  AustralianState,
  { source: string; url: string; note: string }
> = {
  nsw: {
    source: "NSW Government FuelCheck",
    url: "https://www.fuelcheck.nsw.gov.au/",
    note: "Mandatory real-time price reporting under the NSW Fuel Price Reporting scheme.",
  },
  qld: {
    source: "Queensland Government Fuel Price Reporting",
    url: "https://www.qld.gov.au/transport/projects/fuel-price-reporting",
    note: "Real-time prices published under Queensland's mandatory fuel-price reporting scheme.",
  },
  vic: {
    source: "Victorian Government fuel-price data",
    url: "https://www.vic.gov.au/",
    note: "Pending integration.",
  },
  wa: {
    source: "WA FuelWatch",
    url: "https://www.fuelwatch.wa.gov.au/",
    note: "Pending integration. FuelWatch publishes next-day prices.",
  },
  sa: {
    source: "South Australian fuel-price data",
    url: "https://www.sa.gov.au/",
    note: "Pending integration.",
  },
  tas: {
    source: "Tasmanian fuel-price data",
    url: "https://www.tas.gov.au/",
    note: "Pending integration.",
  },
  act: {
    source: "ACT fuel-price data",
    url: "https://www.act.gov.au/",
    note: "Pending integration.",
  },
  nt: {
    source: "NT MyFuel",
    url: "https://fuel.nt.gov.au/",
    note: "Pending integration.",
  },
};

async function loadLiveStates(): Promise<AustralianState[]> {
  try {
    const { data } = await getMetadata();
    const states = liveStates(data);
    return states.length ? states : ["nsw"];
  } catch {
    return ["nsw"];
  }
}

export default async function AboutPage() {
  const live = await loadLiveStates();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "About",
        item: `${SITE_URL}/about`,
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
        {/* Header — 面包屑 Map › About */}
        <header className="border-b border-border-subtle">
          <nav
            aria-label="Breadcrumb"
            className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-text-secondary"
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
              About
            </span>
          </nav>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-ochre mb-2">
            Methodology
          </p>
          <h1 className="font-display font-bold text-4xl md:text-5xl text-text">
            How ServoMap works
          </h1>

          <section className="mt-8 space-y-4 text-text-secondary leading-relaxed">
            <p>
              ServoMap is a free Australia-wide fuel-price map. We aggregate each
              state&rsquo;s official fuel-price feed into one normalised dataset,
              so you can compare U91, E10, U95, U98 and Diesel across every
              covered station in one place.
            </p>
            <p>
              Prices are pulled directly from government sources every 15 minutes
              and stored at the edge for fast delivery. Each station and suburb
              page shows when its price was last reported, so you always know how
              fresh the data is. We never estimate or interpolate prices — if a
              station hasn&rsquo;t reported, we don&rsquo;t show a price for it.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display font-bold text-2xl text-text mb-4">
              Where the data comes from
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              ServoMap is currently live in{" "}
              {live.map((s, i) => (
                <span key={s}>
                  <Link
                    href={`/fuel/${s}`}
                    className="text-ochre hover:text-ochre-dim transition-colors"
                  >
                    {STATE_LABELS[s]}
                  </Link>
                  {i < live.length - 1 ? ", " : ""}
                </span>
              ))}
              . Each state&rsquo;s prices are sourced from its official
              government reporting scheme:
            </p>
            <dl className="space-y-4">
              {live.map((s) => {
                const p = PROVENANCE[s];
                return (
                  <div
                    key={s}
                    className="rounded-[var(--radius-card)] border border-border-subtle bg-surface px-5 py-4"
                  >
                    <dt className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-ochre">
                        {STATE_LABELS[s]}
                      </span>
                      <span className="text-sm font-semibold text-text">
                        {p.source}
                      </span>
                    </dt>
                    <dd className="text-sm text-text-secondary mt-2 leading-relaxed">
                      {p.note}{" "}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ochre hover:text-ochre-dim transition-colors"
                      >
                        Official source
                      </a>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="mt-10 space-y-4 text-text-secondary leading-relaxed">
            <h2 className="font-display font-bold text-2xl text-text">
              Accuracy &amp; freshness
            </h2>
            <p>
              Fuel prices change frequently and reporting can lag at individual
              stations. Always confirm the price at the bowser before you fill
              up. ServoMap is an independent project and is not affiliated with
              any government agency or fuel retailer.
            </p>
          </section>

          <div className="mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-button)] bg-ochre text-bg font-semibold text-sm hover:bg-ochre-dim transition-colors"
            >
              Open the live map
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
