"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SheetPosition = "collapsed" | "half" | "full";

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
}

const POSITIONS = {
  collapsed: "calc(100% - 80px)",
  half: "50%",
  full: "64px",
};

export function BottomSheet({ children, className }: BottomSheetProps) {
  const [position, setPosition] = useState<SheetPosition>("half");
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startTop: 0, dragging: false });

  const handleDragStart = useCallback(
    (clientY: number) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      dragRef.current = {
        startY: clientY,
        startTop: sheet.getBoundingClientRect().top,
        dragging: true,
      };
    },
    [],
  );

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

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed left-0 right-0 bottom-0 z-30 glass-heavy rounded-t-[var(--radius-panel)] border-t border-border-subtle shadow-panel transition-[top] duration-[var(--duration-slow)] ease-[var(--ease-out-expo)] md:hidden",
        className,
      )}
      style={{ top: POSITIONS[position] }}
    >
      {/* Grab handle */}
      <div
        className="py-2 cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
      >
        <div className="grab-handle" />
      </div>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: `calc(100vh - ${POSITIONS[position]} - 40px)` }}
      >
        {children}
      </div>
    </div>
  );
}
