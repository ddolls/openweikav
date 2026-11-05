import React, { useState, useEffect } from 'react';
import { batteryService, type BatteryState } from '../services/batteryService';
import { Battery, BatteryCharging, BatteryWarning, Wifi, Usb, Cable, Apple, Monitor } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  modifiedCount: number;
  deviceName?: string;
  userMode?: 'none' | 'guest' | 'dev';
  onOpenModeModal?: () => void;
  onConnect?: () => void;
  isMacLayout?: boolean;
  onApplyMacLayout?: () => void;
  onApplyWindowsLayout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  deviceName,
  userMode = 'guest',
  onOpenModeModal,
  onConnect,
  isMacLayout = false,
  onApplyMacLayout,
  onApplyWindowsLayout,
}) => {
  const [batteryState, setBatteryState] = useState<BatteryState>(batteryService.getState());

  useEffect(() => {
    const unsub = batteryService.subscribe((s) => {
      setBatteryState(s);
    });
    return unsub;
  }, []);

  const getBatteryIcon = () => {
    if (batteryState.isCharging) {
      return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (batteryState.percentage <= 20) {
      return <BatteryWarning className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
    }
    return <Battery className="w-3.5 h-3.5 text-purple-400" />;
  };

  const displayName = (!deviceName || deviceName.toLowerCase() === 'gaming keyboard') ? 'Weikav WK75' : deviceName;

  return (
    <header className="px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4 md:pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-[#0a0a0a]">
      <div className="space-y-0.5 sm:space-y-1">
        <div className="flex items-center justify-between sm:block">
          <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase font-semibold">
            Tri-Mode 75% Mechanical Keyboard Configurator
          </p>

          {!isConnected && onConnect && (
            <button
              onClick={onConnect}
              className="sm:hidden px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
            >
              <Cable className="w-3 h-3" />
              Connect
            </button>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {displayName}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
        {isConnected && (
          <div
            title={`Battery Status: ${batteryState.statusText}\nEstimated Runtime: ~${batteryState.estimatedHoursRemaining} hrs\nVoltage: ${batteryState.voltageEstimate}V (4000mAh LiPo)`}
            className={`px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-default select-none ${
              batteryState.isCharging
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : batteryState.percentage <= 20
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            {getBatteryIcon()}
            <span className="font-mono font-bold text-[11px]">{batteryState.percentage}%</span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
              {batteryState.isWireless ? (
                <>
                  <Wifi className="w-3 h-3 text-purple-400" />
                  <span className="hidden xs:inline">2.4G</span>
                </>
              ) : (
                <>
                  <Usb className="w-3 h-3 text-emerald-400" />
                  <span className="hidden xs:inline">USB</span>
                </>
              )}
            </span>
          </div>
        )}

        {userMode !== 'none' && (
          <button
            type="button"
            onClick={onOpenModeModal}
            title="Click to view Terms or change mode"
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              userMode === 'dev'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${userMode === 'dev' ? 'bg-amber-400' : 'bg-purple-400'}`} />
            <span>{userMode === 'dev' ? 'Dev Mode' : 'Safe Mode'}</span>
          </button>
        )}

        {isConnected && (
          <button
            type="button"
            onClick={isMacLayout ? onApplyWindowsLayout : onApplyMacLayout}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
              isMacLayout
                ? 'bg-white hover:bg-zinc-200 text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.25)]'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-purple-500/50 text-zinc-200'
            }`}
            title={
              isMacLayout
                ? 'Active layout: macOS (Click to switch to Windows)'
                : 'Active layout: Windows (Click to switch to macOS)'
            }
          >
            {isMacLayout ? (
              <>
                <Apple className="w-3.5 h-3.5 fill-black" />
                <span className="font-bold">macOS</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-zinc-200">Windows</span>
              </>
            )}
          </button>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-xs font-semibold text-zinc-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
};

