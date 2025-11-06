export type Period = { months: number; flow: number };

export type PeriodBlock = {
  pattern: Period[];
  repeatYears: number;
  name?: string;
};

// DSL を PeriodBlock に変換
export function parseDslToBlocks(dslText: string): { blocks: PeriodBlock[]; errors: string[] } {
  const lines = dslText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const blocks: PeriodBlock[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    try {
      let working = line;
      let name: string | undefined;

      const nameMatch = working.match(/^([^:]+):(.*)$/);
      if (nameMatch && nameMatch[2].includes("(")) {
        name = nameMatch[1].trim();
        working = nameMatch[2].trim();
      }

      const [patternPart, repeatPart] = working.split(/x/i).map((p) => p.trim());
      if (!patternPart || !repeatPart) {
        throw new Error("xN の形式で繰り返し年数を指定してください");
      }
      const repeatYears = Number(repeatPart);
      if (!Number.isInteger(repeatYears) || repeatYears <= 0) {
        throw new Error("繰り返し年数は正の整数で入力してください");
      }
      const patternMatches = patternPart.match(/\([^\)]+\)/g);
      if (!patternMatches) {
        throw new Error("(months, flow) の形式で指定してください");
      }
      const pattern: Period[] = patternMatches.map((token) => {
        const clean = token.replace(/[()]/g, "");
        const [monthsStr, flowStr] = clean.split(/,/).map((t) => t.trim());
        const months = Number(monthsStr);
        const flow = Number(flowStr.replace(/[+]/g, ""));
        if (!Number.isInteger(months) || months <= 0) {
          throw new Error("months は 1 以上の整数で入力してください");
        }
        if (!Number.isFinite(flow)) {
          throw new Error("flow は数値で入力してください");
        }
        return { months, flow: Math.trunc(flow) };
      });
      blocks.push({ pattern, repeatYears, name });
    } catch (err) {
      errors.push(`${idx + 1} 行目: ${(err as Error).message}`);
    }
  });

  return { blocks, errors };
}

export function blocksToDsl(blocks: PeriodBlock[]): string {
  return blocks
    .map((block) => {
      const namePrefix = block.name ? `${block.name}: ` : "";
      const patternText = block.pattern
        .map((period) => `(${period.months}, ${period.flow})`)
        .join(", ");
      return `${namePrefix}${patternText} x${block.repeatYears}`;
    })
    .join("\n");
}

// ブロックを平坦化して Period[] に変換
export function flattenBlocks(blocks: PeriodBlock[]): Period[] {
  const periods: Period[] = [];
  blocks.forEach((block) => {
    const pattern = block.pattern;
    const totalMonths = block.repeatYears * 12;
    let remaining = totalMonths;
    while (remaining > 0) {
      for (const item of pattern) {
        if (remaining <= 0) break;
        const months = Math.min(item.months, remaining);
        periods.push({ months, flow: item.flow });
        remaining -= months;
      }
    }
  });
  return periods;
}

// durationMonths に合わせて Period[] を整形
export function applyDuration(periods: Period[], durationMonths: number): Period[] {
  const result: Period[] = [];
  let total = 0;
  for (const period of periods) {
    if (total >= durationMonths) break;
    const remaining = durationMonths - total;
    if (period.months <= remaining) {
      result.push(period);
      total += period.months;
    } else {
      result.push({ months: remaining, flow: period.flow });
      total += remaining;
    }
  }
  if (total < durationMonths) {
    const lastFlow = result.length > 0 ? result[result.length - 1].flow : 0;
    const remaining = durationMonths - total;
    for (let i = 0; i < remaining; i++) {
      result.push({ months: 1, flow: lastFlow });
    }
  }
  return mergeConsecutive(result);
}

// simple モードの入出金を生成
export function generateSimplePeriods(args: {
  monthlyInvest: number;
  monthlyWithdraw: number;
  withdrawStartYm: string | undefined;
  startYm: string;
  durationMonths: number;
}): Period[] {
  const { monthlyInvest, monthlyWithdraw, withdrawStartYm, startYm, durationMonths } = args;
  const invest: Period[] = [];
  const withdraw: Period[] = [];

  if (monthlyInvest > 0) {
    invest.push({ months: durationMonths, flow: monthlyInvest });
  }

  if (monthlyWithdraw > 0 && withdrawStartYm) {
    const diff = Math.max(0, diffMonthsSafe(startYm, withdrawStartYm));
    if (diff < durationMonths) {
      if (diff > 0) {
        withdraw.push({ months: diff, flow: 0 });
      }
      withdraw.push({ months: durationMonths - diff, flow: -monthlyWithdraw });
    }
  }

  return mergeStreams([invest, withdraw], durationMonths);
}

function diffMonthsSafe(startYm: string, endYm: string): number {
  try {
    const [sYear, sMonth] = startYm.split("-").map((v) => Number(v));
    const [eYear, eMonth] = endYm.split("-").map((v) => Number(v));
    return (eYear - sYear) * 12 + (eMonth - sMonth);
  } catch {
    return 0;
  }
}

function mergeStreams(streams: Period[][], durationMonths: number): Period[] {
  const monthlyFlows = new Array(durationMonths).fill(0);
  streams.forEach((periods) => {
    let index = 0;
    periods.forEach((period) => {
      for (let i = 0; i < period.months && index < durationMonths; i++, index++) {
        monthlyFlows[index] += period.flow;
      }
    });
  });

  const result: Period[] = [];
  let currentFlow = monthlyFlows[0] ?? 0;
  let length = 0;
  monthlyFlows.forEach((flow) => {
    if (length === 0) {
      currentFlow = flow;
      length = 1;
      return;
    }
    if (flow === currentFlow) {
      length += 1;
    } else {
      result.push({ months: length, flow: currentFlow });
      currentFlow = flow;
      length = 1;
    }
  });
  if (length > 0) {
    result.push({ months: length, flow: currentFlow });
  }
  return result;
}

function mergeConsecutive(periods: Period[]): Period[] {
  if (periods.length === 0) return [];
  const result: Period[] = [periods[0]];
  for (let i = 1; i < periods.length; i++) {
    const prev = result[result.length - 1];
    const curr = periods[i];
    if (prev.flow === curr.flow) {
      prev.months += curr.months;
    } else {
      result.push({ ...curr });
    }
  }
  return result;
}

export function normalizePeriods(
  mode: "simple" | "builder" | "dsl",
  options: {
    durationYears: number;
    blocks?: PeriodBlock[];
    simpleArgs?: {
      monthlyInvest: number;
      monthlyWithdraw: number;
      withdrawStartYm?: string;
      startYm: string;
    };
  }
): { periods: Period[]; durationMonths: number } {
  const durationMonths = Math.max(0, Math.trunc(options.durationYears * 12));
  let periods: Period[] = [];

  if (durationMonths === 0) {
    return { periods: [], durationMonths: 0 };
  }

  if (mode === "simple" && options.simpleArgs) {
    periods = generateSimplePeriods({
      monthlyInvest: options.simpleArgs.monthlyInvest,
      monthlyWithdraw: options.simpleArgs.monthlyWithdraw,
      withdrawStartYm: options.simpleArgs.withdrawStartYm,
      startYm: options.simpleArgs.startYm,
      durationMonths,
    });
  } else if (mode === "builder" && options.blocks) {
    periods = flattenBlocks(options.blocks);
  } else if (mode === "dsl" && options.blocks) {
    periods = flattenBlocks(options.blocks);
  }

  periods = applyDuration(periods, durationMonths);
  return { periods, durationMonths };
}

export function monthlySequence(periods: Period[], durationMonths: number): number[] {
  const result = new Array(durationMonths).fill(0);
  let index = 0;
  periods.forEach((period) => {
    for (let i = 0; i < period.months && index < durationMonths; i++, index++) {
      result[index] = period.flow;
    }
  });
  if (index < durationMonths && periods.length > 0) {
    const lastFlow = periods[periods.length - 1].flow;
    for (; index < durationMonths; index++) {
      result[index] = lastFlow;
    }
  }
  return result;
}
