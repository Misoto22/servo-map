import type { FuelType } from "./fuel";
import type { AustralianState } from "./states";

export interface FuelPrice {
  fuel: FuelType;
  /** Price in cents per litre */
  price: number;
  updated_at: string;
}

export interface Station {
  /** Format: {state}-{source_id} */
  id: string;
  name: string;
  brand: string;
  address: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  lat: number;
  lng: number;
  prices: FuelPrice[];
}

export interface StationWithDistance extends Station {
  /** Distance in km, only present when lat/lng query params provided */
  distance?: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface StateMetadata {
  last_updated: string;
  station_count: number;
}

/** Daily price roll-up for one state + fuel, captured by the ingest cron */
export interface PriceSnapshot {
  /** Calendar date in YYYY-MM-DD (UTC), one entry per day */
  date: string;
  fuel: FuelType;
  min: number;
  avg: number;
  max: number;
  /** How many stations reported this fuel on this day */
  station_count: number;
}

/** A rolling time series of daily snapshots for a single state */
export interface PriceTrend {
  state: AustralianState;
  series: PriceSnapshot[];
}

export interface ApiResponse<T> {
  status: "success";
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
  code: string;
}
