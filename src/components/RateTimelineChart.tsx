import React, { useMemo } from "react";
import { RateRow } from "../lib/calcEngine";
import { formatYen } from "../lib/format";

interface RateTimelineChartProps {
  row: RateRow;
  startYear: number;
  hidden?: boolean;
  highlighted?: boolean;
}

const chartWidth = 760;
const chartHeight = 240;
const paddingX = 68;
const paddingY = 32;

const RateTimelineChart: React.FC<RateTimelineChartProps> = ({ row, startYear, hidden, highlighted }) => {
  const { pathPrincipal, pathProfit, minY, maxY, ticks, maxMonth } = useMemo(() => {
    const points = row.timeline;
    if (points.length === 0) {
      return {
        pathPrincipal: "",
        pathProfit: "",
        minY: 0,
        maxY: 0,
        ticks: [0],
        maxMonth: 0,
      };
    }

    const maxMonthIndex = points[points.length - 1]?.monthIndex ?? 0;
    const principalValues = points.map((p) => p.principal);
    const profitValues = points.map((p) => p.profit);
    const positiveMax = Math.max(0, ...principalValues, ...profitValues);
    const negativeMin = Math.min(0, ...profitValues);
    const range = positiveMax - negativeMin || 1;

    const getX = (monthIndex: number) => {
      if (maxMonthIndex === 0) {
        return paddingX;
      }
      const ratio = monthIndex / maxMonthIndex;
      return paddingX + ratio * (chartWidth - paddingX * 2);
    };

    const getY = (value: number) => {
      const clamped = Math.max(negativeMin, Math.min(positiveMax, value));
      const ratio = (clamped - negativeMin) / range;
      return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
    };

    const buildPath = (values: number[]) =>
      values
        .map((value, index) => {
          const monthIndex = points[index]?.monthIndex ?? index;
          const x = getX(monthIndex);
          const y = getY(value);
          return `${index === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");

    const tickCount = 4;
    const tickStep = range / tickCount;
    const generatedTicks = new Array(tickCount + 1)
      .fill(null)
      .map((_, idx) => negativeMin + tickStep * idx);

    return {
      pathPrincipal: buildPath(principalValues),
      pathProfit: buildPath(profitValues),
      minY: negativeMin,
      maxY: positiveMax,
      ticks: generatedTicks,
      maxMonth: maxMonthIndex,
    };
  }, [row.timeline]);

  const yearLabels = useMemo(() => {
    if (maxMonth <= 0) return [];
    const years = Math.ceil(maxMonth / 12);
    const step = Math.max(1, Math.floor(years / 6));
    const labels: { label: number; monthIndex: number }[] = [];
    for (let yearOffset = 0; yearOffset <= years; yearOffset += step) {
      const monthIndex = Math.min(maxMonth, yearOffset * 12);
      labels.push({ label: startYear + yearOffset, monthIndex });
    }
    return labels;
  }, [maxMonth, startYear]);

  if (hidden) {
    return null;
  }

  return (
    <div className={`rate-chart-card${highlighted ? " is-highlighted" : ""}`}>
      <header className="rate-chart-header">
        <h3>{formatRate(row.ratePercent)} の推移</h3>
        <div className="rate-chart-legend">
          <span className="legend principal">元本</span>
          <span className="legend profit">運用利益</span>
        </div>
        <div className="rate-chart-summary">
          <span>最終元本: {formatYen(row.timeline[row.timeline.length - 1]?.principal ?? 0)} 円</span>
          <span>最終運用利益: {formatYen(row.profit)} 円</span>
        </div>
      </header>
      <div className="rate-chart-canvas">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="元本と運用利益の推移グラフ">
          <rect
            x={0}
            y={0}
            width={chartWidth}
            height={chartHeight}
            rx={12}
            className="chart-surface"
          />
          {ticks.map((tick) => {
            const range = maxY - minY || 1;
            const ratio = (tick - minY) / range;
            const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
            return (
              <g key={`tick-${tick}`} className="chart-tick">
                <line x1={paddingX} x2={chartWidth - paddingX} y1={y} y2={y} />
                <text x={paddingX - 12} y={y + 4}>
                  {formatYen(Math.round(tick))}
                </text>
              </g>
            );
          })}
          {yearLabels.map((label) => {
            const x =
              paddingX +
              (maxMonth === 0 ? 0 : (label.monthIndex / maxMonth) * (chartWidth - paddingX * 2));
            return (
              <text key={`year-${label.label}`} x={x} y={chartHeight - 4} className="chart-x-label">
                {label.label}年
              </text>
            );
          })}
          <path className="line principal" d={pathPrincipal} />
          <path className="line profit" d={pathProfit} />
        </svg>
      </div>
    </div>
  );
};

function formatRate(rateInput: number): string {
  const normalized = rowNormalize(rateInput);
  return `${Math.round(normalized * 100)}%`;
}

function rowNormalize(rateInput: number): number {
  return rateInput >= 1 ? rateInput / 100 : rateInput;
}

export default RateTimelineChart;
