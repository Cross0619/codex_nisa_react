import React from "react";
import { PeriodBlock } from "../lib/periods";

interface BlocksEditorProps {
  blocks: PeriodBlock[];
  onChange: (blocks: PeriodBlock[]) => void;
}

// UI ブロックエディタ：pattern の並びと繰り返し年数を編集
const BlocksEditor: React.FC<BlocksEditorProps> = ({ blocks, onChange }) => {
  const updateBlock = (index: number, updater: (block: PeriodBlock) => PeriodBlock) => {
    const next = blocks.map((block, i) => (i === index ? updater(block) : block));
    onChange(next);
  };

  const updatePattern = (
    blockIndex: number,
    patternIndex: number,
    field: "months" | "flow",
    value: number
  ) => {
    updateBlock(blockIndex, (block) => {
      const pattern = block.pattern.map((period, i) =>
        i === patternIndex ? { ...period, [field]: value } : period
      );
      return { ...block, pattern };
    });
  };

  const addBlock = () => {
    onChange([
      ...blocks,
      {
        name: "",
        repeatYears: 1,
        pattern: [
          {
            months: 12,
            flow: 0,
          },
        ],
      },
    ]);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onChange(next);
  };

  const addPattern = (blockIndex: number) => {
    updateBlock(blockIndex, (block) => ({
      ...block,
      pattern: [...block.pattern, { months: 1, flow: 0 }],
    }));
  };

  const removePattern = (blockIndex: number, patternIndex: number) => {
    updateBlock(blockIndex, (block) => ({
      ...block,
      pattern: block.pattern.filter((_, i) => i !== patternIndex),
    }));
  };

  return (
    <div className="blocks-editor">
      <div className="blocks-header">
        <button type="button" onClick={addBlock}>
          ブロックを追加
        </button>
      </div>
      {blocks.length === 0 ? (
        <p className="hint">ブロックがありません。追加してください。</p>
      ) : (
        blocks.map((block, blockIndex) => (
          <div key={blockIndex} className="block-card">
            <div className="block-header">
              <div className="block-title">
                <strong>ブロック {blockIndex + 1}</strong>
                {block.name ? <span className="block-name-tag">{block.name}</span> : null}
              </div>
              <div className="block-actions">
                <button
                  type="button"
                  onClick={() => moveBlock(blockIndex, -1)}
                  disabled={blockIndex === 0}
                  aria-label="上へ移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(blockIndex, 1)}
                  disabled={blockIndex === blocks.length - 1}
                  aria-label="下へ移動"
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeBlock(blockIndex)}>
                  削除
                </button>
              </div>
            </div>
            <label className="field-inline">
              <span>ブロック名</span>
              <input
                type="text"
                value={block.name ?? ""}
                placeholder="例: 積立期"
                onChange={(e) =>
                  updateBlock(blockIndex, (b) => ({
                    ...b,
                    name: e.target.value,
                  }))
                }
              />
            </label>
            <label className="field-inline">
              <span>繰り返し年数</span>
              <input
                type="number"
                min={1}
                value={block.repeatYears}
                onChange={(e) =>
                  updateBlock(blockIndex, (b) => ({
                    ...b,
                    repeatYears: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </label>
            <div className="pattern-list">
              {block.pattern.map((period, patternIndex) => (
                <div key={patternIndex} className="pattern-row">
                  <label>
                    <span>months</span>
                    <input
                      type="number"
                      min={1}
                      value={period.months}
                      onChange={(e) =>
                        updatePattern(
                          blockIndex,
                          patternIndex,
                          "months",
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>flow</span>
                    <input
                      type="number"
                      value={period.flow}
                      onChange={(e) =>
                        updatePattern(
                          blockIndex,
                          patternIndex,
                          "flow",
                          Math.trunc(Number(e.target.value) || 0)
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removePattern(blockIndex, patternIndex)}
                    disabled={block.pattern.length === 1}
                  >
                    行削除
                  </button>
                </div>
              ))}
            </div>
            <div className="pattern-actions">
              <button type="button" onClick={() => addPattern(blockIndex)}>
                行を追加
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BlocksEditor;
