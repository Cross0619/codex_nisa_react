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
};

export type Summary = {
  principalTotal: number;
  nisaPrincipal: number;
};

export type CalcResult = {
  summary: Summary;
  rows: RateRow[];
};

const NISA_LIMIT = 18_000_000;

export function normalizeRateValue(value: number): number {
  if (value >= 1) return value / 100;
  return value;
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
  let principalTotal = scenario.initialLump;

  const timeline: RateTimelinePoint[] = [];
  const pushTimelinePoint = (monthIndex: number) => {
    const total = yenFloor(balNisa + balTax);
    timeline.push({
      monthIndex,
      principal: yenFloor(principalTotal),
      profit: yenFloor(total - principalTotal),
      total,
    });
  };

  // 初期元本を反映
  if (scenario.initialLump > 0) {
    const toNisa = Math.min(scenario.initialLump, nisaRemaining);
    balNisa = yenFloor(balNisa + toNisa);
    nisaRemaining -= toNisa;
    nisaUsed += toNisa;
    const toTax = scenario.initialLump - toNisa;
    balTax = yenFloor(balTax + toTax);
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
    if (flow > 0) {
      const toNisa = Math.min(flow, nisaRemaining);
      balNisa = yenFloor(balNisa + toNisa);
      nisaRemaining -= toNisa;
      nisaUsed += toNisa;
      const toTax = flow - toNisa;
      if (toTax > 0) {
        balTax = yenFloor(balTax + toTax);
      }
      principalTotal += flow;
    } else if (flow < 0) {
      let remaining = -flow;
      if (balTax > 0) {
        const fromTax = Math.min(remaining, balTax);
        balTax = yenFloor(balTax - fromTax);
        remaining -= fromTax;
      }
      if (remaining > 0 && balNisa > 0) {
        const fromNisa = Math.min(remaining, balNisa);
        balNisa = yenFloor(balNisa - fromNisa);
        remaining -= fromNisa;
      }
    }

    pushTimelinePoint(month + 1);
  }

  const finalTotal = balNisa + balTax;

  return {
    finalTotal: yenFloor(finalTotal),
    finalNisa: yenFloor(balNisa),
    finalTaxable: yenFloor(balTax),
    principalTotal: yenFloor(principalTotal),
    nisaPrincipal: yenFloor(nisaUsed),
    timeline,
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

  scenario.ratesPercent.forEach((rateInput, index) => {
    const result = calcFinalForRate(scenario, rateInput, precomputed);
    rows.push({
      ratePercent: rateInput,
      finalTotal: result.finalTotal,
      finalNisa: result.finalNisa,
      finalTaxable: result.finalTaxable,
      profit: result.finalTotal - result.principalTotal,
      timeline: result.timeline,
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
