import {
  WEIKAV_WK75_LAYOUT,
  DEFAULT_RGB_STATE,
  WEIKAV_RGB_EFFECTS,
  WEIKAV_LIGHT_HW,
  type RGBColor,
  type RgbConfigState,
} from '../types/hid';
import { webhid } from './webhid';

// Helper: Convert hex string '#RRGGBB' to RGB object
export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace(/^#+/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) {
    return { r: 0, g: 229, b: 255 };
  }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// Helper: Convert RGB object to hex string '#RRGGBB'
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Modes that support custom single-color in Weikav WK75 hardware
const COLOR_CAPABLE_MODES = [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13];

class RgbControllerService {
  private device: any = null;
  private state: RgbConfigState = { ...DEFAULT_RGB_STATE };
  private listeners: ((state: RgbConfigState) => void)[] = [];
  private cachedConfig: Uint8Array | null = null;
  private keepaliveTimer: any = null;
  private animInterval: any = null;
  private isSendingFrame = false;
  private queuePromise: Promise<void> = Promise.resolve();
  private detectedModel: string = 'Weikav WK75';

  // Mutual exclusion queue to prevent USB transaction collisions
  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const waitPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentTail = this.queuePromise;
    this.queuePromise = currentTail.then(() => waitPromise).catch(() => waitPromise);
    try {
      await currentTail;
      return await fn();
    } finally {
      release!();
    }
  }

  constructor() {
    webhid.subscribe((hidUpdate) => {
      if (hidUpdate.isConnected && webhid.getDevice()) {
        this.attachDevice(webhid.getDevice());
      } else if (hidUpdate.isConnected === false) {
        this.detachDevice();
      }
    });
  }

  public setDevice(device: any) {
    this.device = device;
    if (device) {
      this.syncDeviceConfig();
    } else {
      this.detachDevice();
    }
  }

  public async syncDeviceConfig() {
    await this.queryModel();
    await new Promise((r) => setTimeout(r, 60));
    await this.readDeviceConfig();
  }

  public subscribe(fn: (state: RgbConfigState) => void): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getState(): RgbConfigState {
    return { ...this.state };
  }

  private notify(partial: Partial<RgbConfigState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener({ ...this.state });
      } catch (err) {
        console.error('[RGB] Listener error:', err);
      }
    }
  }

  public attachDevice(device: any) {
    this.device = device;
    webhid.log('[RGB] WebHID device attached to RGB controller service.');
    this.queryModel().then(() => this.readDeviceConfig());
  }

  private configListeners: ((config136: Uint8Array) => void)[] = [];

  public onConfigRead(fn: (config136: Uint8Array) => void) {
    this.configListeners.push(fn);
    if (this.cachedConfig) {
      fn(this.cachedConfig);
    }
    return () => {
      this.configListeners = this.configListeners.filter((l) => l !== fn);
    };
  }

  public getCachedConfig(): Uint8Array | null {
    return this.cachedConfig;
  }

  public detachDevice() {
    this.stopSoftwareAnimation();
    this.stopKeepalive();
    this.device = null;
    this.cachedConfig = null;
    this.notify({ isDirectStreaming: false });
    webhid.log('[RGB] Device detached from RGB controller.');
  }

  // Model Query (CMD 0x82)
  public async queryModel(): Promise<string> {
    if (!this.device || !this.device.opened) {
      return 'Weikav WK75 (Simulated)';
    }

    try {
      const reportId = webhid.getReportId();
      const pkt = new Uint8Array(519);
      pkt[0] = 0x82;
      pkt[1] = 0x01;
      pkt[3] = 0x01;
      pkt[5] = 0x06;

      for (let i = 0; i < 2; i++) {
        await this.device.sendFeatureReport(reportId, pkt);
        await new Promise((r) => setTimeout(r, 20));
      }

      const res = await this.device.receiveFeatureReport(reportId);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      const base = data[0] === reportId ? 1 : 0;
      const modelId = data[base + 12];
      webhid.log(`[RGB] Model query response: byte[12]=0x${modelId?.toString(16) || '??'}`);

      this.detectedModel = this.device.productName || 'Weikav WK75';
      webhid.log(`[RGB] Model detected: ${this.detectedModel}`);
      return this.detectedModel;
    } catch (err: any) {
      webhid.log(`[RGB] Model query failed: ${err.message}`);
      return 'Weikav WK75';
    }
  }

  // Read current lighting configuration via CMD 0x84 (returns 136 bytes)
  public async readDeviceConfig(silent = false): Promise<Uint8Array | null> {
    if (!this.device || !this.device.opened) {
      return null;
    }

    try {
      const reportId = webhid.getReportId();
      const pkt = new Uint8Array(519);
      pkt[0] = 0x84;
      pkt[3] = 0x01;
      pkt[5] = 0x80;

      await this.device.sendFeatureReport(reportId, pkt);
      await new Promise((r) => setTimeout(r, 30));

      const res = await this.device.receiveFeatureReport(reportId);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      const base = data[0] === reportId ? 1 : 0;
      const config136 = data.slice(base, base + 136);

      if (config136.length < 134) {
        webhid.log(`[RGB] Ignored non-config packet (${config136.length} bytes)`);
        return null;
      }

      this.cachedConfig = new Uint8Array(config136);
      this.configListeners.forEach((fn) => {
        try {
          fn(this.cachedConfig!);
        } catch {
          // Ignore
        }
      });

      if (!silent) {
        const customFlag = config136[16] === 1;
        const rawEffectId = config136[17];
        const sideLightMode = config136[25];

        // Map reported effect ID from keyboard back to UI effect definition
        const matchedEffect = WEIKAV_RGB_EFFECTS.find(
          (e) => e.id === rawEffectId || e.hwId === rawEffectId
        );
        const effectId = matchedEffect ? matchedEffect.id : (rawEffectId ?? this.state.effectId);

        const paramOffset = 63 + 2 * effectId;
        let brightness = 4;
        let speed = 2;
        let colorful = true;

        if (paramOffset + 1 < config136.length && paramOffset + 1 < 122) {
          const rawBright = config136[paramOffset];
          const brightIdx = WEIKAV_LIGHT_HW.indexOf(rawBright);
          brightness = brightIdx >= 0 ? Math.min(4, brightIdx + 1) : Math.min(4, Math.max(1, rawBright));
          const speedByte = config136[paramOffset + 1];
          speed = Math.min(4, Math.max(0, (speedByte >> 4) & 0x0f));
          colorful = (speedByte & 0x0f) !== 0;
        }

        const isKnownEffect = WEIKAV_RGB_EFFECTS.some((e) => e.id === effectId);
        const validEffectId = typeof effectId === 'number' && isKnownEffect ? effectId : this.state.effectId;
        const validSideLight = typeof sideLightMode === 'number' && sideLightMode <= 4 ? sideLightMode : this.state.sideLightMode;

        this.notify({
          effectId: validEffectId,
          customMode: customFlag,
          sideLightMode: validSideLight,
          brightness,
          speed,
          colorful,
        });

        webhid.log(
          `[RGB Sync] Effect: #${validEffectId} (${matchedEffect?.name ?? 'Unknown'}), Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Side: ${validSideLight}`
        );
      }
      return this.cachedConfig;
    } catch (err: any) {
      webhid.log(`[RGB] Config read error: ${err.message}`);
      return null;
    }
  }

  // Set hardware lighting effect using CMD 0x04
  public async setHardwareEffect(
    effectId: number,
    brightness: number = this.state.brightness,
    speed: number = this.state.speed,
    colorful: boolean = this.state.colorful,
    colorHex: string = this.state.staticColor
  ): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    const normalizedColor = colorHex.startsWith('#') ? colorHex.toUpperCase() : ('#' + colorHex).toUpperCase();
    const effectObj = WEIKAV_RGB_EFFECTS.find((e) => e.id === effectId || e.hwId === effectId);
    const targetEffectId = effectObj?.id ?? effectId;

    // Rainbow modes are inherently multi-color spectrums (modes 3, 15, 16, 17 as defined in KB.ini)
    const isRainbowOnly = effectObj ? !effectObj.hasColor : (targetEffectId === 3 || targetEffectId === 15 || targetEffectId === 16 || targetEffectId === 17);
    const effectiveColorful = isRainbowOnly ? true : colorful;

    // Immediately update local UI state for zero-latency response
    this.notify({
      effectId: targetEffectId,
      brightness,
      speed,
      colorful: effectiveColorful,
      staticColor: normalizedColor,
      customMode: false,
      isDirectStreaming: false,
      activeSoftwareAnim: null,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Hardware effect set to #${targetEffectId} (${effectObj?.name ?? 'Custom'}, Color: ${normalizedColor}, Colorful: ${effectiveColorful})`);
      return true;
    }

    return this.runExclusive(async () => {
      try {
        const reportId = webhid.getReportId();
        webhid.log(
          `[RGB] Applying Effect #${targetEffectId} (${effectObj?.name ?? 'Custom'}, Bright: ${brightness}, Speed: ${speed}, Colorful: ${effectiveColorful}, Color: ${normalizedColor})...`
        );

        // STEP 1: For color-capable modes, write target color profile when single-color
        if (COLOR_CAPABLE_MODES.includes(targetEffectId) && !effectiveColorful) {
          await this.writeStaticColorProfile(normalizedColor);
          await new Promise((r) => setTimeout(r, 60));
          await this.readDeviceConfig(true);
          await new Promise((r) => setTimeout(r, 40));
        }

        // STEP 2: Use cached baseline config or read once if missing
        let baseline = this.cachedConfig;
        if (!baseline) {
          baseline = await this.readDeviceConfig(true);
          await new Promise((r) => setTimeout(r, 30));
        }

        // STEP 3: Write modified config back (CMD 0x04)
        const pkt = new Uint8Array(519);
        pkt[0] = 0x04; // CMD: CONFIG_WRITE
        pkt[3] = 0x01;
        pkt[5] = 0x80;

        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            pkt[7 + i] = baseline[7 + i];
          }
        }

        pkt[16] = 0x00; // HW effect flag (0 for normal presets)
        pkt[17] = targetEffectId; // Direct 1-based MCU firmware effect index (1..17, 0 for off)
        pkt[25] = 0x00;
        pkt[35] = 0x00;

        if (targetEffectId > 0 && targetEffectId <= 19) {
          const paramOff = 63 + 2 * targetEffectId;
          const brightVal = WEIKAV_LIGHT_HW[Math.max(0, Math.min(4, brightness - 1))] ?? 20;
          const upper = (Math.max(0, Math.min(4, speed)) & 0x0f) << 4;
          const lower = effectiveColorful ? 0x07 : 0x00;
          if (paramOff + 1 < 122) {
            pkt[paramOff] = brightVal;
            pkt[paramOff + 1] = upper | lower;
          }
        } else if (targetEffectId === 0) {
          pkt[17] = 0x00;
        }

        // Preserve SinoWealth signature bytes
        pkt[122] = 0x5a;
        pkt[123] = 0xa5;

        let writeOk = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await this.device.sendFeatureReport(reportId, pkt);
            writeOk = true;
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 40));
          }
        }

        if (!writeOk) {
          throw new Error('Failed to send config write packet');
        }

        // Latch write confirmation after 30ms
        await new Promise((r) => setTimeout(r, 30));
        try {
          await this.device.sendFeatureReport(reportId, pkt);
        } catch {
          // Handled silently
        }

        if (this.cachedConfig) {
          this.cachedConfig[16] = 0x00;
          this.cachedConfig[17] = targetEffectId;
          this.cachedConfig[25] = 0x00;
          this.cachedConfig[35] = 0x00;
          const pOff = 63 + 2 * targetEffectId;
          const bVal = WEIKAV_LIGHT_HW[Math.max(0, Math.min(4, brightness - 1))] ?? 20;
          const sByte = ((Math.max(0, Math.min(4, speed)) & 0x0f) << 4) | (effectiveColorful ? 0x07 : 0x00);
          if (pOff + 1 < 122 && pOff + 1 < this.cachedConfig.length) {
            this.cachedConfig[pOff] = bVal;
            this.cachedConfig[pOff + 1] = sByte;
          }
          this.cachedConfig[122] = 0x5a;
          this.cachedConfig[123] = 0xa5;
        }

        this.notify({
          effectId: targetEffectId,
          brightness,
          speed,
          colorful: effectiveColorful,
          staticColor: normalizedColor,
          customMode: false,
          isDirectStreaming: false,
          activeSoftwareAnim: null,
        });

        webhid.log(`[RGB] Effect #${targetEffectId} (${effectObj?.name ?? 'Custom'}) successfully committed to keyboard memory!`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB Error] Failed to write effect: ${err.message}`);
        return false;
      }
    });
  }

  // Atomically set color for active effect
  public async setEffectColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    const currentId = this.state.effectId;
    let targetId = currentId;

    if (targetId === 0 || !COLOR_CAPABLE_MODES.includes(targetId)) {
      targetId = 1; // Default to Static #1
      webhid.log(`[RGB] Effect #${currentId} is fixed-rainbow or off. Switching to Static (#1) with ${normalizedHex}.`);
    }

    return await this.setHardwareEffect(
      targetId,
      this.state.brightness,
      this.state.speed,
      false,
      normalizedHex
    );
  }

  // Set universal static color (CMD 0x0A + Effect #1)
  public async setStaticColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    return await this.setHardwareEffect(1, this.state.brightness, 0, false, normalizedHex);
  }

  // Low-level helper: write custom color profile (CMD 0x0A)
  public async writeStaticColorProfile(hex: string): Promise<boolean> {
    if (!this.device || !this.device.opened) return true;

    try {
      const reportId = webhid.getReportId();
      const rgb = hexToRgb(hex);
      const pkt = new Uint8Array(519);

      pkt[0] = 0x0a; // CMD: CUSTOM_COLOR_PROFILE
      pkt[3] = 0x01;
      pkt[6] = 0x02;

      const groupChunks = [
        { start: 28, numGroups: 5 },  // Group 1-5: index 28 to 132 (105 bytes)
        { start: 154, numGroups: 2 }, // Group 6-7: index 154 to 195 (42 bytes)
        { start: 217, numGroups: 4 }, // Group 8-11: index 217 to 300 (84 bytes)
        { start: 322, numGroups: 3 }, // Group 12-14: index 322 to 384 (63 bytes)
      ];

      for (const chunk of groupChunks) {
        const totalBytes = chunk.numGroups * 21;
        for (let i = chunk.start; i + 2 < chunk.start + totalBytes; i += 3) {
          pkt[i] = rgb.r;
          pkt[i + 1] = rgb.g;
          pkt[i + 2] = rgb.b;
        }
      }

      pkt[513] = 0x5a;
      pkt[514] = 0xa5;

      await this.device.sendFeatureReport(reportId, pkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Static profile error: ${err.message}`);
      return false;
    }
  }

  // Set side-light strip effect mode
  public async setSideLightMode(mode: number): Promise<boolean> {
    this.notify({ sideLightMode: mode });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Side light set to mode ${mode}`);
      return true;
    }

    return this.runExclusive(async () => {
      try {
        const reportId = webhid.getReportId();
        let baseline = this.cachedConfig;
        if (!baseline) {
          baseline = await this.readDeviceConfig(true);
        }

        const pkt = new Uint8Array(519);
        pkt[0] = 0x04;
        pkt[3] = 0x01;
        pkt[5] = 0x80;

        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            pkt[7 + i] = baseline[7 + i];
          }
        }

        pkt[25] = Math.max(0, Math.min(4, mode));

        await this.device.sendFeatureReport(reportId, pkt);
        if (this.cachedConfig && this.cachedConfig.length > 25) {
          this.cachedConfig[25] = mode;
        }

        webhid.log(`[RGB] Side light mode set to ${mode}`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB] Side light error: ${err.message}`);
        return false;
      }
    });
  }

  // Per-Key Custom RGB Painting (CMD 0x0A + CMD 0x04)
  public async applyPerKeyPlanar(perKeyColors: Record<number, string>): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    this.notify({
      perKeyColors,
      customMode: true,
      effectId: 21,
      isDirectStreaming: false,
      activeSoftwareAnim: null,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Per-key colors saved (${Object.keys(perKeyColors).length} keys).`);
      return true;
    }

    return this.runExclusive(async () => {
      try {
        const reportId = webhid.getReportId();
        webhid.log(`[RGB] Commit custom LED matrix (CMD 0x0A)...`);

        const pkt = new Uint8Array(519);
        pkt[0] = 0x0a;
        pkt[3] = 0x01;
        pkt[6] = 0x02;

        for (const [keyIdxStr, hex] of Object.entries(perKeyColors)) {
          const idx = parseInt(keyIdxStr, 10);
          if (idx < 80) {
            const rgb = hexToRgb(hex);
            const off = 28 + idx * 3;
            if (off + 2 < 513) {
              pkt[off] = rgb.r;
              pkt[off + 1] = rgb.g;
              pkt[off + 2] = rgb.b;
            }
          }
        }

        pkt[513] = 0x5a;
        pkt[514] = 0xa5;

        await this.device.sendFeatureReport(reportId, pkt);
        await new Promise((r) => setTimeout(r, 30));

        // Commit configuration: Custom Flag = 1
        const cfgPkt = new Uint8Array(519);
        cfgPkt[0] = 0x04;
        cfgPkt[3] = 0x01;
        cfgPkt[5] = 0x80;

        if (this.cachedConfig && this.cachedConfig.length >= 7) {
          const copyLen = Math.min(this.cachedConfig.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            cfgPkt[7 + i] = this.cachedConfig[7 + i];
          }
        }

        cfgPkt[16] = 0x01; // Custom Mode ON
        cfgPkt[17] = 21;   // Self-Define / Custom Mode HW ID

        await this.device.sendFeatureReport(reportId, cfgPkt);
        webhid.log(`[RGB] Per-key custom layout saved to keyboard memory.`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB] Per-key write error: ${err.message}`);
        return false;
      }
    });
  }

  // Real-time direct streaming frame
  public async sendDirectFrame(colors: (RGBColor | null)[]): Promise<boolean> {
    if (!this.device || !this.device.opened || this.isSendingFrame) {
      return false;
    }

    this.isSendingFrame = true;
    try {
      const reportId = webhid.getReportId();
      const pkt = new Uint8Array(519);
      pkt[0] = 0x0a;
      pkt[3] = 0x01;
      pkt[6] = 0x02;

      for (let i = 0; i < 80; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        const off = 28 + i * 3;
        if (off + 2 < 513) {
          pkt[off] = c.r;
          pkt[off + 1] = c.g;
          pkt[off + 2] = c.b;
        }
      }

      pkt[513] = 0x5a;
      pkt[514] = 0xa5;

      await this.device.sendFeatureReport(reportId, pkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB Frame Error] ${err.message}`);
      return false;
    } finally {
      this.isSendingFrame = false;
    }
  }

  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(async () => {
      if (this.state.isDirectStreaming && this.device?.opened && !this.isSendingFrame) {
        const frame = new Array(80).fill(null).map((_, idx) => {
          const hex = this.state.perKeyColors[idx] || this.state.staticColor;
          return hexToRgb(hex);
        });
        await this.sendDirectFrame(frame);
      }
    }, 600);
  }

  private stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  public async startSoftwareAnimation(animType: 'matrix' | 'rainbow' | 'pulse' | 'fire') {
    await this.stopSoftwareAnimation();
    this.notify({
      activeSoftwareAnim: animType,
      isDirectStreaming: true,
      customMode: false,
    });

    webhid.log(`[RGB] Initializing software streaming for '${animType}'...`);

    if (this.device && this.device.opened) {
      try {
        const reportId = webhid.getReportId();
        const cfgPkt = new Uint8Array(519);
        cfgPkt[0] = 0x04;
        cfgPkt[3] = 0x01;
        cfgPkt[5] = 0x80;

        if (this.cachedConfig && this.cachedConfig.length >= 7) {
          const copyLen = Math.min(this.cachedConfig.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            cfgPkt[7 + i] = this.cachedConfig[7 + i];
          }
        }

        cfgPkt[16] = 0x01; // Custom mode ON
        cfgPkt[17] = 21;   // Self-Define

        await this.device.sendFeatureReport(reportId, cfgPkt);
        await new Promise((r) => setTimeout(r, 25));
        webhid.log(`[RGB] Keyboard MCU switched to Custom Streaming Mode.`);
      } catch (err: any) {
        webhid.log(`[RGB Warning] Could not set custom streaming mode: ${err.message}`);
      }
    }

    let tick = 0;
    const intervalMs = 50;

    this.animInterval = setInterval(async () => {
      tick++;
      const frameColors: (RGBColor | null)[] = new Array(80).fill(null);
      const activePerKey: Record<number, string> = {};

      for (const key of WEIKAV_WK75_LAYOUT) {
        const idx = key.matrixIdx;
        if (idx >= 80) continue;

        let rgb: RGBColor;

        if (animType === 'matrix') {
          const rowOffset = (key.row + tick * 0.3) % 6;
          const brightness = Math.max(0, 1 - Math.abs(rowOffset - 3) / 3);
          const isGreen = Math.sin(key.col * 2 + tick * 0.2) > 0;
          if (brightness > 0.4 && isGreen) {
            rgb = { r: Math.round(40 * brightness), g: Math.round(255 * brightness), b: Math.round(80 * brightness) };
          } else {
            rgb = { r: 0, g: 20, b: 5 };
          }
        } else if (animType === 'rainbow') {
          const hue = ((key.col * 22 + tick * 6) % 360 + 360) % 360;
          rgb = hslToRgb(hue, 1, 0.5);
        } else if (animType === 'pulse') {
          const baseRgb = hexToRgb(this.state.staticColor);
          const intensity = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(tick * 0.1));
          rgb = {
            r: Math.round(baseRgb.r * intensity),
            g: Math.round(baseRgb.g * intensity),
            b: Math.round(baseRgb.b * intensity),
          };
        } else {
          const distFromBottom = 5 - key.row;
          const flicker = Math.sin(key.col * 3 + tick * 0.4) * 0.25;
          const heat = Math.max(0, Math.min(1, 1 - distFromBottom / 5 + flicker));
          rgb = {
            r: Math.round(255 * heat),
            g: Math.round(140 * heat * heat),
            b: Math.round(15 * heat * heat * heat),
          };
        }

        frameColors[idx] = rgb;
        activePerKey[idx] = rgbToHex(rgb.r, rgb.g, rgb.b);
      }

      this.notify({ perKeyColors: activePerKey });

      if (this.device?.opened && !this.isSendingFrame) {
        await this.sendDirectFrame(frameColors);
      }
    }, intervalMs);

    this.startKeepalive();
    webhid.log(`[RGB] Software animation '${animType}' streaming active.`);
  }

  public async stopSoftwareAnimation() {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.stopKeepalive();
    if (this.state.activeSoftwareAnim) {
      this.notify({ activeSoftwareAnim: null, isDirectStreaming: false });
      webhid.log('[RGB] Software animation stopped, restoring hardware lighting.');
      await this.setHardwareEffect(this.state.effectId);
    }
  }
}

function hslToRgb(h: number, s: number, l: number): RGBColor {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    r1 = c;
    b1 = x;
  } else if (h < 240) {
    r1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export const rgbService = new RgbControllerService();
