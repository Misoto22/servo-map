"use client";

import { useState, useEffect } from "react";
import { getBrands } from "@/lib/api";

/**
 * 加载可用品牌列表（用于品牌筛选下拉）。
 * 品牌集合变化极慢，挂载时取一次即可，失败时静默回退到空数组
 * （筛选 UI 自然隐藏，不阻断主流程）。
 */
export function useBrands() {
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBrands()
      .then((res) => {
        if (!cancelled) setBrands([...res.data].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { brands, loading };
}
