"use client";

import { useCallback, useState } from "react";

export type RadarDataPoint = {
  label: string;
  value: number; // 0-10
};

type Props = {
  data: RadarDataPoint[];
  /** Max value on each axis */
  max?: number;
  /** Tooltip suffix, e.g. "(avg of last 5)" */
  tooltipSuffix?: string;
};

/**
 * Pure-SVG responsive radar / spider chart.
 * Uses a generous viewBox with extra padding so axis labels are never clipped.
 */
export default function RadarChart({
  data,
  max = 10,
  tooltipSuffix,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Internal coordinate space — labels live outside the chart radius,
  // so the viewBox is wider than the polygon area.
  const vbSize = 360;
  const cx = vbSize / 2;
  const cy = vbSize / 2;
  const radius = 110;
  const rings = 5;
  const n = data.length;

  const angleSlice = (Math.PI * 2) / n;

  /** Convert (index, value) to SVG coords. Axis 0 points straight up. */
  const pointAt = useCallback(
    (i: number, v: number) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = (v / max) * radius;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    },
    [angleSlice, cx, cy, max, radius],
  );

  const polygon = (values: number[]) =>
    values
      .map((v, i) => {
        const p = pointAt(i, v);
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const dataPolygon = polygon(data.map((d) => d.value));

  return (
    <div className="relative mx-auto w-full">
      <svg
        viewBox={`0 0 ${vbSize} ${vbSize}`}
        className="w-full h-auto"
        overflow="visible"
        role="img"
        aria-label="Radar chart"
      >
        {/* Concentric grid rings */}
        {Array.from({ length: rings }, (_, ringIdx) => {
          const ringVal = max * ((ringIdx + 1) / rings);
          const pts = Array.from({ length: n }, (__, i) => {
            const p = pointAt(i, ringVal);
            return `${p.x},${p.y}`;
          }).join(" ");

          return (
            <polygon
              key={ringIdx}
              points={pts}
              fill="none"
              className="stroke-border"
              strokeWidth={ringIdx === rings - 1 ? 1.2 : 0.6}
              strokeDasharray={ringIdx === rings - 1 ? undefined : "2,3"}
            />
          );
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
          const p = pointAt(i, max);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              className="stroke-border"
              strokeWidth={0.6}
            />
          );
        })}

        {/* Data polygon fill */}
        <polygon
          points={dataPolygon}
          className="fill-accent/15 stroke-accent"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />

        {/* Data points (circles) */}
        {data.map((d, i) => {
          const p = pointAt(i, d.value);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 5 : 3.5}
              className="fill-accent stroke-background"
              strokeWidth={1.5}
              style={{ cursor: "pointer", transition: "r 0.15s ease" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Axis labels — positioned well outside the polygon */}
        {data.map((d, i) => {
          const labelRadius = radius + 32;
          const angle = angleSlice * i - Math.PI / 2;
          const lx = cx + labelRadius * Math.cos(angle);
          const ly = cy + labelRadius * Math.sin(angle);

          let anchor: "middle" | "start" | "end" = "middle";
          if (Math.cos(angle) > 0.15) anchor = "start";
          else if (Math.cos(angle) < -0.15) anchor = "end";

          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="central"
              className="fill-muted text-[14px] font-medium"
              style={{ fontFamily: "inherit" }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm whitespace-nowrap"
          style={{ bottom: 4 }}
        >
          <span className="font-medium">{data[hovered].label}:</span>{" "}
          {data[hovered].value.toFixed(1)}
          {tooltipSuffix ? ` ${tooltipSuffix}` : ""}
        </div>
      )}
    </div>
  );
}
