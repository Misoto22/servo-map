"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** 要分享的标题（站名 + 品牌） */
  title: string;
  /** 分享的相对路径，如 /station/nsw-123 */
  path: string;
  className?: string;
}

/**
 * 分享按钮：优先用 Web Share API（移动端原生分享），
 * 不支持时回退到复制链接到剪贴板并给出短暂的 "Copied" 反馈。
 */
export function ShareButton({ title, path, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // 运行时才能拿到绝对地址（SSR 阶段没有 window）
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // 用户取消分享（AbortError）→ 静默返回，不回退到复制
        if (err instanceof DOMException && err.name === "AbortError") return;
        // 其它失败 → 继续走复制回退
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板也不可用（无权限/非安全上下文）→ 无声失败，避免抛错
    }
  }, [title, path]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold text-sm transition-colors",
        className,
      )}
      aria-label="Share this station"
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Link copied
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
