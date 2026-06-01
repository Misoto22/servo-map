/**
 * 独立数据抓取脚本 — 在 GitHub Actions 中运行
 *
 * 复用 worker 的 state adapters 抓取油价数据（单一真相来源），
 * 然后通过 Cloudflare KV REST API 写入。adapters 在运行时只依赖
 * 全局 fetch / crypto，对 @servo-map/shared 全是 type-only import。
 *
 * 环境变量:
 *   NSW_API_KEY, NSW_API_AUTH — NSW FuelCheck API 认证
 *   QLD_API_TOKEN — QLD Fuel Prices API token
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID — Cloudflare KV 写入
 */

import type {
  Station,
  AustralianState,
  StateMetadata,
} from "@servo-map/shared";
import { adapters } from "../packages/worker/src/adapters/index";
import { KV_KEYS } from "../packages/worker/src/kv/keys";
import type { Env } from "../packages/worker/src/env";

// 当某州本次抓取数量低于上次的该比例时，跳过覆盖以保护 KV 中的健康数据
const MIN_RETENTION_RATIO = 0.5;
// 低于此基数的州不触发护栏（新州 / 极小州的正常波动）
const RETENTION_GUARD_FLOOR = 20;

// ── 环境变量 ──

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

/** 为 adapters 构造 env（KV binding 不会被 adapters 使用，仅读取 secrets） */
function buildAdapterEnv(): Env {
  return {
    NSW_API_KEY: requireEnv("NSW_API_KEY"),
    NSW_API_AUTH: requireEnv("NSW_API_AUTH"),
    QLD_API_TOKEN: process.env.QLD_API_TOKEN ?? "",
  } as unknown as Env;
}

// ── Cloudflare KV REST API ──

async function kvPut(key: string, value: string, retries = 3): Promise<void> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const namespaceId = requireEnv("CF_KV_NAMESPACE_ID");
  const token = requireEnv("CF_API_TOKEN");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: value,
    });
    if (res.ok) return;
    if (res.status === 429 && attempt < retries) {
      // Rate limited — 等待后重试
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const body = await res.text().catch(() => "");
    throw new Error(`KV PUT ${key} failed: ${res.status} — ${body}`);
  }
}

/** Bulk write KV pairs (max 10000 per request) */
async function kvBulkWrite(
  pairs: { key: string; value: string }[],
): Promise<void> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const namespaceId = requireEnv("CF_KV_NAMESPACE_ID");
  const token = requireEnv("CF_API_TOKEN");

  const CHUNK = 10000;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const chunk = pairs.slice(i, i + CHUNK);
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`KV bulk write failed: ${res.status} — ${body}`);
    }
    console.log(
      `[fetch-data] Bulk wrote ${Math.min(i + CHUNK, pairs.length)}/${pairs.length} keys`,
    );
  }
}

async function kvGet(key: string): Promise<string | null> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const namespaceId = requireEnv("CF_KV_NAMESPACE_ID");
  const token = requireEnv("CF_API_TOKEN");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.text();
}

// ── 主流程 ──

async function main() {
  console.log("[fetch-data] Starting...");

  // 并行调用所有 adapter，互不阻塞（一个失败不影响其他）
  const env = buildAdapterEnv();
  const results = await Promise.allSettled(
    adapters.map((a) => a.fetchStations(env)),
  );

  const allStations: Station[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const label = adapters[i].states.join("/").toUpperCase();
    if (r.status === "fulfilled") {
      console.log(`[fetch-data] ${label}: ${r.value.length} stations`);
      allStations.push(...r.value);
    } else {
      console.error(`[fetch-data] ${label}: FAILED —`, r.reason);
    }
  }

  if (allStations.length === 0) {
    console.error("[fetch-data] No stations fetched. Exiting.");
    process.exit(1);
  }

  // 按州分组
  const grouped = new Map<AustralianState, Station[]>();
  for (const s of allStations) {
    const group = grouped.get(s.state) ?? [];
    group.push(s);
    grouped.set(s.state, group);
  }

  // 先读已有 metadata —— 用于护栏比较 + 合并
  const existingRaw = await kvGet(KV_KEYS.metadata);
  const existingMeta: Record<string, StateMetadata> = existingRaw
    ? JSON.parse(existingRaw)
    : {};

  // 写入按州 chunk，带最小数量护栏
  const metadataUpdates: Record<string, StateMetadata> = {};
  const writtenStations: Station[] = [];
  for (const [state, stations] of grouped) {
    const prev = existingMeta[state]?.station_count ?? 0;
    if (
      prev > RETENTION_GUARD_FLOOR &&
      stations.length < prev * MIN_RETENTION_RATIO
    ) {
      console.warn(
        `[fetch-data] ${state}: ${stations.length} stations vs previous ${prev} ` +
          `(< ${MIN_RETENTION_RATIO * 100}% retention) — skipping overwrite, preserving prior KV`,
      );
      continue;
    }
    console.log(`[fetch-data] Writing ${state}: ${stations.length} stations...`);
    await kvPut(KV_KEYS.stationsByState(state), JSON.stringify(stations));
    metadataUpdates[state] = {
      last_updated: new Date().toISOString(),
      station_count: stations.length,
    };
    writtenStations.push(...stations);
  }

  if (writtenStations.length === 0) {
    console.error(
      "[fetch-data] Every state failed the retention guard; nothing written.",
    );
    process.exit(1);
  }

  // 品牌列表（先写，避免 station keys rate limit 阻塞）
  // 取自全部抓取结果：品牌是 UI 过滤项，超集无害
  const brands = [...new Set(allStations.map((s) => s.brand))].sort();
  await kvPut(KV_KEYS.brands, JSON.stringify(brands));

  // Metadata（合并已有数据，未更新/被护栏跳过的州保留上次记录）
  const merged = { ...existingMeta, ...metadataUpdates };
  await kvPut(KV_KEYS.metadata, JSON.stringify(merged));

  // 写入单独的 station keys（用于 GET /stations/:id）—— 仅写实际更新的州，
  // 与 stations:{state} chunk 保持一致
  console.log(
    `[fetch-data] Writing ${writtenStations.length} individual station keys via bulk API...`,
  );
  await kvBulkWrite(
    writtenStations.map((s) => ({
      key: KV_KEYS.stationById(s.id),
      value: JSON.stringify(s),
    })),
  );

  console.log(
    `[fetch-data] Done: ${writtenStations.length} stations written, ${brands.length} brands`,
  );
}

main().catch((err) => {
  console.error("[fetch-data] Fatal:", err);
  process.exit(1);
});
