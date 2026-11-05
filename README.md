# Weikav WK75 WebHID Driver & Keyboard Configurator

A driverless, browser-based WebHID configuration suite for the **Weikav WK75** mechanical keyboard. Built with React 19, TypeScript, Tailwind CSS v4, and Vite.

---

## ⚡ Architecture & Reverse Engineering Overview

Both the **Weikav WK75** and **Leobog Hi75c Pro** share the same underlying microcontroller architecture: **SinoWealth SH68F90A / BY Tech (8051-based)** HID platform.

### Microcontroller & USB Identifiers
| Mode / Component | Vendor ID (VID) | Product ID (PID) | Description |
| :--- | :--- | :--- | :--- |
| **Wired Mode (Default)** | `0x258A` | `0x0049` | Primary SinoWealth USB wired connection |
| **Wired Alternate 1** | `0x258A` | `0x0150` | Weikav secondary firmware revision |
| **Wired Alternate 2** | `0x258A` | `0x019D` | Generic BY Tech 8051 platform |
| **Wired Alternate 3** | `0x258A` | `0x010C` | Shared platform PID |
| **2.4G Wireless Dongle** | `0x3554` | `0xFA09` | High-speed 2.4GHz USB wireless dongle |
| **Fallback Generic** | `0x00C7` | `0x0001` | Generic HID receiver |

---

## 🔬 Protocol & Packet Specification

The Weikav WK75 firmware communicates over USB HID Feature Reports:
- **HID Report ID**: `6` (and `5` on select wireless receiver dongles)
- **Report Payload Size**: `519 bytes` (3-byte header + 512 bytes payload / 4-byte padding)
- **Header Structure**:
  - `byte[0]` = Report ID (`0x06` or `0x05`)
  - `byte[1]` = Command / Sub-opcode
  - `byte[2]` = Packet Index / Table ID
  - `byte[3..514]` = 512-byte EEPROM Table / Configuration Data
  - `byte[515..518]` = Checksum / Frame trailer

### Keymapping EEPROM Tables (128 Matrix Slots x 4 Bytes)
- **Table 0 (Base Layer)**: Read via `0x83 0x00`, Written via `0x03 0x00`.
- **Table 1 (Fn Layer)**: Read via `0x83 0x01`, Written via `0x03 0x01`.
- **Record Format (4 Bytes per matrix slot)**:
  - `Byte 0`: Modifier type / Fn action flag (`13` = Fn hardware trigger)
  - `Byte 1`: Standard modifier bitmask (`0x01` LCtrl, `0x02` LShift, `0x04` LAlt, `0x08` LGUI/Win, `0x10` RCtrl, `0x20` RShift, `0x40` RAlt, `0x80` RGUI/Win)
  - `Byte 2`: Reserved / Macro pointer
  - `Byte 3`: Standard USB HID Usage ID (e.g., `0x04` = Key A, `0x29` = Escape, `0x28` = Return)

### Hardware Rotary Knob (Volume & Mute)
- Located at Row 0, Col 15: **Matrix Index #84**.
- Rotation CW triggers Volume Up (`0x80`), CCW triggers Volume Down (`0x81`), Push switch triggers Volume Mute (`0x7F`).

### Hardware Lighting & Global Configurations
- **Global Config Query**: Command `0x84`, Write: `0x04`.
  - `pkt[10]`: Hardware Debounce Stage (`1` to `5` = 2ms, 5ms, 8ms, 10ms, 15ms).
  - `pkt[29]`: Tap setting / Repeat Delay (`1` to `10` x 50ms).
  - `pkt[31]`: Wireless Sleep Timer (`1` to `10` x 30s).
- **RGB Lighting Modes**: Command `0x0A` (Preset RGB profile) and Command `0x06` (Planar Per-Key RGB matrix mapping across 122 LED positions).

---

## 🛠️ Features

1. **Driverless WebHID Integration**: Zero native installer, runs on Chrome, Edge, Brave, and Opera.
2. **75% ANSI Interactive Matrix (80 Keys + Rotary Encoder)**:
   - Full remap with modifier combo builder (e.g. `Win + Shift + S`, `Alt + Tab`).
   - Apple macOS ↔ Windows PC layout one-click switcher.
   - Dedicated physical Knob visualizer (Volume Up, Down, Mute).
3. **RGB Studio & Per-Key Canvas**:
   - 19 Hardware lighting presets (Breathing, Wave, Ripple, Rain, Windmill, etc.).
   - Per-key custom LED painter with 14 hardware LED groups and custom palette.
   - Dynamic real-time software animation streaming mode (60 FPS WebHID frame push).
4. **Hardware Performance Tuning**:
   - Debounce stages 1–5 (2ms to 15ms) for esports latency vs. anti-chatter protection.
   - Wireless idle sleep timer (30s to 10 minutes) & tap sensitivity.
   - 4000mAh battery discharge curve & charging telemetry.
5. **Switch Health & Chatter Tester**:
   - Micro-switch bounce inspection with chatter alerts (<30ms re-activation threshold).
   - Smart Debounce Advisor recommending optimal EEPROM debounce stage.
   - Text report export for switch RMA / troubleshooting.
6. **Polling Rate & Jitter Benchmark**:
   - Live 1000Hz / 500Hz / 250Hz / 125Hz USB polling rate counter.
   - Hardware packet arrival jitter (±ms) and real-time interval scatter graph.
7. **Bilingual Typing Speed Benchmark**:
   - Real-time WPM, accuracy, consistency, and keystroke heatmap analytics.
   - Web Audio synthesizer with 5 authentic mechanical switch sound packs (Thock, Clack, Clicky, Bubble, Typewriter).
8. **Dev Mode & Safe Recovery Guard**:
   - Two-tier safety system: Safe Mode (read-only safe test) vs. Dev Mode (full EEPROM access).
   - Surgical Fn key recovery (`13 00 00 00` restore) and 1024-byte full binary dump import/export.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v24.19.0)
- Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera)

### Development
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
# Compile TypeScript and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 🔒 Safety & Firmware Protection
- Fn key recovery tools prevent accidental bricking or locking out layer switches.
- Safe Mode is active by default to protect EEPROM memory until unlocked with Developer PIN (`1234`).
- All EEPROM writes execute with single-packet mutex locking to prevent frame interleaving.

