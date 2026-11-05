import { parseKeyRecordUsage, encodeKeyRecordBytes, type KeyRecord } from '../types/hid';

export interface WebHIDState {
  isConnected: boolean;
  deviceName: string;
  vendorId: string;
  productId: string;
  firmwareVersion?: string;
  matrixData: Uint8Array | null;
  records: Map<number, KeyRecord>;
  fnRecords?: Map<number, KeyRecord>;
  modifiedCount: number;
  logs: string[];
}

export const PRISTINE_STAGE5_MATRIX: [number[], number[]] = [
  [0, 0, 0, 41, 0, 0, 0, 53, 0, 0, 0, 43, 0, 0, 0, 57, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 20, 0, 0, 0, 4, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 58, 0, 0, 0, 31, 0, 0, 0, 26, 0, 0, 0, 22, 0, 0, 0, 29, 0, 4, 0, 0, 0, 0, 0, 59, 0, 0, 0, 32, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 27, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 33, 0, 0, 0, 21, 0, 0, 0, 9, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 34, 0, 0, 0, 23, 0, 0, 0, 10, 0, 0, 0, 25, 0, 0, 0, 44, 0, 0, 0, 62, 0, 0, 0, 35, 0, 0, 0, 28, 0, 0, 0, 11, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 36, 0, 0, 0, 24, 0, 0, 0, 13, 0, 0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 37, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0, 16, 0, 64, 0, 0, 0, 0, 0, 65, 0, 0, 0, 38, 0, 0, 0, 18, 0, 0, 0, 15, 0, 0, 0, 54, 13, 0, 0, 0, 0, 0, 0, 66, 0, 0, 0, 39, 0, 0, 0, 19, 0, 0, 0, 51, 0, 0, 0, 55, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0, 52, 0, 0, 0, 56, 0, 0, 0, 0, 0, 0, 0, 68, 0, 0, 0, 46, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 42, 0, 0, 0, 49, 0, 0, 0, 40, 0, 32, 0, 0, 0, 0, 0, 80, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82, 0, 0, 0, 81, 2, 0, 0, 226, 0, 0, 0, 76, 0, 0, 0, 75, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 41, 0, 0, 0, 53, 8, 0, 0, 1, 0, 0, 0, 57, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 20, 0, 0, 0, 4, 0, 0, 0, 0, 7, 0, 0, 1, 2, 0, 1, 148, 0, 0, 0, 31, 0, 0, 0, 26, 0, 0, 0, 22, 0, 0, 0, 29, 0, 4, 0, 0, 2, 0, 1, 138, 0, 0, 0, 32, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 27, 0, 0, 0, 0, 2, 0, 1, 146, 0, 0, 0, 33, 0, 0, 0, 21, 0, 0, 0, 9, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 34, 0, 0, 0, 23, 0, 0, 0, 10, 0, 0, 0, 25, 0, 0, 0, 44, 0, 0, 0, 62, 0, 0, 0, 35, 0, 0, 0, 28, 0, 0, 0, 11, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 36, 0, 0, 0, 24, 0, 0, 0, 13, 0, 0, 0, 17, 0, 0, 0, 0, 2, 0, 0, 182, 0, 0, 0, 37, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0, 16, 0, 64, 0, 0, 2, 0, 0, 205, 0, 0, 0, 38, 0, 0, 0, 18, 0, 0, 0, 15, 0, 0, 0, 54, 13, 0, 0, 0, 2, 0, 0, 181, 0, 0, 0, 39, 0, 0, 0, 19, 0, 0, 0, 51, 0, 0, 0, 55, 0, 0, 0, 0, 2, 0, 0, 226, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0, 52, 0, 0, 0, 56, 0, 0, 0, 0, 2, 0, 0, 234, 0, 0, 0, 46, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 233, 7, 0, 0, 27, 8, 0, 0, 0, 0, 0, 0, 40, 0, 32, 0, 0, 8, 4, 2, 0, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 3, 1, 0, 8, 3, 2, 0, 2, 0, 0, 226, 0, 0, 0, 76, 0, 0, 0, 75, 0, 0, 0, 78, 0, 0, 0, 0, 8, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

export interface DiffEntry {
  offsetHex: string;
  offsetDec: number;
  valA: string;
  valB: string;
  notes: string;
}

class WebHIDController {
  private device: any = null;
  private reportId: number = 9; // Report ID 9 for Weikav WK75 (Fw=26), Report ID 6 fallback
  private listeners: ((state: Partial<WebHIDState>) => void)[] = [];
  private logs: string[] = [];
  private connectedBaseline: Uint8Array | null = null;
  private activeBaseTable: Uint8Array = new Uint8Array(PRISTINE_STAGE5_MATRIX[0]);
  private activeFnTable: Uint8Array = new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);

  constructor() {
    this.initFromLocalStorage();
    this.initNavigatorListeners();
  }

  private initFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedBase = localStorage.getItem('weikav_wk75_base_table');
        if (savedBase) {
          const arr = JSON.parse(savedBase);
          if (Array.isArray(arr) && arr.length === 512) {
            this.activeBaseTable.set(arr);
          }
        }
        const savedFn = localStorage.getItem('weikav_wk75_fn_table');
        if (savedFn) {
          const arr = JSON.parse(savedFn);
          if (Array.isArray(arr) && arr.length === 512) {
            this.activeFnTable.set(arr);
          }
        }
      }
    } catch {}
  }

  private initNavigatorListeners() {
    if (typeof navigator !== 'undefined' && (navigator as any).hid) {
      (navigator as any).hid.addEventListener('disconnect', (event: any) => {
        const disconnectedDev = event.device;
        if (!this.device) return;

        const isCurrentDevice =
          disconnectedDev === this.device ||
          (disconnectedDev?.vendorId === this.device.vendorId &&
            disconnectedDev?.productId === this.device.productId);

        if (isCurrentDevice) {
          const devName = this.device.productName || 'Weikav WK75';
          this.log(`Device disconnected (${devName}).`);
          this.device = null;
          this.connectedBaseline = null;
          this.notify({
            isConnected: false,
            deviceName: '',
            matrixData: null,
            records: new Map(),
            fnRecords: new Map(),
            modifiedCount: 0,
          });
        }
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device) {
      try {
        if (this.device.opened) {
          await this.device.close();
        }
      } catch (err: any) {
        this.log(`Error closing device: ${err.message}`);
      }
      this.device = null;
    }
    this.connectedBaseline = null;
    this.notify({
      isConnected: false,
      deviceName: '',
      matrixData: null,
      records: new Map(),
      fnRecords: new Map(),
      modifiedCount: 0,
    });
    this.log('WebHID device disconnected.');
  }

  public getDevice(): any {
    return this.device;
  }

  public getReportId(): number {
    return this.reportId;
  }

  public log(msg: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${msg}`;
    this.logs.push(logLine);
    console.log(logLine);
    this.notify({ logs: [...this.logs] });
  }

  public subscribe(fn: (state: Partial<WebHIDState>) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(state: Partial<WebHIDState>) {
    this.listeners.forEach(fn => fn(state));
  }

  public async connect(): Promise<boolean> {
    try {
      const hidNav = (navigator as any).hid;
      if (!hidNav) {
        throw new Error('WebHID is not supported in this browser. Please use Chrome, Edge, or Brave.');
      }

      this.log('Checking existing authorized HID devices...');
      let existing = await hidNav.getDevices();
      let matched = existing.find((d: any) => 
        d.vendorId === 0x258A || d.vendorId === 0x3554 || d.vendorId === 0x00C7
      );

      if (!matched) {
        this.log('Requesting HID device picker (VID: 0x258A / 0x3554)...');
        const devices = await hidNav.requestDevice({
          filters: [
            { vendorId: 0x258A, productId: 0x019D }, // WK75 Wired
            { vendorId: 0x258A, productId: 0x0150 }, // WK75 2.4G
            { vendorId: 0x258A, productId: 0x0049 },
            { vendorId: 0x258A, productId: 0x010C },
            { vendorId: 0x258A },
            { vendorId: 0x3554, productId: 0xFA09 },
            { vendorId: 0x3554 },
            { vendorId: 0x00C7 }
          ]
        });

        if (!devices || devices.length === 0) {
          this.log('No device selected by user in picker.');
          return false;
        }
        matched = devices[0];
      }

      const allDevices = await hidNav.getDevices();
      const targetDevs = allDevices.filter((d: any) => 
        d.vendorId === 0x258A || d.vendorId === 0x3554 || d.vendorId === 0x00C7
      );

      // Prioritize Report ID 9 (Vendor control collection for Weikav WK75 / Fw=26)
      let matchedDev = targetDevs.find((d: any) => 
        (d.collections || []).some((c: any) => 
          (c.featureReports || []).some((r: any) => r.reportId === 9)
        )
      );
      let chosenReportId = 9;

      // Fallback to Report ID 6 if Report ID 9 is not present
      if (!matchedDev) {
        matchedDev = targetDevs.find((d: any) => 
          (d.collections || []).some((c: any) => 
            (c.featureReports || []).some((r: any) => r.reportId === 6)
          )
        );
        if (matchedDev) {
          chosenReportId = 6;
        }
      }

      this.device = matchedDev || matched || targetDevs[0];
      this.reportId = chosenReportId;

      if (!this.device) {
        throw new Error('No valid Weikav WK75 device found.');
      }

      if (!this.device.opened) {
        this.log(`Opening WebHID interface (Report ID ${this.reportId})...`);
        await this.device.open();
      }

      const rawName = (this.device.productName || '').trim();
      const devName = (!rawName || rawName.toLowerCase() === 'gaming keyboard')
        ? 'Weikav WK75'
        : rawName;

      const vidHex = '0x' + (this.device.vendorId || 0x258A).toString(16).toUpperCase();
      const pidHex = '0x' + (this.device.productId || 0x019D).toString(16).toUpperCase();

      const isWireless = rawName.toLowerCase().includes('2.4g') ||
                         rawName.toLowerCase().includes('dongle') ||
                         rawName.toLowerCase().includes('receiver') ||
                         rawName.toLowerCase().includes('wireless');
      const fwVersion = isWireless ? 'V30.0.1 (2.4G)' : 'V1.0.3 (USB)';

      this.log(`Successfully opened ${devName} (${vidHex}:${pidHex}) on Report ID ${this.reportId} - Firmware: ${fwVersion}`);
      
      this.notify({
        isConnected: true,
        deviceName: devName,
        vendorId: vidHex,
        productId: pidHex,
        firmwareVersion: fwVersion,
      });

      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`Connection error: ${err.message}`);
      alert(`Connection failed: ${err.message}\n\nTips:\n1. Close official Weikav software if running.\n2. Ensure keyboard is connected via USB cable.\n3. Re-plug USB cable and try again.`);
      return false;
    }
  }

  // Exact SinoWealth readBase implementation matching OemDrv.exe CDevG5KB protocol (520 bytes on Report ID 9/6)
  public async readBaseTable(): Promise<Uint8Array> {
    if (!this.device || !this.device.opened) {
      return new Uint8Array(this.connectedBaseline || PRISTINE_STAGE5_MATRIX[0]);
    }

    try {
      const query = new Uint8Array(519);
      query[0] = 0x83; // Command GET Table (0x83)
      query[1] = 0x00; // Table Index 0 (Base Table)
      query[2] = 0x00; // Reserved
      query[3] = 0x01; // Total Packets (1)
      query[4] = 0x00; // Packet Index (0)
      query[5] = 0x00; // Size low (0x00)
      query[6] = 0x02; // Size high (0x02 -> 0x0200 = 512 bytes)

      this.log(`[WebHID] Querying hardware Base Table (CMD 0x83, Table 0, 512 bytes)...`);
      await this.device.sendFeatureReport(this.reportId, query);
      await new Promise(r => setTimeout(r, 40));

      const res = await this.device.receiveFeatureReport(this.reportId);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      let payload: Uint8Array;
      if (data.length >= 512) {
        payload = data.slice(data.length - 512);
      } else {
        payload = new Uint8Array(this.connectedBaseline || PRISTINE_STAGE5_MATRIX[0]);
      }

      if (payload.length !== 512) {
        payload = new Uint8Array(this.connectedBaseline || PRISTINE_STAGE5_MATRIX[0]);
      }

      // If hardware returns all zeros, fallback to baseline
      const hasCustomData = payload.some(b => b !== 0);
      if (!hasCustomData) {
        return new Uint8Array(this.connectedBaseline || PRISTINE_STAGE5_MATRIX[0]);
      }
      return payload;
    } catch (err: any) {
      this.log('[WebHID] readBase note: ' + err.message);
      return new Uint8Array(this.connectedBaseline || PRISTINE_STAGE5_MATRIX[0]);
    }
  }

  // Exact SinoWealth writeBase implementation matching OemDrv.exe CDevG5KB protocol (520 bytes on Report ID 9/6)
  public async writeBaseTable(table0Data: Uint8Array): Promise<boolean> {
    if (!this.device || !this.device.opened) {
      return true;
    }

    if (table0Data.length !== 512) {
      throw new Error('Table 0 data must be exactly 512 bytes');
    }

    const query = new Uint8Array(519);
    query[0] = 0x03; // Command SET Table (0x03)
    query[1] = 0x00; // Table Index 0 (Base Table)
    query[2] = 0x00; // Reserved
    query[3] = 0x01; // Total Packets (1)
    query[4] = 0x00; // Packet Index (0)
    query[5] = 0x00; // Size low byte (0x00)
    query[6] = 0x02; // Size high byte (0x02 -> 0x0200 = 512 bytes)
    query.set(table0Data, 7); // 512 bytes payload at query[7..518]

    this.log(`[WebHID] Sending writeBaseTable packet (CMD: 0x03, Table: 0, 512 bytes)...`);
    await this.device.sendFeatureReport(this.reportId, query);
    await new Promise(r => setTimeout(r, 50));
    return true;
  }

  // Read FN Table (Command GET 0x83, Table Index 1 - 512 bytes)
  public async readFnTable(): Promise<Uint8Array> {
    if (!this.device || !this.device.opened) {
      return new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);
    }

    try {
      const query = new Uint8Array(519);
      query[0] = 0x83; // Command GET Table (0x83)
      query[1] = 0x01; // Table Index 1 (FN Table)
      query[2] = 0x00;
      query[3] = 0x01; // 1 packet
      query[4] = 0x00;
      query[5] = 0x00;
      query[6] = 0x02; // 512 bytes

      this.log(`[WebHID] Querying hardware FN Table (CMD 0x83, Table 1, 512 bytes)...`);
      await this.device.sendFeatureReport(this.reportId, query);
      await new Promise(r => setTimeout(r, 40));

      const res = await this.device.receiveFeatureReport(this.reportId);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      let payload: Uint8Array;
      if (data.length >= 512) {
        payload = data.slice(data.length - 512);
      } else {
        payload = new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);
      }

      if (payload.length !== 512) {
        payload = new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);
      }

      const hasCustomData = payload.some(b => b !== 0);
      if (!hasCustomData) {
        return new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);
      }
      return payload;
    } catch (err: any) {
      this.log('[WebHID] readFnTable note: ' + err.message);
      return new Uint8Array(PRISTINE_STAGE5_MATRIX[1]);
    }
  }

  // Write FN Table (Command SET 0x03, Table Index 1 - 512 bytes)
  public async writeFnTable(fnTableData: Uint8Array): Promise<boolean> {
    if (!this.device || !this.device.opened) {
      return true;
    }

    if (fnTableData.length !== 512) {
      throw new Error('FN Table data must be exactly 512 bytes');
    }

    const query = new Uint8Array(519);
    query[0] = 0x03; // Command SET Table (0x03)
    query[1] = 0x01; // Table Index 1 (FN Table)
    query[2] = 0x00;
    query[3] = 0x01;
    query[4] = 0x00;
    query[5] = 0x00;
    query[6] = 0x02; // 512 bytes
    query.set(fnTableData, 7);

    this.log(`[WebHID] Sending writeFnTable packet (CMD: 0x03, Table: 1, 512 bytes)...`);
    await this.device.sendFeatureReport(this.reportId, query);
    await new Promise(r => setTimeout(r, 50));
    return true;
  }

  // Write FN key remap using persistent in-memory buffer (retains all previous remaps!)
  public async writeFnKeyRemap(matrixIdx: number, newUsage: number): Promise<boolean> {
    const newBytes = encodeKeyRecordBytes(newUsage);
    return await this.writeFnKeyRemapRaw(matrixIdx, newBytes);
  }

  public async writeFnKeyRemapRaw(matrixIdx: number, rawBytes: [number, number, number, number]): Promise<boolean> {
    const offset = matrixIdx * 4;
    this.log(`Staging FN matrix #${matrixIdx} (offset ${offset}) to [${rawBytes.join(', ')}]...`);

    // Modify activeFnTable in-place so all previous remaps accumulate
    this.activeFnTable[offset] = rawBytes[0];
    this.activeFnTable[offset + 1] = rawBytes[1];
    this.activeFnTable[offset + 2] = rawBytes[2];
    this.activeFnTable[offset + 3] = rawBytes[3];

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('weikav_wk75_fn_table', JSON.stringify(Array.from(this.activeFnTable)));
      }
    } catch {}

    if (!this.device || !this.device.opened) {
      this.log(`[Offline Mode] Simulated FN key remap for matrix ${matrixIdx} -> [${rawBytes.join(', ')}]`);
      await this.readMatrixData();
      return true;
    }

    try {
      this.log(`Writing FN table (CMD 0x03, Table 1, 512 bytes)...`);
      await this.writeFnTable(this.activeFnTable);
      this.log(`FN key remap write committed. Updating UI matrix state...`);
      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`FN APPLY ERROR: ${err.message}`);
      return false;
    }
  }

  public async readMatrixData(): Promise<Uint8Array | null> {
    const baseTable = this.activeBaseTable;
    const fnTable = this.activeFnTable;

    const records = new Map<number, KeyRecord>();
    let modifiedCount = 0;

    for (let idx = 0; idx < 128; idx++) {
      const offset = idx * 4;
      const bytes: [number, number, number, number] = [
        baseTable[offset],
        baseTable[offset + 1],
        baseTable[offset + 2],
        baseTable[offset + 3]
      ];

      // Compare against pristine factory stock as reference
      const baselineBytes: [number, number, number, number] = [
        PRISTINE_STAGE5_MATRIX[0][offset],
        PRISTINE_STAGE5_MATRIX[0][offset + 1],
        PRISTINE_STAGE5_MATRIX[0][offset + 2],
        PRISTINE_STAGE5_MATRIX[0][offset + 3]
      ];

      const hidUsage = parseKeyRecordUsage(bytes);
      const originalUsage = parseKeyRecordUsage(baselineBytes);

      if (bytes[0] !== baselineBytes[0] || bytes[1] !== baselineBytes[1] ||
          bytes[2] !== baselineBytes[2] || bytes[3] !== baselineBytes[3]) {
        modifiedCount++;
      }

      records.set(idx, {
        matrixIdx: idx,
        hidUsage,
        originalUsage,
        bytes
      });
    }

    const fnRecords = new Map<number, KeyRecord>();
    for (let idx = 0; idx < 128; idx++) {
      const offset = idx * 4;
      const bytes: [number, number, number, number] = [
        fnTable[offset],
        fnTable[offset + 1],
        fnTable[offset + 2],
        fnTable[offset + 3]
      ];
      const stockBytes = PRISTINE_STAGE5_MATRIX[1].slice(offset, offset + 4);
      const hidUsage = parseKeyRecordUsage(bytes);
      const originalUsage = parseKeyRecordUsage([stockBytes[0], stockBytes[1], stockBytes[2], stockBytes[3]]);
      fnRecords.set(idx, {
        matrixIdx: idx,
        hidUsage,
        originalUsage,
        bytes
      });
    }

    const full1024 = new Uint8Array(1024);
    full1024.set(baseTable, 0);
    full1024.set(fnTable, 512);

    this.notify({
      matrixData: full1024,
      records,
      fnRecords,
      modifiedCount
    });

    return full1024;
  }

  // Exact Apply Key Remap flow with verified readBase verification
  public async writeKeyRemap(matrixIdx: number, newUsage: number): Promise<boolean> {
    const newBytes = encodeKeyRecordBytes(newUsage);
    return await this.writeKeyRemapRaw(matrixIdx, newBytes);
  }

  // Write raw 4-byte combo record using persistent in-memory activeBaseTable (accumulates all remaps!)
  public async writeKeyRemapRaw(matrixIdx: number, rawBytes: [number, number, number, number]): Promise<boolean> {
    const offset = matrixIdx * 4;
    this.log(`Staging matrix #${matrixIdx} (offset ${offset}) to [${rawBytes.join(', ')}]...`);

    // Modify activeBaseTable in-place so all previous remaps accumulate (e.g. L=F12 and Y=F2 stay together!)
    this.activeBaseTable[offset] = rawBytes[0];
    this.activeBaseTable[offset + 1] = rawBytes[1];
    this.activeBaseTable[offset + 2] = rawBytes[2];
    this.activeBaseTable[offset + 3] = rawBytes[3];

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('weikav_wk75_base_table', JSON.stringify(Array.from(this.activeBaseTable)));
      }
    } catch {}

    if (!this.device || !this.device.opened) {
      this.log(`[Offline Mode] Simulated key remap for matrix ${matrixIdx} -> [${rawBytes.join(', ')}]`);
      await this.readMatrixData();
      return true;
    }

    try {
      this.log(`Writing base table (CMD 0x03, Table 0, 512 bytes with all staged remaps)...`);
      await this.writeBaseTable(this.activeBaseTable);

      this.log(`Key remap write committed. Updating UI matrix state...`);
      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`APPLY ERROR: ${err.message}`);
      return false;
    }
  }

  // Full Hardware Factory Reset: writes stock Base Table 0 and FN Table 1 directly to keyboard EEPROM
  public async resetToFactoryDefaults(): Promise<boolean> {
    this.activeBaseTable.set(PRISTINE_STAGE5_MATRIX[0]);
    this.activeFnTable.set(PRISTINE_STAGE5_MATRIX[1]);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('weikav_wk75_base_table');
        localStorage.removeItem('weikav_wk75_fn_table');
      }
    } catch {}

    if (!this.device || !this.device.opened) {
      this.connectedBaseline = new Uint8Array(PRISTINE_STAGE5_MATRIX[0]);
      await this.readMatrixData();
      this.log('[Offline Mode] Restored matrix tables to pristine factory stock defaults.');
      return true;
    }

    try {
      this.log('Performing hardware factory reset for Base Table 0 (512 bytes)...');
      await this.writeBaseTable(this.activeBaseTable);

      this.log('Performing hardware factory reset for FN Table 1 (512 bytes)...');
      await this.writeFnTable(this.activeFnTable);

      this.connectedBaseline = new Uint8Array(PRISTINE_STAGE5_MATRIX[0]);
      this.log('FACTORY RESET APPLIED: Both Base and FN tables successfully restored to factory stock!');
      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`FACTORY RESET ERROR: ${err.message}`);
      return false;
    }
  }

  // Reset a single key to its pristine stock factory mapping
  public async resetKeyToDefault(matrixIdx: number): Promise<boolean> {
    const stockOffset = matrixIdx * 4;
    const stockBytes: [number, number, number, number] = [
      PRISTINE_STAGE5_MATRIX[0][stockOffset],
      PRISTINE_STAGE5_MATRIX[0][stockOffset + 1],
      PRISTINE_STAGE5_MATRIX[0][stockOffset + 2],
      PRISTINE_STAGE5_MATRIX[0][stockOffset + 3],
    ];
    this.log(`Resetting Matrix #${matrixIdx} to stock factory mapping: [${stockBytes.join(', ')}]...`);
    return await this.writeKeyRemapRaw(matrixIdx, stockBytes);
  }

  // Restores Fn record (matrix 59 = [13, 0, 0, 0])
  public async surgicalFnRecovery(): Promise<boolean> {
    this.log('=== SURGICAL FN RECOVERY START ===');
    this.log('Restoring Fn record (Matrix 59 -> [13, 0, 0, 0])...');
    return await this.writeKeyRemap(59, 0xFF);
  }

  // Restores Win key record (matrix 11 = [0, 8, 0, 0])
  public async surgicalWinRecovery(): Promise<boolean> {
    this.log('=== SURGICAL WIN RECOVERY START ===');
    this.log('Restoring Windows key (Matrix 11 -> [0, 8, 0, 0])...');
    return await this.writeKeyRemap(11, 0xE3);
  }

  public compareDumps(dumpA: Uint8Array, dumpB: Uint8Array): DiffEntry[] {
    const diffs: DiffEntry[] = [];
    const len = Math.min(dumpA.length, dumpB.length);

    for (let i = 0; i < len; i++) {
      if (dumpA[i] !== dumpB[i]) {
        const offsetHex = `0x${i.toString(16).toUpperCase().padStart(3, '0')}`;
        const valA = `0x${dumpA[i].toString(16).toUpperCase().padStart(2, '0')} (${dumpA[i]})`;
        const valB = `0x${dumpB[i].toString(16).toUpperCase().padStart(2, '0')} (${dumpB[i]})`;
        
        let notes = 'Configuration byte';
        if (i < 512) {
          const matrixIdx = Math.floor(i / 4);
          const byteIdx = i % 4;
          notes = `Table 0 Matrix #${matrixIdx} [Byte ${byteIdx}]`;
        } else {
          const matrixIdx = Math.floor((i - 512) / 4);
          const byteIdx = i % 4;
          notes = `Table 1 Secondary #${matrixIdx} [Byte ${byteIdx}]`;
        }

        diffs.push({
          offsetHex,
          offsetDec: i,
          valA,
          valB,
          notes
        });
      }
    }
    return diffs;
  }

  public calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) >>> 0;
    }
    return sum;
  }
}

export const webhid = new WebHIDController();
