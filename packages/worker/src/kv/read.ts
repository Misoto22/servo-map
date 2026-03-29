import type { Station, StateMetadata, AustralianState } from "@servo-map/shared";
import { KV_KEYS } from "./keys";

export async function readStationsByState(
  kv: KVNamespace,
  state: AustralianState,
): Promise<Station[]> {
  return (await kv.get<Station[]>(KV_KEYS.stationsByState(state), "json")) ?? [];
}

export async function readStationById(
  kv: KVNamespace,
  id: string,
): Promise<Station | null> {
  return kv.get<Station>(KV_KEYS.stationById(id), "json");
}

export async function readBrands(kv: KVNamespace): Promise<string[]> {
  return (await kv.get<string[]>(KV_KEYS.brands, "json")) ?? [];
}

export async function readMetadata(
  kv: KVNamespace,
): Promise<Record<string, StateMetadata>> {
  return (await kv.get<Record<string, StateMetadata>>(KV_KEYS.metadata, "json")) ?? {};
}

/** Read cached reference data (e.g. NSW station reference), returns null if expired */
export async function readRefData<T>(
  kv: KVNamespace,
  state: AustralianState,
): Promise<T | null> {
  return kv.get<T>(KV_KEYS.refData(state), "json");
}
