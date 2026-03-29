/**
 * 独立数据抓取脚本 — 在 GitHub Actions 中运行
 * 从 NSW/QLD API 抓取油价数据，通过 Cloudflare KV REST API 写入
 *
 * 环境变量:
 *   NSW_API_KEY, NSW_API_AUTH — NSW FuelCheck API 认证
 *   QLD_API_TOKEN — QLD Fuel Prices API token
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID — Cloudflare KV 写入
 */

import type {
  Station,
  FuelPrice,
  FuelType,
  AustralianState,
  StateMetadata,
} from "@servo-map/shared";

// ── 环境变量 ──

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

// ── Cloudflare KV REST API ──

const KV_KEYS = {
  stationsByState: (state: AustralianState) => `stations:${state}`,
  stationById: (id: string) => `station:${id}`,
  brands: "brands",
  metadata: "metadata",
};

async function kvPut(key: string, value: string): Promise<void> {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const namespaceId = requireEnv("CF_KV_NAMESPACE_ID");
  const token = requireEnv("CF_API_TOKEN");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: value,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`KV PUT ${key} failed: ${res.status} — ${body}`);
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

// ── 油种映射 ──

const NSW_FUEL_MAP: Record<string, FuelType> = {
  E10: "E10",
  U91: "U91",
  P95: "U95",
  P98: "U98",
  DL: "Diesel",
};

const QLD_FUEL_MAP: Record<number, FuelType> = {
  2: "U91",
  5: "U95",
  8: "U98",
  12: "E10",
  3: "Diesel",
};

// ── NSW Adapter ──

interface NswOAuthResponse {
  access_token: string;
}

interface NswStation {
  brandid: string;
  stationid: string;
  brand: string;
  code: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number };
  state: string;
}

interface NswPriceEntry {
  stationcode: number;
  state: string;
  fueltype: string;
  price: number;
  lastupdated: string;
}

interface NswPricesResponse {
  stations: NswStation[];
  prices: NswPriceEntry[];
}

function parseNswAddress(raw: string): { suburb: string; postcode: string } {
  const match = raw.match(/,\s*(.+?)\s+(?:NSW|TAS|ACT)\s+(\d{4})$/i);
  if (match) return { suburb: match[1].trim(), postcode: match[2] };
  const pcMatch = raw.match(/(\d{4})$/);
  return { suburb: "", postcode: pcMatch?.[1] ?? "" };
}

function parseNswDate(raw: string): string {
  const match = raw.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) return new Date().toISOString();
  const [, dd, mm, yyyy, hh, min, ss] = match;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`).toISOString();
}

function mapNswState(raw: string): AustralianState | null {
  const mapping: Record<string, AustralianState> = {
    nsw: "nsw",
    "new south wales": "nsw",
    tas: "tas",
    tasmania: "tas",
    act: "act",
    "australian capital territory": "act",
  };
  return mapping[raw.toLowerCase().trim()] ?? null;
}

async function fetchNsw(): Promise<Station[]> {
  const apiKey = requireEnv("NSW_API_KEY");
  const authHeader = requireEnv("NSW_API_AUTH");

  // Step 1: OAuth token
  const oauthRes = await fetch(
    "https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials",
    { method: "GET", headers: { Authorization: authHeader } },
  );
  if (!oauthRes.ok)
    throw new Error(`NSW OAuth error: ${oauthRes.status} ${oauthRes.statusText}`);
  const { access_token } = (await oauthRes.json()) as NswOAuthResponse;

  // Step 2: 抓取 stations + prices
  const headers = {
    Authorization: `Bearer ${access_token}`,
    apikey: apiKey,
    transactionid: crypto.randomUUID(),
    requesttimestamp: new Date()
      .toLocaleString("en-AU", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", ""),
    "Content-Type": "application/json",
  };

  const dataRes = await fetch(
    "https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices",
    { headers },
  );
  if (!dataRes.ok) {
    const body = await dataRes.text().catch(() => "");
    throw new Error(
      `NSW API error: ${dataRes.status} ${dataRes.statusText} — ${body}`,
    );
  }
  const data = (await dataRes.json()) as NswPricesResponse;

  // 索引站点
  const stationMap = new Map<string, NswStation>();
  for (const s of data.stations) stationMap.set(s.code, s);

  // 聚合油价
  const pricesByStation = new Map<string, FuelPrice[]>();
  for (const p of data.prices) {
    const fuelType = NSW_FUEL_MAP[p.fueltype];
    if (!fuelType) continue;
    const code = String(p.stationcode);
    const prices = pricesByStation.get(code) ?? [];
    prices.push({
      fuel: fuelType,
      price: p.price,
      updated_at: parseNswDate(p.lastupdated),
    });
    pricesByStation.set(code, prices);
  }

  // 合并
  const stations: Station[] = [];
  for (const [code, prices] of pricesByStation) {
    const ref = stationMap.get(code);
    if (!ref) continue;
    if (!ref.location?.latitude || !ref.location?.longitude) continue;
    const state = mapNswState(ref.state);
    if (!state) continue;
    const { suburb, postcode } = parseNswAddress(ref.address);
    stations.push({
      id: `${state}-${code}`,
      name: ref.name,
      brand: ref.brand,
      address: ref.address,
      suburb,
      state,
      postcode,
      lat: ref.location.latitude,
      lng: ref.location.longitude,
      prices,
    });
  }
  return stations;
}

// ── QLD Adapter ──

interface QldSite {
  S: number;
  N: string;
  A: string;
  B: number;
  Bn: string;
  P: string;
  Lt: number;
  Ln: number;
  Sb: string;
}

interface QldSitePrice {
  SiteId: number;
  FuelId: number;
  Price: number;
  TransactionDateUtc: string;
}

async function fetchQld(): Promise<Station[]> {
  const token = requireEnv("QLD_API_TOKEN");
  const headers = {
    Authorization: `FPDAPI SubscriberToken=${token}`,
    "Content-Type": "application/json",
  };
  const base = "https://fppdirectapi-prod.fuelpricesqld.com.au";

  const [sitesRes, pricesRes] = await Promise.all([
    fetch(
      `${base}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=3&geoRegionId=1`,
      { headers },
    ),
    fetch(
      `${base}/Price/GetSitesPrices?countryId=21&geoRegionLevel=3&geoRegionId=1`,
      { headers },
    ),
  ]);

  if (!sitesRes.ok)
    throw new Error(`QLD sites error: ${sitesRes.status} ${sitesRes.statusText}`);
  if (!pricesRes.ok)
    throw new Error(`QLD prices error: ${pricesRes.status} ${pricesRes.statusText}`);

  const sites = (await sitesRes.json()) as { S: QldSite[] };
  const pricesData = (await pricesRes.json()) as { SitePrices: QldSitePrice[] };

  const pricesBySite = new Map<number, FuelPrice[]>();
  for (const p of pricesData.SitePrices) {
    const fuelType = QLD_FUEL_MAP[p.FuelId];
    if (!fuelType) continue;
    const prices = pricesBySite.get(p.SiteId) ?? [];
    prices.push({
      fuel: fuelType,
      price: p.Price / 10,
      updated_at: p.TransactionDateUtc,
    });
    pricesBySite.set(p.SiteId, prices);
  }

  const stations: Station[] = [];
  for (const site of sites.S) {
    if (!site.Lt || !site.Ln) continue;
    stations.push({
      id: `qld-${site.S}`,
      name: site.N,
      brand: site.Bn,
      address: site.A,
      suburb: site.Sb,
      state: "qld",
      postcode: site.P,
      lat: site.Lt,
      lng: site.Ln,
      prices: pricesBySite.get(site.S) ?? [],
    });
  }
  return stations;
}

// ── 主流程 ──

async function main() {
  console.log("[fetch-data] Starting...");

  // 并行抓取
  const results = await Promise.allSettled([fetchNsw(), fetchQld()]);
  const labels = ["NSW/TAS/ACT", "QLD"];

  const allStations: Station[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      console.log(`[fetch-data] ${labels[i]}: ${r.value.length} stations`);
      allStations.push(...r.value);
    } else {
      console.error(`[fetch-data] ${labels[i]}: FAILED —`, r.reason);
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

  // 写入 KV — 按州 chunks
  const metadataUpdates: Record<string, StateMetadata> = {};
  for (const [state, stations] of grouped) {
    console.log(`[fetch-data] Writing ${state}: ${stations.length} stations...`);
    await kvPut(KV_KEYS.stationsByState(state), JSON.stringify(stations));
    metadataUpdates[state] = {
      last_updated: new Date().toISOString(),
      station_count: stations.length,
    };
  }

  // 写入单独的 station keys
  console.log(
    `[fetch-data] Writing ${allStations.length} individual station keys...`,
  );
  // 分批写入，避免过多并发请求
  const BATCH_SIZE = 50;
  for (let i = 0; i < allStations.length; i += BATCH_SIZE) {
    const batch = allStations.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((s) =>
        kvPut(KV_KEYS.stationById(s.id), JSON.stringify(s)),
      ),
    );
  }

  // 品牌列表
  const brands = [...new Set(allStations.map((s) => s.brand))].sort();
  await kvPut(KV_KEYS.brands, JSON.stringify(brands));

  // Metadata（合并已有数据）
  const existingRaw = await kvGet(KV_KEYS.metadata);
  const existing = existingRaw ? JSON.parse(existingRaw) : {};
  const merged = { ...existing, ...metadataUpdates };
  await kvPut(KV_KEYS.metadata, JSON.stringify(merged));

  console.log(
    `[fetch-data] Done: ${allStations.length} stations, ${brands.length} brands`,
  );
}

main().catch((err) => {
  console.error("[fetch-data] Fatal:", err);
  process.exit(1);
});
