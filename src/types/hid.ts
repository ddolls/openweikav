export interface KeyDefinition {
  matrixIdx: number;       // Physical matrix index (0 to 127)
  label: string;           // Display label e.g., 'A', 'Esc', 'Space'
  width?: number;          // Key width multiplier e.g., 1, 1.25, 1.5, 2.25, 6.25
  row: number;             // Physical layout row (0-5)
  col: number;             // Column positioning offset
  category?: string;       // 'alphanumeric' | 'modifier' | 'fn' | 'nav' | 'knob'
  isKnob?: boolean;
}

export interface KeyRecord {
  matrixIdx: number;
  hidUsage: number;
  originalUsage: number;
  bytes: [number, number, number, number];
}

export interface HIDUsageItem {
  usage: number;
  label: string;
  category: 'Standard' | 'Modifiers' | 'Function' | 'Navigation' | 'Media' | 'Special';
}

// Parsed combo record for display
export interface ComboRecord {
  modifiers: number;    // Modifier bitmask from byte[1]
  keyUsage: number;     // Standard key from byte[3]
  isFnKey: boolean;     // byte[0] === 13
  isCombo: boolean;     // Has both modifiers AND a standard key
  isModifierOnly: boolean; // Only modifier, no standard key
}

// Map of default stock HID usage for each physical matrix index on Weikav WK75 (6 rows x 16 cols matrix)
export const DEFAULT_MATRIX_USAGES: Record<number, number> = {
  0: 0x29,   // Esc
  1: 0x35,   // `~
  2: 0x2B,   // Tab
  3: 0x39,   // Caps Lock
  4: 0xE1,   // LShift
  5: 0xE0,   // LCtrl
  7: 0x1E,   // 1
  8: 0x14,   // Q
  9: 0x04,   // A
  11: 0xE3,  // LWin
  12: 0x3A,  // F1
  13: 0x1F,  // 2
  14: 0x1A,  // W
  15: 0x16,  // S
  16: 0x1D,  // Z
  17: 0xE2,  // LAlt
  18: 0x3B,  // F2
  19: 0x20,  // 3
  20: 0x08,  // E
  21: 0x07,  // D
  22: 0x1B,  // X
  24: 0x3C,  // F3
  25: 0x21,  // 4
  26: 0x15,  // R
  27: 0x09,  // F
  28: 0x06,  // C
  30: 0x3D,  // F4
  31: 0x22,  // 5
  32: 0x17,  // T
  33: 0x0A,  // G
  34: 0x19,  // V
  35: 0x2C,  // Space
  36: 0x3E,  // F5
  37: 0x23,  // 6
  38: 0x1C,  // Y
  39: 0x0B,  // H
  40: 0x05,  // B
  42: 0x3F,  // F6
  43: 0x24,  // 7
  44: 0x18,  // U
  45: 0x0D,  // J
  46: 0x11,  // N
  48: 0x40,  // F7
  49: 0x25,  // 8
  50: 0x0C,  // I
  51: 0x0E,  // K
  52: 0x10,  // M
  53: 0xE6,  // RAlt
  54: 0x41,  // F8
  55: 0x26,  // 9
  56: 0x12,  // O
  57: 0x0F,  // L
  58: 0x36,  // < ,
  59: 0xFF,  // FN
  60: 0x42,  // F9
  61: 0x27,  // 0
  62: 0x13,  // P
  63: 0x33,  // ; :
  64: 0x37,  // > .
  66: 0x43,  // F10
  67: 0x2D,  // - _
  68: 0x2F,  // [ {
  69: 0x34,  // ' "
  70: 0x38,  // ? /
  72: 0x44,  // F11
  73: 0x2E,  // = +
  74: 0x30,  // ] }
  78: 0x45,  // F12
  79: 0x2A,  // Backspace
  80: 0x31,  // \ |
  81: 0x28,  // Enter
  82: 0xE5,  // RShift
  83: 0x50,  // Left Arrow
  84: 0x4A,  // Home
  88: 0x52,  // Up Arrow
  89: 0x51,  // Down Arrow
  90: 0x10E2, // Knob / Volume Mute
  91: 0x4C,  // Delete
  92: 0x4B,  // PgUp
  93: 0x4E,  // PgDn
  95: 0x4F,  // Right Arrow
};

export const CONSUMER_CALCULATOR = 0x0192;
export const CONSUMER_MUTE       = 0x10E2;
export const CONSUMER_VOL_DOWN   = 0x10EA;
export const CONSUMER_VOL_UP     = 0x10E9;
export const CONSUMER_PLAY_PAUSE = 0x10CD;
export const CONSUMER_NEXT       = 0x10B5;
export const CONSUMER_PREV       = 0x10B6;
export const CONSUMER_EMAIL      = 0x018A;

// Decode 4-byte matrix record into logical HID usage (simple single-usage view)
export function parseKeyRecordUsage(bytes: [number, number, number, number] | undefined | null): number {
  if (!bytes || bytes.length < 4) return 0;
  if (bytes[0] === 13) return 0xFF;  // Fn Key
  if (bytes[0] === 2) {
    // Consumer Control (Media / Calculator)
    if (bytes[2] === 1 && bytes[3] === 0x92) return CONSUMER_CALCULATOR;
    if (bytes[2] === 1 && bytes[3] === 0x8A) return CONSUMER_EMAIL;
    if (bytes[3] !== 0) return 0x1000 | bytes[3];
    return 0x0200;
  }
  // If it's a combo (modifier + key), return the key part for display
  if (bytes[1] !== 0 && bytes[3] !== 0) return bytes[3] || 0;
  if (bytes[1] === 0x01) return 0xE0; // Left Control
  if (bytes[1] === 0x02) return 0xE1; // Left Shift
  if (bytes[1] === 0x04) return 0xE2; // Left Alt
  if (bytes[1] === 0x08) return 0xE3; // Left GUI / Win
  if (bytes[1] === 0x10) return 0xE4; // Right Control
  if (bytes[1] === 0x20) return 0xE5; // Right Shift
  if (bytes[1] === 0x40) return 0xE6; // Right Alt
  if (bytes[1] === 0x80) return 0xE7; // Right GUI / Win
  return bytes[3] || 0;
}

// Parse full combo info from 4-byte record
export function parseComboRecord(bytes: [number, number, number, number] | undefined | null): ComboRecord {
  if (!bytes || bytes.length < 4) {
    return {
      modifiers: 0,
      keyUsage: 0,
      isFnKey: false,
      isCombo: false,
      isModifierOnly: false,
    };
  }
  const mod = typeof bytes[1] === 'number' && !isNaN(bytes[1]) ? bytes[1] : 0;
  const key = typeof bytes[3] === 'number' && !isNaN(bytes[3]) ? bytes[3] : 0;
  return {
    modifiers: mod,
    keyUsage: key,
    isFnKey: bytes[0] === 13,
    isCombo: mod !== 0 && key !== 0,
    isModifierOnly: mod !== 0 && key === 0,
  };
}

// Modifier bitmask constants
export const MOD_LCTRL  = 0x01;
export const MOD_LSHIFT = 0x02;
export const MOD_LALT   = 0x04;
export const MOD_LWIN   = 0x08;
export const MOD_RCTRL  = 0x10;
export const MOD_RSHIFT = 0x20;
export const MOD_RALT   = 0x40;
export const MOD_RWIN   = 0x80;

// Get human-readable modifier labels from bitmask
export function getModifierLabels(modBitmask: number): string[] {
  const labels: string[] = [];
  if (modBitmask & MOD_LCTRL)  labels.push('Ctrl');
  if (modBitmask & MOD_LSHIFT) labels.push('Shift');
  if (modBitmask & MOD_LALT)   labels.push('Alt');
  if (modBitmask & MOD_LWIN)   labels.push('Win');
  if (modBitmask & MOD_RCTRL)  labels.push('RCtrl');
  if (modBitmask & MOD_RSHIFT) labels.push('RShift');
  if (modBitmask & MOD_RALT)   labels.push('RAlt');
  if (modBitmask & MOD_RWIN)   labels.push('RWin');
  return labels;
}

// Format combo record as user-friendly label
export function formatComboLabel(bytes: [number, number, number, number] | undefined | null): string {
  if (!bytes || bytes.length < 4) return 'Default';
  if (bytes[0] === 13) return 'Fn Key';
  if (bytes[0] === 2) {
    if (bytes[2] === 1 && bytes[3] === 0x92) return 'Calculator';
    if (bytes[2] === 1 && bytes[3] === 0x8A) return 'Email';
    if (bytes[3] === 0xE2) return 'Volume Mute';
    if (bytes[3] === 0xEA) return 'Volume Down';
    if (bytes[3] === 0xE9) return 'Volume Up';
    if (bytes[3] === 0xCD) return 'Play / Pause';
    if (bytes[3] === 0xB5) return 'Next Track';
    if (bytes[3] === 0xB6) return 'Previous Track';
    return `Media (0x${bytes[3].toString(16).toUpperCase()})`;
  }
  
  const combo = parseComboRecord(bytes);
  const parts: string[] = getModifierLabels(combo.modifiers);
  
  if (combo.keyUsage !== 0 && typeof combo.keyUsage === 'number' && !isNaN(combo.keyUsage)) {
    const keyLabel = HID_USAGES.find(u => u.usage === combo.keyUsage)?.label 
      || `0x${combo.keyUsage.toString(16).toUpperCase()}`;
    parts.push(keyLabel);
  }
  
  if (parts.length === 0) return 'Disabled';
  return parts.join(' + ');
}

// Encode HID usage into 4-byte matrix record format for Table 0 base write or Table 1 FN write
export function encodeKeyRecordBytes(hidUsage: number): [number, number, number, number] {
  if (hidUsage === 0xE0) return [0, 0x01, 0, 0]; // LCtrl
  if (hidUsage === 0xE1) return [0, 0x02, 0, 0]; // LShift
  if (hidUsage === 0xE2) return [0, 0x04, 0, 0]; // LAlt
  if (hidUsage === 0xE3) return [0, 0x08, 0, 0]; // Win / LGUI
  if (hidUsage === 0xE4) return [0, 0x10, 0, 0]; // RCtrl
  if (hidUsage === 0xE5) return [0, 0x20, 0, 0]; // RShift
  if (hidUsage === 0xE6) return [0, 0x40, 0, 0]; // RAlt
  if (hidUsage === 0xE7) return [0, 0x80, 0, 0]; // RWin / RGUI
  if (hidUsage === 0xFF) return [13, 0, 0, 0];   // Fn Key

  // Consumer Control (Calculator, Volume, Media)
  if (hidUsage === CONSUMER_CALCULATOR) return [2, 0, 1, 0x92];
  if (hidUsage === CONSUMER_EMAIL) return [2, 0, 1, 0x8A];
  if ((hidUsage & 0xFF00) === 0x1000) {
    return [2, 0, 0, hidUsage & 0xFF];
  }

  // Standard Key
  return [0, 0, 0, hidUsage];
}

// Encode modifier+key combo into 4-byte matrix record
export function encodeComboBytes(modBitmask: number, keyUsage: number): [number, number, number, number] {
  return [0, modBitmask & 0xFF, 0, keyUsage & 0xFF];
}

// Map of physical keys on Weikav WK75 75% Layout (80 Keys + Rotary Knob)
export const WEIKAV_WK75_LAYOUT: KeyDefinition[] = [
  // Row 0: Esc, F1-F12, Home, Knob
  { matrixIdx: 0, label: 'Esc', row: 0, col: 0 },
  { matrixIdx: 12, label: 'F1', row: 0, col: 1.25 },
  { matrixIdx: 18, label: 'F2', row: 0, col: 2.25 },
  { matrixIdx: 24, label: 'F3', row: 0, col: 3.25 },
  { matrixIdx: 30, label: 'F4', row: 0, col: 4.25 },
  { matrixIdx: 36, label: 'F5', row: 0, col: 5.5 },
  { matrixIdx: 42, label: 'F6', row: 0, col: 6.5 },
  { matrixIdx: 48, label: 'F7', row: 0, col: 7.5 },
  { matrixIdx: 54, label: 'F8', row: 0, col: 8.5 },
  { matrixIdx: 60, label: 'F9', row: 0, col: 9.75 },
  { matrixIdx: 66, label: 'F10', row: 0, col: 10.75 },
  { matrixIdx: 72, label: 'F11', row: 0, col: 11.75 },
  { matrixIdx: 78, label: 'F12', row: 0, col: 12.75 },
  { matrixIdx: 84, label: 'Home', row: 0, col: 13.9, category: 'nav' },
  { matrixIdx: 90, label: 'Knob', row: 0, col: 15, isKnob: true },

  // Row 1: `~, 1-0, -, =, Backspace, Delete
  { matrixIdx: 1, label: '`', row: 1, col: 0 },
  { matrixIdx: 7, label: '1', row: 1, col: 1 },
  { matrixIdx: 13, label: '2', row: 1, col: 2 },
  { matrixIdx: 19, label: '3', row: 1, col: 3 },
  { matrixIdx: 25, label: '4', row: 1, col: 4 },
  { matrixIdx: 31, label: '5', row: 1, col: 5 },
  { matrixIdx: 37, label: '6', row: 1, col: 6 },
  { matrixIdx: 43, label: '7', row: 1, col: 7 },
  { matrixIdx: 49, label: '8', row: 1, col: 8 },
  { matrixIdx: 55, label: '9', row: 1, col: 9 },
  { matrixIdx: 61, label: '0', row: 1, col: 10 },
  { matrixIdx: 67, label: '-', row: 1, col: 11 },
  { matrixIdx: 73, label: '=', row: 1, col: 12 },
  { matrixIdx: 79, label: 'Backspace', width: 2, row: 1, col: 13 },
  { matrixIdx: 91, label: 'Delete', row: 1, col: 15, category: 'nav' },

  // Row 2: Tab, QWERTYUIOP, [, ], \, PgUp
  { matrixIdx: 2, label: 'Tab', width: 1.5, row: 2, col: 0 },
  { matrixIdx: 8, label: 'Q', row: 2, col: 1.5 },
  { matrixIdx: 14, label: 'W', row: 2, col: 2.5 },
  { matrixIdx: 20, label: 'E', row: 2, col: 3.5 },
  { matrixIdx: 26, label: 'R', row: 2, col: 4.5 },
  { matrixIdx: 32, label: 'T', row: 2, col: 5.5 },
  { matrixIdx: 38, label: 'Y', row: 2, col: 6.5 },
  { matrixIdx: 44, label: 'U', row: 2, col: 7.5 },
  { matrixIdx: 50, label: 'I', row: 2, col: 8.5 },
  { matrixIdx: 56, label: 'O', row: 2, col: 9.5 },
  { matrixIdx: 62, label: 'P', row: 2, col: 10.5 },
  { matrixIdx: 68, label: '[', row: 2, col: 11.5 },
  { matrixIdx: 74, label: ']', row: 2, col: 12.5 },
  { matrixIdx: 80, label: '\\', width: 1.5, row: 2, col: 13.5 },
  { matrixIdx: 92, label: 'PgUp', row: 2, col: 15, category: 'nav' },

  // Row 3: Caps Lock, ASDFGHJKL, ;, ', Enter, PgDn
  { matrixIdx: 3, label: 'Caps Lock', width: 1.75, row: 3, col: 0 },
  { matrixIdx: 9, label: 'A', row: 3, col: 1.75 },
  { matrixIdx: 15, label: 'S', row: 3, col: 2.75 },
  { matrixIdx: 21, label: 'D', row: 3, col: 3.75 },
  { matrixIdx: 27, label: 'F', row: 3, col: 4.75 },
  { matrixIdx: 33, label: 'G', row: 3, col: 5.75 },
  { matrixIdx: 39, label: 'H', row: 3, col: 6.75 },
  { matrixIdx: 45, label: 'J', row: 3, col: 7.75 },
  { matrixIdx: 51, label: 'K', row: 3, col: 8.75 },
  { matrixIdx: 57, label: 'L', row: 3, col: 9.75 },
  { matrixIdx: 63, label: ';', row: 3, col: 10.75 },
  { matrixIdx: 69, label: "'", row: 3, col: 11.75 },
  { matrixIdx: 81, label: 'Enter', width: 2.25, row: 3, col: 12.75 },
  { matrixIdx: 93, label: 'PgDn', row: 3, col: 15, category: 'nav' },

  // Row 4: Shift, ZXCVBNM, ,, ., /, Shift, Arrow Up
  { matrixIdx: 4, label: 'Shift', width: 2.25, row: 4, col: 0, category: 'modifier' },
  { matrixIdx: 16, label: 'Z', row: 4, col: 2.25 },
  { matrixIdx: 22, label: 'X', row: 4, col: 3.25 },
  { matrixIdx: 28, label: 'C', row: 4, col: 4.25 },
  { matrixIdx: 34, label: 'V', row: 4, col: 5.25 },
  { matrixIdx: 40, label: 'B', row: 4, col: 6.25 },
  { matrixIdx: 46, label: 'N', row: 4, col: 7.25 },
  { matrixIdx: 52, label: 'M', row: 4, col: 8.25 },
  { matrixIdx: 58, label: '<', row: 4, col: 9.25 },
  { matrixIdx: 64, label: '>', row: 4, col: 10.25 },
  { matrixIdx: 70, label: '/', row: 4, col: 11.25 },
  { matrixIdx: 82, label: 'Shift', width: 1.75, row: 4, col: 12.25, category: 'modifier' },
  { matrixIdx: 88, label: '▲', row: 4, col: 14, category: 'nav' },

  // Row 5: Ctrl, Win, Alt, Space, Alt, FN, Arrow Left, Arrow Down, Arrow Right
  { matrixIdx: 5, label: 'Ctrl', width: 1.25, row: 5, col: 0, category: 'modifier' },
  { matrixIdx: 11, label: 'Win', width: 1.25, row: 5, col: 1.25, category: 'modifier' },
  { matrixIdx: 17, label: 'Alt', width: 1.25, row: 5, col: 2.5, category: 'modifier' },
  { matrixIdx: 35, label: 'Space', width: 6.25, row: 5, col: 3.75 },
  { matrixIdx: 53, label: 'Alt', width: 1, row: 5, col: 10, category: 'modifier' },
  { matrixIdx: 59, label: 'FN', width: 1, row: 5, col: 11.1, category: 'fn' },
  { matrixIdx: 83, label: '◄', row: 5, col: 13, category: 'nav' },
  { matrixIdx: 89, label: '▼', row: 5, col: 14, category: 'nav' },
  { matrixIdx: 95, label: '►', row: 5, col: 15, category: 'nav' },
];

// Common HID Usages
export const HID_USAGES: HIDUsageItem[] = [
  // Standard Keys
  { usage: 0x04, label: 'A', category: 'Standard' },
  { usage: 0x05, label: 'B', category: 'Standard' },
  { usage: 0x06, label: 'C', category: 'Standard' },
  { usage: 0x07, label: 'D', category: 'Standard' },
  { usage: 0x08, label: 'E', category: 'Standard' },
  { usage: 0x09, label: 'F', category: 'Standard' },
  { usage: 0x0A, label: 'G', category: 'Standard' },
  { usage: 0x0B, label: 'H', category: 'Standard' },
  { usage: 0x0C, label: 'I', category: 'Standard' },
  { usage: 0x0D, label: 'J', category: 'Standard' },
  { usage: 0x0E, label: 'K', category: 'Standard' },
  { usage: 0x0F, label: 'L', category: 'Standard' },
  { usage: 0x10, label: 'M', category: 'Standard' },
  { usage: 0x11, label: 'N', category: 'Standard' },
  { usage: 0x12, label: 'O', category: 'Standard' },
  { usage: 0x13, label: 'P', category: 'Standard' },
  { usage: 0x14, label: 'Q', category: 'Standard' },
  { usage: 0x15, label: 'R', category: 'Standard' },
  { usage: 0x16, label: 'S', category: 'Standard' },
  { usage: 0x17, label: 'T', category: 'Standard' },
  { usage: 0x18, label: 'U', category: 'Standard' },
  { usage: 0x19, label: 'V', category: 'Standard' },
  { usage: 0x1A, label: 'W', category: 'Standard' },
  { usage: 0x1B, label: 'X', category: 'Standard' },
  { usage: 0x1C, label: 'Y', category: 'Standard' },
  { usage: 0x1D, label: 'Z', category: 'Standard' },
  { usage: 0x1E, label: '1 !', category: 'Standard' },
  { usage: 0x1F, label: '2 @', category: 'Standard' },
  { usage: 0x20, label: '3 #', category: 'Standard' },
  { usage: 0x21, label: '4 $', category: 'Standard' },
  { usage: 0x22, label: '5 %', category: 'Standard' },
  { usage: 0x23, label: '6 ^', category: 'Standard' },
  { usage: 0x24, label: '7 &', category: 'Standard' },
  { usage: 0x25, label: '8 *', category: 'Standard' },
  { usage: 0x26, label: '9 (', category: 'Standard' },
  { usage: 0x27, label: '0 )', category: 'Standard' },
  { usage: 0x28, label: 'Enter', category: 'Standard' },
  { usage: 0x29, label: 'Escape', category: 'Standard' },
  { usage: 0x2A, label: 'Backspace', category: 'Standard' },
  { usage: 0x2B, label: 'Tab', category: 'Standard' },
  { usage: 0x2C, label: 'Space', category: 'Standard' },
  { usage: 0x2D, label: '- _', category: 'Standard' },
  { usage: 0x2E, label: '= +', category: 'Standard' },
  { usage: 0x2F, label: '[ {', category: 'Standard' },
  { usage: 0x30, label: '] }', category: 'Standard' },
  { usage: 0x31, label: '\\ |', category: 'Standard' },
  { usage: 0x33, label: '; :', category: 'Standard' },
  { usage: 0x34, label: "' \"", category: 'Standard' },
  { usage: 0x35, label: '` ~', category: 'Standard' },
  { usage: 0x36, label: ', <', category: 'Standard' },
  { usage: 0x37, label: '. >', category: 'Standard' },
  { usage: 0x38, label: '/ ?', category: 'Standard' },
  { usage: 0x39, label: 'Caps Lock', category: 'Standard' },

  // Modifiers
  { usage: 0xE0, label: 'Left Control', category: 'Modifiers' },
  { usage: 0xE1, label: 'Left Shift', category: 'Modifiers' },
  { usage: 0xE2, label: 'Left Alt', category: 'Modifiers' },
  { usage: 0xE3, label: 'Left GUI / Win', category: 'Modifiers' },
  { usage: 0xE4, label: 'Right Control', category: 'Modifiers' },
  { usage: 0xE5, label: 'Right Shift', category: 'Modifiers' },
  { usage: 0xE6, label: 'Right Alt', category: 'Modifiers' },
  { usage: 0xE7, label: 'Right GUI / Win', category: 'Modifiers' },

  // Function Keys
  { usage: 0x3A, label: 'F1', category: 'Function' },
  { usage: 0x3B, label: 'F2', category: 'Function' },
  { usage: 0x3C, label: 'F3', category: 'Function' },
  { usage: 0x3D, label: 'F4', category: 'Function' },
  { usage: 0x3E, label: 'F5', category: 'Function' },
  { usage: 0x3F, label: 'F6', category: 'Function' },
  { usage: 0x40, label: 'F7', category: 'Function' },
  { usage: 0x41, label: 'F8', category: 'Function' },
  { usage: 0x42, label: 'F9', category: 'Function' },
  { usage: 0x43, label: 'F10', category: 'Function' },
  { usage: 0x44, label: 'F11', category: 'Function' },
  { usage: 0x45, label: 'F12', category: 'Function' },

  // Navigation
  { usage: 0x46, label: 'Print Screen', category: 'Navigation' },
  { usage: 0x47, label: 'Scroll Lock', category: 'Navigation' },
  { usage: 0x48, label: 'Pause / Break', category: 'Navigation' },
  { usage: 0x49, label: 'Insert', category: 'Navigation' },
  { usage: 0x4A, label: 'Home', category: 'Navigation' },
  { usage: 0x4B, label: 'Page Up', category: 'Navigation' },
  { usage: 0x4C, label: 'Delete', category: 'Navigation' },
  { usage: 0x4D, label: 'End', category: 'Navigation' },
  { usage: 0x4E, label: 'Page Down', category: 'Navigation' },
  { usage: 0x4F, label: 'Right Arrow', category: 'Navigation' },
  { usage: 0x50, label: 'Left Arrow', category: 'Navigation' },
  { usage: 0x51, label: 'Down Arrow', category: 'Navigation' },
  { usage: 0x52, label: 'Up Arrow', category: 'Navigation' },

  // Media & Consumer Control
  { usage: CONSUMER_CALCULATOR, label: 'Calculator', category: 'Media' },
  { usage: CONSUMER_MUTE, label: 'Volume Mute', category: 'Media' },
  { usage: CONSUMER_VOL_DOWN, label: 'Volume Down', category: 'Media' },
  { usage: CONSUMER_VOL_UP, label: 'Volume Up', category: 'Media' },
  { usage: CONSUMER_PLAY_PAUSE, label: 'Play / Pause', category: 'Media' },
  { usage: CONSUMER_NEXT, label: 'Next Track', category: 'Media' },
  { usage: CONSUMER_PREV, label: 'Previous Track', category: 'Media' },
  { usage: CONSUMER_EMAIL, label: 'Email', category: 'Media' },

  // Special
  { usage: 0xFF, label: 'Fn Key (Special)', category: 'Special' },
  { usage: 0x00, label: 'Disabled / None', category: 'Special' },
];

// Preset shortcut combos for quick access
export const SHORTCUT_PRESETS = [
  { label: 'Copy', modifiers: MOD_LCTRL, key: 0x06, desc: 'Ctrl + C' },
  { label: 'Paste', modifiers: MOD_LCTRL, key: 0x19, desc: 'Ctrl + V' },
  { label: 'Cut', modifiers: MOD_LCTRL, key: 0x1B, desc: 'Ctrl + X' },
  { label: 'Undo', modifiers: MOD_LCTRL, key: 0x1D, desc: 'Ctrl + Z' },
  { label: 'Redo', modifiers: MOD_LCTRL | MOD_LSHIFT, key: 0x1D, desc: 'Ctrl + Shift + Z' },
  { label: 'Save', modifiers: MOD_LCTRL, key: 0x16, desc: 'Ctrl + S' },
  { label: 'Select All', modifiers: MOD_LCTRL, key: 0x04, desc: 'Ctrl + A' },
  { label: 'Find', modifiers: MOD_LCTRL, key: 0x09, desc: 'Ctrl + F' },
  { label: 'New Tab', modifiers: MOD_LCTRL, key: 0x17, desc: 'Ctrl + T' },
  { label: 'Close Tab', modifiers: MOD_LCTRL, key: 0x1A, desc: 'Ctrl + W' },
  { label: 'Refresh', modifiers: MOD_LCTRL, key: 0x15, desc: 'Ctrl + R' },
  { label: 'Dev Tools', modifiers: MOD_LCTRL | MOD_LSHIFT, key: 0x0C, desc: 'Ctrl + Shift + I' },
  { label: 'Screenshot', modifiers: MOD_LWIN | MOD_LSHIFT, key: 0x16, desc: 'Win + Shift + S' },
  { label: 'Task Manager', modifiers: MOD_LCTRL | MOD_LSHIFT, key: 0x29, desc: 'Ctrl + Shift + Esc' },
  { label: 'Lock Screen', modifiers: MOD_LWIN, key: 0x0F, desc: 'Win + L' },
  { label: 'File Explorer', modifiers: MOD_LWIN, key: 0x08, desc: 'Win + E' },
  { label: 'Run Dialog', modifiers: MOD_LWIN, key: 0x15, desc: 'Win + R' },
  { label: 'Alt+F4', modifiers: MOD_LALT, key: 0x3D, desc: 'Alt + F4' },
  { label: 'Alt+Tab', modifiers: MOD_LALT, key: 0x2B, desc: 'Alt + Tab' },
];

// ==========================================
// RGB LIGHTING ARCHITECTURE & DEFINITIONS
// ==========================================

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface RgbHardwareEffect {
  id: number;
  hwId?: number;
  uiIndex?: number;
  name: string;
  category: 'motion' | 'reactive' | 'ambient' | 'static' | 'special';
  description: string;
  hasSpeed: boolean;
  hasBrightness: boolean;
  hasColor: boolean;
}

// Hardware mapping constants reverse-engineered from Weikav WK75 OEM software (CDev916KB)
export const WEIKAV_LIGHT_HW = [1, 5, 10, 15, 20];
export const WEIKAV_SPEED_HW = [0, 1, 2, 3, 4];

export const WEIKAV_RGB_EFFECTS: RgbHardwareEffect[] = [
  { id: 3, hwId: 3, uiIndex: 3, name: 'Rainbow Wave', category: 'motion', description: 'Fluid multi-color spectrum wave across all keys', hasSpeed: true, hasBrightness: true, hasColor: false },
  { id: 1, hwId: 1, uiIndex: 1, name: 'Static Color', category: 'static', description: 'Single uniform color across all keys', hasSpeed: false, hasBrightness: true, hasColor: true },
  { id: 2, hwId: 2, uiIndex: 2, name: 'Breathing', category: 'ambient', description: 'Smooth pulsating illumination in chosen or random colors', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 4, hwId: 4, uiIndex: 4, name: 'Flash Away', category: 'reactive', description: 'Keys light up on strike and flash away across rows', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 5, hwId: 5, uiIndex: 5, name: 'Raindrops', category: 'motion', description: 'Digital raindrops trickling down keyboard columns', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 7, hwId: 7, uiIndex: 7, name: 'Ripples Shining', category: 'reactive', description: 'Circular water ripple spreading outward from keypress', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 8, hwId: 8, uiIndex: 8, name: 'Stars Twinkle', category: 'ambient', description: 'Random twinkling starlight sparkling across keyboard', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 9, hwId: 9, uiIndex: 9, name: 'Shadow Disappear', category: 'reactive', description: 'Pressed keys fade into dark shadows and re-emerge', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 10, hwId: 10, uiIndex: 10, name: 'Retro Snake', category: 'motion', description: 'Serpentine illuminated trail weaving through rows', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 11, hwId: 11, uiIndex: 11, name: 'Neon Stream', category: 'motion', description: 'Shifting northern lights atmospheric neon wave', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 12, hwId: 12, uiIndex: 12, name: 'Reaction', category: 'reactive', description: 'Single pressed key illuminates instantly and fades smoothly', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 13, hwId: 13, uiIndex: 13, name: 'Sine Wave', category: 'motion', description: 'Harmonic undulating sinusoidal waves of color', hasSpeed: true, hasBrightness: true, hasColor: true },
  { id: 15, hwId: 15, uiIndex: 15, name: 'Rotating Windmill', category: 'motion', description: 'Pinwheel rotational sweep around keyboard center', hasSpeed: true, hasBrightness: true, hasColor: false },
  { id: 16, hwId: 16, uiIndex: 16, name: 'Colorful Waterfall', category: 'motion', description: 'Downward vertical cascading waterfall of vibrant hues', hasSpeed: true, hasBrightness: true, hasColor: false },
  { id: 17, hwId: 17, uiIndex: 17, name: 'Blossoming', category: 'reactive', description: 'Floral bloom of light radiating outward on keypress', hasSpeed: true, hasBrightness: true, hasColor: false },
  { id: 0, hwId: 0, uiIndex: 20, name: 'Off / Sleep', category: 'static', description: 'Turn off all keyboard LEDs completely', hasSpeed: false, hasBrightness: false, hasColor: false },
];

export interface SideLightOption {
  id: number;
  label: string;
}

export const WEIKAV_SIDE_LIGHT_MODES: SideLightOption[] = [
  { id: 0, label: 'Off / Battery Indicator' },
  { id: 1, label: 'Rainbow Stream' },
  { id: 2, label: 'Breathing Mixed' },
  { id: 3, label: 'Static Red' },
  { id: 4, label: 'Breathing Red' },
];

export interface RgbConfigState {
  effectId: number;
  brightness: number; // 1 to 4 (or 0 for off)
  speed: number;      // 0 to 4
  colorful: boolean;  // multi-color / random vs single color
  staticColor: string; // #RRGGBB
  sideLightMode: number; // 0 to 4
  customMode: boolean; // Custom per-key mode active
  isDirectStreaming: boolean;
  activeSoftwareAnim: string | null;
  perKeyColors: Record<number, string>; // matrixIdx -> #RRGGBB
}

export const DEFAULT_RGB_STATE: RgbConfigState = {
  effectId: 3, // Rainbow wave
  brightness: 4, // Max
  speed: 2,     // Medium
  colorful: true,
  staticColor: '#a855f7', // Weikav purple accent
  sideLightMode: 0, // Off
  customMode: false,
  isDirectStreaming: false,
  activeSoftwareAnim: null,
  perKeyColors: {},
};

export const COLOR_PRESETS = [
  { label: 'Weikav Purple', hex: '#a855f7' },
  { label: 'Electric Emerald', hex: '#10b981' },
  { label: 'Cyber Cyan', hex: '#00e5ff' },
  { label: 'True Blue', hex: '#0066ff' },
  { label: 'Neon Magenta', hex: '#ff007f' },
  { label: 'Amber Gold', hex: '#ffb300' },
  { label: 'Pure White', hex: '#ffffff' },
  { label: 'Crimson Red', hex: '#ff1744' },
  { label: 'Vivid Orange', hex: '#ff6d00' },
  { label: 'Deep Indigo', hex: '#6366f1' },
];

