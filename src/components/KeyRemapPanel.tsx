import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import {
  WEIKAV_WK75_LAYOUT,
  HID_USAGES,
  SHORTCUT_PRESETS,
  formatComboLabel,
  parseComboRecord,
  encodeComboBytes,
  MOD_LCTRL,
  MOD_LSHIFT,
  MOD_LALT,
  MOD_LWIN,
  MOD_RCTRL,
  MOD_RSHIFT,
  MOD_RALT,
  MOD_RWIN,
  type KeyRecord,
} from '../types/hid';

export interface KeyRemapPanelProps {
  selectedMatrixIdx: number | null;
  records: Map<number, KeyRecord>;
  onApplyRemap: (matrixIdx: number, usage: number) => void;
  onApplyComboRemap: (matrixIdx: number, rawBytes: [number, number, number, number]) => void;
  onResetKey: (matrixIdx: number) => void;
  onResetAll?: () => void;
  isDevMode?: boolean;
}

export const KeyRemapPanel: React.FC<KeyRemapPanelProps> = ({
  selectedMatrixIdx,
  records,
  onApplyRemap,
  onApplyComboRemap,
  onResetKey,
  onResetAll,
}) => {
  const [remapMode, setRemapMode] = useState<'single' | 'shortcut' | 'presets'>('single');
  const [activeCategory, setActiveCategory] = useState<string>('Standard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUsage, setSelectedUsage] = useState<number | null>(null);

  // Shortcut builder state
  const [modLCtrl, setModLCtrl] = useState(false);
  const [modLShift, setModLShift] = useState(false);
  const [modLAlt, setModLAlt] = useState(false);
  const [modLWin, setModLWin] = useState(false);
  const [modRCtrl, setModRCtrl] = useState(false);
  const [modRShift, setModRShift] = useState(false);
  const [modRAlt, setModRAlt] = useState(false);
  const [modRWin, setModRWin] = useState(false);
  const [shortcutKeyUsage, setShortcutKeyUsage] = useState<number>(0x06); // Default 'C'

  useEffect(() => {
    setSelectedUsage(null);
    setSearchQuery('');

    if (selectedMatrixIdx !== null) {
      const rec = records.get(selectedMatrixIdx);
      if (rec) {
        const combo = parseComboRecord(rec.bytes);
        setModLCtrl(!!(combo.modifiers & MOD_LCTRL));
        setModLShift(!!(combo.modifiers & MOD_LSHIFT));
        setModLAlt(!!(combo.modifiers & MOD_LALT));
        setModLWin(!!(combo.modifiers & MOD_LWIN));
        setModRCtrl(!!(combo.modifiers & MOD_RCTRL));
        setModRShift(!!(combo.modifiers & MOD_RSHIFT));
        setModRAlt(!!(combo.modifiers & MOD_RALT));
        setModRWin(!!(combo.modifiers & MOD_RWIN));
        setShortcutKeyUsage(combo.keyUsage || 0x06);
      }
    }
  }, [selectedMatrixIdx, records]);

  if (selectedMatrixIdx === null) {
    return (
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] space-y-4">
        <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
          KEYMAP &amp; SHORTCUT INSPECTOR
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-white">No Physical Key Selected</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            Click any key on the physical Weikav WK75 layout above to remap its function, assign custom combos, or apply instant media shortcuts.
          </p>
        </div>
      </div>
    );
  }

  const keyDef = WEIKAV_WK75_LAYOUT.find((k) => k.matrixIdx === selectedMatrixIdx);
  const record = records.get(selectedMatrixIdx);
  const currentBytes = record ? record.bytes : ([0, 0, 0, 0] as [number, number, number, number]);
  const currentLabel = formatComboLabel(currentBytes);
  const currentUsage = record ? record.hidUsage : 0;
  const originalUsage = record ? record.originalUsage : 0;
  const isModified = record ? record.bytes.join(',') !== [0, 0, 0, originalUsage].join(',') && currentUsage !== originalUsage : false;

  const categories = ['Standard', 'Modifiers', 'Function', 'Navigation', 'Media', 'Special'];

  const filteredUsages = HID_USAGES.filter((u) => {
    const matchesCategory = activeCategory === 'All' || u.category === activeCategory;
    const matchesSearch = u.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `0x${u.usage.toString(16)}`.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getModBitmask = () => {
    let mask = 0;
    if (modLCtrl) mask |= MOD_LCTRL;
    if (modLShift) mask |= MOD_LSHIFT;
    if (modLAlt) mask |= MOD_LALT;
    if (modLWin) mask |= MOD_LWIN;
    if (modRCtrl) mask |= MOD_RCTRL;
    if (modRShift) mask |= MOD_RSHIFT;
    if (modRAlt) mask |= MOD_RALT;
    if (modRWin) mask |= MOD_RWIN;
    return mask;
  };

  const handleApplySingle = () => {
    if (selectedUsage === null) return;
    onApplyRemap(selectedMatrixIdx, selectedUsage);
  };

  const handleApplyShortcut = () => {
    const rawBytes = encodeComboBytes(getModBitmask(), shortcutKeyUsage);
    onApplyComboRemap(selectedMatrixIdx, rawBytes);
  };

  const handleApplyRawPreset = (rawBytes: [number, number, number, number]) => {
    onApplyComboRemap(selectedMatrixIdx, rawBytes);
  };

  const getUsageLabel = (usage: number) => {
    const found = HID_USAGES.find((u) => u.usage === usage);
    return found ? found.label : `0x${usage.toString(16).toUpperCase()}`;
  };

  const QUICK_SHORTCUTS: { label: string; desc: string; rawBytes: [number, number, number, number]; icon: string }[] = [
    { label: 'Calculator', desc: 'Opens Windows Calculator', rawBytes: [2, 0, 1, 0x92], icon: '🧮' },
    { label: 'Volume Down', desc: 'Decrease Volume (Media)', rawBytes: [2, 0, 0, 0xEA], icon: '🔉' },
    { label: 'Volume Up', desc: 'Increase Volume (Media)', rawBytes: [2, 0, 0, 0xE9], icon: '🔊' },
    { label: 'Volume Mute', desc: 'Toggle Audio Mute', rawBytes: [2, 0, 0, 0xE2], icon: '🔇' },
    { label: 'Play / Pause', desc: 'Media Playback', rawBytes: [2, 0, 0, 0xCD], icon: '⏯️' },
    { label: 'Next Track', desc: 'Media Next Song', rawBytes: [2, 0, 0, 0xB5], icon: '⏭️' },
    { label: 'Previous Track', desc: 'Media Prev Song', rawBytes: [2, 0, 0, 0xB6], icon: '⏮️' },
    { label: 'Email Client', desc: 'Launch Default Mail', rawBytes: [2, 0, 1, 0x8A], icon: '✉️' },
  ];

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
            KEYMAP &amp; SHORTCUT INSPECTOR
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
            <span>Key {keyDef ? keyDef.label : `#${selectedMatrixIdx}`}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[#333333] text-white font-mono text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>Matrix #{selectedMatrixIdx}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-purple-400 font-bold">{currentLabel}</span>
          </div>
          {isModified && (
            <button
              onClick={() => onResetKey(selectedMatrixIdx)}
              className="text-xs text-rose-400 hover:text-rose-300 font-mono font-semibold cursor-pointer transition-colors"
            >
              Reset Key
            </button>
          )}
          {onResetAll && (
            <button
              onClick={() => onResetAll()}
              className="text-xs text-zinc-400 hover:text-white font-mono font-medium px-2 py-1 rounded bg-[#181818] border border-[#2a2a2a] hover:border-[#383838] transition-all cursor-pointer"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Hardware Protection Banner */}
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
          <div>
            <span className="font-bold text-purple-300">Safe Hardware Protection Active</span>
            <span className="text-[11px] text-zinc-400 block">
              Remapping writes to EEPROM User keymap tables. Bootloader and MCU firmware are 100% safe.
            </span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setRemapMode('single')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            remapMode === 'single'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          Single Key Remap
        </button>
        <button
          onClick={() => setRemapMode('shortcut')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            remapMode === 'shortcut'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          Combo Builder (Ctrl / Alt / Win)
        </button>
        <button
          onClick={() => setRemapMode('presets')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            remapMode === 'presets'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          Quick Presets &amp; Media Shortcuts
        </button>
      </div>

      {/* MODE 1: Single Key & Media Selection */}
      {remapMode === 'single' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              placeholder="Search keys by label or hex usage (e.g. 'Calculator', 'Volume', 'F9', '0xE2')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredUsages.map((item) => {
              const isChosen = selectedUsage === item.usage;
              return (
                <button
                  key={item.usage + item.label}
                  onClick={() => setSelectedUsage(item.usage)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 ${
                    isChosen
                      ? 'bg-purple-500/20 border-purple-400 text-white shadow-sm shadow-purple-500/20'
                      : 'bg-[#161616] border-[#242424] text-zinc-300 hover:border-zinc-600 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight truncate">{item.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    0x{item.usage.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-[#161616] border border-[#222222] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Selected Remap Target</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {selectedUsage !== null ? getUsageLabel(selectedUsage) : 'None'}
              </div>
            </div>

            <button
              onClick={handleApplySingle}
              disabled={selectedUsage === null}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                selectedUsage !== null
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Apply Single Key Remap
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: Shortcut / Combination Builder */}
      {remapMode === 'shortcut' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Create an instant multi-key combination (e.g., <code className="text-purple-400">Ctrl + Shift + S</code>,{' '}
            <code className="text-purple-400">Win + D</code>). When pressed, the keyboard sends the modifiers and key in one hardware report.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-zinc-300 font-mono">LEFT MODIFIERS</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Ctrl', val: modLCtrl, set: setModLCtrl },
                  { label: 'Shift', val: modLShift, set: setModLShift },
                  { label: 'Alt', val: modLAlt, set: setModLAlt },
                  { label: 'Win', val: modLWin, set: setModLWin },
                ].map((mod) => (
                  <button
                    key={mod.label}
                    onClick={() => mod.set(!mod.val)}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      mod.val
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-[#1c1c1c] border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-[#383838]'
                    }`}
                  >
                    Left {mod.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-zinc-300 font-mono">RIGHT MODIFIERS</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Ctrl', val: modRCtrl, set: setModRCtrl },
                  { label: 'Shift', val: modRShift, set: setModRShift },
                  { label: 'Alt', val: modRAlt, set: setModRAlt },
                  { label: 'Win', val: modRWin, set: setModRWin },
                ].map((mod) => (
                  <button
                    key={mod.label}
                    onClick={() => mod.set(!mod.val)}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      mod.val
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-[#1c1c1c] border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-[#383838]'
                    }`}
                  >
                    Right {mod.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#161616] border border-[#222222] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-zinc-300 font-mono">TRIGGER KEY</div>
              <div className="text-xs text-zinc-500">Key triggered alongside modifier combination</div>
            </div>
            <select
              value={shortcutKeyUsage}
              onChange={(e) => setShortcutKeyUsage(Number(e.target.value))}
              className="bg-[#202020] border border-[#333333] text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-400 w-full sm:w-auto"
            >
              {HID_USAGES.filter((u) => u.category === 'Standard' || u.category === 'Function' || u.category === 'Navigation').map(
                (u) => (
                  <option key={u.usage} value={u.usage}>
                    {u.label} (0x{u.usage.toString(16).toUpperCase().padStart(2, '0')})
                  </option>
                )
              )}
            </select>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">
                Shortcut Preview
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {formatComboLabel(encodeComboBytes(getModBitmask(), shortcutKeyUsage))}
              </div>
            </div>

            <button
              onClick={handleApplyShortcut}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-purple-600/30 cursor-pointer text-center"
            >
              Apply Combo Shortcut
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: Preset Shortcuts & Media Shortcuts */}
      {remapMode === 'presets' && (
        <div className="space-y-6">
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-purple-400 font-mono uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Dedicated Media &amp; App Shortcuts (Instant Apply)
            </div>
            <p className="text-xs text-zinc-400">
              One-click preset shortcuts for Calculator, Volume controls, and media playback. Click to apply directly to{' '}
              <span className="text-white font-bold">Key {keyDef?.label}</span>:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_SHORTCUTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleApplyRawPreset(item.rawBytes)}
                  className="p-3 bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/30 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-20 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[9px] font-mono text-purple-300 font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40">
                      Preset
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-[#1c1c1c]">
            <div className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              Productivity Combos
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-52 overflow-y-auto pr-1">
              {SHORTCUT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleApplyRawPreset(encodeComboBytes(preset.modifiers, preset.key))}
                  className="p-3 bg-[#161616] border border-[#242424] hover:border-purple-500/60 hover:bg-[#1e1e1e] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                    {preset.label}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1 font-semibold">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

