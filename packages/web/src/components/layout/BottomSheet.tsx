"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type SheetPosition = "collapsed" | "half" | "full";

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
  /**
   * 当前展示内容的标识键。值变化时把抽屉展开并把焦点移入内容区。
   * 用于「在地图上选中站点 → 详情打开」时，让键盘/读屏用户的焦点跟进。
   */
  activeContentKey?: string | null;
}

const POSITIONS = {
  collapsed: "calc(100% - 80px)",
  half: "50%",
  full: "64px",
};

// 键盘/点击循环展开的顺序：collapsed → half → full → collapsed
const NEXT_POSITION: Record<SheetPosition, SheetPosition> = {
  collapsed: "half",
  half: "full",
  full: "collapsed",
};

export function BottomSheet({
  children,
  className,
  activeContentKey,
}: BottomSheetProps) {
  const [position, setPosition] = useState<SheetPosition>("half");
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startTop: 0, dragging: false });

  const handleDragStart = useCallback((clientY: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    dragRef.current = {
      startY: clientY,
      startTop: sheet.getBoundingClientRect().top,
      dragging: true,
    };
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    const dy = clientY - dragRef.current.startY;
    const newTop = Math.max(64, dragRef.current.startTop + dy);
    sheetRef.current.style.top = `${newTop}px`;
    sheetRef.current.style.transition = "none";
  }, []);

  const handleDragEnd = useCallback((clientY: number) => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    dragRef.current.dragging = false;
    sheetRef.current.style.transition = "";

    const vh = window.innerHeight;
    const top = sheetRef.current.getBoundingClientRect().top;
    const ratio = top / vh;

    if (ratio < 0.25) setPosition("full");
    else if (ratio < 0.65) setPosition("half");
    else setPosition("collapsed");

    sheetRef.current.style.top = "";
  }, []);

  // Touch events
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY),
    [handleDragStart],
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY),
    [handleDragMove],
  );
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => handleDragEnd(e.changedTouches[0].clientY),
    [handleDragEnd],
  );

  // Mouse events
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = (e: MouseEvent) => handleDragEnd(e.clientY);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [handleDragMove, handleDragEnd]);

  // 选中站点（activeContentKey 变化为非空）时展开抽屉并把焦点移入内容，
  // 让键盘用户从地图操作平滑过渡到详情，而不必再去抓取手柄。
  // 展开与聚焦都放进异步回调：避免在 effect 体内同步 setState 触发级联渲染。
  useEffect(() => {
    if (!activeContentKey) return;
    const id = window.setTimeout(() => {
      setPosition((p) => (p === "collapsed" ? "half" : p));
      contentRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeContentKey]);

  // 键盘操作手柄：Enter/Space 循环展开，方向键上下精细调整高度
  const handleHandleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPosition((p) => NEXT_POSITION[p]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPosition((p) => (p === "collapsed" ? "half" : "full"));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPosition((p) => (p === "full" ? "half" : "collapsed"));
    }
  }, []);

  const isExpanded = position !== "collapsed";

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label="Station list"
      className={cn(
        "fixed left-0 right-0 bottom-0 z-30 glass-heavy rounded-t-[var(--radius-panel)] border-t border-border-subtle shadow-panel transition-[top] duration-[var(--duration-slow)] ease-[var(--ease-out-expo)] md:hidden",
        className,
      )}
      style={{ top: POSITIONS[position] }}
    >
      {/* 可键盘操作的手柄 — 真实 button，带 aria-expanded，触摸/鼠标拖拽仍可用 */}
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? "Collapse station panel"
            : "Expand station panel"
        }
        className="w-full py-2 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onKeyDown={handleHandleKeyDown}
      >
        <span className="grab-handle block" />
      </button>

      <div
        ref={contentRef}
        tabIndex={-1}
        className="overflow-y-auto outline-none"
        style={{ maxHeight: `calc(100vh - ${POSITIONS[position]} - 40px)` }}
      >
        {children}
      </div>
    </div>
  );
}
