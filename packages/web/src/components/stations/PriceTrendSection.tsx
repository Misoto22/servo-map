import type { FuelType, PriceSnapshot } from "@servo-map/shared";
import { PriceTrendChart } from "./PriceTrendChart";
import {
  cheapestDayToFill,
  cyclePosition,
  seriesForFuel,
  type CyclePosition,
} from "@/lib/trends";
import { formatPriceCents } from "@/lib/utils";

interface Props {
  series: PriceSnapshot[];
  fuel: FuelType;
  /** Uppercase state code, e.g. "NSW" — labels the (state-level) trend. */
  stateLabel: string;
}

const CYCLE_COPY: Record<CyclePosition, string> = {
  low: "Prices are near the LOW of the recent cycle — a good time to fill up.",
  mid: "Prices are around the MID of the recent cycle.",
  high: "Prices are near the HIGH of the recent cycle — hold off if you can.",
};

/**
 * "Price trend" section: the SVG chart plus the cheapest-day and cycle-position
 * insights. History is captured per state, so this is honestly labelled as the
 * state's trend rather than suburb-specific. Renders nothing if the fuel has no
 * snapshots — callers also guard on an empty series, this is belt-and-braces.
 */
export function PriceTrendSection({ series, fuel, stateLabel }: Props) {
  const snapshots = seriesForFuel(series, fuel);
  if (snapshots.length === 0) return null;

  const cheapest = cheapestDayToFill(series, fuel);
  const cycle = cyclePosition(series, fuel);

  return (
    <section className="mt-12 animate-slide-up">
      <h2 className="font-display font-bold text-xl text-text mb-1">
        Price trend
      </h2>
      <p className="text-xs text-text-muted mb-4">
        {stateLabel} {fuel} daily average across the state. Updated daily.
      </p>

      <PriceTrendChart series={series} fuel={fuel} state={stateLabel} />

      <div className="mt-4 space-y-2 text-sm text-text-secondary">
        {cheapest && (
          <p>
            Cheapest day to fill in {stateLabel}:{" "}
            <span className="font-semibold text-text">{cheapest.weekday}</span>{" "}
            <span className="text-text-muted">
              (avg {formatPriceCents(cheapest.avg)}c)
            </span>
          </p>
        )}
        {cycle && <p>{CYCLE_COPY[cycle.position]}</p>}
      </div>
    </section>
  );
}
