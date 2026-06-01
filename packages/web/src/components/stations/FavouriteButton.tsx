"use client";

import { cn } from "@/lib/utils";

interface FavouriteButtonProps {
  active: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 收藏星标按钮。受控（active）+ 上报点击（onToggle）。
 * 内部 stopPropagation，避免在卡片内触发卡片自身的点击。
 */
export function FavouriteButton({
  active,
  onToggle,
  size = "sm",
  className,
}: FavouriteButtonProps) {
  const px = size === "sm" ? 16 : 20;
  const box = size === "sm" ? "w-7 h-7" : "w-9 h-9";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from saved" : "Save station"}
      className={cn(
        "shrink-0 rounded-lg flex items-center justify-center transition-colors",
        box,
        active
          ? "text-ochre hover:bg-ochre/10"
          : "text-text-muted hover:text-ochre hover:bg-surface-hover",
        className,
      )}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
}
