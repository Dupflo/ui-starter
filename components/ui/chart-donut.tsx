"use client"

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

// ADR 006 — same encapsulation and colour-token rules as chart-line.tsx
// (see its header comment). Recharts' pie slices have their own default
// fill and stroke (node_modules/recharts source, not reproduced here as
// hex literals — that would itself defeat check-design-tokens) — every
// slice below is its own cell with `fill` set explicitly, so the shared
// pie default never applies.
const SLICE_PALETTE = [
  "var(--color-lime)",
  "var(--color-link)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-cat-sector)",
] as const

export type ChartDonutSlice = {
  key: string
  /** Legend / tooltip label — pass an already-translated string. */
  label: string
  value: number
  /** Explicit token override; defaults to the next colour in the palette. */
  color?: string
}

/** Donut chart: share of a whole across a handful of categories. Client Component. */
export function ChartDonut({
  data,
  height = 240,
}: {
  data: ChartDonutSlice[]
  height?: number
}) {
  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      initialDimension={{ width: 640, height }}
    >
      <PieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-input)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
        <Legend />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--color-input)"
          // No isAnimationActive override — see chart-line.tsx's comment:
          // the transient observed here never reproduced as a permanent
          // freeze, and Recharts 3's default already respects
          // prefers-reduced-motion. Left at the default.
        >
          {data.map((slice, i) => (
            <Cell
              key={slice.key}
              fill={slice.color ?? SLICE_PALETTE[i % SLICE_PALETTE.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
