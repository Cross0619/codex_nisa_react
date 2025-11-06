import React, { useEffect, useMemo, useRef, useState } from "react";
import { RateDetail } from "../lib/calcEngine";
import { exportYearsToCsv } from "../lib/export";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export type RateDetailModalProps = {
  open: boolean;
  onClose: () => void;
  detail?: RateDetail;
  onToggleSeries?: (ratePercent: number, show: boolean) => void;
  isSeriesActive?: boolean;
};

const RateDetailModal: React.FC<RateDetailModalProps> = ({
  open,
  onClose,
  detail,
  onToggleSeries,
  isSeriesActive,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [seriesChecked, setSeriesChecked] = useState<boolean>(isSeriesActive ?? false);

  useEffect(() => {
    if (!open) return;
    const modal = dialogRef.current;
    const previousActive = document.activeElement as HTMLElement | null;
    const focusable = modal?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable && focusable[0];
    first?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && focusable && focusable.length > 0) {
        const elements = Array.from(focusable);
        const firstEl = elements[0];
        const lastEl = elements[elements.length - 1];
        if (!event.shiftKey && document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        } else if (event.shiftKey && document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    setSeriesChecked(isSeriesActive ?? false);
  }, [isSeriesActive, detail?.ratePercent, open]);

  const kpiCards = useMemo(() => {
    if (!detail) return [];
    return [
      {
        label: "枠使い切り年",
        value: detail.kpi.nisaCapYear ? `${detail.kpi.nisaCapYear}年` : "未到達",
      },
      {
        label: "最大評価額",
        value: `${yenFormatter.format(detail.kpi.maxValue)} (${detail.kpi.maxYear}年)` ,
      },
      {
        label: "枯渇年",
        value: detail.kpi.depletionYear ? `${detail.kpi.depletionYear}年` : "維持",
      },
    ];
  }, [detail]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        {detail ? (
          <>
            <header className="modal-header">
              <h2 id="rate-detail-title">{detail.ratePercent}% の年別内訳</h2>
              <button type="button" className="modal-close" onClick={onClose} aria-label="閉じる">
                ×
              </button>
            </header>
            <section className="kpi-row">
              {kpiCards.map((card) => (
                <div key={card.label} className="kpi-card">
                  <span className="kpi-label">{card.label}</span>
                  <strong className="kpi-value">{card.value}</strong>
                </div>
              ))}
            </section>
            <section className="detail-table-wrapper" aria-live="polite">
              <table>
                <thead>
                  <tr>
                    <th>年</th>
                    <th>元本累計</th>
                    <th>非課税</th>
                    <th>課税</th>
                    <th>合計</th>
                    <th>当年投下元本</th>
                    <th>当年取崩し</th>
                    <th>NISA元本累計</th>
                    <th>NISA枠残</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.years.map((year) => (
                    <tr key={year.year}>
                      <td>{year.year}</td>
                      <td>{yenFormatter.format(year.principalCum)}</td>
                      <td>{yenFormatter.format(year.nisaValue)}</td>
                      <td>{yenFormatter.format(year.taxableValue)}</td>
                      <td>{yenFormatter.format(year.totalValue)}</td>
                      <td>{yenFormatter.format(year.principalYear)}</td>
                      <td>{yenFormatter.format(year.withdrawYear)}</td>
                      <td>{yenFormatter.format(year.nisaPrincipalCum)}</td>
                      <td>{yenFormatter.format(year.nisaRoomLeft)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <footer className="modal-footer">
              <div className="footer-left">
                <button type="button" onClick={() => detail && exportYearsToCsv(detail)}>
                  CSVエクスポート
                </button>
              </div>
              {onToggleSeries && (
                <label className="series-toggle">
                  <input
                    type="checkbox"
                    checked={seriesChecked}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSeriesChecked(checked);
                      if (detail) {
                        onToggleSeries(detail.ratePercent, checked);
                      }
                    }}
                  />
                  <span>この年率をグラフに重ねる</span>
                </label>
              )}
            </footer>
          </>
        ) : (
          <div className="modal-empty">
            <p>詳細を取得できませんでした。</p>
            <button type="button" onClick={onClose}>
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateDetailModal;
