"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 把一段状态持久化到 localStorage，并在挂载时恢复。
 *
 * - SSR 安全：首渲染始终返回 initialValue，避免 hydration 不匹配；
 *   真正的本地值在 effect 中读取后再注入（hydrated 后）。
 * - 跨标签页同步：监听 storage 事件，让多个标签页保持一致。
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  // 挂载后从 localStorage 恢复（仅客户端，避免 SSR/hydration 冲突）
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // 解析失败（损坏数据）→ 保留 initialValue，不抛错打断渲染
    }
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // 存储配额满或隐私模式 → 仍更新内存态，只是不持久化
        }
        return resolved;
      });
    },
    [key],
  );

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setValue(e.newValue !== null ? (JSON.parse(e.newValue) as T) : initialValue);
      } catch {
        // 忽略其它标签页写入的损坏数据
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // initialValue 仅作为解析失败/清空时的回退；key 变化才需重订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, set];
}
