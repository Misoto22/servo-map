"use client";

import { useState, useEffect } from "react";
import type { StateMetadata, AustralianState } from "@servo-map/shared";
import { getMetadata } from "@/lib/api";

type Metadata = Record<AustralianState, StateMetadata>;

interface UseMetadataResult {
  metadata: Metadata | null;
  loading: boolean;
}

/**
 * 拉取每个州的 metadata（last_updated / station_count）。
 * 用于派生 live 州集合、首页新鲜度徽章与过期横幅。失败时静默降级为 null。
 */
export function useMetadata(): UseMetadataResult {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMetadata()
      .then(({ data }) => {
        if (!cancelled) setMetadata(data);
      })
      .catch(() => {
        // metadata 不可用不应阻断地图，静默降级
        if (!cancelled) setMetadata(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { metadata, loading };
}
