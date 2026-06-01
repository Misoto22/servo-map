"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface BrandFilterProps {
  brands: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * 可搜索的品牌多选弹层。点击外部或 Esc 关闭。
 * 选中集合通过受控 prop 上提，由 page 负责把它喂给客户端筛选。
 */
export function BrandFilter({ brands, selected, onChange }: BrandFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.toLowerCase().includes(q));
  }, [brands, search]);

  const toggle = (brand: string) => {
    onChange(
      selected.includes(brand)
        ? selected.filter((b) => b !== brand)
        : [...selected, brand],
    );
  };

  if (brands.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium border transition-colors",
          selected.length > 0
            ? "bg-ochre/15 border-ochre/40 text-ochre"
            : "bg-surface border-border-subtle text-text-secondary hover:text-text hover:bg-surface-hover",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        Brand
        {selected.length > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-ochre text-bg text-[10px] font-bold tabular-nums">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-60 z-50 glass-heavy rounded-[var(--radius-card)] border border-border-subtle shadow-float animate-scale-in origin-top-left"
          role="listbox"
        >
          {/* 搜索框 */}
          <div className="p-2 border-b border-border-subtle">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands..."
              autoFocus
              className="w-full bg-surface rounded-[var(--radius-button)] px-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none border border-transparent focus:border-ochre/40 transition-colors"
            />
          </div>

          {/* 已选 → 清除全部 */}
          {selected.length > 0 && (
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left text-[11px] text-text-muted hover:text-text transition-colors py-1"
              >
                Clear {selected.length} selected
              </button>
            </div>
          )}

          {/* 品牌列表 */}
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">
                No brands match
              </p>
            ) : (
              filtered.map((brand) => {
                const isOn = selected.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => toggle(brand)}
                    role="option"
                    aria-selected={isOn}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-button)] text-xs text-text hover:bg-surface-hover transition-colors text-left"
                  >
                    <span
                      className={cn(
                        "shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors",
                        isOn
                          ? "bg-ochre border-ochre text-bg"
                          : "border-border text-transparent",
                      )}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="truncate">{brand}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
