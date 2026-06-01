import Link from "next/link";
import type { AustralianState } from "@servo-map/shared";
import { getMetadata } from "@/lib/api";
import { liveStates, formatLiveStates, STATE_LABELS } from "@/lib/coverage";
import HomeMap from "./client";

// 首页是服务端外壳：渲染可索引的 SSR 介绍 + 内链，再挂载客户端地图组件。
// ISR：live 州集合变动缓慢，15 分钟足够。
export const revalidate = 900;

/** 服务端解析 live 州，用于渲染真实的州 hub 内链（无数据时回退 nsw）。 */
async function loadLiveStates(): Promise<AustralianState[]> {
  try {
    const { data } = await getMetadata();
    const states = liveStates(data);
    return states.length ? states : ["nsw"];
  } catch {
    return ["nsw"];
  }
}

export default async function Home() {
  const live = await loadLiveStates();
  const liveText = formatLiveStates(live);

  return (
    <>
      {/* 客户端交互地图（占满首屏） */}
      <HomeMap />

      {/*
        SSR 可索引内容：地图组件 client 端不输出真实的 h1 与内链，此处由服务端提供。
        放在地图之后、正常文档流中，对爬虫完全可读；视觉上位于首屏地图下方。
        sr-only-focusable 的 h1 给读屏一个明确标题，链接区为可见页脚。
      */}
      <section aria-label="About ServoMap" className="bg-bg">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-text">
            ServoMap — live Australian fuel prices near you
          </h1>
          <p className="mt-4 text-text-secondary leading-relaxed max-w-2xl">
            Compare real-time petrol and diesel prices across Australia on one
            map. ServoMap aggregates official state government fuel-price feeds
            so you can find the cheapest U91, E10, U95, U98 and Diesel near you.
            {liveText ? ` Live now in ${liveText}.` : ""}
          </p>

          {/* 州 hub 内链 — 真实数据驱动，给爬虫一条进入郊区图谱的路径 */}
          <nav aria-label="Browse by state" className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Browse fuel prices by state
            </h2>
            <ul className="flex flex-wrap gap-2">
              {live.map((s) => (
                <li key={s}>
                  <Link
                    href={`/fuel/${s}`}
                    className="inline-flex items-center px-4 py-2 rounded-[var(--radius-pill)] bg-surface-elevated border border-border-subtle text-sm text-text hover:border-ochre/40 hover:bg-surface-hover transition-colors"
                  >
                    {STATE_LABELS[s]} fuel prices
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-8 text-sm text-text-muted">
            Prices sourced from official state government fuel-price feeds.{" "}
            <Link
              href="/about"
              className="text-ochre hover:text-ochre-dim transition-colors"
            >
              How ServoMap works
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
