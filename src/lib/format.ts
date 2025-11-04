// ユーティリティ：金額フォーマットや丸め処理
export const TAX_RATE = 0.20315;

// 円未満切り捨て
export function yenFloor(value: number): number {
  return Math.floor(value);
}

// 金額を千区切りで表示
export function formatYen(value: number): string {
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

// 年率リストの入力をパース（3 → 0.03 / 0.03 → 0.03）
export function normalizeRates(input: string): number[] {
  return input
    .split(/[\s,、]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const value = Number(token);
      if (!Number.isFinite(value)) return NaN;
      if (value >= 1) {
        return value / 100;
      }
      return value;
    })
    .filter((v) => !Number.isNaN(v));
}

// YYYY-MM 形式の月差分を計算
export function diffMonths(startYm: string, endYm: string): number {
  const [sYear, sMonth] = startYm.split("-").map((v) => Number(v));
  const [eYear, eMonth] = endYm.split("-").map((v) => Number(v));
  return (eYear - sYear) * 12 + (eMonth - sMonth);
}

export function addMonths(ym: string, months: number): string {
  const [year, month] = ym.split("-").map((v) => Number(v));
  const total = (year * 12 + (month - 1)) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear.toString().padStart(4, "0")}-${newMonth
    .toString()
    .padStart(2, "0")}`;
}

export function parseRatesText(text: string): { rates: number[]; rawTokens: string[] } {
  const tokens = text.split(/[\s,、]+/).map((t) => t.trim()).filter(Boolean);
  const rates = tokens.map((token) => {
    const num = Number(token);
    if (!Number.isFinite(num)) return NaN;
    return num >= 1 ? num / 100 : num;
  });
  return { rates: rates.filter((v) => Number.isFinite(v)), rawTokens: tokens };
}
