"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { MapView } from "@/components/map/MapView";
import { StationList } from "@/components/stations/StationList";
import { StationDetail } from "@/components/stations/StationDetail";
import { FreshnessBadge } from "@/components/stations/FreshnessBadge";
import { StaleBanner } from "@/components/stations/StaleBanner";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { LocationPrime } from "@/components/layout/LocationPrime";
import { FilterBar } from "@/components/filters/FilterBar";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useStations } from "@/hooks/useStations";
import { useMetadata } from "@/hooks/useMetadata";
import { useBrands } from "@/hooks/useBrands";
import { useFavourites } from "@/hooks/useFavourites";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { liveStates, formatLiveStates, latestUpdatedAt } from "@/lib/coverage";
import { haversineKm } from "@/lib/utils";
import { PriceRangeProvider } from "@/providers/PriceRangeProvider";

// 悉尼 CBD 默认坐标（冷启动默认视野，并非用户真实定位）
const DEFAULT_LAT = -33.8688;
const DEFAULT_LNG = 151.2093;
const DEFAULT_RADIUS = 20;

// 视野重查询门槛：中心移动 < 1km 且半径变化不大时不重新请求，减少冗余调用
const REFETCH_MIN_MOVE_KM = 1;

export default function Home() {
  // 记住用户上次选择的燃油类型（diesel/95/98 用户不必每次重选 U91）
  const [selectedFuel, setSelectedFuel] = useLocalStorage<FuelType>(
    "servo-map:fuel",
    "U91",
  );
  const [sortBy, setSortBy] = useState<"price" | "distance">("price");
  const [activeStation, setActiveStation] =
    useState<StationWithDistance | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchSuburb, setSearchSuburb] = useState<string>("");

  // 品牌多选筛选（客户端对已加载站点过滤，不额外请求 Worker）
  const { brands } = useBrands();
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // 收藏（无账号，localStorage）
  const { isFavourite, toggle: toggleFavourite, count: savedCount } =
    useFavourites();
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // 地图视野中心 — 当用户拖动地图时更新
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [mapRadius, setMapRadius] = useState(DEFAULT_RADIUS);

  // 记录上次实际触发查询的视野，用于门控冗余重查询
  const lastQueryRef = useRef({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    zoom: 12,
  });

  const geo = useGeolocation();
  // 用户是否已主动定位过（用于把悉尼默认视野标注为「默认」而非用户位置）
  const hasLocated = geo.lat != null && geo.lng != null;

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

  const { stations: rawStations, loading, noResults, error, refresh } =
    useStations(stationsOpts);

  // 品牌多选筛选：选中为空则透传全部
  const stations = useMemo(() => {
    if (selectedBrands.length === 0) return rawStations;
    const set = new Set(selectedBrands.map((b) => b.toLowerCase()));
    return rawStations.filter((s) => set.has(s.brand.toLowerCase()));
  }, [rawStations, selectedBrands]);

  const removeBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) => prev.filter((b) => b !== brand));
  }, []);
  const clearBrands = useCallback(() => setSelectedBrands([]), []);

  // 每州数据新鲜度 / 覆盖范围（live 州集合的单一事实来源）
  const { metadata } = useMetadata();
  const liveStateList = useMemo(() => liveStates(metadata), [metadata]);
  const liveStatesText = useMemo(
    () => formatLiveStates(liveStateList),
    [liveStateList],
  );

  // 当前视野内出现的州（用于展示对应州的新鲜度徽章）
  const visibleStates = useMemo(() => {
    const set = new Set(stations.map((s) => s.state));
    return liveStateList.filter((s) => set.has(s));
  }, [stations, liveStateList]);

  // 当前展示数据的最新更新时间：优先按可见州，否则取全部 live 州
  const viewLastUpdated = useMemo(
    () =>
      latestUpdatedAt(
        metadata,
        visibleStates.length ? visibleStates : liveStateList,
      ),
    [metadata, visibleStates, liveStateList],
  );

  // 非搜索状态下查询返回 0 个站点 → 该区域暂无覆盖（区别于搜索无结果）。
  // 用 rawStations 判定：品牌筛选导致的零结果不应被当成「无覆盖」。
  const noCoverage =
    !searchSuburb && !loading && !error && rawStations.length === 0;

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

  // 清除搜索 → 回到地图浏览模式（按当前地图中心重新查询）
  const handleClearSearch = useCallback(() => {
    setSearchSuburb("");
  }, []);

  const handleLocateMe = useCallback(() => {
    setSearchSuburb("");
    setSortBy("distance");
    // 定位成功后把查询中心切到用户位置，让「Locate me」真正显示附近价格。
    // 同步 lastQueryRef，避免随后程序化 flyTo 的 moveend 触发二次请求。
    geo.locate((coords) => {
      setMapCenter(coords);
      setMapRadius(DEFAULT_RADIUS);
      lastQueryRef.current = { ...coords, zoom: 13 };
    });
  }, [geo]);

  const toggleSavedOnly = useCallback(() => {
    setShowSavedOnly((v) => !v);
  }, []);

  // 地图移动后，用新的中心和可视范围重新查询。
  // 门控：中心移动 < 1km 且缩放未变化时跳过，避免微小拖动触发冗余 Worker/Mapbox 调用。
  const handleMoveEnd = useCallback(
    (bounds: { ne: [number, number]; sw: [number, number]; zoom: number }) => {
      const centerLat = (bounds.ne[1] + bounds.sw[1]) / 2;
      const centerLng = (bounds.ne[0] + bounds.sw[0]) / 2;

      const last = lastQueryRef.current;
      const movedKm = haversineKm(last.lat, last.lng, centerLat, centerLng);
      const zoomChanged = Math.abs(bounds.zoom - last.zoom) >= 0.5;
      if (movedKm < REFETCH_MIN_MOVE_KM && !zoomChanged) return;

      // 用对角线一半作为半径（粗略估算 km）
      const dlat = bounds.ne[1] - bounds.sw[1];
      const dlng = bounds.ne[0] - bounds.sw[0];
      const approxKm = (Math.sqrt(dlat * dlat + dlng * dlng) * 111) / 2;
      const radius = Math.max(5, Math.min(approxKm, 200));

      lastQueryRef.current = { lat: centerLat, lng: centerLng, zoom: bounds.zoom };

      // 用户手动拖动地图后，清除搜索词，切回 geo 模式
      setSearchSuburb("");
      setMapCenter({ lat: centerLat, lng: centerLng });
      setMapRadius(Math.round(radius));
    },
    [],
  );

  // 桌面侧栏与移动抽屉共享同一面板内容，避免重复 prop 接线
  const panelContent =
    showDetail && activeStation ? (
      <StationDetail
        station={activeStation}
        selectedFuel={selectedFuel}
        isFavourite={isFavourite(activeStation.id)}
        onToggleFavourite={() => toggleFavourite(activeStation.id)}
        onClose={handleCloseDetail}
      />
    ) : (
      <div className="flex flex-col h-full">
        <FilterBar
          brands={brands}
          selectedBrands={selectedBrands}
          onChangeBrands={setSelectedBrands}
          onRemoveBrand={removeBrand}
          onClearBrands={clearBrands}
        />
        <div className="flex-1 min-h-0">
          <StationList
            stations={stations}
            selectedFuel={selectedFuel}
            sortBy={sortBy}
            activeStationId={activeStation?.id ?? null}
            loading={loading}
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
            showSavedOnly={showSavedOnly}
            savedCount={savedCount}
            onToggleSavedOnly={toggleSavedOnly}
            onStationClick={handleStationClick}
            onSortChange={setSortBy}
          />
        </div>
      </div>
    );

  // 屏幕阅读器状态播报：加载 / 无结果 / 无覆盖 / 结果计数（polite，不打断当前朗读）
  const liveMessage = loading
    ? "Loading stations…"
    : error
      ? "Couldn’t load fuel prices."
      : noResults
        ? `No stations found for ${searchSuburb}.`
        : noCoverage
          ? "No live prices in this area yet."
          : stations.length > 0
            ? `Showing ${stations.length} station${stations.length !== 1 ? "s" : ""}.`
            : "";

  return (
    <PriceRangeProvider stations={stations} selectedFuel={selectedFuel}>
      {/* 跳转到主内容：键盘用户可绕过浮层直达地图/列表 */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* 视觉隐藏的页面标题，给读屏/SEO 一个明确的 h1 */}
      <h1 className="sr-only">
        ServoMap — live Australian fuel prices near you
      </h1>

      {/* 无障碍状态播报区（视觉隐藏，polite 朗读加载/无结果/计数） */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>

    <main
      id="main-content"
      tabIndex={-1}
      className="relative h-screen w-screen overflow-hidden outline-none"
    >
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
        value={searchSuburb}
        onClear={handleClearSearch}
      />

      {/* 数据新鲜度徽章 — 反映当前视野内 live 州的更新时间 */}
      {!loading && !error && !noResults && viewLastUpdated && stations.length > 0 && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <FreshnessBadge lastUpdated={viewLastUpdated} className="glass shadow-card" />
        </div>
      )}

      {/* 数据过期横幅 */}
      {!loading && !error && !noResults && viewLastUpdated && stations.length > 0 && (
        <div className="fixed top-40 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in">
          <StaleBanner lastUpdated={viewLastUpdated} className="glass shadow-card" />
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 glass rounded-[var(--radius-pill)] px-4 py-2 text-xs text-text-secondary animate-fade-in">
          Loading stations...
        </div>
      )}

      {/* 请求出错横幅 — 提供重试，区别于真正的零结果 */}
      {error && !loading && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in">
          <div className="glass-heavy rounded-[var(--radius-card)] border border-price-expensive/30 shadow-float px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              Couldn&rsquo;t load fuel prices. Check your connection and try
              again.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 px-3 py-1.5 rounded-[var(--radius-pill)] bg-ochre text-bg text-xs font-semibold hover:bg-ochre-dim transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 搜索无结果 — 保留搜索词，提供清除入口（避免自动清空造成的死路） */}
      {noResults && !loading && !error && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in">
          <div className="glass-heavy rounded-[var(--radius-card)] border border-border-subtle shadow-float px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              No stations found for &ldquo;{searchSuburb}&rdquo;.
              {liveStatesText ? ` Live now: ${liveStatesText}.` : ""}
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="shrink-0 px-3 py-1.5 rounded-[var(--radius-pill)] bg-surface-elevated text-text text-xs font-semibold border border-border-subtle hover:bg-surface-hover transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 区域无覆盖 — 诚实告知 live 州，而不是空白地图 */}
      {noCoverage && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in">
          <div className="glass-heavy rounded-[var(--radius-card)] border border-border-subtle shadow-float px-4 py-3 text-center">
            <p className="text-sm text-text font-medium">
              No live prices in this area yet
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {liveStatesText
                ? `Live now: ${liveStatesText}. Pan to a covered area or search a ${liveStateList[0]?.toUpperCase()} suburb.`
                : "Coverage is rolling out — pan to a covered area or try a search."}
            </p>
          </div>
        </div>
      )}

      {/* Desktop: 左侧面板 */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-96 z-20 flex-col">
        <div className="glass-heavy h-full border-r border-border-subtle shadow-panel mt-14">
          {panelContent}
        </div>
      </aside>

      {/* 定位预热提示 — 用户尚未定位、未搜索且无错误时出现，标注悉尼为默认视野 */}
      {!hasLocated && !searchSuburb && !error && (
        <LocationPrime onLocate={handleLocateMe} locating={geo.loading} />
      )}

      {/* Mobile: 底部抽屉。选中站点详情时展开并把焦点移入内容（键盘可达） */}
      <BottomSheet
        activeContentKey={showDetail && activeStation ? activeStation.id : null}
      >
        {panelContent}
      </BottomSheet>
    </main>
    </PriceRangeProvider>
  );
}
