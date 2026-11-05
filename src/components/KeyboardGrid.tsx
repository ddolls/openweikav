import React, { useEffect, useState } from 'react';
import { WEIKAV_WK75_LAYOUT, HID_USAGES, formatComboLabel, type KeyDefinition, type KeyRecord, type RgbConfigState } from '../types/hid';
import { inputManager, type KnobState } from '../services/inputManager';
import { rgbService } from '../services/rgbService';

interface KeyboardGridProps {
  selectedMatrixIdx: number | null;
  onSelectKey: (idx: number) => void;
  records: Map<number, KeyRecord>;
}

export const KeyboardGrid: React.FC<KeyboardGridProps> = ({
  selectedMatrixIdx,
  onSelectKey,
  records,
}) => {
  const rows = [0, 1, 2, 3, 4, 5];
  const [pressedIndices, setPressedIndices] = useState<Set<number>>(new Set());
  const [knobState, setKnobState] = useState<KnobState>(inputManager.getKnobState());
  const [rgbState, setRgbState] = useState<RgbConfigState>(rgbService.getState());

  useEffect(() => {
    const unsubscribeInput = inputManager.subscribe((pressed) => {
      setPressedIndices(new Set(pressed));
    });
    const unsubscribeKnob = inputManager.subscribeKnob((knob) => {
      setKnobState(knob);
    });
    const unsubscribeRgb = rgbService.subscribe((state) => {
      setRgbState(state);
    });
    return () => {
      unsubscribeInput();
      unsubscribeKnob();
      unsubscribeRgb();
    };
  }, []);

  const getUsageLabel = (hidUsage: number) => {
    const found = HID_USAGES.find((u) => u.usage === hidUsage);
    if (found) return found.label;
    if (hidUsage === 0) return 'None';
    return `0x${hidUsage.toString(16).toUpperCase()}`;
  };

  return (
    <div className="w-full overflow-x-auto pb-2 pt-1 touch-pan-x select-none">
      <div className="min-w-[704px] w-[704px] mx-auto flex flex-col items-center justify-center space-y-2 py-2">
        {rows.map((rowIdx) => {
          const keysInRow = WEIKAV_WK75_LAYOUT.filter((k) => k.row === rowIdx);
          return (
            <div key={rowIdx} className="flex items-center gap-1.5 relative h-11 w-full max-w-[704px]">
              {keysInRow.map((keyDef: KeyDefinition) => {
                const record = records.get(keyDef.matrixIdx);
                const currentUsage = record ? record.hidUsage : null;
                const isModified = record && record.hidUsage !== record.originalUsage;
                const isSelected = selectedMatrixIdx === keyDef.matrixIdx;
                const isPressed = pressedIndices.has(keyDef.matrixIdx);
                const isFnKey = keyDef.category === 'fn' || keyDef.matrixIdx === 59;

                if (keyDef.isKnob) {
                  const isKnobActive = isPressed || knobState.isActive;
                  return (
                    <div
                      key={keyDef.matrixIdx}
                      style={{ left: `${keyDef.col * 44}px`, width: '38px' }}
                      className="absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-pointer group select-none"
                      onClick={() => {
                        onSelectKey(keyDef.matrixIdx);
                        inputManager.triggerKnobAction('mute');
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        if (e.deltaY < 0) {
                          inputManager.triggerKnobAction('up');
                        } else {
                          inputManager.triggerKnobAction('down');
                        }
                      }}
                      title="Weikav Metal Rotary Knob (Rotate: Vol +/- | Click: Mute)"
                    >
                      {/* Floating Action Badge */}
                      {knobState.lastAction && (
                        <div className="absolute -top-6 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-500/50 text-[9px] font-mono font-bold text-purple-300 shadow-[0_0_10px_#a855f7] pointer-events-none animate-pulse whitespace-nowrap z-30">
                          {knobState.lastAction === 'up' && 'VOL ▲'}
                          {knobState.lastAction === 'down' && 'VOL ▼'}
                          {knobState.lastAction === 'mute' && 'MUTE'}
                        </div>
                      )}

                      {/* Rotating Ring */}
                      <div
                        style={{
                          transform: `rotate(${knobState.rotation}deg) ${isKnobActive ? 'scale(0.92)' : 'scale(1)'}`,
                          transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        className={`relative w-9 h-9 rounded-full bg-gradient-to-b from-[#2a1a38] to-[#120a1c] border flex items-center justify-center shadow-lg transition-all ${
                          isKnobActive
                            ? 'border-purple-400 shadow-[0_0_18px_#a855f7] bg-[#221035]'
                            : isSelected
                            ? 'border-white bg-[#222222] shadow-md'
                            : 'border-[#3d2752] group-hover:border-purple-400/70'
                        }`}
                      >
                        {/* Notch */}
                        <div
                          className={`absolute top-1 w-1.5 h-1.5 rounded-full transition-colors ${
                            isKnobActive
                              ? 'bg-purple-400 shadow-[0_0_8px_#a855f7]'
                              : 'bg-purple-300 group-hover:bg-white'
                          }`}
                        />

                        {/* Center Core */}
                        <div className="w-4 h-4 rounded-full bg-[#181124] border border-[#3b2450] flex items-center justify-center">
                          <div
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isKnobActive ? 'bg-purple-400' : 'bg-purple-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                const widthPx = (keyDef.width || 1) * 38 + ((keyDef.width || 1) - 1) * 6;
                const isMac = records.get(11)?.hidUsage === 0xE2 && records.get(17)?.hidUsage === 0xE3;
                let displayLabel = keyDef.label;
                if (isMac) {
                  if (keyDef.matrixIdx === 11) displayLabel = '⌥ Opt';
                  if (keyDef.matrixIdx === 17) displayLabel = '⌘ Cmd';
                }
                const comboLabel = record && record.bytes ? formatComboLabel(record.bytes) : displayLabel;
                const currentUsageLabel = isModified ? comboLabel : (currentUsage !== null ? getUsageLabel(currentUsage) : displayLabel);
                const keyRgb =
                  rgbState.perKeyColors[keyDef.matrixIdx] ||
                  ((!rgbState.colorful || rgbState.effectId === 1) && rgbState.effectId !== 0
                    ? rgbState.staticColor
                    : null);
                const hasRgbGlow = Boolean(keyRgb && keyRgb !== '#000000');

                return (
                  <button
                    key={keyDef.matrixIdx}
                    onClick={() => onSelectKey(keyDef.matrixIdx)}
                    style={{
                      width: `${widthPx}px`,
                      left: `${keyDef.col * 44}px`,
                      ...(hasRgbGlow && !isPressed && !isSelected
                        ? {
                            borderColor: `${keyRgb}88`,
                            boxShadow: `0 0 10px ${keyRgb}30`,
                          }
                        : {}),
                    }}
                    className={`key-cap-tile absolute top-0 bottom-0 rounded-lg p-1 flex flex-col justify-between items-start text-left select-none ${
                      isPressed
                        ? 'pressed'
                        : isSelected
                        ? 'selected'
                        : isModified
                        ? 'modified'
                        : isFnKey
                        ? 'fn-key'
                        : 'text-zinc-200'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-tight truncate leading-none">
                        {displayLabel}
                      </span>
                      <span className="text-[7px] font-mono text-zinc-500">
                        #{keyDef.matrixIdx}
                      </span>
                    </div>

                    <div className="w-full truncate text-[8px] font-mono text-zinc-400 leading-none">
                      {isModified ? (
                        <span className="text-amber-400 font-semibold truncate block">{currentUsageLabel}</span>
                      ) : (
                        currentUsageLabel !== displayLabel && <span>{currentUsageLabel}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

