import { RateDetail } from "./calcEngine";

// 年別データをCSV形式でダウンロードする
export function exportYearsToCsv(detail: RateDetail): void {
  if (typeof window === "undefined") {
    return;
  }

  const headers = [
    "year",
    "principalCum",
    "principalYear",
    "withdrawYear",
    "nisaValue",
    "taxableValue",
    "totalValue",
    "nisaPrincipalCum",
    "nisaRoomLeft",
  ];

  const rows = detail.years.map((year) =>
    [
      year.year,
      year.principalCum,
      year.principalYear,
      year.withdrawYear,
      year.nisaValue,
      year.taxableValue,
      year.totalValue,
      year.nisaPrincipalCum,
      year.nisaRoomLeft,
    ].join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nisa-${detail.ratePercent}percent.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}
