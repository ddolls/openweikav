// Polling Rate & Latency Benchmark Service

export interface PollingSample {
  id: string;
  timestamp: number;
  deltaMs: number;
  hz: number;
  source: 'webhid' | 'dom';
  key: string;
}

export interface PollingRateSummary {
  currentHz: number;
  peakHz: number;
  avgHz: number;
  sampleCount: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  jitterMs: number;
  stabilityScore: number;
  ratedTier: '1000 Hz (1ms)' | '500 Hz (2ms)' | '250 Hz (4ms)' | '125 Hz (8ms)' | 'Measuring...' | 'Standby' | 'Recording...';
  distribution: {
    hz1000: number; // ~0.5ms - 1.5ms
    hz500: number;  // ~1.6ms - 2.5ms
    hz250: number;  // ~2.6ms - 5.0ms
    hz125: number;  // ~5.1ms - 10.0ms
    other: number;
  };
  isBenchmarking: boolean;
  benchmarkRemainingSec: number;
  benchmarkResult: BenchmarkResult | null;
}

export interface BenchmarkResult {
  peakHz: number;
  avgHz: number;
  totalSamples: number;
  stabilityScore: number;
  jitterMs: number;
  minIntervalMs: number;
  ratedTier: string;
  grade: 'S' | 'A' | 'B' | 'C';
}

class PollingRateService {
  private samples: PollingSample[] = [];
  private lastTimestamp: number | null = null;
  private peakHz: number = 0;
  private listeners: ((summary: PollingRateSummary, samples: PollingSample[]) => void)[] = [];

  // Benchmark state
  private isBenchmarking: boolean = false;
  private benchmarkTimer: any = null;
  private benchmarkRemainingSec: number = 0;
  private benchmarkSamples: PollingSample[] = [];
  private benchmarkResult: BenchmarkResult | null = null;

  private isActive: boolean = false;

  public setActive(active: boolean) {
    this.isActive = active;
    if (!active) {
      this.lastTimestamp = null;
      if (this.isBenchmarking) {
        this.resetAll();
      }
    }
  }

  public recordEvent(source: 'webhid' | 'dom', key: string = '') {
    if (!this.isActive) return;

    const now = performance.now();

    if (this.lastTimestamp !== null) {
      const deltaMs = now - this.lastTimestamp;

      if (deltaMs >= 0.3 && deltaMs <= 40.0) {
        const rawHz = Math.round(1000 / deltaMs);
        const hz = Math.min(2000, rawHz);

        if (hz > this.peakHz) {
          this.peakHz = hz;
        }

        const sample: PollingSample = {
          id: Math.random().toString(36).substring(2, 8),
          timestamp: now,
          deltaMs: parseFloat(deltaMs.toFixed(2)),
          hz,
          source,
          key,
        };

        this.samples.push(sample);
        if (this.samples.length > 200) {
          this.samples.shift();
        }

        if (this.isBenchmarking) {
          this.benchmarkSamples.push(sample);
        }
        this.notify();
      }
    }

    this.lastTimestamp = now;
  }

  public getSummary(): PollingRateSummary {
    const activePool = this.isBenchmarking && this.benchmarkSamples.length > 0 ? this.benchmarkSamples : this.samples;
    const count = activePool.length;

    if (count === 0) {
      return {
        currentHz: 0,
        peakHz: this.peakHz,
        avgHz: 0,
        sampleCount: 0,
        minIntervalMs: 0,
        maxIntervalMs: 0,
        jitterMs: 0,
        stabilityScore: 100,
        ratedTier: this.isBenchmarking ? 'Recording...' : 'Standby',
        distribution: { hz1000: 0, hz500: 0, hz250: 0, hz125: 0, other: 0 },
        isBenchmarking: this.isBenchmarking,
        benchmarkRemainingSec: this.benchmarkRemainingSec,
        benchmarkResult: this.benchmarkResult,
      };
    }

    const recent = activePool.slice(-5);
    const currentHz = Math.round(recent.reduce((sum, s) => sum + s.hz, 0) / recent.length);
    const avgHz = Math.round(activePool.reduce((sum, s) => sum + s.hz, 0) / count);

    const intervals = activePool.map((s) => s.deltaMs);
    const minIntervalMs = Math.min(...intervals);
    const maxIntervalMs = Math.max(...intervals);

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / count;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / count;
    const jitterMs = parseFloat(Math.sqrt(variance).toFixed(2));

    const dist = { hz1000: 0, hz500: 0, hz250: 0, hz125: 0, other: 0 };
    activePool.forEach((s) => {
      if (s.deltaMs <= 1.5) dist.hz1000++;
      else if (s.deltaMs <= 2.6) dist.hz500++;
      else if (s.deltaMs <= 5.0) dist.hz250++;
      else if (s.deltaMs <= 10.0) dist.hz125++;
      else dist.other++;
    });

    let ratedTier: '1000 Hz (1ms)' | '500 Hz (2ms)' | '250 Hz (4ms)' | '125 Hz (8ms)' | 'Measuring...' = 'Measuring...';
    if (dist.hz1000 >= count * 0.4 || avgHz >= 750) {
      ratedTier = '1000 Hz (1ms)';
    } else if (dist.hz500 >= count * 0.4 || avgHz >= 375) {
      ratedTier = '500 Hz (2ms)';
    } else if (dist.hz250 >= count * 0.4 || avgHz >= 180) {
      ratedTier = '250 Hz (4ms)';
    } else {
      ratedTier = '125 Hz (8ms)';
    }

    const stabilityScore = Math.max(10, Math.min(100, Math.round(100 - (jitterMs / (avgInterval || 1)) * 50)));

    return {
      currentHz,
      peakHz: Math.max(this.peakHz, ...activePool.map((s) => s.hz)),
      avgHz,
      sampleCount: count,
      minIntervalMs,
      maxIntervalMs,
      jitterMs,
      stabilityScore,
      ratedTier,
      distribution: dist,
      isBenchmarking: this.isBenchmarking,
      benchmarkRemainingSec: this.benchmarkRemainingSec,
      benchmarkResult: this.benchmarkResult,
    };
  }

  public getSamples(): PollingSample[] {
    return [...this.samples];
  }

  public startBenchmark(durationSec: number = 10) {
    if (this.isBenchmarking) return;

    this.isBenchmarking = true;
    this.benchmarkRemainingSec = durationSec;
    this.samples = [];
    this.benchmarkSamples = [];
    this.peakHz = 0;
    this.benchmarkResult = null;
    this.lastTimestamp = null;
    this.notify();

    this.benchmarkTimer = setInterval(() => {
      this.benchmarkRemainingSec--;
      if (this.benchmarkRemainingSec <= 0) {
        this.finishBenchmark();
      } else {
        this.notify();
      }
    }, 1000);
  }

  private finishBenchmark() {
    if (this.benchmarkTimer) {
      clearInterval(this.benchmarkTimer);
      this.benchmarkTimer = null;
    }

    this.isBenchmarking = false;
    this.benchmarkRemainingSec = 0;

    const count = this.benchmarkSamples.length;
    if (count > 5) {
      const hzList = this.benchmarkSamples.map((s) => s.hz);
      const intervals = this.benchmarkSamples.map((s) => s.deltaMs);
      const peakHz = Math.max(...hzList);
      const avgHz = Math.round(hzList.reduce((a, b) => a + b, 0) / count);
      const minIntervalMs = Math.min(...intervals);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / count;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / count;
      const jitterMs = parseFloat(Math.sqrt(variance).toFixed(2));
      const stabilityScore = Math.max(10, Math.min(100, Math.round(100 - (jitterMs / (avgInterval || 1)) * 50)));

      let ratedTier = '125 Hz';
      let grade: 'S' | 'A' | 'B' | 'C' = 'C';

      if (avgHz >= 800 || peakHz >= 950) {
        ratedTier = '1000 Hz Ultra Fast';
        grade = stabilityScore >= 80 ? 'S' : 'A';
      } else if (avgHz >= 400 || peakHz >= 480) {
        ratedTier = '500 Hz High Performance';
        grade = 'A';
      } else if (avgHz >= 200) {
        ratedTier = '250 Hz Standard';
        grade = 'B';
      }

      this.benchmarkResult = {
        peakHz,
        avgHz,
        totalSamples: count,
        stabilityScore,
        jitterMs,
        minIntervalMs,
        ratedTier,
        grade,
      };
    } else {
      this.benchmarkResult = {
        peakHz: 0,
        avgHz: 0,
        totalSamples: count,
        stabilityScore: 0,
        jitterMs: 0,
        minIntervalMs: 0,
        ratedTier: 'Insufficient Samples',
        grade: 'C',
      };
    }

    this.notify();
  }

  public resetAll() {
    if (this.benchmarkTimer) {
      clearInterval(this.benchmarkTimer);
      this.benchmarkTimer = null;
    }
    this.isBenchmarking = false;
    this.benchmarkRemainingSec = 0;
    this.benchmarkSamples = [];
    this.benchmarkResult = null;
    this.samples = [];
    this.peakHz = 0;
    this.lastTimestamp = null;
    this.notify();
  }

  public subscribe(fn: (summary: PollingRateSummary, samples: PollingSample[]) => void) {
    this.listeners.push(fn);
    fn(this.getSummary(), this.getSamples());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const summary = this.getSummary();
    const samples = this.getSamples();
    this.listeners.forEach((fn) => {
      try {
        fn(summary, samples);
      } catch {
        // Safe listener execution
      }
    });
  }
}

export const pollingRateService = new PollingRateService();

