import type { FuelType, PriceSnapshot } from "@servo-map/shared";
import { seriesForFuel } from "@/lib/trends";
import { formatPriceCents } from "@/lib/utils";

interface Props {
  series: PriceSnapshot[];
  fuel: FuelType;
  /** Human label for the trend's scope, e.g. "NSW" — used in the aria summary. */
  state: string;
  /** Optional caption rendered above the chart. */
  label?: string;
}

// Fixed SVG viewBox; the chart scales to its container via width=100%.
const VIEW_W = 600;
const VIEW_H = 160;
const PAD_X = 8;
const PAD_Y = 12;

/**
 * Inline SVG price trend for one fuel: a min–max area band plus an avg
 * polyline. Theme-aware through CSS color tokens (ochre + text-muted), no
 * client JS and no chart library. Renders a "not enough history" note when the
 * window has fewer than two points so the section never shows an empty box.
 */
export function PriceTrendChart({ series, fuel, state, label }: Props) {
  const snapshots = seriesForFuel(series, fuel);

  if (snapshots.length < 2) {
    return (
      <figure className="rounded-[var(--radius-card)] border border-border-subtle bg-surface px-5 py-6">
        {label && (
          <figcaption className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            {label}
          </figcaption>
        )}
        <p className="text-sm text-text-muted">Not enough history yet.</p>
      </figure>
    );
  }

  // Domain across the whole window, with light padding so the band never
  // touches the chart edges. Guard a flat window (min === max) against a
  // zero span that would collapse every y to the same line.
  let lo = snapshots[0].min;
  let hi = snapshots[0].max;
  for (const s of snapshots) {
    if (s.min < lo) lo = s.min;
    if (s.max > hi) hi = s.max;
  }
  const span = hi - lo || 1;
  const padded = span * 0.08;
  const domainLo = lo - padded;
  const domainHi = hi + padded;
  const domainSpan = domainHi - domainLo;

  const innerW = VIEW_W - PAD_X * 2;
  const innerH = VIEW_H - PAD_Y * 2;
  const n = snapshots.length; // guaranteed >= 2 past the guard above

  const x = (i: number) => PAD_X + (i / (n - 1)) * innerW;
  const y = (price: number) =>
    PAD_Y + innerH - ((price - domainLo) / domainSpan) * innerH;

  // Area band: max edge left→right, then min edge right→left, closed.
  const topEdge = snapshots.map((s, i) => `${x(i)},${y(s.max)}`);
  const bottomEdge = snapshots.map((s, i) => `${x(i)},${y(s.min)}`).reverse();
  const bandPoints = [...topEdge, ...bottomEdge].join(" ");

  const avgLine = snapshots.map((s, i) => `${x(i)},${y(s.avg)}`).join(" ");

  const latest = snapshots[n - 1].avg;
  const windowLow = Math.min(...snapshots.map((s) => s.avg));
  const windowHigh = Math.max(...snapshots.map((s) => s.avg));

  const summary =
    `${state} ${fuel} price trend over ${n} day${n !== 1 ? "s" : ""}: ` +
    `latest average ${formatPriceCents(latest)}c per litre, ` +
    `ranging from a low of ${formatPriceCents(windowLow)}c ` +
    `to a high of ${formatPriceCents(windowHigh)}c.`;

  return (
    <figure className="rounded-[var(--radius-card)] border border-border-subtle bg-surface px-5 py-4">
      {label && (
        <figcaption className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          {label}
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="auto"
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
        className="block text-ochre"
      >
        {/* min–max band — ochre tint that follows the theme via currentColor */}
        <polygon points={bandPoints} fill="currentColor" fillOpacity="0.12" />
        {/* avg polyline */}
        <polyline
          points={avgLine}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Screen-reader fallback restating the same summary as plain text. */}
      <p className="sr-only">{summary}</p>
    </figure>
  );
}
