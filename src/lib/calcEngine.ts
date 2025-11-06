import { TAX_RATE, yenFloor } from "./format";
import {
  PeriodBlock,
  normalizePeriods,
  parseDslToBlocks,
  Period,
  monthlySequence,
} from "./periods";

export type Scenario = {
  id: string;
  name: string;
  startYm: string;
  initialLump: number;
  durationYears: number;
  mode: "simple" | "builder" | "dsl";
  monthlyInvest?: number;
  withdrawStartYm?: string;
  monthlyWithdraw?: number;
  blocks?: PeriodBlock[];
  dslText?: string;
  ratesPercent: number[];
};

export type RateTimelinePoint = {
  monthIndex: number;
  principal: number;
  profit: number;
  total: number;
};

export type RateRow = {
  ratePercent: number;
  finalTotal: number;
  finalNisa: number;
  finalTaxable: number;
  profit: number;
  timeline: RateTimelinePoint[];
  startYear: number;
};

export type Summary = {
  principalTotal: number;
  nisaPrincipal: number;
};

export type CalcResult = {
  summary: Summary;
  rows: RateRow[];
};

export type YearRow = {
  year: number;
  principalCum: number;
  principalYear: number;
  withdrawYear: number;
  nisaValue: number;
  taxableValue: number;
  totalValue: number;
  nisaPrincipalCum: number;
  nisaRoomLeft: number;
};

export type RateDetail = {
  ratePercent: number;
  kpi: {
    nisaCapYear?: number;
    maxYear: number;
    maxValue: number;
    depletionYear?: number;
  };
  years: YearRow[];
};

const NISA_LIMIT = 18_000_000;

export function normalizeRateValue(value: number): number {
  if (value >= 1) return value / 100;
  return value;
}

function parseStartYear(startYm: string): number {
  const match = startYm.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    if (Number.isFinite(year)) {
      return year;
    }
  }
  return new Date().getFullYear();
}

export function calcDetailForRate(
  scenario: Scenario,
  annualRateInput: number,
  precomputedPeriods?: { periods: Period[]; durationMonths: number }
): {
  detail: RateDetail;
  finalTotal: number;
  finalNisa: number;
  finalTaxable: number;
  principalTotal: number;
  nisaPrincipal: number;
  timeline: RateTimelinePoint[];
} {
  const annualRate = normalizeRateValue(annualRateInput);
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

  const { periods, durationMonths } =
    precomputedPeriods ??
    normalizePeriods(scenario.mode, {
      durationYears: scenario.durationYears,
      blocks: scenario.blocks,
      simpleArgs:
        scenario.mode === "simple"
          ? {
              monthlyInvest: scenario.monthlyInvest ?? 0,
              monthlyWithdraw: scenario.monthlyWithdraw ?? 0,
              withdrawStartYm: scenario.withdrawStartYm,
              startYm: scenario.startYm,
            }
          : undefined,
    });

  const flows = monthlySequence(periods, durationMonths);

  let balNisa = 0;
  let balTax = 0;
  let nisaRemaining = NISA_LIMIT;
  let nisaUsed = 0;
  let principalCum = 0;
  let principalYearAccum = 0;
  let withdrawYearAccum = 0;
  const startYear = parseStartYear(scenario.startYm);

  const timeline: RateTimelinePoint[] = [];
  const years: YearRow[] = [];

  let nisaCapYear: number | undefined;
  let maxValue = -Infinity;
  let maxYear = startYear;
  let depletionYear: number | undefined;

  const pushTimelinePoint = (monthIndex: number) => {
    const total = yenFloor(balNisa + balTax);
    const principalValue = yenFloor(principalCum);
    timeline.push({
      monthIndex,
      principal: principalValue,
      profit: yenFloor(total - principalValue),
      total,
    });
  };

  const updateNisaCapYear = (yearIndex: number) => {
    if (!nisaCapYear && nisaUsed >= NISA_LIMIT) {
      nisaCapYear = startYear + yearIndex;
    }
  };

  const applyDeposit = (amount: number, yearIndex: number) => {
    if (amount <= 0) return;
    const toNisa = Math.min(amount, nisaRemaining);
    if (toNisa > 0) {
      balNisa = yenFloor(balNisa + toNisa);
      nisaRemaining -= toNisa;
      nisaUsed += toNisa;
    }
    const toTax = amount - toNisa;
    if (toTax > 0) {
      balTax = yenFloor(balTax + toTax);
    }
    principalCum += amount;
    principalYearAccum += amount;
    updateNisaCapYear(yearIndex);
  };

  const applyWithdraw = (amount: number) => {
    if (amount <= 0) return;
    let remaining = amount;
    let withdrawn = 0;
    if (balTax > 0) {
      const fromTax = Math.min(remaining, balTax);
      balTax = yenFloor(balTax - fromTax);
      remaining -= fromTax;
      withdrawn += fromTax;
    }
    if (remaining > 0 && balNisa > 0) {
      const fromNisa = Math.min(remaining, balNisa);
      balNisa = yenFloor(balNisa - fromNisa);
      remaining -= fromNisa;
      withdrawn += fromNisa;
    }
    withdrawYearAccum += withdrawn;
  };

  // 初期元本を反映
  if (scenario.initialLump > 0) {
    applyDeposit(scenario.initialLump, 0);
  }

  pushTimelinePoint(0);

  for (let month = 0; month < durationMonths; month++) {
    // 月末運用：NISAは非課税
    balNisa = yenFloor(balNisa * (1 + monthlyRate));

    const gain = balTax * monthlyRate;
    if (gain >= 0) {
      const taxedGain = gain * (1 - TAX_RATE);
      balTax = yenFloor(balTax + taxedGain);
    } else {
      balTax = yenFloor(balTax + gain);
    }

    const flow = flows[month] ?? 0;
    const yearIndex = Math.floor(month / 12);

    if (flow > 0) {
      applyDeposit(flow, yearIndex);
    } else if (flow < 0) {
      applyWithdraw(-flow);
    }

    const total = yenFloor(balNisa + balTax);
    if (!depletionYear && total <= 0) {
      depletionYear = startYear + yearIndex;
    }

    pushTimelinePoint(month + 1);

    const monthsElapsed = month + 1;
    if (monthsElapsed % 12 === 0) {
      const yearIndexForSnapshot = monthsElapsed / 12 - 1;
      const yearNumber = startYear + yearIndexForSnapshot;
      const totalValue = yenFloor(balNisa + balTax);
      const yearRow: YearRow = {
        year: yearNumber,
        principalCum: yenFloor(principalCum),
        principalYear: yenFloor(principalYearAccum),
        withdrawYear: yenFloor(withdrawYearAccum),
        nisaValue: yenFloor(balNisa),
        taxableValue: yenFloor(balTax),
        totalValue,
        nisaPrincipalCum: yenFloor(nisaUsed),
        nisaRoomLeft: Math.max(0, NISA_LIMIT - yenFloor(nisaUsed)),
      };
      years.push(yearRow);
      if (totalValue > maxValue) {
        maxValue = totalValue;
        maxYear = yearNumber;
      }
      principalYearAccum = 0;
      withdrawYearAccum = 0;
    }
  }

  if (maxValue === -Infinity) {
    const finalTotal = yenFloor(balNisa + balTax);
    maxValue = finalTotal;
    maxYear = startYear;
  }

  const detail: RateDetail = {
    ratePercent: Math.round(annualRate * 100),
    kpi: {
      nisaCapYear,
      maxYear,
      maxValue,
      depletionYear,
    },
    years,
  };

  return {
    detail,
    finalTotal: yenFloor(balNisa + balTax),
    finalNisa: yenFloor(balNisa),
    finalTaxable: yenFloor(balTax),
    principalTotal: yenFloor(principalCum),
    nisaPrincipal: yenFloor(nisaUsed),
    timeline,
  };
}

export function calcFinalForRate(
  scenario: Scenario,
  annualRateInput: number,
  precomputedPeriods?: { periods: Period[]; durationMonths: number }
): {
  finalTotal: number;
  finalNisa: number;
  finalTaxable: number;
  principalTotal: number;
  nisaPrincipal: number;
  timeline: RateTimelinePoint[];
} {
  const result = calcDetailForRate(scenario, annualRateInput, precomputedPeriods);
  return {
    finalTotal: result.finalTotal,
    finalNisa: result.finalNisa,
    finalTaxable: result.finalTaxable,
    principalTotal: result.principalTotal,
    nisaPrincipal: result.nisaPrincipal,
    timeline: result.timeline,
  };
}

export function calcAllRates(scenario: Scenario): CalcResult {
  const precomputed = normalizePeriods(scenario.mode, {
    durationYears: scenario.durationYears,
    blocks: scenario.blocks,
    simpleArgs:
      scenario.mode === "simple"
        ? {
            monthlyInvest: scenario.monthlyInvest ?? 0,
            monthlyWithdraw: scenario.monthlyWithdraw ?? 0,
            withdrawStartYm: scenario.withdrawStartYm,
            startYm: scenario.startYm,
          }
        : undefined,
  });

  const rows: RateRow[] = [];
  let summary: Summary | undefined;
  const startYear = parseStartYear(scenario.startYm);

  scenario.ratesPercent.forEach((rateInput, index) => {
    const result = calcDetailForRate(scenario, rateInput, precomputed);
    rows.push({
      ratePercent: rateInput,
      finalTotal: result.finalTotal,
      finalNisa: result.finalNisa,
      finalTaxable: result.finalTaxable,
      profit: result.finalTotal - result.principalTotal,
      timeline: result.timeline,
      startYear,
    });
    if (index === 0) {
      summary = {
        principalTotal: result.principalTotal,
        nisaPrincipal: result.nisaPrincipal,
      };
    }
  });

  return {
    summary: summary ?? { principalTotal: 0, nisaPrincipal: 0 },
    rows,
  };
}

export { parseDslToBlocks };
