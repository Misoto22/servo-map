import type {
  Station,
  StationWithDistance,
  ApiResponse,
  PaginationMeta,
} from "@servo-map/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function fetchApi<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getStations(params?: {
  state?: string;
  suburb?: string;
  brand?: string;
  fuel?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: "price" | "distance";
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<StationWithDistance[]>> {
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) search.set(k, String(v));
    });
  }
  const qs = search.toString();
  return fetchApi(`/api/v1/stations${qs ? `?${qs}` : ""}`);
}

export async function getStation(
  id: string,
): Promise<ApiResponse<Station>> {
  return fetchApi(`/api/v1/stations/${id}`);
}

export async function getBrands(): Promise<ApiResponse<string[]>> {
  return fetchApi("/api/v1/brands");
}
