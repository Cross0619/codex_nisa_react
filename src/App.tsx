import React, { useEffect, useState } from "react";
import ScenarioForm from "./components/ScenarioForm";
import ResultTable from "./components/ResultTable";
import ScenarioStore, { StoredScenario } from "./components/ScenarioStore";
import { CalcResult, Scenario, calcAllRates, parseDslToBlocks } from "./lib/calcEngine";
import { PeriodBlock } from "./lib/periods";
import { parseRatesText } from "./lib/format";

const STORAGE_KEY = "nisa-sim/scenarios";

const initialDsl = `(5, 5000)
(11, 20000), (1, -100000) x10
(11, 30000), (1, -100000) x15
(11, 50000), (1, -100000) x15
(12, -100000) x15`;

function createInitialScenario(): Scenario {
  const { blocks } = parseDslToBlocks(initialDsl);
  return {
    id: createId(),
    name: "標準シナリオ",
    startYm: new Date().toISOString().slice(0, 7),
    initialLump: 20000,
    durationYears: 55,
    mode: "dsl",
    monthlyInvest: 0,
    monthlyWithdraw: 0,
    withdrawStartYm: "",
    blocks,
    dslText: initialDsl,
    ratesPercent: [0.03, 0.05, 0.07, 0.1],
  };
}

const App: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>(() => createInitialScenario());
  const [ratesText, setRatesText] = useState<string>("3 5 7 10");
  const [dslErrors, setDslErrors] = useState<string[]>([]);
  const [ratesValid, setRatesValid] = useState<boolean>(true);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<StoredScenario[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredScenario[] = JSON.parse(raw);
        setSavedScenarios(parsed);
      }
    } catch (err) {
      console.warn("Failed to load scenarios", err);
    }
  }, []);

  const isDslValid = scenario.mode !== "dsl" || dslErrors.length === 0;
  const hasRates = scenario.ratesPercent.length > 0 && ratesValid;

  const handleScenarioFieldChange = (patch: Partial<Scenario>) => {
    setScenario((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleRatesChange = (text: string) => {
    setRatesText(text);
    const { rates, rawTokens } = parseRatesText(text);
    setRatesValid(rawTokens.length === rates.length && rates.length > 0);
    setScenario((prev) => ({
      ...prev,
      ratesPercent: rates,
    }));
  };

  const handleBlocksChange = (blocks: PeriodBlock[]) => {
    setScenario((prev) => ({
      ...prev,
      blocks,
    }));
  };

  const handleDslChange = (text: string, blocks: PeriodBlock[], errors: string[]) => {
    setDslErrors(errors);
    setScenario((prev) => ({
      ...prev,
      dslText: text,
      blocks,
    }));
  };

  const handleCalculate = () => {
    if (!hasRates || !isDslValid) return;
    try {
      const nextResult = calcAllRates(scenario);
      setResult(nextResult);
    } catch (err) {
      console.error(err);
    }
  };

  const saveScenarios = (items: StoredScenario[]) => {
    setSavedScenarios(items);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  };

  const handleSaveNew = () => {
    if (!scenario.name.trim()) {
      window.alert("シナリオ名を入力してください");
      return;
    }
    const newId = createId();
    const stored: StoredScenario = { ...scenario, id: newId, updatedAt: new Date().toISOString() };
    saveScenarios([...savedScenarios, stored]);
    setScenario((prev) => ({ ...prev, id: newId }));
  };

  const handleOverwrite = () => {
    if (!scenario.name.trim()) {
      window.alert("シナリオ名を入力してください");
      return;
    }
    const exists = savedScenarios.some((item) => item.id === scenario.id);
    if (!exists) {
      window.alert("保存済みシナリオがありません。新規保存してください。");
      return;
    }
    const updatedAt = new Date().toISOString();
    const updated = savedScenarios.map((item) =>
      item.id === scenario.id ? { ...scenario, updatedAt } : item
    );
    saveScenarios(updated);
  };

  const handleLoad = (item: StoredScenario) => {
    setScenario({ ...item });
    setRatesText(item.ratesPercent.map((r) => (r >= 1 ? r : Math.round(r * 10000) / 100)).join(" "));
    setRatesValid(item.ratesPercent.length > 0);
    setDslErrors([]);
    setResult(null);
  };

  const handleDelete = (id: string) => {
    const filtered = savedScenarios.filter((item) => item.id !== id);
    saveScenarios(filtered);
  };

  const handleDuplicate = (item: StoredScenario) => {
    const newScenario: StoredScenario = {
      ...item,
      id: createId(),
      name: `${item.name} (copy)`,
      updatedAt: new Date().toISOString(),
    };
    saveScenarios([...savedScenarios, newScenario]);
  };

  const canCalculate = isDslValid && hasRates;

  return (
    <div className="app">
      <div className="layout">
        <div className="left">
          <ScenarioForm
            scenario={scenario}
            ratesText={ratesText}
            dslErrors={dslErrors}
            ratesValid={ratesValid}
            onScenarioFieldChange={handleScenarioFieldChange}
            onRatesTextChange={handleRatesChange}
            onBlocksChange={handleBlocksChange}
            onDslChange={handleDslChange}
          />
          <button className="calculate" type="button" onClick={handleCalculate} disabled={!canCalculate}>
            計算する
          </button>
          <ScenarioStore
            currentScenario={scenario}
            savedScenarios={savedScenarios}
            onSaveNew={handleSaveNew}
            onOverwrite={handleOverwrite}
            onLoad={handleLoad}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
        <div className="right">
          <ResultTable result={result} />
        </div>
      </div>
    </div>
  );
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export default App;
