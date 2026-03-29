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
