import { webhid } from './webhid';
import { rgbService } from './rgbService';

export interface HardwareGlobalSettings {
  tapEnabled: boolean;
  tapSensitivityMs: number; // 50ms - 500ms
  sleepEnabled: boolean;
  sleepTimeoutSeconds: number; // in seconds: 60, 120, 180, 300, 600, etc.
  debounceStage: number; // 1 - 5 (Stage 1 = 2ms, Stage 2 = 5ms, Stage 3 = 8ms, Stage 4 = 10ms, Stage 5 = 15ms)
}

const DEFAULT_SETTINGS: HardwareGlobalSettings = {
  tapEnabled: false,
  tapSensitivityMs: 200,
  sleepEnabled: true,
  sleepTimeoutSeconds: 120, // 2 Min default
  debounceStage: 3, // 3 Stage default (8ms)
};

const STORAGE_KEY = 'weikav_wk75_hardware_settings';

class HardwareSettingsService {
  private settings: HardwareGlobalSettings;
  private listeners: ((s: HardwareGlobalSettings) => void)[] = [];
  private isApplying: boolean = false;

  constructor() {
    this.settings = this.loadFromStorage();

    rgbService.onConfigRead((config136) => {
      this.syncFromHardwareConfig(config136);
    });
  }

  private loadFromStorage(): HardwareGlobalSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveToStorage(s: HardwareGlobalSettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // Ignore
    }
  }

  public syncFromHardwareConfig(config136: Uint8Array) {
    if (!config136 || config136.length < 32) return;

    const hexSlice = Array.from(config136.slice(0, 36))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    webhid.log(`[Hardware Sync] Device Cfg buffer[0..35]: ${hexSlice}`);

    // SinoWealth / Weikav WK75 wire offsets:
    // Cfg[3]  (wire offset 7 + 3  = 10): Debounce stage (1 - 5)
    // Cfg[22] (wire offset 7 + 22 = 29): Tap sensitivity / status
    // Cfg[24] (wire offset 7 + 24 = 31): Sleep timeout in 30s units
    const rawDebounce = (config136[10] >= 1 && config136[10] <= 5)
      ? config136[10]
      : (config136[9] >= 1 && config136[9] <= 5 ? config136[9] : config136[2]);
    const debounceStage = rawDebounce >= 1 && rawDebounce <= 5 ? rawDebounce : this.settings.debounceStage;

    const rawTap = config136[29] !== undefined && config136[29] <= 10
      ? config136[29]
      : (config136[15] !== undefined && config136[15] <= 10 ? config136[15] : config136[8]);
    const tapEnabled = rawTap > 0;
    const tapSensitivityMs = rawTap > 0 ? Math.max(50, Math.min(500, rawTap * 50)) : this.settings.tapSensitivityMs;

    let rawSleepVal = config136[31];
    if (rawSleepVal === undefined || rawSleepVal > 120) {
      rawSleepVal = (config136[16] > 1 && config136[16] <= 60) ? config136[16] : config136[9];
    }
    const sleepEnabled = rawSleepVal > 0;
    const sleepTimeoutSeconds = sleepEnabled ? rawSleepVal * 30 : this.settings.sleepTimeoutSeconds;

    this.settings = {
      tapEnabled,
      tapSensitivityMs,
      sleepEnabled,
      sleepTimeoutSeconds,
      debounceStage,
    };

    webhid.log(
      `[Hardware Sync] Synced from device EEPROM: Debounce=Stage ${debounceStage} (byte[10]=${config136[10]}), Sleep=${
        sleepEnabled ? `${Math.round(sleepTimeoutSeconds / 60)} Min (${rawSleepVal}x30s at byte[31])` : 'Disabled (Always Awake)'
      }, Tap=${tapEnabled ? `${tapSensitivityMs}ms (byte[29]=${rawTap})` : 'OFF'}`
    );

    this.notify();
  }

  public getSettings(): HardwareGlobalSettings {
    return { ...this.settings };
  }

  public subscribe(fn: (s: HardwareGlobalSettings) => void) {
    this.listeners.push(fn);
    fn(this.settings);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.saveToStorage(this.settings);
    this.listeners.forEach((fn) => fn({ ...this.settings }));
  }

  public updateSettings(partial: Partial<HardwareGlobalSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.notify();
  }

  public setDebounceStage(stage: number) {
    this.updateSettings({ debounceStage: Math.max(1, Math.min(5, stage)) });
  }

  public resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.notify();
  }

  public getIsApplying(): boolean {
    return this.isApplying;
  }

  public async applyToHardware(): Promise<{ success: boolean; message: string }> {
    const dev = (webhid as any).device;
    if (!dev || !dev.opened) {
      return {
        success: false,
        message: 'Device is not connected. Please connect via USB cable and initialize WebHID first.',
      };
    }

    this.isApplying = true;
    try {
      const sleepUnits = this.settings.sleepEnabled
        ? Math.max(1, Math.min(120, Math.round(this.settings.sleepTimeoutSeconds / 30)))
        : 0;
      const debounceStage = Math.max(1, Math.min(5, this.settings.debounceStage));
      const tapVal = this.settings.tapEnabled
        ? Math.max(1, Math.min(10, Math.round(this.settings.tapSensitivityMs / 50)))
        : 0;

      webhid.log(
        `[Hardware Settings] Applying parameters: Debounce=Stage ${debounceStage}, Tap=${tapVal}, Sleep=${sleepUnits} units (${Math.round(
          this.settings.sleepTimeoutSeconds / 60
        )} Min)`
      );

      let baseline = rgbService.getCachedConfig();
      if (!baseline) {
        baseline = await rgbService.readDeviceConfig(true);
        await new Promise((r) => setTimeout(r, 40));
      }

      const pkt = new Uint8Array(519);
      pkt[0] = 0x04; // CMD: CONFIG_WRITE
      pkt[1] = 0x00;
      pkt[2] = 0x00;
      pkt[3] = 0x01;
      pkt[4] = 0x00;
      pkt[5] = 0x80;
      pkt[6] = 0x00;

      if (baseline) {
        const copyLen = Math.min(baseline.length - 7, 519 - 7);
        for (let i = 0; i < copyLen; i++) {
          pkt[7 + i] = baseline[7 + i];
        }
      }

      pkt[7 + 3] = debounceStage; // pkt[10]
      pkt[7 + 22] = tapVal;       // pkt[29]
      pkt[7 + 24] = sleepUnits;   // pkt[31]

      pkt[7 + 2] = debounceStage;
      pkt[7 + 8] = tapVal;
      pkt[2] = debounceStage;
      pkt[8] = tapVal;

      webhid.log(
        `[Hardware Settings] Writing packet: pkt[10](Debounce)=${pkt[10]}, pkt[29](Tap)=${pkt[29]}, pkt[31](Sleep)=${pkt[31]}`
      );

      await dev.sendFeatureReport(6, pkt);
      await new Promise((r) => setTimeout(r, 40));

      try {
        await dev.sendFeatureReport(6, pkt);
      } catch {
        // Latch retry
      }
      await new Promise((r) => setTimeout(r, 50));

      await rgbService.readDeviceConfig(true);

      webhid.log(`[Hardware Settings] Successfully written and verified in Weikav WK75 internal EEPROM.`);
      this.isApplying = false;
      return {
        success: true,
        message: 'Tap, Sleep, and Debounce settings successfully saved to keyboard memory!',
      };
    } catch (err: any) {
      webhid.log(`[Hardware Settings] Write error: ${err.message}`);
      this.isApplying = false;
      return {
        success: false,
        message: `Failed to write to hardware: ${err.message}. Please verify keyboard is connected in Wired USB mode.`,
      };
    }
  }
}

export const hardwareSettingsService = new HardwareSettingsService();

