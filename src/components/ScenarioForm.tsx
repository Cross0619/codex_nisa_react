import React from 'react';
import type { Scenario } from '../lib/calcEngine';

export type ScenarioFormProps = {
  scenario: Scenario;
  ratesInput: string;
  errorMessage?: string | null;
  onScenarioChange: (scenario: Scenario) => void;
  onRatesInputChange: (value: string) => void;
  onCalculate: () => void;
  onSave: () => void;
  onLoad: () => void;
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const fieldsetStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

export const ScenarioForm: React.FC<ScenarioFormProps> = ({
  scenario,
  ratesInput,
  errorMessage,
  onScenarioChange,
  onRatesInputChange,
  onCalculate,
  onSave,
  onLoad,
}) => {
  const handleChange = <K extends keyof Scenario>(key: K, rawValue: Scenario[K]) => {
    onScenarioChange({
      ...scenario,
      [key]: rawValue,
    });
  };

  const handleNumberChange = (key: keyof Scenario) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    handleChange(key, Number.isNaN(value) ? 0 : (value as Scenario[typeof key]));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onCalculate();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <fieldset style={fieldsetStyle}>
        <label style={labelStyle}>
          シナリオ名
          <input
            type="text"
            value={scenario.name}
            onChange={(event) => handleChange('name', event.target.value as Scenario['name'])}
          />
        </label>

        <label style={labelStyle}>
          開始年月（YYYY-MM）
          <input
            type="month"
            value={scenario.startYm}
            onChange={(event) => handleChange('startYm', event.target.value as Scenario['startYm'])}
          />
        </label>

        <label style={labelStyle}>
          初期元本（円）
          <input type="number" min={0} step={1} value={scenario.initialLump} onChange={handleNumberChange('initialLump')} />
        </label>

        <label style={labelStyle}>
          毎月の積立額（円）
          <input type="number" min={0} step={1} value={scenario.monthlyInvest} onChange={handleNumberChange('monthlyInvest')} />
        </label>

        <label style={labelStyle}>
          取り崩し開始年月（空欄可）
          <input
            type="month"
            value={scenario.withdrawStartYm ?? ''}
            onChange={(event) => handleChange('withdrawStartYm', event.target.value as Scenario['withdrawStartYm'])}
          />
        </label>

        <label style={labelStyle}>
          毎月の取り崩し額（円）
          <input
            type="number"
            min={0}
            step={1}
            value={scenario.monthlyWithdraw ?? 0}
            onChange={handleNumberChange('monthlyWithdraw')}
          />
        </label>

        <label style={labelStyle}>
          年率リスト（例: 3,5,7）
          <input
            type="text"
            value={ratesInput}
            onChange={(event) => onRatesInputChange(event.target.value)}
            placeholder="3,5,7"
          />
        </label>
      </fieldset>

      {errorMessage ? <p style={{ color: 'red' }}>{errorMessage}</p> : null}

      <div style={buttonRowStyle}>
        <button type="submit">計算する</button>
        <button type="button" onClick={onSave}>
          保存
        </button>
        <button type="button" onClick={onLoad}>
          読込
        </button>
      </div>
    </form>
  );
};

export default ScenarioForm;
