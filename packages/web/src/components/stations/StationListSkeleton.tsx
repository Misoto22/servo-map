"use client";

/**
 * 站点列表加载骨架屏。在请求进行中替代空白，给出布局占位与动效。
 */
export function StationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-2 py-2 space-y-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 rounded-[var(--radius-card)] border border-transparent"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3.5 w-14 rounded skeleton-shimmer" />
              <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded skeleton-shimmer" />
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <div className="h-5 w-12 rounded skeleton-shimmer ml-auto" />
              <div className="h-2.5 w-8 rounded skeleton-shimmer ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
