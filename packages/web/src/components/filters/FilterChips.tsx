"use client";

interface FilterChipsProps {
  brands: string[];
  onRemoveBrand: (brand: string) => void;
  onClearAll: () => void;
}

/**
 * 已生效筛选的可移除标签。每个标签点 X 移除单个品牌；
 * 多于一个时给一个 "Clear all"。空筛选时不渲染。
 */
export function FilterChips({
  brands,
  onRemoveBrand,
  onClearAll,
}: FilterChipsProps) {
  if (brands.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {brands.map((brand) => (
        <span
          key={brand}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-[var(--radius-pill)] bg-ochre/15 border border-ochre/30 text-ochre text-[11px] font-medium animate-scale-in"
        >
          {brand}
          <button
            type="button"
            onClick={() => onRemoveBrand(brand)}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-ochre/20 transition-colors"
            aria-label={`Remove ${brand} filter`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}

      {brands.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-text-muted hover:text-text transition-colors px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
