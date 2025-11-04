import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScenarioForm } from './components/ScenarioForm';
import { ResultList } from './components/ResultList';
import { calcFinalTotal, type RateResult, type Scenario } from './lib/calcEngine';
import { loadScenario, saveScenario } from './lib/storage';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
});

export const formatJPY = (value: number): string => currencyFormatter.format(value);

function getTodayYm(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseRatesInput(input: string): number[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => Number(item))
    .filter((value) => !Number.isNaN(value));
}

const initialScenario: Scenario = {
  name: 'テストシナリオ',
  startYm: getTodayYm(),
  initialLump: 0,
  monthlyInvest: 30_000,
  withdrawStartYm: '',
  monthlyWithdraw: 0,
  ratesPercent: [3, 5, 7],
};

const RATE_MIN = 0;
const RATE_MAX = 50;

const App: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [ratesInput, setRatesInput] = useState('3,5,7');
  const [results, setResults] = useState<RateResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const scenarioForCalc = useMemo(() => scenario, [scenario]);

  const validateScenario = useCallback(
    (nextScenario: Scenario, rateList: number[]): string | null => {
      if (nextScenario.initialLump < 0 || nextScenario.monthlyInvest < 0) {
        return '初期元本・毎月積立額は0以上で入力してください。';
      }
      if (nextScenario.monthlyWithdraw !== undefined && nextScenario.monthlyWithdraw < 0) {
        return '毎月の取り崩し額は0以上で入力してください。';
      }
      if (!rateList.length) {
        return '年率リストを入力してください。';
      }
      const invalidRate = rateList.find((rate) => rate < RATE_MIN || rate > RATE_MAX);
      if (invalidRate !== undefined) {
        return `年率は${RATE_MIN}〜${RATE_MAX}%の範囲で入力してください。`;
      }
      return null;
    },
    [],
  );

  const runCalculation = useCallback(
    (baseScenario: Scenario, rateList: number[]): RateResult[] =>
      rateList.map((ratePercent) => ({
        ratePercent,
        finalTotal: calcFinalTotal(baseScenario, ratePercent / 100),
      })),
    [],
  );

  const handleCalculate = useCallback(() => {
    const parsedRates = parseRatesInput(ratesInput);
    const updatedScenario: Scenario = {
      ...scenarioForCalc,
      ratesPercent: parsedRates,
    };
    const validationError = validateScenario(updatedScenario, parsedRates);
    if (validationError) {
      setErrorMessage(validationError);
      setInfoMessage(null);
      return;
    }

    setScenario(updatedScenario);
    setErrorMessage(null);
    setInfoMessage(null);
    const nextResults = runCalculation(updatedScenario, parsedRates);
    setResults(nextResults);
  }, [ratesInput, runCalculation, scenarioForCalc, validateScenario]);

  const handleSave = useCallback(() => {
    const parsedRates = parseRatesInput(ratesInput);
    const updatedScenario: Scenario = {
      ...scenarioForCalc,
      ratesPercent: parsedRates,
    };
    const validationError = validateScenario(updatedScenario, parsedRates);
    if (validationError) {
      setErrorMessage(validationError);
      setInfoMessage(null);
      return;
    }

    setScenario(updatedScenario);
    saveScenario(updatedScenario);
    setErrorMessage(null);
    setInfoMessage('シナリオを保存しました。');
  }, [ratesInput, scenarioForCalc, validateScenario]);

  const handleLoad = useCallback(() => {
    const loaded = loadScenario();
    if (!loaded) {
      setErrorMessage('保存されたシナリオが見つかりません。');
      setInfoMessage(null);
      return;
    }
    setScenario(loaded);
    setRatesInput(loaded.ratesPercent.join(','));
    setErrorMessage(null);
    setInfoMessage('保存済みシナリオを読み込みました。');
  }, []);

  useEffect(() => {
    handleCalculate();
    // 初回のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>NISAシミュレーター（MVP）</h1>
        <p className="app-note">
          このモデルは月末運用→月末入出金、課税口座は月次の増加分に課税する簡易モデルです
        </p>
      </header>
      <main className="app-main">
        <section className="form-section">
          <ScenarioForm
            scenario={scenario}
            ratesInput={ratesInput}
            errorMessage={errorMessage}
            onScenarioChange={(next) => {
              setScenario(next);
              setInfoMessage(null);
            }}
            onRatesInputChange={(value) => {
              setRatesInput(value);
              setInfoMessage(null);
            }}
            onCalculate={handleCalculate}
            onSave={handleSave}
            onLoad={handleLoad}
          />
          {infoMessage ? <p className="info-message">{infoMessage}</p> : null}
        </section>
        <section className="result-section">
          <h2>計算結果</h2>
          <ResultList results={results} formatJPY={formatJPY} />
        </section>
      </main>
    </div>
  );
};

export default App;
