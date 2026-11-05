import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { hardwareSettingsService, type HardwareGlobalSettings } from '../services/hardwareSettingsService';

interface GlobalSettingsPanelProps {
  isConnected: boolean;
  isDevMode: boolean;
}

const SLEEP_PRESETS = [
  { label: '1 Min', seconds: 60 },
  { label: '2 Min (Default)', seconds: 120 },
  { label: '3 Min', seconds: 180 },
  { label: '5 Min', seconds: 300 },
  { label: '10 Min', seconds: 600 },
  { label: '20 Min', seconds: 1200 },
  { label: '30 Min', seconds: 1800 },
];

export const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({ isConnected }) => {
  const [settings, setSettings] = useState<HardwareGlobalSettings>(hardwareSettingsService.getSettings());
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const unsub = hardwareSettingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  const handleApply = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    const res = await hardwareSettingsService.applyToHardware();
    setIsSaving(false);
    setStatusMsg({ text: res.message, isError: !res.success });
    setTimeout(() => {
      setStatusMsg(null);
    }, 6000);
  };

  const handleReset = () => {
    if (confirm('Reset all Tap, Sleep, and Debounce settings to factory defaults?')) {
      hardwareSettingsService.resetToDefaults();
      setStatusMsg({ text: 'Settings reset to factory defaults.', isError: false });
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const getDebounceDescription = (stage: number) => {
    switch (stage) {
      case 1:
        return 'Stage 1: Ultra Fast (2ms) - Maximum responsive latency for competitive gaming. Ensure switches are in optimal condition.';
      case 2:
        return 'Stage 2: Fast Response (5ms) - Quick response with slight chatter protection.';
      case 3:
        return 'Stage 3: Balanced (8ms, Factory Default) - Optimal balance between gaming latency and typing reliability.';
      case 4:
        return 'Stage 4: Safe Stability (10ms) - Prevents unintended double-typing on sensitive switches.';
      case 5:
        return 'Stage 5: Anti-Chatter Max (15ms) - Maximum protection for worn or dusty switches to eliminate double-typing chatter.';
      default:
        return `Stage ${stage}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#101010] border border-[#222222] rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 border border-purple-800 text-purple-300">
                Hardware Configuration
              </span>
              <span className="text-xs text-zinc-500 font-mono">Tap • Sleep • Debounce</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Weikav WK75 Hardware &amp; Performance
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Configure internal microcontroller parameters for Weikav WK75 to control Tap sensitivity, wireless Sleep power-saving timers, and mechanical switch Debounce filters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              disabled={!isConnected || isSaving}
              onClick={handleApply}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save to Keyboard'}</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-mono transition-all ${
              statusMsg.isError
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            }`}
          >
            {statusMsg.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* 3 Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. TAP SETTINGS CARD */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Tap Function</h3>
                <div className="text-[11px] text-zinc-500 font-mono">Dual-Action Sensitivity</div>
              </div>

              <button
                type="button"
                onClick={() => hardwareSettingsService.updateSettings({ tapEnabled: !settings.tapEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.tapEnabled ? 'bg-purple-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.tapEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Distinguish between a quick tap and a sustained hold to trigger dual-function secondary actions on designated keys.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Sensitivity Threshold:</span>
                <span className="font-bold text-purple-400">{settings.tapSensitivityMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                disabled={!settings.tapEnabled}
                value={settings.tapSensitivityMs}
                onChange={(e) => hardwareSettingsService.updateSettings({ tapSensitivityMs: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>Fast (50ms)</span>
                <span>Normal (200ms)</span>
                <span>Slow (500ms)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#181818] border border-[#242424] rounded-xl p-3 text-[11px] text-zinc-400 font-mono">
            Status: <strong className={settings.tapEnabled ? 'text-emerald-400' : 'text-zinc-500'}>{settings.tapEnabled ? 'ACTIVE' : 'OFF'}</strong>
          </div>
        </div>

        {/* 2. SLEEP SETTINGS CARD */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Sleep Timeout</h3>
                <div className="text-[11px] text-zinc-500 font-mono">Wireless Power Saver</div>
              </div>

              <button
                type="button"
                onClick={() => hardwareSettingsService.updateSettings({ sleepEnabled: !settings.sleepEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.sleepEnabled ? 'bg-purple-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.sleepEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              In wireless modes (2.4G &amp; Bluetooth), the keyboard will automatically enter sleep mode after an idle interval to conserve battery life.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Idle Duration:</span>
                <span className="font-bold text-purple-400">
                  {settings.sleepEnabled ? `${Math.round(settings.sleepTimeoutSeconds / 60)} Min` : 'Always Awake'}
                </span>
              </div>

              <select
                disabled={!settings.sleepEnabled}
                value={settings.sleepTimeoutSeconds}
                onChange={(e) => hardwareSettingsService.updateSettings({ sleepTimeoutSeconds: parseInt(e.target.value, 10) })}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500 disabled:opacity-40"
              >
                {SLEEP_PRESETS.map((preset) => (
                  <option key={preset.seconds} value={preset.seconds}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#181818] border border-[#242424] rounded-xl p-3 text-[11px] text-zinc-400 font-mono">
            Wireless Mode: <strong className={settings.sleepEnabled ? 'text-emerald-400' : 'text-amber-400'}>{settings.sleepEnabled ? `Auto Sleep (${Math.round(settings.sleepTimeoutSeconds / 60)} Min)` : 'Always Awake (Higher Battery Usage)'}</strong>
          </div>
        </div>

        {/* 3. DEBOUNCE SETTINGS CARD */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Debounce Filter</h3>
                <div className="text-[11px] text-zinc-500 font-mono">Switch Chatter Control</div>
              </div>

              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950/80 border border-amber-800 text-amber-300">
                {settings.debounceStage} Stage
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Adjust the mechanical switch debouncing filter delay to minimize input latency for gaming or eliminate double-typing chatter.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Debounce Stage Level:</span>
                <span className="font-bold text-amber-400">Stage {settings.debounceStage}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.debounceStage}
                onChange={(e) => hardwareSettingsService.updateSettings({ debounceStage: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Stage 1 (Gaming)</span>
                <span>Stage 3 (Default)</span>
                <span>Stage 5 (Safe)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#181818] border border-[#242424] rounded-xl p-3 text-[11px] text-zinc-300 font-mono leading-relaxed">
            {getDebounceDescription(settings.debounceStage)}
          </div>
        </div>
      </div>
    </div>
  );
};

