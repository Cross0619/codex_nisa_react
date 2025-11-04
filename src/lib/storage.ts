import type { Scenario } from './calcEngine';

const STORAGE_KEY = 'nisa-sim/currentScenario';

type SerializableScenario = Omit<Scenario, 'ratesPercent'> & {
  ratesPercent: number[];
};

export function saveScenario(scenario: Scenario): void {
  if (typeof window === 'undefined') return;
  const data: SerializableScenario = {
    ...scenario,
    ratesPercent: [...scenario.ratesPercent],
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadScenario(): Scenario | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SerializableScenario;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      ...parsed,
      ratesPercent: Array.isArray(parsed.ratesPercent)
        ? parsed.ratesPercent.map((v) => Number(v)).filter((v) => !Number.isNaN(v))
        : [],
    };
  } catch (error) {
    console.error('Failed to load scenario', error);
    return null;
  }
}

export { STORAGE_KEY };
