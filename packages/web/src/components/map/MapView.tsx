"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { priceColorHex, getFuelPrice, formatPriceCents } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// 澳洲中心
const INITIAL_VIEW = {
  latitude: -33.8688,
  longitude: 151.2093,
  zoom: 12,
};

interface MapViewProps {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  activeStationId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onStationClick: (station: StationWithDistance) => void;
  onMoveEnd?: (bounds: {
    ne: [number, number];
    sw: [number, number];
  }) => void;
}

export function MapView({
  stations,
  selectedFuel,
  activeStationId,
  userLocation,
  onStationClick,
  onMoveEnd,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  // 用户定位后飞过去
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13,
        duration: 1500,
      });
    }
  }, [userLocation]);

  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      if (!mapRef.current || !onMoveEnd) return;
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        onMoveEnd({
          ne: [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
          sw: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
        });
      }
    },
    [onMoveEnd],
  );

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        mapStyle={mapStyle}
        onMoveEnd={handleMoveEnd}
        onLoad={() => setReady(true)}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* 用户位置标记 */}
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-500/40 animate-ping" />
            </div>
          </Marker>
        )}

        {/* 加油站标记 */}
        {ready &&
          stations.map((station) => {
            const fp = getFuelPrice(station.prices, selectedFuel);
            if (!fp) return null;

            const isActive = activeStationId === station.id;
            const color = priceColorHex(fp.price);

            return (
              <Marker
                key={station.id}
                latitude={station.lat}
                longitude={station.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onStationClick(station);
                }}
              >
                <div
                  className="cursor-pointer transition-transform duration-150"
                  style={{
                    transform: isActive ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  {/* 价格标签气泡 */}
                  <div
                    className="relative px-2 py-1 rounded-lg text-xs font-bold font-display tabular-nums shadow-card"
                    style={{
                      backgroundColor: isActive ? color : "var(--color-surface-elevated)",
                      color: isActive ? "var(--color-bg)" : color,
                      border: `1.5px solid ${isActive ? color : "var(--color-border)"}`,
                    }}
                  >
                    {formatPriceCents(fp.price)}
                    {/* 向下的三角形 */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0"
                      style={{
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderTop: `6px solid ${isActive ? color : "var(--color-border)"}`,
                      }}
                    />
                  </div>
                </div>
              </Marker>
            );
          })}
      </Map>
    </div>
  );
}
