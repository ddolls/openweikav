import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Unlock,
} from 'lucide-react';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onSelectMode: (mode: 'dev' | 'guest') => void;
  onClose?: () => void;
}

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  isOpen,
  onSelectMode,
  onClose,
}) => {
  const [step, setStep] = useState<'termsAndMode' | 'devPin'>('termsAndMode');
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAgreementWarning, setShowAgreementWarning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleChooseGuest = () => {
    if (!hasAgreed) {
      setShowAgreementWarning(true);
      return;
    }
    onSelectMode('guest');
    if (onClose) onClose();
  };

  const handleProceedToDev = () => {
    if (!hasAgreed) {
      setShowAgreementWarning(true);
      return;
    }
    setStep('devPin');
    setPin('');
    setErrorMsg(null);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trimmed = pin.trim();
      // Allow developer bypass codes (e.g. 1234 / 0000 / 7575) or hashed PIN
      if (trimmed === '1234' || trimmed === '0000' || trimmed === '7575') {
        onSelectMode('dev');
        if (onClose) onClose();
        return;
      }

      const salt = 'openweikav_dev_key_salt_2026';
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + trimmed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      if (hashHex === 'fe79f7f81cab1c2ceee8caceda90e9dcdb8558ce7af540f89052f19de2752b37') {
        onSelectMode('dev');
        if (onClose) onClose();
      } else {
        setErrorMsg('Incorrect PIN. (Tip: Use 1234 or 0000 for Dev Mode access)');
        setPin('');
      }
    } catch {
      setErrorMsg('PIN verification failed.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101010] border border-[#242424] rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-52 h-52 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {step === 'termsAndMode' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* LEFT COLUMN: TERMS */}
            <div className="flex flex-col justify-between space-y-3.5 pr-0 md:pr-2 border-b md:border-b-0 md:border-r border-[#222222] pb-5 md:pb-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-white tracking-tight leading-snug">
                    Terms &amp; Conditions Agreement
                  </h2>
                  <p className="text-[10px] text-zinc-400">
                    OpenWeikav WebHID Configurator • Weikav WK75
                  </p>
                </div>
              </div>

              <div className="bg-[#080808] border border-[#1e1e1e] rounded-xl p-3.5 h-[220px] overflow-y-auto text-left text-[11px] text-zinc-400 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700">
                <div className="space-y-1">
                  <div className="font-semibold text-zinc-200 text-xs">
                    1. Self-Modification &amp; Hardware Risk (Do With Your Own Risk)
                  </div>
                  <p className="text-zinc-400 pl-3">
                    This web application communicates directly with your Weikav WK75 keyboard microcontroller via WebHID. Using features such as Key Remapping, EEPROM writing, and custom lighting is performed at your own risk.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-zinc-200 text-xs">
                    2. Direct WebHID Communication
                  </div>
                  <p className="text-zinc-400 pl-3">
                    Raw vendor feature report packets are transmitted directly to the SinoWealth microcontroller on the Weikav WK75. Do not disconnect the USB cable while configuration read/write operations are in progress.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-zinc-200 text-xs">
                    3. Independent Community Project (Non-Affiliated)
                  </div>
                  <p className="text-zinc-400 pl-3">
                    OpenWeikav is an open-source, community-driven project and is not officially affiliated with or endorsed by Weikav or SinoWealth.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-zinc-200 text-xs">
                    4. Data Privacy &amp; Zero Telemetry
                  </div>
                  <p className="text-zinc-400 pl-3">
                    This application operates 100% locally in your browser (client-side). No keystrokes, passwords, or personal telemetry are logged or sent to any remote server.
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setHasAgreed(!hasAgreed);
                  setShowAgreementWarning(false);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  hasAgreed
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                    : showAgreementWarning
                    ? 'bg-red-500/10 border-red-500/40 text-red-300 animate-pulse'
                    : 'bg-[#141414] border-[#262626] text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-600 text-purple-500 focus:ring-0 cursor-pointer accent-purple-400 shrink-0"
                />
                <div className="text-left text-xs leading-snug">
                  <span className="font-semibold text-white">
                    I have read, understood, and agree
                  </span>{' '}
                  to the Terms &amp; Conditions and Disclaimer above.
                </div>
              </div>

              {showAgreementWarning && !hasAgreed && (
                <p className="text-[10px] text-red-400 font-medium text-left">
                  Please agree to the Terms &amp; Conditions before selecting a mode.
                </p>
              )}
            </div>

            {/* RIGHT COLUMN: MODE */}
            <div className="flex flex-col justify-between space-y-3 text-left pl-0 md:pl-2">
              <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                SELECT OPERATING MODE:
              </div>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <button
                  type="button"
                  onClick={handleChooseGuest}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 group cursor-pointer ${
                    hasAgreed
                      ? 'bg-purple-500/10 border-purple-500/40 hover:bg-purple-500/20 hover:border-purple-500/60 shadow-sm'
                      : 'bg-[#131313] border-[#222222] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        hasAgreed ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${
                        hasAgreed ? 'text-purple-300' : 'text-zinc-300'
                      }`}>
                        Safe Mode
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      hasAgreed ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      Recommended
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug mt-1 ${
                    hasAgreed ? 'text-purple-100/80' : 'text-zinc-500'
                  }`}>
                    Safe Mode protects EEPROM flash memory from accidental writes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToDev}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2.5 group cursor-pointer ${
                    hasAgreed
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:from-amber-500/20 hover:to-orange-500/15 border-amber-500/30 hover:border-amber-500/60 shadow-sm'
                      : 'bg-[#131313] border-[#222222] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        hasAgreed ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Unlock className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${
                        hasAgreed ? 'text-amber-300' : 'text-zinc-300'
                      }`}>
                        Dev Mode
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      hasAgreed ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      PIN Protected
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug mt-1 ${
                    hasAgreed ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>
                    Full hardware write access (Key Remap, Stream BETA, Backup/Restore).
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-4 max-w-md mx-auto relative z-10 py-2">
            <button
              type="button"
              onClick={() => {
                setStep('termsAndMode');
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mode Selection</span>
            </button>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Developer Authorization</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Developer Mode grants direct hardware EEPROM write access to your Weikav WK75. Enter authorization PIN to unlock (Default: 1234):
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                Enter Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-[#161616] border border-[#2e2e2e] focus:border-purple-400 rounded-xl px-4 py-2.5 text-center font-mono text-lg text-white tracking-[0.3em] placeholder-zinc-600 focus:outline-none transition-colors"
              />
              {errorMsg && (
                <p className="text-[11px] text-rose-400 font-medium text-center pt-0.5">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('termsAndMode')}
                className="flex-1 py-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] text-zinc-300 font-semibold text-xs border border-[#2a2a2a] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Unlock Dev Mode
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

