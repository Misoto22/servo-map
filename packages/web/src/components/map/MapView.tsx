"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import MapGL, {
  Marker,
  Source,
  Layer,
  NavigationControl,
  type MapRef,
  type ViewStateChangeEvent,
  type MapLayerMouseEvent,
  type CircleLayer,
  type SymbolLayer,
  type GeoJSONSource,
} from "react-map-gl";
import type { ExpressionSpecification } from "mapbox-gl";
import type { StationWithDistance, FuelType } from "@servo-map/shared";
import {
  getFuelPrice,
  formatPriceCents,
  computePriceRange,
  tierHex,
} from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { usePriceRange } from "@/providers/PriceRangeProvider";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// 澳洲中心
const INITIAL_VIEW = {
  latitude: -33.8688,
  longitude: 151.2093,
  zoom: 12,
};

// GeoJSON 数据源 / 图层 id，集中声明避免散落字符串拼写错误
const SOURCE_ID = "stations";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";
const POINT_LAYER_ID = "unclustered-point";

// 站点 feature 的属性载荷。tier 用 0/1/2 编码便于在样式表达式里 match。
interface StationFeatureProps {
  id: string;
  brand: string;
  /** 当前选中燃油的价格（分），用于排序时取最小值聚合 */
  price: number;
  /** 价格档位：0 cheap / 1 mid / 2 expensive */
  tier: number;
  /** 已格式化的价格文本，直接作为 symbol text-field */
  label: string;
}

interface MapViewProps {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  activeStationId: string | null;
  userLocation: { lat: number; lng: number } | null;
  searchQuery: string;
  onStationClick: (station: StationWithDistance) => void;
  onMoveEnd?: (bounds: {
    ne: [number, number];
    sw: [number, number];
    zoom: number;
  }) => void;
}

export function MapView({
  stations,
  selectedFuel,
  activeStationId,
  userLocation,
  searchQuery,
  onStationClick,
  onMoveEnd,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const range = usePriceRange();
  const [ready, setReady] = useState(false);

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  // 把站点构建为 GeoJSON FeatureCollection。
  // 没有当前燃油价格的站点直接跳过（与旧 Marker 渲染的 `if (!fp) return null` 一致）。
  // 复用 PriceRangeProvider 的阈值；provider 缺失时本地兜底计算，保证档位语义不丢。
  const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, StationFeatureProps>>(() => {
    const priced = stations
      .map((s) => {
        const fp = getFuelPrice(s.prices, selectedFuel);
        return fp ? { station: s, price: fp.price } : null;
      })
      .filter((x): x is { station: StationWithDistance; price: number } => x !== null);

    const effectiveRange =
      range ?? computePriceRange(priced.map((p) => p.price));

    return {
      type: "FeatureCollection",
      features: priced.map(({ station, price }) => {
        const tier =
          price <= effectiveRange.cheapBelow
            ? 0
            : price <= effectiveRange.midBelow
              ? 1
              : 2;
        return {
          type: "Feature" as const,
          // promoteId 会把 properties.id 提升为 feature.id，用于 feature-state 高亮
          id: station.id,
          geometry: { type: "Point" as const, coordinates: [station.lng, station.lat] },
          properties: {
            id: station.id,
            brand: station.brand,
            price,
            tier,
            label: formatPriceCents(price),
          },
        };
      }),
    };
  }, [stations, selectedFuel, range]);

  // id → station 映射，点击 unclustered point 时回查原始站点对象
  const stationById = useMemo(() => {
    const m = new globalThis.Map<string, StationWithDistance>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

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

  // 搜索结果返回后，将地图视野调整到结果范围
  useEffect(() => {
    if (!searchQuery || stations.length === 0 || !mapRef.current) return;

    if (stations.length === 1) {
      mapRef.current.flyTo({
        center: [stations[0].lng, stations[0].lat],
        zoom: 14,
        duration: 1200,
      });
    } else {
      // 计算所有搜索结果的边界
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      for (const s of stations) {
        if (s.lat < minLat) minLat = s.lat;
        if (s.lat > maxLat) maxLat = s.lat;
        if (s.lng < minLng) minLng = s.lng;
        if (s.lng > maxLng) maxLng = s.lng;
      }
      mapRef.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 60, maxZoom: 15, duration: 1200 },
      );
    }
  }, [searchQuery, stations]);

  // 高亮选中站点：用 feature-state 而非重建 FeatureCollection，避免每次选中都重跑聚类。
  // 记录上一次高亮的 id 以便切换时清除状态。
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const prev = prevActiveRef.current;
    if (prev && prev !== activeStationId) {
      map.removeFeatureState({ source: SOURCE_ID, id: prev }, "active");
    }
    if (activeStationId) {
      map.setFeatureState(
        { source: SOURCE_ID, id: activeStationId },
        { active: true },
      );
    }
    prevActiveRef.current = activeStationId;
  }, [activeStationId, ready, data]);

  // 只上报用户手动触发的移动。程序化移动(flyTo/fitBounds)没有 originalEvent，
  // 忽略它们可以避免搜索后的自动飞行把 searchSuburb 清空。
  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      if (!mapRef.current || !onMoveEnd) return;
      if (!e.originalEvent) return;
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        onMoveEnd({
          ne: [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
          sw: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
          zoom: mapRef.current.getZoom(),
        });
      }
    },
    [onMoveEnd],
  );

  // 点击：聚类点 → 展开缩放；单站点 → 选中并打开详情
  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current;
      const feature = e.features?.[0];
      if (!map || !feature) return;

      // 聚类点：properties.cluster 为 true，按 getClusterExpansionZoom 缩放进去
      if (feature.properties?.cluster) {
        const clusterId = feature.properties.cluster_id as number;
        const source = map.getSource<GeoJSONSource>(SOURCE_ID);
        if (!source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [lng, lat], zoom, duration: 500 });
        });
        return;
      }

      // 单站点：回查原始站点对象后交给上层（选中 + 列表高亮 + 详情）
      const id = feature.properties?.id as string | undefined;
      if (!id) return;
      const station = stationById.get(id);
      if (station) onStationClick(station);
    },
    [onStationClick, stationById],
  );

  // 悬停聚类点 / 站点时显示手型光标
  const handleMouseEnter = useCallback(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = "pointer";
  }, []);
  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = "";
  }, []);

  // 档位 → 颜色的数据驱动表达式，单站点文字共用。
  // 颜色随主题切换：浅色底图用更深的同色系以满足 WCAG AA 对比度（见 utils.tierHex）。
  const tierColor = useMemo<ExpressionSpecification>(
    () => [
      "match",
      ["get", "tier"],
      0,
      tierHex("cheap", theme),
      1,
      tierHex("fair", theme),
      2,
      tierHex("pricey", theme),
      tierHex("fair", theme),
    ],
    [theme],
  );

  const clusterLayer: CircleLayer = {
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#E8843C", // ochre，与品牌色一致
      // 站点越多圆越大：50/200 为分级阈值
      "circle-radius": ["step", ["get", "point_count"], 16, 50, 22, 200, 28],
      "circle-opacity": 0.9,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255,255,255,0.6)",
    },
  };

  const clusterCountLayer: SymbolLayer = {
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 13,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ffffff",
    },
  };

  // 单站点：价格气泡（背景圆 + 价格文本），文字颜色按档位，选中时整体描边加粗
  const pointLayer: SymbolLayer = {
    id: POINT_LAYER_ID,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
      // 注意：layout 属性不支持 feature-state 表达式，选中态高亮全部放在 paint 里
      "text-size": 12,
      "text-allow-overlap": false,
      "text-padding": 2,
      "symbol-sort-key": ["get", "price"], // 价格低的优先显示，碰撞时保留便宜的
    },
    paint: {
      "text-color": tierColor,
      // 选中态：用档位色作为光晕并加粗，未选中态用与底图对比的描边保证可读性
      "text-halo-color": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        tierColor,
        theme === "dark" ? "#0C0B09" : "#FAF7F2",
      ],
      "text-halo-width": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        3,
        1.5,
      ],
    },
  };

  return (
    <div className="absolute inset-0">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        mapStyle={mapStyle}
        onMoveEnd={handleMoveEnd}
        onLoad={() => setReady(true)}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={[CLUSTER_LAYER_ID, POINT_LAYER_ID]}
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

        {/* 加油站聚类图层 — Mapbox 原生 GeoJSON clustering，取代逐个 DOM Marker */}
        {ready && (
          <Source
            id={SOURCE_ID}
            type="geojson"
            data={data}
            cluster
            clusterMaxZoom={13}
            clusterRadius={48}
            promoteId="id"
          >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...pointLayer} />
          </Source>
        )}
      </MapGL>

      {/* 价格档位图例 — 颜色之外再给文字标签，避免色觉依赖（WCAG 1.4.1）。
          桌面端常驻；移动端被底部抽屉遮挡，故 md 以下隐藏，列表是其无障碍替代路径。 */}
      <div
        className="hidden md:block absolute bottom-6 left-4 z-10 glass rounded-[var(--radius-card)] border border-border-subtle shadow-card px-3 py-2 pointer-events-none"
        aria-hidden="true"
      >
        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
          Price · relative to nearby
        </p>
        <ul className="flex items-center gap-3">
          {(
            [
              ["cheap", "Cheap"],
              ["fair", "Fair"],
              ["pricey", "Pricey"],
            ] as const
          ).map(([tier, label]) => (
            <li key={tier} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tierHex(tier, theme) }}
              />
              <span className="text-[11px] font-medium text-text-secondary">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
