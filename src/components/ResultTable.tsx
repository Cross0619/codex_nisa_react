import React from "react";
import { CalcResult, normalizeRateValue } from "../lib/calcEngine";
import { formatYen } from "../lib/format";
import RateTimelineChart from "./RateTimelineChart";

interface ResultTableProps {
  result: CalcResult | null;
  onOpenDetail: (ratePercent: number) => void;
  activeRates: number[];
  startYear: number;
}

const ResultTable: React.FC<ResultTableProps> = ({ result, onOpenDetail, activeRates, startYear }) => {
  if (!result) {
    return (
      <section className="result-table">
        <h2>結果</h2>
        <p className="hint">パラメータを入力して「計算する」を押してください。</p>
        <Notes />
      </section>
    );
  }

  return (
    <section className="result-table">
      <h2>結果</h2>
      <div className="summary">
        <div>
          <span className="label">元本(合計)</span>
          <strong>{formatYen(result.summary.principalTotal)} 円</strong>
        </div>
        <div>
          <span className="label">NISA元本(累計)</span>
          <strong>{formatYen(result.summary.nisaPrincipal)} 円</strong>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>年率</th>
            <th>将来価値(合計)</th>
            <th>将来価値(NISA)</th>
            <th>運用利益</th>
            <th>将来価値(課税)</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, idx) => {
            const displayRate = Math.round(normalizeRateValue(row.ratePercent) * 100);
            const isActive = activeRates.includes(displayRate);
            const isDimmed = activeRates.length > 0 && !isActive;
            return (
              <tr
                key={idx}
                className={`result-row${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}`}
                onClick={() => onOpenDetail(row.ratePercent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDetail(row.ratePercent);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${displayRate}% の内訳を開く`}
              >
                <td>
                  <span className="rate-link">{formatRate(row.ratePercent)}</span>
                </td>
                <td>{formatYen(row.finalTotal)}</td>
                <td>{formatYen(row.finalNisa)}</td>
                <td>{formatYen(row.profit)}</td>
                <td>{formatYen(row.finalTaxable)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="rate-charts">
        {result.rows.map((row, idx) => {
          const displayRate = Math.round(normalizeRateValue(row.ratePercent) * 100);
          const isActive = activeRates.includes(displayRate);
          const hidden = activeRates.length > 0 && !isActive;
          return (
            <RateTimelineChart
              key={idx}
              row={row}
              startYear={startYear}
              hidden={hidden}
              highlighted={isActive}
            />
          );
        })}
      </div>
      <Notes />
    </section>
  );
};

const Notes: React.FC = () => (
  <div className="notes">
    <p>本モデルは 月末運用→月末入出金。課税口座は 月次の増分に課税(20.315%) する簡易モデルです。</p>
    <p>年率は 3 または 0.03 のどちらでも入力できます。</p>
  </div>
);

function formatRate(rateInput: number): string {
  const normalized = normalizeRateValue(rateInput);
  return `${Math.round(normalized * 100)}%`;
}

export default ResultTable;
