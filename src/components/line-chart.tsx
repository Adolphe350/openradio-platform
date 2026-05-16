"use client";

export type DataPoint = { label: string; value: number };
export type Series = { name: string; color: string; data: DataPoint[] };

type Props = {
  series: Series[];
  height?: number;
  yLabel?: string;
};

const PAD = { top: 16, right: 16, bottom: 36, left: 44 };

function polyPoints(data: DataPoint[], minY: number, maxY: number, w: number, h: number): string {
  if (data.length === 0) return "";
  const range = maxY - minY || 1;
  return data
    .map((d, i) => {
      const x = PAD.left + (i / Math.max(data.length - 1, 1)) * w;
      const y = PAD.top + h - ((d.value - minY) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LineChart({ series, height = 200, yLabel }: Props) {
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 10;
  const minY = Math.max(0, rawMin - (rawMax - rawMin) * 0.1);
  const maxY = rawMax + (rawMax - rawMin) * 0.1 || 10;

  const longestSeries = series.reduce((a, b) => (b.data.length > a.data.length ? b : a), series[0] ?? { data: [] });
  const labels = longestSeries?.data.map((d) => d.label) ?? [];

  const svgW = 600;
  const svgH = height;
  const plotW = svgW - PAD.left - PAD.right;
  const plotH = svgH - PAD.top - PAD.bottom;

  const yTicks = 4;
  const yStep = (maxY - minY) / yTicks;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", height: svgH, display: "block" }}
        aria-label={yLabel ?? "Line chart"}
      >
        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = PAD.top + plotH - (i / yTicks) * plotH;
          const val = minY + i * yStep;
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y.toFixed(1)}
                x2={svgW - PAD.right} y2={y.toFixed(1)}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4"
              />
              <text
                x={PAD.left - 6} y={y + 4}
                fontSize="10" textAnchor="end" fill="var(--text-light)"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {labels.map((label, i) => {
          const x = PAD.left + (i / Math.max(labels.length - 1, 1)) * plotW;
          const showEvery = Math.ceil(labels.length / 8);
          if (i % showEvery !== 0 && i !== labels.length - 1) return null;
          return (
            <text
              key={label + i}
              x={x.toFixed(1)} y={svgH - 6}
              fontSize="10" textAnchor="middle" fill="var(--text-light)"
            >
              {label}
            </text>
          );
        })}

        {/* Series lines */}
        {series.map((s) => {
          const pts = polyPoints(s.data, minY, maxY, plotW, plotH);
          if (!pts) return null;
          return (
            <g key={s.name}>
              <polyline
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Dots */}
              {s.data.map((d, i) => {
                const x = PAD.left + (i / Math.max(s.data.length - 1, 1)) * plotW;
                const range = maxY - minY || 1;
                const y = PAD.top + plotH - ((d.value - minY) / range) * plotH;
                return (
                  <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill={s.color}>
                    <title>{`${d.label}: ${d.value}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}

        {/* Border */}
        <rect
          x={PAD.left} y={PAD.top}
          width={plotW} height={plotH}
          fill="none" stroke="var(--border)" strokeWidth="1"
        />
      </svg>

      {/* Legend */}
      {series.length > 1 && (
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <div style={{ width: 20, height: 3, background: s.color, borderRadius: 999 }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
