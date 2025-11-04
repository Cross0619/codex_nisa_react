import React from "react";
import { Scenario } from "../lib/calcEngine";

export type StoredScenario = Scenario & { updatedAt: string };

interface ScenarioStoreProps {
  currentScenario: Scenario;
  savedScenarios: StoredScenario[];
  onSaveNew: () => void;
  onOverwrite: () => void;
  onLoad: (scenario: StoredScenario) => void;
  onDelete: (id: string) => void;
  onDuplicate: (scenario: StoredScenario) => void;
}

const ScenarioStore: React.FC<ScenarioStoreProps> = ({
  currentScenario,
  savedScenarios,
  onSaveNew,
  onOverwrite,
  onLoad,
  onDelete,
  onDuplicate,
}) => {
  const hasCurrentInStorage = savedScenarios.some((item) => item.id === currentScenario.id);

  return (
    <section className="scenario-store">
      <h2>シナリオ保存</h2>
      <div className="store-actions">
        <button type="button" onClick={onSaveNew}>
          新規保存
        </button>
        <button type="button" onClick={onOverwrite} disabled={!hasCurrentInStorage}>
          上書き保存
        </button>
      </div>
      <div className="store-list">
        <h3>保存済みシナリオ</h3>
        {savedScenarios.length === 0 ? (
          <p className="hint">保存済みシナリオはありません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>更新日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {savedScenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td>{scenario.name}</td>
                  <td>{new Date(scenario.updatedAt).toLocaleString()}</td>
                  <td className="store-buttons">
                    <button type="button" onClick={() => onLoad(scenario)}>
                      読込
                    </button>
                    <button type="button" onClick={() => onDuplicate(scenario)}>
                      複製
                    </button>
                    <button type="button" onClick={() => onDelete(scenario.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default ScenarioStore;
