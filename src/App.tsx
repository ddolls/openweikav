import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KeyboardGrid } from './components/KeyboardGrid';
import { KeyRemapPanel } from './components/KeyRemapPanel';
import { BackupPanel } from './components/BackupPanel';
import { LogViewer } from './components/LogViewer';
import { Overview } from './components/Overview';
import { LiveInputWidget } from './components/LiveInputWidget';
import { FnWinRepairWidget } from './components/FnWinRepairWidget';
import { RgbControlPanel } from './components/RgbControlPanel';
import { GlobalSettingsPanel } from './components/GlobalSettingsPanel';
import { ModeSelectionModal } from './components/ModeSelectionModal';
import { SocialModal } from './components/SocialModal';
import { webhid, PRISTINE_STAGE5_MATRIX, type WebHIDState } from './services/webhid';
import { parseKeyRecordUsage, type KeyRecord } from './types/hid';
import { SwitchTesterWidget } from './components/SwitchTesterWidget';
import { TypingTestTab } from './components/TypingTestTab';
import { batteryService } from './services/batteryService';
import { inputManager } from './services/inputManager';
import { rgbService } from './services/rgbService';

function getInitialRecords(): Map<number, KeyRecord> {
  const initialRecords = new Map<number, KeyRecord>();
  for (let idx = 0; idx < 128; idx++) {
    const offset = idx * 4;
    const bytes: [number, number, number, number] = [
      PRISTINE_STAGE5_MATRIX[0][offset],
      PRISTINE_STAGE5_MATRIX[0][offset + 1],
      PRISTINE_STAGE5_MATRIX[0][offset + 2],
      PRISTINE_STAGE5_MATRIX[0][offset + 3],
    ];
    const parsedUsage = parseKeyRecordUsage(bytes);
    initialRecords.set(idx, {
      matrixIdx: idx,
      hidUsage: parsedUsage,
      originalUsage: parsedUsage,
      bytes,
    });
  }
  return initialRecords;
}

export function App() {
  const [userMode, setUserMode] = useState<'none' | 'guest' | 'dev'>('none');
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(true);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedMatrixIdx, setSelectedMatrixIdx] = useState<number | null>(null);

  // State from webhid service
  const [hidState, setHidState] = useState<WebHIDState>(() => ({
    isConnected: false,
    deviceName: 'WEIKAV WK75',
    vendorId: '0x258A',
    productId: '0x0049',
    matrixData: new Uint8Array([...PRISTINE_STAGE5_MATRIX[0], ...PRISTINE_STAGE5_MATRIX[1]]),
    records: getInitialRecords(),
    modifiedCount: 0,
    logs: ['[Init] Weikav WK75 WebHID Configurator ready.'],
  }));

  // Subscribe to webhid controller updates
  useEffect(() => {
    const unsubscribe = webhid.subscribe((update) => {
      setHidState((prev) => ({
        ...prev,
        ...update,
      }));
    });
    return unsubscribe;
  }, []);

  // Redirect to overview if on backup tab while in guest mode
  useEffect(() => {
    if (userMode !== 'dev' && activeTab === 'backup') {
      setActiveTab('overview');
    }
  }, [userMode, activeTab]);

  const handleConnect = async () => {
    const success = await webhid.connect();
    if (success && webhid.getDevice()) {
      inputManager.attachWebHIDDevice(webhid.getDevice());
      batteryService.attachDevice(webhid.getDevice());
    }
  };

  const handleApplyRemap = async (matrixIdx: number, newUsage: number) => {
    await webhid.writeKeyRemap(matrixIdx, newUsage);
  };

  const handleApplyComboRemap = async (matrixIdx: number, rawBytes: [number, number, number, number]) => {
    await webhid.writeKeyRemapRaw(matrixIdx, rawBytes);
  };

  const isMacLayout =
    hidState.records.get(11)?.hidUsage === 0xE2 && hidState.records.get(17)?.hidUsage === 0xE3;

  const handleApplyMacLayout = async () => {
    await handleApplyRemap(11, 0xE2); // Set Matrix 11 to Left Alt (Option ⌥)
    await handleApplyRemap(17, 0xE3); // Set Matrix 17 to Left Win (Command ⌘)
    webhid.log('Applied Apple macOS layout (Option ⌥ on Matrix #11, Command ⌘ on Matrix #17)');
  };

  const handleApplyWindowsLayout = async () => {
    await handleApplyRemap(11, 0xE3); // Set Matrix 11 to Left Win (Windows ⊞)
    await handleApplyRemap(17, 0xE2); // Set Matrix 17 to Left Alt (Alt)
    webhid.log('Applied Windows PC layout (Win ⊞ on Matrix #11, Alt on Matrix #17)');
  };

  const handleResetKey = async (matrixIdx: number) => {
    await webhid.resetKeyToDefault(matrixIdx);
  };

  const handleResetAll = async () => {
    if (confirm('Reset all keys to factory stock mapping? Semua perubahan remap akan dikembalikan ke setting pabrik.')) {
      await webhid.resetToFactoryDefaults();
    }
  };

  const keyboardGridComponent = (
    <KeyboardGrid
      selectedMatrixIdx={selectedMatrixIdx}
      onSelectKey={(idx) => setSelectedMatrixIdx(idx)}
      records={hidState.records}
    />
  );

  return (
    <div className="flex flex-col md:flex-row bg-[#0a0a0a] min-h-screen text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
      {/* Mode Selection Modal (Opens on first launch or when user clicks Change in sidebar) */}
      <ModeSelectionModal
        isOpen={isModeModalOpen || userMode === 'none'}
        onSelectMode={(mode) => {
          setUserMode(mode);
          setIsModeModalOpen(false);
        }}
        onClose={() => {
          if (userMode !== 'none') {
            setIsModeModalOpen(false);
          }
        }}
      />

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={hidState.isConnected}
        deviceName={hidState.deviceName}
        onConnect={handleConnect}
        userMode={userMode === 'dev' ? 'dev' : 'guest'}
        onOpenModeModal={() => setIsModeModalOpen(true)}
      />

      {/* Main Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          isConnected={hidState.isConnected}
          modifiedCount={hidState.modifiedCount}
          deviceName={hidState.deviceName}
          userMode={userMode}
          onOpenModeModal={() => setIsModeModalOpen(true)}
          onConnect={handleConnect}
          isMacLayout={isMacLayout}
          onApplyMacLayout={handleApplyMacLayout}
          onApplyWindowsLayout={handleApplyWindowsLayout}
        />

        <main className="flex-1 px-3.5 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-4 md:space-y-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Overview
                isConnected={hidState.isConnected}
                modifiedCount={hidState.modifiedCount}
                onConnect={handleConnect}
                keyboardElement={keyboardGridComponent}
                deviceName={hidState.deviceName}
                vendorId={hidState.vendorId}
                productId={hidState.productId}
                firmwareVersion={hidState.firmwareVersion}
                onNavigateToTester={() => setActiveTab('switch-tester')}
              />

              <LiveInputWidget records={hidState.records} />

              {/* Keymap & Shortcut Inspector (Active in both Safe Mode and Dev Mode) */}
              <KeyRemapPanel
                selectedMatrixIdx={selectedMatrixIdx}
                records={hidState.records}
                onApplyRemap={handleApplyRemap}
                onApplyComboRemap={handleApplyComboRemap}
                onResetKey={handleResetKey}
                onResetAll={handleResetAll}
                isDevMode={userMode === 'dev'}
              />
            </div>
          )}

          {activeTab === 'typing-test' && (
            <TypingTestTab />
          )}

          {activeTab === 'switch-tester' && (
            <SwitchTesterWidget />
          )}

          {activeTab === 'rgb' && (
            <RgbControlPanel
              isConnected={hidState.isConnected}
              isDevMode={userMode === 'dev'}
            />
          )}

          {activeTab === 'settings' && (
            <GlobalSettingsPanel
              isConnected={hidState.isConnected}
              isDevMode={userMode === 'dev'}
            />
          )}

          {/* Only render Backup & Recovery panel in Dev Mode */}
          {activeTab === 'backup' && userMode === 'dev' && (
            <div className="space-y-6">
              <FnWinRepairWidget
                onRefresh={() => webhid.readMatrixData()}
                isDevMode={true}
              />
              <BackupPanel
                matrixData={hidState.matrixData}
                onRefresh={() => webhid.readMatrixData()}
                isDevMode={true}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <LogViewer logs={hidState.logs} onClear={() => setHidState((p) => ({ ...p, logs: [] }))} />
          )}
        </main>

        {/* Global Bottom Footer */}
        <footer className="shrink-0 px-4 sm:px-6 md:px-10 py-3.5 bg-[#080808]/90 backdrop-blur-sm border-t border-[#181818] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 z-10 mb-14 md:mb-0">
          {/* Bottom Left Corner */}
          <div className="flex items-center gap-1.5">
            <span>Credits</span>
            <a
              href="https://github.com/not-ayan/openaula"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-cyan-400 font-semibold underline underline-offset-4 decoration-zinc-600 hover:decoration-cyan-400 transition-colors cursor-pointer"
            >
              Ayan Biswas
            </a>
          </div>

          {/* Bottom Right Corner */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="https://saweria.co/itsmickeyyy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-amber-500/50 text-amber-300 hover:text-amber-200 font-semibold transition-all inline-flex items-center gap-1 cursor-pointer shadow-sm"
            >
              ☕Buy me a coffee!
            </a>

            <span className="text-zinc-600">•</span>

            <span className="flex items-center gap-1 text-zinc-400">
              Created with ❤️ by{' '}
              <button
                type="button"
                onClick={() => setIsSocialModalOpen(true)}
                className="text-white hover:text-rose-400 font-bold underline underline-offset-4 decoration-zinc-600 hover:decoration-rose-400 transition-colors cursor-pointer"
              >
                Mickey Montana
              </button>{' '}
              &amp;{' '}
              <a
                href="https://www.tiktok.com/@pacarnyapharitaaa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-rose-400 font-bold underline underline-offset-4 decoration-zinc-600 hover:decoration-rose-400 transition-colors cursor-pointer"
              >
                Pharita
              </a>
            </span>
          </div>
        </footer>
      </div>

      {/* Social Media Popup Modal */}
      <SocialModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
      />
    </div>
  );
}

export default App;

