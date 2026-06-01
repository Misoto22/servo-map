"use client";

import { BrandFilter } from "./BrandFilter";
import { FilterChips } from "./FilterChips";

interface FilterBarProps {
  brands: string[];
  selectedBrands: string[];
  onChangeBrands: (next: string[]) => void;
  onRemoveBrand: (brand: string) => void;
  onClearBrands: () => void;
}

/**
 * 列表面板顶部的筛选条：品牌多选 + 可移除标签。
 * 实时结果计数由 StationList 头部的 "Showing N stations" 承担。
 * 无可用品牌且未选中任何品牌时不渲染（保持面板简洁）。
 */
export function FilterBar({
  brands,
  selectedBrands,
  onChangeBrands,
  onRemoveBrand,
  onClearBrands,
}: FilterBarProps) {
  if (brands.length === 0 && selectedBrands.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2 border-b border-border-subtle space-y-2">
      <BrandFilter
        brands={brands}
        selected={selectedBrands}
        onChange={onChangeBrands}
      />
      <FilterChips
        brands={selectedBrands}
        onRemoveBrand={onRemoveBrand}
        onClearAll={onClearBrands}
      />
    </div>
  );
}
