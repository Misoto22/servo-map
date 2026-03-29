import type { Station, AustralianState } from "@servo-map/shared";
import type { Env } from "../env";

export interface StateAdapter {
  /** Which states this adapter covers */
  readonly states: readonly AustralianState[];

  /** Fetch all stations with current prices. Throws on failure. */
  fetchStations(env: Env): Promise<Station[]>;
}

// --- NSW FuelCheck API v2 raw response types ---
// /FuelPriceCheck/v2/fuel/prices 返回 stations + prices 在同一个响应中

export interface NswStation {
  brandid: string;
  stationid: string;
  brand: string;
  code: string;
  name: string;
  /** 完整地址，例如 "307-313 Ocean Beach Road, UMINA BEACH NSW 2257" */
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  state: string;
}

export interface NswPriceEntry {
  stationcode: number;
  state: string;
  fueltype: string;
  price: number;
  /** 格式: "DD/MM/YYYY HH:mm:ss" */
  lastupdated: string;
}

export interface NswPricesResponse {
  stations: NswStation[];
  prices: NswPriceEntry[];
}

export interface NswOAuthResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
}

// --- QLD Fuel Prices API raw response types ---

export interface QldSiteDetails {
  S: QldSite[];
}

export interface QldSite {
  S: number;      // SiteId
  N: string;      // SiteName
  A: string;      // Address
  B: number;      // BrandId
  Bn: string;     // BrandName
  P: string;      // Postcode
  Lt: number;     // Latitude
  Ln: number;     // Longitude
  Sb: string;     // Suburb
}

export interface QldSitePricesResponse {
  SitePrices: QldSitePrice[];
}

export interface QldSitePrice {
  SiteId: number;
  FuelId: number;
  Price: number;        // 0.1 cent units
  TransactionDateUtc: string;
}
