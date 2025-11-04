import React from "react";
import { Scenario, parseDslToBlocks } from "../lib/calcEngine";
import BlocksEditor from "./BlocksEditor";
import { PeriodBlock } from "../lib/periods";

interface ScenarioFormProps {
  scenario: Scenario;
  ratesText: string;
  dslErrors: string[];
  ratesValid: boolean;
  onScenarioFieldChange: (patch: Partial<Scenario>) => void;
  onRatesTextChange: (text: string) => void;
  onBlocksChange: (blocks: PeriodBlock[]) => void;
  onDslChange: (text: string, blocks: PeriodBlock[], errors: string[]) => void;
}

const ScenarioForm: React.FC<ScenarioFormProps> = ({
  scenario,
  ratesText,
  dslErrors,
  ratesValid,
  onScenarioFieldChange,
  onRatesTextChange,
  onBlocksChange,
  onDslChange,
}) => {
  const change = (field: keyof Scenario, value: any) => {
    onScenarioFieldChange({ [field]: value } as Partial<Scenario>);
  };

  const handleModeChange = (mode: Scenario["mode"]) => {
    change("mode", mode);
  };

  const handleDslChange = (text: string) => {
    const { blocks, errors } = parseDslToBlocks(text);
    onDslChange(text, blocks, errors);
  };

  return (
    <section className="scenario-form">
      <h2>入力</h2>
      <label>
        <span>シナリオ名</span>
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => change("name", e.target.value)}
        />
      </label>
      <label>
        <span>開始年月 (YYYY-MM)</span>
        <input
          type="month"
          value={scenario.startYm}
          onChange={(e) => change("startYm", e.target.value)}
        />
      </label>
      <label>
        <span>初期元本 (円)</span>
        <input
          type="number"
          min={0}
          value={scenario.initialLump}
          onChange={(e) => change("initialLump", Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <label>
        <span>シミュ期間 (年)</span>
        <input
          type="number"
          min={1}
          value={scenario.durationYears}
          onChange={(e) => change("durationYears", Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      <label>
        <span>年率リスト</span>
        <input type="text" value={ratesText} onChange={(e) => onRatesTextChange(e.target.value)} />
        <small className="hint">例: 3 5 7 10 または 0.03 0.05 など。入力順に計算します。</small>
        {!ratesValid && <p className="error">数値をスペースまたはカンマ区切りで入力してください。</p>}
      </label>

      <div className="tabs">
        <div className="tab-headers">
          <button
            type="button"
            className={scenario.mode === "simple" ? "active" : ""}
            onClick={() => handleModeChange("simple")}
          >
            かんたんモード
          </button>
          <button
            type="button"
            className={scenario.mode === "builder" ? "active" : ""}
            onClick={() => handleModeChange("builder")}
          >
            期間ビルダー
          </button>
          <button
            type="button"
            className={scenario.mode === "dsl" ? "active" : ""}
            onClick={() => handleModeChange("dsl")}
          >
            テキストDSL
          </button>
        </div>
        <div className="tab-body">
          {scenario.mode === "simple" && (
            <div className="tab-panel">
              <label>
                <span>毎月積立 (円)</span>
                <input
                  type="number"
                  min={0}
                  value={scenario.monthlyInvest ?? 0}
                  onChange={(e) =>
                    change("monthlyInvest", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </label>
              <label>
                <span>毎月取り崩し (円)</span>
                <input
                  type="number"
                  min={0}
                  value={scenario.monthlyWithdraw ?? 0}
                  onChange={(e) =>
                    change("monthlyWithdraw", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </label>
              <label>
                <span>取り崩し開始年月</span>
                <input
                  type="month"
                  value={scenario.withdrawStartYm ?? ""}
                  onChange={(e) => change("withdrawStartYm", e.target.value)}
                />
              </label>
            </div>
          )}
          {scenario.mode === "builder" && (
            <div className="tab-panel">
              <BlocksEditor blocks={scenario.blocks ?? []} onChange={onBlocksChange} />
            </div>
          )}
          {scenario.mode === "dsl" && (
            <div className="tab-panel">
              <textarea
                value={scenario.dslText ?? ""}
                onChange={(e) => handleDslChange(e.target.value)}
                rows={12}
              />
              {dslErrors.length > 0 ? (
                <ul className="error-list">
                  {dslErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              ) : (
                <p className="hint">(months, flow) x年数 の形式で入力します。</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ScenarioForm;
