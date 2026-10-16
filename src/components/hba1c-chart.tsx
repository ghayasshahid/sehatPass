import Link from "next/link";

import { formatDate, formatHbA1c } from "@/lib/format";
import type { ChangePoint } from "@/lib/types";

export function Hba1cChart({ points }: { points: ChangePoint[] }) {
  const width = 360;
  const height = 220;
  const pad = { left: 36, right: 16, top: 18, bottom: 32 };
  const min = 6;
  const max = 10;
  const xFor = (index: number) => {
    if (points.length === 1) return (pad.left + width - pad.right) / 2;
    return pad.left + (index / (points.length - 1)) * (width - pad.left - pad.right);
  };
  const yFor = (value: number) =>
    pad.top + (1 - (value - min) / (max - min)) * (height - pad.top - pad.bottom);
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.value)}`)
    .join(" ");

  return (
    <figure className="rounded-xl border border-border bg-card p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Recorded HbA1c values"
        className="h-auto w-full"
      >
        {[6, 7, 8, 9, 10].map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="currentColor"
              strokeOpacity="0.12"
            />
            <text x="0" y={yFor(tick) + 4} fontSize="11" fill="currentColor" opacity="0.7">
              {tick}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" />
        {points.map((point, index) => (
          <g key={point.factId}>
            <a href={`/reports/${point.documentId}?from=/change-radar`}>
              <title>{`Open ${point.facilityName} report, HbA1c ${formatHbA1c(point.value)}% on ${formatDate(point.date)}`}</title>
              <circle cx={xFor(index)} cy={yFor(point.value)} r="16" fill="transparent" />
              <circle cx={xFor(index)} cy={yFor(point.value)} r="6" fill="currentColor" />
              <text x={xFor(index)} y={height - 8} textAnchor="middle" fontSize="11" fill="currentColor">
                {formatDate(point.date).replace(/ \d{4}$/, "")}
              </text>
            </a>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        Recorded HbA1c (%). No target range is shown. Tap a point to open the original report.
      </figcaption>
      <ul className="mt-3 grid gap-2">
        {points.map((point) => (
          <li key={point.factId}>
            <Link
              href={`/reports/${point.documentId}?from=/change-radar`}
              data-testid={`chart-point-${point.documentId}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted"
            >
              <span>
                <span className="block font-semibold">{formatHbA1c(point.value)}%</span>
                <span className="block text-sm text-muted-foreground">
                  {formatDate(point.date)} · {point.facilityName}
                </span>
              </span>
              <span className="text-sm font-semibold text-primary">Open report</span>
            </Link>
          </li>
        ))}
      </ul>
    </figure>
  );
}
