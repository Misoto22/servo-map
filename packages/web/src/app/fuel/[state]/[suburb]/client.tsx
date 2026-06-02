"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { FUEL_TYPES } from "@servo-map/shared";
import { PriceTag } from "@/components/stations/PriceTag";
import { FreshnessBadge } from "@/components/stations/FreshnessBadge";
import { StaleBanner } from "@/components/stations/StaleBanner";
import { PriceRangeProvider } from "@/providers/PriceRangeProvider";
import { cn, getFuelPrice, timeAgo } from "@/lib/utils";

interface NearbySuburb {
  slug: string;
  name: string;
  stationCount: number;
}

interface Props {
  suburbName: string;
  stateName: string;
  /** 小写州码，用于内链（/fuel/<state> 与 /fuel/<state>/<suburb>） */
  stateSlug: string;
  stations: StationWithDistance[];
  cheapestU91: number | null;
  /** 该州数据最后更新时间（ISO 串），来自 metadata 端点 */
  lastUpdated: string | null;
  /** 模板化正文段落（由真实数据驱动） */
  prose: string[];
  /** FAQ 问答（同时驱动 FAQPage 结构化数据） */
  faqs: { q: string; a: string }[];
  /** 邻近郊区交叉链接 */
  nearby: NearbySuburb[];
  /** 预渲染的州级价格趋势区块（服务端组件），无数据时为 null */
  priceTrend?: ReactNode;
}

export function SuburbPageClient({
  suburbName,
  stateName,
  stateSlug,
  stations,
  cheapestU91,
  lastUpdated,
  prose,
  faqs,
  nearby,
  priceTrend,
}: Props) {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>("U91");

  // 按选中燃油类型排序
  const sorted = [...stations].sort((a, b) => {
    const pa = getFuelPrice(a.prices, selectedFuel)?.price ?? Infinity;
    const pb = getFuelPrice(b.prices, selectedFuel)?.price ?? Infinity;
    return pa - pb;
  });

  return (
    <PriceRangeProvider stations={stations} selectedFuel={selectedFuel}>
    <div className="min-h-screen bg-bg">
      {/* Header — 面包屑式导航：Map › 州 hub › 当前郊区 */}
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
          <Link
            href={`/fuel/${stateSlug}`}
            className="hover:text-text transition-colors"
          >
            {stateName}
          </Link>
          <span className="text-text-muted" aria-hidden="true">
            /
          </span>
          <span className="text-text" aria-current="page">
            {suburbName}
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
            {suburbName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-text-secondary text-lg">
              {stateName} &middot; {stations.length} station
              {stations.length !== 1 ? "s" : ""}
            </p>
            {lastUpdated && <FreshnessBadge lastUpdated={lastUpdated} />}
          </div>
          {lastUpdated && <StaleBanner lastUpdated={lastUpdated} className="mt-4 max-w-md" />}
          {cheapestU91 != null && (
            <div className="mt-6 inline-flex items-baseline gap-2 bg-surface-elevated rounded-[var(--radius-card)] px-5 py-3 border border-border-subtle">
              <span className="text-xs text-text-muted uppercase tracking-wider">
                Cheapest U91
              </span>
              <PriceTag cents={cheapestU91} size="xl" />
            </div>
          )}
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 模板化正文：可索引、由真实数据驱动，清除 thin-content */}
        {prose.length > 0 && (
          <section className="mb-8 max-w-2xl space-y-3 animate-slide-up">
            {prose.map((para, i) => (
              <p key={i} className="text-sm text-text-secondary leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        )}

        {/* 燃油类型选择 */}
        <div className="flex gap-1 bg-surface rounded-[var(--radius-pill)] p-1 mb-6 w-fit animate-slide-up delay-1">
          {FUEL_TYPES.map((fuel) => (
            <button
              key={fuel}
              onClick={() => setSelectedFuel(fuel)}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold transition-all",
                selectedFuel === fuel
                  ? "bg-ochre text-bg"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {fuel}
            </button>
          ))}
        </div>

        {/* 价格表 */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle overflow-hidden animate-slide-up delay-2">
          {/* 表头 */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
            <span>Station</span>
            <span className="text-right">Price</span>
            <span className="text-right hidden sm:block">Updated</span>
          </div>

          {/* 行 */}
          {sorted.map((station, i) => {
            const fp = getFuelPrice(station.prices, selectedFuel);
            return (
              <a
                key={station.id}
                href={`/station/${station.id}`}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5 items-center hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-b-0",
                  i === 0 && "bg-price-cheap/5",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ochre">
                      {station.brand}
                    </span>
                    {i === 0 && (
                      <span className="text-[10px] font-semibold text-price-cheap bg-price-cheap/10 px-1.5 py-0.5 rounded">
                        CHEAPEST
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text truncate">
                    {station.name}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {station.address}
                  </p>
                </div>
                <div className="text-right">
                  {fp ? (
                    <PriceTag cents={fp.price} size="md" />
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  {fp && (
                    <span className="text-xs text-text-muted">
                      {timeAgo(fp.updated_at)}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {/* 州级价格趋势 — 数据按州采集，标注为全州走势而非本郊区 */}
        {priceTrend}

        {/* 邻近郊区交叉链接 — 内链密度 + 让爬虫沿郊区图谱深入 */}
        {nearby.length > 0 && (
          <section className="mt-12 animate-slide-up">
            <h2 className="font-display font-bold text-xl text-text mb-4">
              Nearby suburbs in {stateName}
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((n) => (
                <Link
                  key={n.slug}
                  href={`/fuel/${stateSlug}/${n.slug}`}
                  className="inline-flex items-baseline gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-surface-elevated border border-border-subtle text-sm text-text hover:border-ochre/40 hover:bg-surface-hover transition-colors"
                >
                  <span className="font-medium">{n.name}</span>
                  <span className="text-xs text-text-muted">
                    {n.stationCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ — 可见问答，同时镜像 FAQPage 结构化数据 */}
        {faqs.length > 0 && (
          <section className="mt-12 animate-slide-up">
            <h2 className="font-display font-bold text-xl text-text mb-4">
              {suburbName} fuel price FAQ
            </h2>
            <dl className="space-y-4">
              {faqs.map((f, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-card)] border border-border-subtle bg-surface px-5 py-4"
                >
                  <dt className="text-sm font-semibold text-text">{f.q}</dt>
                  <dd className="text-sm text-text-secondary mt-2 leading-relaxed">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
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
              href={`/fuel/${stateSlug}`}
              className="text-ochre hover:text-ochre-dim transition-colors"
            >
              All {stateName} suburbs &rarr;
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </PriceRangeProvider>
  );
}
