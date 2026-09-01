"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// ADR 006 — Recharts encapsulated behind this wrapper. No screen imports
// "recharts" directly (components/ui/chart-encapsulation.test.ts guards
// this); the API below is deliberately narrow (data + x key + series), not
// a pass-through of Recharts' own props.
//
// Series colours: Recharts applies its own default series stroke colour
// (read from node_modules/recharts source, not reproduced here as a hex
// literal — that would itself defeat check-design-tokens) whenever
// `stroke` is omitted, and that default does not follow this app's `.dark`
// re-theme. Every line series below receives its colour explicitly via
// `var(--color-…)`, resolved by the browser per paint — verified on the
// rendered SVG (see the story report), not on the lint
// (`check-design-tokens` only walks app|components|lib source text; it has
// no visibility into what recharts renders).
const SERIES_PALETTE = [
  "var(--color-lime)",
  "var(--color-link)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-cat-sector)",
] as const

export type ChartDatum = Record<string, string | number>

export type ChartLineSeries = {
  /** Key read off each datum in `data`. */
  key: string
  /** Legend / tooltip label — pass an already-translated string. */
  label: string
  /** Explicit token override; defaults to the next colour in the palette. */
  color?: string
}

/** Line chart: trend over an ordered axis (dates, steps…). Client Component. */
export function ChartLine({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: ChartDatum[]
  xKey: string
  series: ChartLineSeries[]
  height?: number
}) {
  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      // Positive initial size so the chart renders on first paint (server
      // and client) instead of waiting for a ResizeObserver measurement —
      // ResponsiveContainer otherwise renders nothing until mounted in a
      // real, sized DOM node.
      initialDimension={{ width: 640, height }}
    >
      <LineChart data={data}>
        <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          stroke="var(--color-line)"
          tick={{ fill: "var(--color-muted)" }}
          tickLine={{ stroke: "var(--color-line)" }}
        />
        <YAxis
          stroke="var(--color-line)"
          tick={{ fill: "var(--color-muted)" }}
          tickLine={{ stroke: "var(--color-line)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-input)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? SERIES_PALETTE[i % SERIES_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            // No isAnimationActive override (review, s14-dataviz-and-
            // combobox): a transient mid-draw frame was observed at ~400ms
            // right after ResponsiveContainer's ResizeObserver corrects its
            // initial-size fallback to the real, measured container width,
            // but it was never reproduced as a permanent freeze — the SVG
            // settles by ~1.2s, `d` byte-identical to a build with the
            // animation disabled. Recharts 3's default ('auto') already
            // honours `prefers-reduced-motion`; hardcoding `false` would
            // remove motion for everyone with no opt-out through this
            // component's narrow API, to mask a transient nobody could
            // reproduce as a real defect. Left at the default.
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
