"use client";

import { ThemeToggle } from "./ThemeToggle";
import { FUEL_TYPES, type FuelType } from "@servo-map/shared";
import { cn } from "@/lib/utils";

interface HeaderProps {
  selectedFuel: FuelType;
  onFuelChange: (fuel: FuelType) => void;
}

export function Header({ selectedFuel, onFuelChange }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <div className="pointer-events-auto animate-fade-in">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-ochre flex items-center justify-center transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-expo)] group-hover:scale-110">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-bg">
                <path d="M3 22V12l9-9 9 9v10" />
                <path d="M12 7v8" />
                <path d="M9 11h6" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-text hidden sm:block">
              ServoMap
            </span>
          </a>
        </div>

        {/* 燃油类型快捷切换 */}
        <div className="pointer-events-auto animate-fade-in delay-1">
          <div className="glass rounded-[var(--radius-pill)] border border-border-subtle shadow-float p-1 flex gap-0.5">
            {FUEL_TYPES.map((fuel) => (
              <button
                key={fuel}
                onClick={() => onFuelChange(fuel)}
                className={cn(
                  "px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-semibold transition-all duration-[var(--duration-fast)]",
                  selectedFuel === fuel
                    ? "bg-ochre text-bg shadow-sm"
                    : "text-text-secondary hover:text-text hover:bg-surface-hover",
                )}
              >
                {fuel}
              </button>
            ))}
          </div>
        </div>

        {/* Theme toggle */}
        <div className="pointer-events-auto animate-fade-in delay-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
