import type { Station, AustralianState, StateMetadata } from "@servo-map/shared";
import type { Env } from "../env";
import { adapters } from "../adapters";
import { writeStations, writeBrands, writeMetadata } from "../kv/write";

/** 按 state 分组 */
function groupByState(stations: Station[]): Map<AustralianState, Station[]> {
  const map = new Map<AustralianState, Station[]>();
  for (const s of stations) {
    const group = map.get(s.state) ?? [];
    group.push(s);
    map.set(s.state, group);
  }
  return map;
}

export async function handleScheduled(env: Env): Promise<void> {
  // 并行调用所有适配器，互不阻塞
  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.fetchStations(env)),
  );

  const allStations: Station[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const adapterStates = adapters[i].states.join(", ");
    if (result.status === "fulfilled") {
      console.log(`[cron] ${adapterStates}: fetched ${result.value.length} stations`);
      allStations.push(...result.value);
    } else {
      console.error(`[cron] ${adapterStates}: failed —`, result.reason);
    }
  }

  if (allStations.length === 0) {
    console.warn("[cron] No stations fetched from any adapter");
    return;
  }

  // 按州分组写入 KV
  const grouped = groupByState(allStations);
  const metadataUpdates: Partial<Record<AustralianState, StateMetadata>> = {};

  for (const [state, stations] of grouped) {
    await writeStations(env.KV, state, stations);
    metadataUpdates[state] = {
      last_updated: new Date().toISOString(),
      station_count: stations.length,
    };
    console.log(`[cron] KV written: ${state} — ${stations.length} stations`);
  }

  // 汇总品牌列表
  const brands = [...new Set(allStations.map((s) => s.brand))].sort();
  await writeBrands(env.KV, brands);

  // 更新 metadata（合并，失败的州保留上次记录）
  await writeMetadata(env.KV, metadataUpdates);

  console.log(
    `[cron] Done: ${allStations.length} total stations, ${brands.length} brands`,
  );
}
