// Central Input State Manager for Weikav WK75 Key Press Visualizer
import { switchHealthService } from './switchHealthService';
import { pollingRateService } from './pollingRateService';

export interface KeyHistoryItem {
  id: string;
  combination: string;
  mappedCombination: string;
  timestamp: string;
}

export interface DebugLogEntry {
  timestamp: string;
  source: 'DOM' | 'WebHID';
  code: string;
  key: string;
  reportId?: number;
  rawHex?: string;
  matrixIdx?: number | null;
  mappedUsage?: string;
}

// Physical matrix map from KeyboardEvent.code -> Weikav WK75 physical matrix index (6 rows x 16 cols)
export const PHYSICAL_CODE_TO_MATRIX: Record<string, number> = {
  Escape: 0,
  Backquote: 1,
  Tab: 2,
  CapsLock: 3,
  ShiftLeft: 4,
  ControlLeft: 5,

  Digit1: 7,
  KeyQ: 8,
  KeyA: 9,
  MetaLeft: 11,

  F1: 12,
  Digit2: 13,
  KeyW: 14,
  KeyS: 15,
  KeyZ: 16,
  AltLeft: 17,

  F2: 18,
  Digit3: 19,
  KeyE: 20,
  KeyD: 21,
  KeyX: 22,

  F3: 24,
  Digit4: 25,
  KeyR: 26,
  KeyF: 27,
  KeyC: 28,

  F4: 30,
  Digit5: 31,
  KeyT: 32,
  KeyG: 33,
  KeyV: 34,
  Space: 35,

  F5: 36,
  Digit6: 37,
  KeyY: 38,
  KeyH: 39,
  KeyB: 40,

  F6: 42,
  Digit7: 43,
  KeyU: 44,
  KeyJ: 45,
  KeyN: 46,

  F7: 48,
  Digit8: 49,
  KeyI: 50,
  KeyK: 51,
  KeyM: 52,
  AltRight: 53,

  F8: 54,
  Digit9: 55,
  KeyO: 56,
  KeyL: 57,
  Comma: 58,
  Fn: 59,

  F9: 60,
  Digit0: 61,
  KeyP: 62,
  Semicolon: 63,
  Period: 64,

  F10: 66,
  Minus: 67,
  BracketLeft: 68,
  Quote: 69,
  Slash: 70,

  F11: 72,
  Equal: 73,
  BracketRight: 74,

  F12: 78,
  Backspace: 79,
  Backslash: 80,
  Enter: 81,
  ShiftRight: 82,
  ArrowLeft: 83,

  Home: 84,
  ArrowUp: 88,
  ArrowDown: 89,
  Delete: 91,
  PageUp: 92,
  PageDown: 93,
  ArrowRight: 95,

  // Media / Rotary Knob (Matrix 90)
  AudioVolumeMute: 90,
  VolumeMute: 90,
  AudioVolumeUp: 90,
  VolumeUp: 90,
  AudioVolumeDown: 90,
  VolumeDown: 90,
  MediaPlayPause: 90,
};

// Friendly key display labels
export const FRIENDLY_KEY_NAMES: Record<string, string> = {
  MetaLeft: 'Win',
  MetaRight: 'Win',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ArrowUp: '▲',
  ArrowDown: '▼',
  ArrowLeft: '◄',
  ArrowRight: '►',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Del',
  Enter: 'Enter',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  End: 'End',
  AudioVolumeMute: 'Mute',
  VolumeMute: 'Mute',
  AudioVolumeUp: 'Vol+',
  VolumeUp: 'Vol+',
  AudioVolumeDown: 'Vol-',
  VolumeDown: 'Vol-',
  MediaPlayPause: 'Play/Pause',
};

export interface KnobState {
  rotation: number;
  lastAction: 'up' | 'down' | 'mute' | 'press' | null;
  isActive: boolean;
}

class InputManager {
  private pressedCodes = new Set<string>();
  private pressedMatrixIndices = new Set<number>();
  private listeners: ((pressed: Set<number>, codes: Set<string>) => void)[] = [];
  private historyListeners: ((history: KeyHistoryItem[]) => void)[] = [];
  private debugListeners: ((logs: DebugLogEntry[]) => void)[] = [];
  private knobListeners: ((knob: KnobState) => void)[] = [];

  private knobState: KnobState = { rotation: 0, lastAction: null, isActive: false };
  private knobTimer: any = null;

  private history: KeyHistoryItem[] = [];
  private debugLogs: DebugLogEntry[] = [];
  private isTestModeActive = false;

  constructor() {
    this.initDOMListeners();
  }

  private initDOMListeners() {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        const rawCode = e.code || '';
        const rawKey = e.key || '';
        const isVolUp = rawCode === 'AudioVolumeUp' || rawCode === 'VolumeUp' || rawKey === 'AudioVolumeUp';
        const isVolDown = rawCode === 'AudioVolumeDown' || rawCode === 'VolumeDown' || rawKey === 'AudioVolumeDown';
        const isVolMute = rawCode === 'AudioVolumeMute' || rawCode === 'VolumeMute' || rawKey === 'AudioVolumeMute' || rawCode === 'MediaPlayPause' || rawKey === 'MediaPlayPause';

        if (!isInputFocused) {
          e.preventDefault();
        }

        if (isVolUp) {
          this.triggerKnobAction('up');
          return;
        }
        if (isVolDown) {
          this.triggerKnobAction('down');
          return;
        }
        if (isVolMute) {
          this.triggerKnobAction('mute');
          return;
        }

        if (e.repeat) return;
        this.handleKeyDown(e.code, e.key);
      },
      { capture: true }
    );

    window.addEventListener(
      'keyup',
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        if (!isInputFocused) {
          e.preventDefault();
        }

        this.handleKeyUp(e.code);
      },
      { capture: true }
    );

    window.addEventListener('blur', () => this.releaseAllKeys());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAllKeys();
    });
  }

  public triggerKnobAction(action: 'up' | 'down' | 'mute') {
    pollingRateService.recordEvent('dom', `Knob_${action}`);
    if (action === 'up') {
      this.knobState.rotation += 18;
      this.knobState.lastAction = 'up';
      this.knobState.isActive = true;
      this.pressedCodes.add('AudioVolumeUp');
      this.logDebug('DOM', 'AudioVolumeUp', 'Vol+', 90);
    } else if (action === 'down') {
      this.knobState.rotation -= 18;
      this.knobState.lastAction = 'down';
      this.knobState.isActive = true;
      this.pressedCodes.add('AudioVolumeDown');
      this.logDebug('DOM', 'AudioVolumeDown', 'Vol-', 90);
    } else {
      this.knobState.lastAction = 'mute';
      this.knobState.isActive = true;
      this.pressedCodes.add('AudioVolumeMute');
      this.logDebug('DOM', 'AudioVolumeMute', 'Mute', 90);
    }

    this.pressedMatrixIndices.add(90);
    this.notify();

    if (this.knobTimer) clearTimeout(this.knobTimer);
    this.knobTimer = setTimeout(() => {
      this.pressedMatrixIndices.delete(90);
      this.pressedCodes.delete('AudioVolumeUp');
      this.pressedCodes.delete('AudioVolumeDown');
      this.pressedCodes.delete('AudioVolumeMute');
      this.knobState.isActive = false;
      this.knobState.lastAction = null;
      this.notify();
    }, 280);
  }

  public getKnobState(): KnobState {
    return { ...this.knobState };
  }

  public subscribeKnob(fn: (knob: KnobState) => void) {
    this.knobListeners.push(fn);
    fn({ ...this.knobState });
    return () => {
      this.knobListeners = this.knobListeners.filter(l => l !== fn);
    };
  }

  public handleKeyDown(code: string, key: string = '') {
    pollingRateService.recordEvent('dom', code);
    const matrixIdx = PHYSICAL_CODE_TO_MATRIX[code];

    if (this.pressedCodes.has(code)) {
      // If key is already in pressedCodes, subsequent rapid keydowns can indicate micro-switch bounce
      if (this.isTestModeActive && matrixIdx !== undefined) {
        switchHealthService.recordKeyDown(matrixIdx, code, key);
      }
      return;
    }

    this.pressedCodes.add(code);
    if (matrixIdx !== undefined) {
      this.pressedMatrixIndices.add(matrixIdx);
      if (this.isTestModeActive) {
        switchHealthService.recordKeyDown(matrixIdx, code, key);
      }
    }

    this.logDebug('DOM', code, key, matrixIdx);
    this.notify();
  }

  public handleKeyUp(code: string) {
    if (!this.pressedCodes.has(code)) return;

    if (this.pressedCodes.size > 0) {
      this.recordHistory();
    }

    this.pressedCodes.delete(code);
    const matrixIdx = PHYSICAL_CODE_TO_MATRIX[code];
    if (matrixIdx !== undefined) {
      this.pressedMatrixIndices.delete(matrixIdx);
      if (this.isTestModeActive) {
        switchHealthService.recordKeyUp(matrixIdx);
      }
    }

    this.notify();
  }

  public releaseAllKeys() {
    if (this.isTestModeActive) {
      this.pressedMatrixIndices.forEach(idx => {
        switchHealthService.recordKeyUp(idx);
      });
    }
    this.pressedCodes.clear();
    this.pressedMatrixIndices.clear();
    this.knobState.isActive = false;
    this.knobState.lastAction = null;
    this.notify();
  }

  public attachWebHIDDevice(device: any) {
    if (!device) return;
    try {
      const hasInputReports = (device.collections || []).some(
        (c: any) => c.inputReports && c.inputReports.length > 0
      );
      if (!hasInputReports) {
        return;
      }
      device.addEventListener('inputreport', (e: any) => {
        pollingRateService.recordEvent('webhid', `HID_${e.reportId}`);
        const { reportId, data } = e;
        const rawBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const hex = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');

        const hasVolUp = rawBytes.includes(0xE9) || (reportId === 2 && (rawBytes[0] & 0x01 || rawBytes[1] & 0x01));
        const hasVolDown = rawBytes.includes(0xEA) || (reportId === 2 && (rawBytes[0] & 0x02 || rawBytes[1] & 0x02));
        const hasMute = rawBytes.includes(0xE2) || rawBytes.includes(0xCD) || (reportId === 2 && (rawBytes[0] & 0x04 || rawBytes[1] & 0x04));

        if (hasVolUp) {
          this.triggerKnobAction('up');
        } else if (hasVolDown) {
          this.triggerKnobAction('down');
        } else if (hasMute) {
          this.triggerKnobAction('mute');
        }

        this.logDebug('WebHID', 'HID_REPORT', `Report ${reportId}`, null, reportId, hex);
      });
    } catch (err) {
      console.warn('WebHID inputreport listener error:', err);
    }
  }

  private recordHistory() {
    const formatted = this.getFormattedCombination(this.pressedCodes);
    if (!formatted) return;

    const newItem: KeyHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      combination: formatted,
      mappedCombination: formatted,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.history = [newItem, ...this.history.slice(0, 7)];
    this.historyListeners.forEach(fn => fn(this.history));
  }

  private logDebug(source: 'DOM' | 'WebHID', code: string, key: string, matrixIdx?: number | null, reportId?: number, rawHex?: string) {
    const entry: DebugLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source,
      code,
      key,
      matrixIdx,
      reportId,
      rawHex,
    };
    this.debugLogs = [entry, ...this.debugLogs.slice(0, 49)];
    this.debugListeners.forEach(fn => fn(this.debugLogs));
  }

  public getFormattedCombination(codes: Set<string>): string {
    if (codes.size === 0) return '';
    const arr = Array.from(codes).map(code => {
      if (FRIENDLY_KEY_NAMES[code]) return FRIENDLY_KEY_NAMES[code];
      if (code.startsWith('Key')) return code.replace('Key', '').toUpperCase();
      if (code.startsWith('Digit')) return code.replace('Digit', '');
      return code;
    });

    return arr.join(' + ');
  }

  public subscribe(fn: (pressed: Set<number>, codes: Set<string>) => void) {
    this.listeners.push(fn);
    fn(this.pressedMatrixIndices, this.pressedCodes);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public subscribeHistory(fn: (history: KeyHistoryItem[]) => void) {
    this.historyListeners.push(fn);
    fn(this.history);
    return () => {
      this.historyListeners = this.historyListeners.filter(l => l !== fn);
    };
  }

  public subscribeDebug(fn: (logs: DebugLogEntry[]) => void) {
    this.debugListeners.push(fn);
    fn(this.debugLogs);
    return () => {
      this.debugListeners = this.debugListeners.filter(l => l !== fn);
    };
  }

  public clearHistory() {
    this.history = [];
    this.historyListeners.forEach(fn => fn(this.history));
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.pressedMatrixIndices, this.pressedCodes));
    this.knobListeners.forEach(fn => fn({ ...this.knobState }));
  }

  public setTestMode(active: boolean) {
    this.isTestModeActive = active;
  }

  public getTestMode() {
    return this.isTestModeActive;
  }
}

export const inputManager = new InputManager();

