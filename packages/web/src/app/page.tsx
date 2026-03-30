"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
const DEFAULT_RADIUS = 20;

export default function Home() {
  const [selectedFuel, setSelectedFuel] = useState<FuelType>("U91");
  const [sortBy, setSortBy] = useState<"price" | "distance">("price");
  const [activeStation, setActiveStation] =
    useState<StationWithDistance | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchSuburb, setSearchSuburb] = useState<string>("");

  // 地图视野中心 — 当用户拖动地图时更新
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [mapRadius, setMapRadius] = useState(DEFAULT_RADIUS);

  const geo = useGeolocation();

  const userLocation =
    geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : null;

  const stationsOpts = useMemo(
    () => ({
      fuel: selectedFuel,
      lat: searchSuburb ? null : mapCenter.lat,
      lng: searchSuburb ? null : mapCenter.lng,
      radius: mapRadius,
      q: searchSuburb || undefined,
      limit: 500,
    }),
    [selectedFuel, mapCenter.lat, mapCenter.lng, mapRadius, searchSuburb],
  );

  const { stations, loading, total, noResults } = useStations(stationsOpts);

  // 搜索无结果时自动清除搜索词，保留地图当前数据
  useEffect(() => {
    if (noResults) {
      const timer = setTimeout(() => setSearchSuburb(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [noResults]);

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

  // 地图移动后，用新的中心和可视范围重新查询
  const handleMoveEnd = useCallback(
    (bounds: { ne: [number, number]; sw: [number, number] }) => {
      const centerLat = (bounds.ne[1] + bounds.sw[1]) / 2;
      const centerLng = (bounds.ne[0] + bounds.sw[0]) / 2;

      // 用对角线一半作为半径（粗略估算 km）
      const dlat = bounds.ne[1] - bounds.sw[1];
      const dlng = bounds.ne[0] - bounds.sw[0];
      const approxKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111 / 2;
      const radius = Math.max(5, Math.min(approxKm, 200));

      // 用户手动拖动地图后，清除搜索词，切回 geo 模式
      setSearchSuburb("");
      setMapCenter({ lat: centerLat, lng: centerLng });
      setMapRadius(Math.round(radius));
    },
    [],
  );

  // 用户定位成功后，更新地图中心
  const effectiveLat = userLocation?.lat ?? DEFAULT_LAT;
  const effectiveLng = userLocation?.lng ?? DEFAULT_LNG;
  // 只在首次定位时同步到 mapCenter
  // （后续由 onMoveEnd 控制）

  return (
    <PriceRangeProvider stations={stations} selectedFuel={selectedFuel}>
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 地图层 */}
      <MapView
        stations={stations}
        selectedFuel={selectedFuel}
        activeStationId={activeStation?.id ?? null}
        userLocation={userLocation}
        searchQuery={searchSuburb}
        onStationClick={handleStationClick}
        onMoveEnd={handleMoveEnd}
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

      {/* 搜索无结果提示 */}
      {noResults && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 glass rounded-[var(--radius-pill)] px-4 py-2 text-xs text-text-secondary animate-fade-in">
          No stations found for &ldquo;{searchSuburb}&rdquo;
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
