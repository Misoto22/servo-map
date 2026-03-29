"use client";

import { useState, useCallback, useMemo } from "react";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { MapView } from "@/components/map/MapView";
import { StationList } from "@/components/stations/StationList";
import { StationDetail } from "@/components/stations/StationDetail";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useStations } from "@/hooks/useStations";
import { PriceRangeProvider } from "@/providers/PriceRangeProvider";

// 悉尼 CBD 默认坐标
const DEFAULT_LAT = -33.8688;
const DEFAULT_LNG = 151.2093;
const DEFAULT_RADIUS = 15;

export default function Home() {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>("U91");
  const [sortBy, setSortBy] = useState<"price" | "distance">("price");
  const [activeStation, setActiveStation] =
    useState<StationWithDistance | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchSuburb, setSearchSuburb] = useState<string>("");

  const geo = useGeolocation();

  const userLocation =
    geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : null;

  // 用用户位置或默认悉尼坐标查询附近站点
  const queryLat = userLocation?.lat ?? DEFAULT_LAT;
  const queryLng = userLocation?.lng ?? DEFAULT_LNG;

  const stationsOpts = useMemo(
    () => ({
      fuel: selectedFuel,
      lat: searchSuburb ? null : queryLat,
      lng: searchSuburb ? null : queryLng,
      radius: DEFAULT_RADIUS,
      suburb: searchSuburb || undefined,
      limit: 200,
    }),
    [selectedFuel, queryLat, queryLng, searchSuburb],
  );

  const { stations, loading, total } = useStations(stationsOpts);

  const handleStationClick = useCallback((station: StationWithDistance) => {
    setActiveStation(station);
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchSuburb(query);
    setShowDetail(false);
    setActiveStation(null);
  }, []);

  const handleLocateMe = useCallback(() => {
    geo.locate();
    setSearchSuburb("");
    setSortBy("distance");
  }, [geo]);

  return (
    <PriceRangeProvider stations={stations} selectedFuel={selectedFuel}>
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 地图层 */}
      <MapView
        stations={stations}
        selectedFuel={selectedFuel}
        activeStationId={activeStation?.id ?? null}
        userLocation={userLocation}
        onStationClick={handleStationClick}
      />

      {/* Header 浮层 */}
      <Header selectedFuel={selectedFuel} onFuelChange={setSelectedFuel} />

      {/* 搜索栏浮层 */}
      <SearchBar
        onSearch={handleSearch}
        onLocateMe={handleLocateMe}
        locating={geo.loading}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 glass rounded-[var(--radius-pill)] px-4 py-2 text-xs text-text-secondary animate-fade-in">
          Loading stations...
        </div>
      )}

      {/* Desktop: 左侧面板 */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-96 z-20 flex-col">
        <div className="glass-heavy h-full border-r border-border-subtle shadow-panel mt-14">
          {showDetail && activeStation ? (
            <StationDetail
              station={activeStation}
              selectedFuel={selectedFuel}
              onClose={handleCloseDetail}
            />
          ) : (
            <StationList
              stations={stations}
              selectedFuel={selectedFuel}
              sortBy={sortBy}
              activeStationId={activeStation?.id ?? null}
              onStationClick={handleStationClick}
              onSortChange={setSortBy}
            />
          )}
        </div>
      </aside>

      {/* Mobile: 底部抽屉 */}
      <BottomSheet>
        {showDetail && activeStation ? (
          <StationDetail
            station={activeStation}
            selectedFuel={selectedFuel}
            onClose={handleCloseDetail}
          />
        ) : (
          <StationList
            stations={stations}
            selectedFuel={selectedFuel}
            sortBy={sortBy}
            activeStationId={activeStation?.id ?? null}
            onStationClick={handleStationClick}
            onSortChange={setSortBy}
          />
        )}
      </BottomSheet>
    </main>
    </PriceRangeProvider>
  );
}
