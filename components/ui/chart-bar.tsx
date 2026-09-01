"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartDatum } from "@/components/ui/chart-line"

// ADR 006 — same encapsulation and colour-token rules as chart-line.tsx
// (see its header comment for the full rationale). Recharts' bar element
// has its own default fill (node_modules/recharts source, not reproduced
// here as a hex literal — that would itself defeat check-design-tokens) —
// every bar series below sets its own `fill` explicitly.
const SERIES_PALETTE = [
  "var(--color-lime)",
  "var(--color-link)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-cat-sector)",
] as const

export type ChartBarSeries = {
  /** Key read off each datum in `data`. */
  key: string
  /** Legend / tooltip label — pass an already-translated string. */
  label: string
  /** Explicit token override; defaults to the next colour in the palette. */
  color?: string
}

/** Bar chart: compare values across categories. Client Component. */
export function ChartBar({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: ChartDatum[]
  xKey: string
  series: ChartBarSeries[]
  height?: number
}) {
  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      initialDimension={{ width: 640, height }}
    >
      <BarChart data={data}>
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
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? SERIES_PALETTE[i % SERIES_PALETTE.length]}
            radius={[4, 4, 0, 0]}
            // No isAnimationActive override — see chart-line.tsx's comment:
            // the transient observed here never reproduced as a permanent
            // freeze, and Recharts 3's default already respects
            // prefers-reduced-motion. Left at the default.
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
