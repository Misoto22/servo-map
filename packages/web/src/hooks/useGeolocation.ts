"use client";

import { useState, useCallback } from "react";

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  });

  // onResolved 让调用方在定位成功的同一回调里同步派生状态（如把地图中心切到用户位置），
  // 避免用 useEffect 监听 lat/lng 再 setState 触发的级联渲染。
  const locate = useCallback(
    (onResolved?: (coords: { lat: number; lng: number }) => void) => {
      if (!navigator.geolocation) {
        setState((s) => ({ ...s, error: "Geolocation not supported" }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setState({ ...coords, loading: false, error: null });
          onResolved?.(coords);
        },
        (err) => {
          setState((s) => ({
            ...s,
            loading: false,
            error: err.message,
          }));
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    },
    [],
  );

  return { ...state, locate };
}
