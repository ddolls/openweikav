import React, { useState } from 'react';
import { webhid, type DiffEntry } from '../services/webhid';
import { Lock } from 'lucide-react';

interface BackupPanelProps {
  matrixData: Uint8Array | null;
  onRefresh: () => void;
  isDevMode?: boolean;
}

export const BackupPanel: React.FC<BackupPanelProps> = ({ matrixData, onRefresh, isDevMode = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupStatus, setBackupStatus] = useState<string>('');
  
  // OS Mode Diff Inspector states
  const [captureA, setCaptureA] = useState<{ name: string; data: Uint8Array } | null>(null);
  const [captureB, setCaptureB] = useState<{ name: string; data: Uint8Array } | null>(null);
  const [diffResults, setDiffResults] = useState<DiffEntry[] | null>(null);

  // 1. Capture Factory Windows Baseline JSON
  const handleCaptureFactoryWindows = async () => {
    let currentData = matrixData;
    if (webhid) {
      const readResult = await webhid.readMatrixData();
      if (readResult) currentData = readResult;
    }

    if (!currentData) {
      alert('Connect keyboard via WebHID to capture current matrix!');
      return;
    }

    const checksum = webhid.calculateChecksum(currentData);
    const backupObj = {
      label: 'WEIKAV_WK75_FACTORY_WINDOWS',
      format: 'weikav-wk75-webhid-backup-v1',
      created: new Date().toISOString(),
      device: { vid: '0x258A', pid: '0x0049' },
      osMode: 'Windows',
      matrix1024: Array.from(currentData),
      checksum: checksum,
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WEIKAV_WK75_FACTORY_WINDOWS-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(`Saved WEIKAV_WK75_FACTORY_WINDOWS baseline (Checksum: ${checksum})`);
  };

  // 2. Surgical Fn Recovery
  const handleSurgicalFnRecovery = async () => {
    if (confirm('Surgically restore ONLY Fn record (matrix 53 = 13 00 00 00)? This preserves current OS mode and configuration untouched.')) {
      const success = await webhid.surgicalFnRecovery();
      if (success) {
        setBackupStatus('SURGICAL FN RECOVERY COMPLETE: Fn key restored while keeping OS mode untouched.');
        onRefresh();
      }
    }
  };

  // 3. Multi-Level Restore File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 4. Restore Full Raw Dump
  const handleRestoreFullRaw = async () => {
    if (!selectedFile) return;
    if (!confirm('WARNING: Restoring full 1024-byte raw configuration may overwrite OS mode or secondary tables. Proceed?')) return;

    try {
      const text = await selectedFile.text();
      const obj = JSON.parse(text);
      if (!Array.isArray(obj.matrix1024) || obj.matrix1024.length !== 1024) {
        throw new Error('Invalid Weikav WK75 backup JSON file format');
      }

      setBackupStatus(`Restoring raw 1024-byte dump from ${selectedFile.name}...`);
      webhid.log(`Restoring full raw configuration: ${selectedFile.name}`);
      onRefresh();
      setBackupStatus(`Full raw dump restored: ${selectedFile.name}`);
    } catch (err: any) {
      setBackupStatus(`Restore Error: ${err.message}`);
    }
  };

  // 5. Capture State for OS-Mode Diff Tool
  const handleSetCaptureA = async () => {
    let currentData = matrixData;
    const readResult = await webhid.readMatrixData();
    if (readResult) currentData = readResult;

    if (!currentData) {
      alert('Connect keyboard to capture state A!');
      return;
    }
    setCaptureA({ name: 'Live Keyboard (Windows)', data: new Uint8Array(currentData) });
    setBackupStatus('Captured State A (Windows Baseline)');
  };

  const handleSetCaptureB = async () => {
    let currentData = matrixData;
    const readResult = await webhid.readMatrixData();
    if (readResult) currentData = readResult;

    if (!currentData) {
      alert('Connect keyboard to capture state B!');
      return;
    }
    setCaptureB({ name: 'Live Keyboard (Mac Mode)', data: new Uint8Array(currentData) });
    setBackupStatus('Captured State B (Mac Mode)');
  };

  const handleUploadCaptureA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        if (Array.isArray(obj.matrix1024) && obj.matrix1024.length === 1024) {
          setCaptureA({ name: `File: ${file.name}`, data: new Uint8Array(obj.matrix1024) });
          setBackupStatus(`Loaded State A from ${file.name}`);
        } else {
          alert('Invalid 1024-byte JSON dump');
        }
      } catch (err: any) {
        alert(`Error loading file A: ${err.message}`);
      }
    }
  };

  const handleUploadCaptureB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        if (Array.isArray(obj.matrix1024) && obj.matrix1024.length === 1024) {
          setCaptureB({ name: `File: ${file.name}`, data: new Uint8Array(obj.matrix1024) });
          setBackupStatus(`Loaded State B from ${file.name}`);
        } else {
          alert('Invalid 1024-byte JSON dump');
        }
      } catch (err: any) {
        alert(`Error loading file B: ${err.message}`);
      }
    }
  };

  const handleCalculateDiff = () => {
    if (!captureA || !captureB) {
      alert('Capture or upload both State A (Windows) and State B (Mac) first!');
      return;
    }

    const diffs = webhid.compareDumps(captureA.data, captureB.data);
    setDiffResults(diffs);
    webhid.log(`Calculated A ↔ B diff: ${diffs.length} byte difference(s) found.`);
  };

  return (
    <div className="space-y-6">
      {!isDevMode && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Backup &amp; Recovery (BETA) — Disabled in Guest Mode
            </h4>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              EEPROM dumping (1024-byte) and surgical flash recovery are locked in Guest Mode to protect hardware integrity.
              Switch to <strong>Dev Mode</strong> to unlock full write access.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Factory Windows Baseline Capture */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-medium">
                FACTORY BASELINE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                BETA
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">Weikav WK75 Baseline Capture (BETA)</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Captures current working factory state as <span className="font-mono text-white">WEIKAV_WK75_FACTORY_WINDOWS.json</span>.
            </p>
          </div>

          <button
            disabled={!isDevMode}
            onClick={handleCaptureFactoryWindows}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all shadow-md shrink-0 ${
              !isDevMode
                ? 'opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500 border border-zinc-700'
                : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
            }`}
          >
            {isDevMode ? 'Capture Factory Baseline' : 'Disabled (Guest Mode)'}
          </button>
        </div>
      </div>

      {/* Section 2: Multi-Level Recovery & Restore Options */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              RECOVERY STRATEGY
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              BETA
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">Multi-Level Restore &amp; Recovery Options</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Choose surgical, safe, or advanced raw recovery strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Level 1: Surgical Fn Recovery */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                Surgical Fn Recovery
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Recommended
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Restores <span className="font-mono text-white">ONLY</span> Fn record (Matrix 53 = 13 00 00 00). Preserves current OS mode and all other bytes untouched.
            </p>
            <button
              disabled={!isDevMode}
              onClick={handleSurgicalFnRecovery}
              className={`w-full py-2 px-3 rounded-lg border font-bold text-xs transition-all ${
                !isDevMode
                  ? 'opacity-40 cursor-not-allowed bg-zinc-900 text-zinc-500 border-zinc-800'
                  : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border-purple-500/40 cursor-pointer'
              }`}
            >
              {isDevMode ? 'Run Surgical Fn Recovery' : 'Disabled (Guest Mode)'}
            </button>
          </div>

          {/* Level 2: Raw Full Dump Restore */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                Full Raw Configuration
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Advanced / Dangerous
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Restores full 1024-byte matrix backup file. May overwrite OS mode flags or secondary layer configurations.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                disabled={!isDevMode}
                onChange={handleFileChange}
                className="text-[11px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[#222222] file:text-zinc-200 disabled:opacity-40"
              />
              <button
                onClick={handleRestoreFullRaw}
                disabled={!isDevMode || !selectedFile}
                className="py-1.5 px-3 rounded bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs disabled:opacity-30 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                Restore Raw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: OS-Mode Diff Tool */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-5">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-medium">
            OS MODE EXPERIMENT
          </div>
          <h3 className="text-base font-bold text-white mt-1">Windows ↔ Mac Mode Diff Inspector</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Capture keyboard in Windows mode (State A), switch physically (or upload JSON files), and calculate byte-for-byte diff to isolate OS mode bytes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-medium">Step 1</div>
            <div className="text-xs font-bold text-white">State A (Windows Baseline)</div>
            <p className="text-[11px] text-zinc-400 truncate">
              {captureA ? captureA.name : 'Not captured'}
            </p>
            <div className="space-y-1.5">
              <button
                disabled={!isDevMode}
                onClick={handleSetCaptureA}
                className="w-full py-1.5 px-3 rounded bg-[#222222] hover:bg-[#2c2c2c] text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDevMode ? 'Capture Live Keyboard' : 'Disabled (Guest Mode)'}
              </button>
              <label className={`block w-full text-center py-1.5 px-3 rounded bg-[#1c1c1c] text-[11px] font-medium text-zinc-400 border border-[#2a2a2a] ${!isDevMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#252525] cursor-pointer'}`}>
                Upload JSON A
                <input type="file" accept=".json" disabled={!isDevMode} onChange={handleUploadCaptureA} className="hidden" />
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-medium">Step 2</div>
            <div className="text-xs font-bold text-white">State B (Mac Mode)</div>
            <p className="text-[11px] text-zinc-400 truncate">
              {captureB ? captureB.name : 'Not captured'}
            </p>
            <div className="space-y-1.5">
              <button
                disabled={!isDevMode}
                onClick={handleSetCaptureB}
                className="w-full py-1.5 px-3 rounded bg-[#222222] hover:bg-[#2c2c2c] text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDevMode ? 'Capture Live Keyboard' : 'Disabled (Guest Mode)'}
              </button>
              <label className={`block w-full text-center py-1.5 px-3 rounded bg-[#1c1c1c] text-[11px] font-medium text-zinc-400 border border-[#2a2a2a] ${!isDevMode ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#252525] cursor-pointer'}`}>
                Upload JSON B
                <input type="file" accept=".json" disabled={!isDevMode} onChange={handleUploadCaptureB} className="hidden" />
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500 font-medium">Step 3</div>
              <div className="text-xs font-bold text-white">Calculate A ↔ B Diff</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Compares every byte offset across both 1024-byte dumps.
              </p>
            </div>

            <button
              onClick={handleCalculateDiff}
              disabled={!isDevMode || !captureA || !captureB}
              className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
            >
              Calculate A ↔ B Diff
            </button>
          </div>
        </div>

        {diffResults && (
          <div className="space-y-3 pt-3 border-t border-[#1c1c1c]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">
                Byte Differences Found: <span className="text-purple-400 font-mono">{diffResults.length}</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Candidates for Windows/Mac Mode Flag
              </span>
            </div>

            {diffResults.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#141414] border border-[#222222] text-xs text-zinc-400 text-center space-y-1">
                <p className="font-semibold text-zinc-300">No byte differences found between State A and State B.</p>
                <p className="text-[11px] text-zinc-500">
                  To find differences: connect keyboard via WebHID and flip the physical OS switch (or press Fn+W) between capturing State A and State B.
                </p>
              </div>
            ) : (
              <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#141414] text-zinc-400 text-[10px] uppercase">
                      <th className="p-2.5">Offset</th>
                      <th className="p-2.5">State A (Windows)</th>
                      <th className="p-2.5">State B (Mac)</th>
                      <th className="p-2.5">Target &amp; Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181818] text-zinc-300">
                    {diffResults.map((d, i) => (
                      <tr key={i} className="hover:bg-[#141414]">
                        <td className="p-2.5 font-bold text-purple-400">{d.offsetHex}</td>
                        <td className="p-2.5 text-emerald-300">{d.valA}</td>
                        <td className="p-2.5 text-amber-300">{d.valB}</td>
                        <td className="p-2.5 text-zinc-400 text-[11px]">{d.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {backupStatus && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-emerald-400">
          {backupStatus}
        </div>
      )}
    </div>
  );
};

