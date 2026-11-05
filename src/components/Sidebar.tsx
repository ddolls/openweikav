import React from 'react';
import { LayoutDashboard, ShieldAlert, Terminal, Palette, Sliders, Activity, Timer } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  deviceName: string;
  onConnect: () => void;
  userMode: 'guest' | 'dev';
  onOpenModeModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  deviceName,
  onConnect,
  userMode,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, mobileLabel: 'Home' },
    { id: 'typing-test', label: 'Typing Test', icon: Timer, mobileLabel: 'Typing' },
    { id: 'rgb', label: 'RGB Lighting', icon: Palette, mobileLabel: 'RGB' },
    { id: 'settings', label: 'Hardware Settings', icon: Sliders, mobileLabel: 'Settings' },
    { id: 'switch-tester', label: 'Switch & PRate Test', icon: Activity, mobileLabel: 'Tester' },
    ...(userMode === 'dev'
      ? [{ id: 'backup', label: 'Backup & Recovery', icon: ShieldAlert, mobileLabel: 'Backup' }]
      : []),
    { id: 'logs', label: 'Diagnostics', icon: Terminal, mobileLabel: 'Logs' },
  ];

  const displayDeviceName =
    !deviceName || deviceName.toLowerCase() === 'gaming keyboard'
      ? 'Weikav WK75'
      : deviceName;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#070707] border-r border-[#181818] flex-col justify-between p-6 shrink-0 min-h-screen">
        <div className="space-y-8">
          <div className="px-1 pt-1">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              <span>Open</span>
              <span className="text-[11px] text-purple-400 font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/50">
                WEIKAV
              </span>
            </h1>
          </div>

          {/* Connected Device Card */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-medium">
              CONNECTED DEVICE
            </div>

            <div
              onClick={onConnect}
              className="bg-[#121212] border border-[#222222] hover:border-purple-500/40 rounded-xl p-3.5 cursor-pointer transition-all space-y-1 group"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                      : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-semibold text-white group-hover:text-purple-300 truncate">
                  {isConnected ? displayDeviceName : 'Weikav WK75'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 pl-4 font-normal">
                {isConnected ? `${displayDeviceName} - Connected` : 'Click to Connect (WebHID)'}
              </p>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 group cursor-pointer ${
                    isActive
                      ? 'bg-purple-950/30 text-white font-semibold border border-purple-600/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white font-medium hover:bg-[#121212]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="text-[10px] font-mono text-zinc-600 px-1 space-y-1">
          <div>Weikav WK75 Configurator</div>
          <div className="text-[9px] text-zinc-700">SinoWealth 8051 HID Core</div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#070707]/95 backdrop-blur-md border-t border-[#1a1a1a] z-40 px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] transition-all cursor-pointer ${
                isActive ? 'text-purple-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

