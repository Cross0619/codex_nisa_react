import React from "react";
import { CalcResult } from "../lib/calcEngine";
import { formatYen } from "../lib/format";

interface ResultTableProps {
  result: CalcResult | null;
}

const ResultTable: React.FC<ResultTableProps> = ({ result }) => {
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
          {result.rows.map((row, idx) => (
            <tr key={idx}>
              <td>{formatRate(row.ratePercent)}</td>
              <td>{formatYen(row.finalTotal)}</td>
              <td>{formatYen(row.finalNisa)}</td>
              <td>{formatYen(row.profit)}</td>
              <td>{formatYen(row.finalTaxable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  if (rateInput >= 1) {
    return `${rateInput.toFixed(2)}%`;
  }
  return `${(rateInput * 100).toFixed(2)}%`;
}

export default ResultTable;
