"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onLocateMe: () => void;
  locating?: boolean;
}

export function SearchBar({ onSearch, onLocateMe, locating }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      inputRef.current?.blur();
    }
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-slide-up delay-2">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "glass-heavy rounded-[var(--radius-panel)] border shadow-float transition-all duration-[var(--duration-normal)]",
            focused
              ? "border-ochre/50 shadow-[0_0_0_1px_var(--color-ochre),var(--shadow-float)]"
              : "border-border-subtle",
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* 搜索图标 */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search suburb or postcode..."
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
            />

            {/* 快捷键提示 */}
            {!focused && !query && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted border border-border-subtle bg-surface-elevated">
                /
              </kbd>
            )}

            {/* 定位按钮 */}
            <button
              type="button"
              onClick={onLocateMe}
              disabled={locating}
              className={cn(
                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-[var(--duration-fast)]",
                locating
                  ? "text-ochre animate-pulse-soft"
                  : "text-text-muted hover:text-ochre hover:bg-surface-hover",
              )}
              aria-label="Use my location"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
