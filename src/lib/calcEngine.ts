export type Scenario = {
  name: string;
  startYm: string;
  initialLump: number;
  monthlyInvest: number;
  withdrawStartYm?: string;
  monthlyWithdraw?: number;
  ratesPercent: number[];
};

export type RateResult = {
  ratePercent: number;
  finalTotal: number;
};

const NISA_LIMIT = 18_000_000;
const TAX_RATE = 0.20315;
const MAX_MONTHS = 480;

export function diffMonths(fromYm: string, toYm: string): number {
  if (!fromYm || !toYm) {
    return 0;
  }
  const [fromYear, fromMonth] = fromYm.split('-').map((v) => parseInt(v, 10));
  const [toYear, toMonth] = toYm.split('-').map((v) => parseInt(v, 10));
  if (
    Number.isNaN(fromYear) ||
    Number.isNaN(fromMonth) ||
    Number.isNaN(toYear) ||
    Number.isNaN(toMonth)
  ) {
    return 0;
  }
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

function calculateMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function allocateToAccounts(
  amount: number,
  balNisa: number,
  balTax: number,
  nisaUsed: number,
): { balNisa: number; balTax: number; nisaUsed: number } {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) {
    return { balNisa, balTax, nisaUsed };
  }

  const nisaRoom = Math.max(0, NISA_LIMIT - nisaUsed);
  const investToNisa = Math.min(safeAmount, nisaRoom);
  const investToTax = safeAmount - investToNisa;

  return {
    balNisa: Math.floor(balNisa + investToNisa),
    balTax: Math.floor(balTax + investToTax),
    nisaUsed: nisaUsed + investToNisa,
  };
}

export function calcFinalTotal(scenario: Scenario, annualRate: number): number {
  const monthlyRate = calculateMonthlyRate(annualRate);

  let balNisa = 0;
  let balTax = 0;
  let nisaUsed = 0;

  ({ balNisa, balTax, nisaUsed } = allocateToAccounts(
    scenario.initialLump,
    balNisa,
    balTax,
    nisaUsed,
  ));

  const withdrawStartDiff = scenario.withdrawStartYm
    ? Math.max(0, diffMonths(scenario.startYm, scenario.withdrawStartYm))
    : Infinity;

  for (let monthIndex = 0; monthIndex < MAX_MONTHS; monthIndex += 1) {
    // 月末運用
    balNisa = Math.floor(balNisa * (1 + monthlyRate));

    if (monthlyRate >= 0) {
      const gain = Math.floor(balTax * monthlyRate);
      const tax = Math.floor(gain * TAX_RATE);
      balTax = Math.floor(balTax + gain - tax);
    } else {
      balTax = Math.floor(balTax * (1 + monthlyRate));
    }

    // 月末入金
    ({ balNisa, balTax, nisaUsed } = allocateToAccounts(
      scenario.monthlyInvest,
      balNisa,
      balTax,
      nisaUsed,
    ));

    // 取り崩し
    const isWithdrawPhase = monthIndex >= withdrawStartDiff;
    const withdrawAmount = isWithdrawPhase
      ? Math.max(0, Math.floor(scenario.monthlyWithdraw ?? 0))
      : 0;

    if (withdrawAmount > 0) {
      const withdrawFromTax = Math.min(balTax, withdrawAmount);
      balTax = Math.floor(balTax - withdrawFromTax);
      let remaining = withdrawAmount - withdrawFromTax;

      if (remaining > 0) {
        const withdrawFromNisa = Math.min(balNisa, remaining);
        balNisa = Math.floor(balNisa - withdrawFromNisa);
      }
    }
  }

  return Math.floor(balNisa + balTax);
}
