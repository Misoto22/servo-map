"use client";

import { useState } from "react";

interface LocationPrimeProps {
  /** 点击「See prices near you」→ 触发显式定位 */
  onLocate: () => void;
  locating?: boolean;
}

/**
 * 定位预热提示。绝不自动弹权限框 —— 只用文案说明当前是默认视野（悉尼），
 * 并提供一个显式的「See prices near you」按钮把意图前置，由用户主动授权。
 * 可关闭，关闭后本次会话不再出现。
 */
export function LocationPrime({ onLocate, locating }: LocationPrimeProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-[26rem] md:translate-x-0 z-40 w-[calc(100%-2rem)] max-w-sm px-0 animate-slide-up">
      <div className="glass-heavy rounded-[var(--radius-card)] border border-border-subtle shadow-float px-4 py-3 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-ochre/15 flex items-center justify-center text-ochre">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text leading-tight">
            See prices near you
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Showing Sydney by default — tap to use your location.
          </p>
        </div>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className="shrink-0 px-3 py-1.5 rounded-[var(--radius-pill)] bg-ochre text-bg text-xs font-semibold hover:bg-ochre-dim transition-colors disabled:opacity-60"
        >
          {locating ? "Locating…" : "Locate me"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
