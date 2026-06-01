import type { MetadataRoute } from "next";
import type { AustralianState, StateMetadata } from "@servo-map/shared";
import { getStations, getMetadata } from "@/lib/api";
import { liveStates } from "@/lib/coverage";
import { SITE_URL } from "@/lib/site";
import { uniqueSuburbs } from "@/lib/seo";

const BASE = SITE_URL;
// Per-state fetch cap (worker MAX_LIMIT). Large states are NOT fully enumerated
// here — a dedicated suburb/station-index endpoint should replace this before
// launch so child sitemaps don't silently miss rows beyond the first 500.
const PER_STATE_LIMIT = 500;

export const revalidate = 3600;

/** Live states are derived from real data (metadata.station_count > 0). */
async function loadMetadata(): Promise<Record<
  AustralianState,
  StateMetadata
> | null> {
  try {
    const { data } = await getMetadata();
    return data;
  } catch {
    return null;
  }
}

/**
 * generateSitemaps: 一个 sitemap index + 每个 live 州一个子站点地图。
 * 返回 id="root"（静态页 + 州 hub）与 id=<state>（该州站点 + 郊区）。
 * 子地图 URL 形如 /sitemap/<id>.xml，index 由 Next 自动生成。
 */
export async function generateSitemaps(): Promise<{ id: string }[]> {
  const metadata = await loadMetadata();
  const states = metadata ? liveStates(metadata) : [];
  // metadata 不可达时回退到 nsw，保证 index 不为空。
  const stateIds = (states.length ? states : (["nsw"] as AustralianState[])).map(
    (s) => ({ id: s }),
  );
  return [{ id: "root" }, ...stateIds];
}

export default async function sitemap(props: {
  id: Promise<string> | string;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const metadata = await loadMetadata();
  const states = metadata ? liveStates(metadata) : [];
  const live = states.length ? states : (["nsw"] as AustralianState[]);

  if (id === "root") {
    return buildRootSitemap(metadata, live);
  }

  // 州子地图：仅对 live 州生成（防止有人直接命中 /sitemap/<deadstate>.xml）
  if (!live.includes(id as AustralianState)) return [];
  return buildStateSitemap(id as AustralianState, metadata);
}

/** 取某州数据最后更新时间（ISO Date），无则现在时刻（避免空 lastModified）。 */
function stateLastModified(
  metadata: Record<AustralianState, StateMetadata> | null,
  state: AustralianState,
): Date {
  const ts = metadata?.[state]?.last_updated;
  return ts ? new Date(ts) : new Date();
}

/** index 子项「root」：首页 + 静态页 + 每个 live 州的 hub 页。 */
function buildRootSitemap(
  metadata: Record<AustralianState, StateMetadata> | null,
  live: AustralianState[],
): MetadataRoute.Sitemap {
  // 站点整体的 lastModified 取所有 live 州的最大 updated_at（而非渲染时刻）。
  const latest = live
    .map((s) => stateLastModified(metadata, s).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const siteLastMod = latest ? new Date(latest) : new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: siteLastMod,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${BASE}/about`,
      lastModified: siteLastMod,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  for (const state of live) {
    entries.push({
      url: `${BASE}/fuel/${state}`,
      lastModified: stateLastModified(metadata, state),
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  return entries;
}

/** 单个州的子地图：该州所有站点 + 所有郊区页。 */
async function buildStateSitemap(
  state: AustralianState,
  metadata: Record<AustralianState, StateMetadata> | null,
): Promise<MetadataRoute.Sitemap> {
  const lastMod = stateLastModified(metadata, state);
  let stations;
  try {
    const { data } = await getStations({ state, limit: PER_STATE_LIMIT });
    stations = data.filter((s) => s.state === state);
  } catch {
    // API 不可达 — 返回空子地图而非整站失败。
    return [];
  }

  const entries: MetadataRoute.Sitemap = stations.map((s) => ({
    url: `${BASE}/station/${s.id}`,
    lastModified: lastMod,
    changeFrequency: "hourly" as const,
    priority: 0.5,
  }));

  for (const sub of uniqueSuburbs(stations)) {
    entries.push({
      url: `${BASE}/fuel/${state}/${sub.slug}`,
      lastModified: lastMod,
      changeFrequency: "hourly",
      priority: 0.7,
    });
  }

  return entries;
}
