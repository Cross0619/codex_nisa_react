import React from "react";
import type { RateRow } from "../lib/calcEngine";

type ResultListProps = {
  results: RateRow[];
  formatJPY: (value: number) => string;
};

export const ResultList: React.FC<ResultListProps> = ({ results, formatJPY }) => {
  if (!results.length) {
    return <p>結果がここに表示されます。</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {results.map((result, index) => (
        <li key={`${result.ratePercent}-${index}`} style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}>
          <strong>{result.ratePercent}%</strong> → {formatJPY(result.finalTotal)}
        </li>
      ))}
    </ul>
  );
};

export default ResultList;
