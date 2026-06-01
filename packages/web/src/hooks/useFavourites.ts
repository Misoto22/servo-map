"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "servo-map:favourites";

/**
 * 收藏站点（无账号，纯 localStorage）。
 * 只存 station id —— 站点详情按需从已加载列表里取，避免存陈旧价格。
 */
export function useFavourites() {
  const [ids, setIds] = useLocalStorage<string[]>(STORAGE_KEY, []);

  // 用 Set 做 O(1) 判定，避免每张卡片 includes 全量数组
  const idSet = useMemo(() => new Set(ids), [ids]);

  const isFavourite = useCallback(
    (id: string) => idSet.has(id),
    [idSet],
  );

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [setIds],
  );

  return { favouriteIds: ids, isFavourite, toggle, count: ids.length };
}
