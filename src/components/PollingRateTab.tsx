import React, { useState, useEffect, useRef } from 'react';
import {
  pollingRateService,
  type PollingRateSummary,
  type PollingSample,
} from '../services/pollingRateService';
import {
  Activity,
  Zap,
  Gauge,
  RotateCcw,
  Play,
  ShieldCheck,
  BarChart2,
} from 'lucide-react';

export const PollingRateTab: React.FC = () => {
  const [summary, setSummary] = useState<PollingRateSummary>(pollingRateService.getSummary());
  const [samples, setSamples] = useState<PollingSample[]>(pollingRateService.getSamples());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [resizeKey, setResizeKey] = useState(0);

  // Resize listener to prevent canvas distortion
  useEffect(() => {
    const handleResize = () => setResizeKey((k) => k + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Activate polling service when this tab is active
  useEffect(() => {
    pollingRateService.setActive(true);
    const unsub = pollingRateService.subscribe((s, sam) => {
      setSummary(s);
      setSamples([...sam]);
    });

    return () => {
      pollingRateService.setActive(false);
      unsub();
    };
  }, []);

  // Draw smooth real-time latency scatter / timeline graph on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI & Responsive sizing: Match internal canvas pixel buffer to actual CSS container width
    const container = canvas.parentElement;
    const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(rect.width > 20 ? rect.width : 800);
    const displayHeight = 240;

    if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = '#181818';
    ctx.lineWidth = 1;

    // Guideline tiers: 1ms (1000Hz), 2ms (500Hz), 4ms (250Hz), 8ms (125Hz)
    // Max display range: 10ms
    const maxMs = 10;
    const getY = (ms: number) => {
      const clamped = Math.max(0, Math.min(maxMs, ms));
      return height - (clamped / maxMs) * (height - 32) - 16;
    };

    const tiers = [
      { ms: 1, label: '1 ms (1000 Hz)' },
      { ms: 2, label: '2 ms (500 Hz)' },
      { ms: 4, label: '4 ms (250 Hz)' },
      { ms: 8, label: '8 ms (125 Hz)' },
    ];

    tiers.forEach((t) => {
      const y = getY(t.ms);

      // Bright white dashed guideline for clear contrast against dark background
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Crisp bold white label text
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(t.label, 10, y - 5);
    });

    // If no samples yet, exit cleanly without drawing any placeholder text
    if (samples.length === 0) {
      ctx.restore();
      return;
    }

    // Connect line and scatter points
    const stepX = width / Math.max(30, samples.length);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 1.5;

    samples.forEach((s, idx) => {
      const x = idx * stepX + 6;
      const y = getY(s.deltaMs);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw individual data dots
    samples.forEach((s, idx) => {
      const x = idx * stepX + 6;
      const y = getY(s.deltaMs);

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);

      if (s.deltaMs <= 1.5) {
        ctx.fillStyle = '#22d3ee'; // 1000Hz
      } else if (s.deltaMs <= 2.5) {
        ctx.fillStyle = '#34d399'; // 500Hz
      } else if (s.deltaMs <= 5.0) {
        ctx.fillStyle = '#fbbf24'; // 250Hz
      } else {
        ctx.fillStyle = '#f43f5e'; // 125Hz
      }

      ctx.fill();
    });

    ctx.restore();
  }, [samples, resizeKey]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Keyboard Polling Rate & Latency Benchmark
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                Hardware Input Interval
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 ${
                  summary.isBenchmarking
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    summary.isBenchmarking ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                {summary.isBenchmarking
                  ? `Benchmarking (${summary.benchmarkRemainingSec}s)`
                  : 'Benchmark Standby'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Measure real-time USB polling rate, packet arrival jitter, and input response latency via WebHID. Press "Run 10s Benchmark" to begin testing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pollingRateService.resetAll()}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              disabled={summary.isBenchmarking}
              onClick={() => pollingRateService.startBenchmark(10)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                summary.isBenchmarking
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {summary.isBenchmarking
                  ? `Recording... (${summary.benchmarkRemainingSec}s)`
                  : 'Run 10s Benchmark'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Current Polling Rate */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>CURRENT RATE</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono">
              {summary.currentHz > 0 ? summary.currentHz : '---'}
            </span>
            <span className="text-xs text-cyan-400 font-mono font-bold">Hz</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Tier: <span className="text-zinc-300 font-semibold">{summary.ratedTier}</span>
          </div>
        </div>

        {/* Card 2: Peak Polling Rate */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>PEAK FREQUENCY</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-300 font-mono">
              {summary.peakHz > 0 ? summary.peakHz : '---'}
            </span>
            <span className="text-xs text-amber-400 font-mono font-bold">Hz</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Fastest Delta: <span className="text-zinc-300 font-mono font-semibold">{summary.minIntervalMs > 0 ? `${summary.minIntervalMs} ms` : '---'}</span>
          </div>
        </div>

        {/* Card 3: Average Polling Rate */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>AVERAGE RATE</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {summary.avgHz > 0 ? summary.avgHz : '---'}
            </span>
            <span className="text-xs text-emerald-400 font-mono font-bold">Hz</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Samples: <span className="text-zinc-300 font-mono">{summary.sampleCount}</span>
          </div>
        </div>

        {/* Card 4: Jitter & Stability */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>STABILITY & JITTER</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-purple-300 font-mono">
              {summary.sampleCount > 2 ? `${summary.stabilityScore}%` : '---'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Deviation: <span className="text-zinc-300 font-mono">{summary.jitterMs > 0 ? `±${summary.jitterMs} ms` : '---'}</span>
          </div>
        </div>
      </div>

      {/* Benchmark Result Card (If Benchmark Completed) */}
      {summary.benchmarkResult && (
        <div className="bg-[#12161b] border border-cyan-800/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xl font-mono">
              {summary.benchmarkResult.grade}
            </div>
            <div>
              <div className="text-xs text-cyan-400 font-mono uppercase tracking-wider font-bold">
                Benchmark Scorecard Verified
              </div>
              <div className="text-base font-bold text-white">
                Rated Tier: {summary.benchmarkResult.ratedTier}
              </div>
              <div className="text-xs text-zinc-400">
                Peak: <span className="text-white font-mono">{summary.benchmarkResult.peakHz} Hz</span> | Avg: <span className="text-white font-mono">{summary.benchmarkResult.avgHz} Hz</span> | Stability: <span className="text-white font-mono">{summary.benchmarkResult.stabilityScore}%</span>
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-zinc-400">
            <div>Samples: <span className="text-cyan-300 font-bold">{summary.benchmarkResult.totalSamples}</span></div>
            <div>Jitter: <span className="text-cyan-300">±{summary.benchmarkResult.jitterMs} ms</span></div>
          </div>
        </div>
      )}

      {/* Real-time Latency Timeline / Scatter Graph */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Input Interval Timeline (ms)</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Points closer to 1 ms represent 1000 Hz USB polling speed.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-zinc-400">1000 Hz (&lt;=1.5ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">500 Hz (~2ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-zinc-400">250 Hz (~4ms)</span>
            </div>
          </div>
        </div>

        {/* Canvas Element */}
        <div className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl overflow-hidden p-3">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '240px' }}
            className="w-full block"
          />
        </div>
      </div>

      {/* Packet Inspector & Live Events Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Breakdown */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Interval Distribution
          </h4>
          <div className="space-y-2 text-xs font-mono">
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span className="text-cyan-400">1000 Hz (&lt;=1.5ms)</span>
                <span>{summary.distribution.hz1000}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${summary.sampleCount > 0 ? (summary.distribution.hz1000 / summary.sampleCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span className="text-emerald-400">500 Hz (~2ms)</span>
                <span>{summary.distribution.hz500}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${summary.sampleCount > 0 ? (summary.distribution.hz500 / summary.sampleCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span className="text-amber-400">250 Hz (~4ms)</span>
                <span>{summary.distribution.hz250}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${summary.sampleCount > 0 ? (summary.distribution.hz250 / summary.sampleCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span className="text-rose-400">125 Hz (~8ms)</span>
                <span>{summary.distribution.hz125}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 transition-all duration-300"
                  style={{
                    width: `${summary.sampleCount > 0 ? (summary.distribution.hz125 / summary.sampleCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-900 text-[11px] text-zinc-500 leading-normal">
            Tip: For optimal results, press multiple keys simultaneously or spin the rotary knob rapidly to generate a continuous high-frequency packet stream.
          </div>
        </div>

        {/* Live Packet Feed Table */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#222222] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Recent Packet Feed (Latest 8)
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">
              Live Buffer
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-[11px]">
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Key / Action</th>
                  <th className="pb-2">Interval</th>
                  <th className="pb-2">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {samples.slice(-8).reverse().map((sample) => (
                  <tr key={sample.id} className="text-zinc-300 hover:bg-[#161616] transition-colors">
                    <td className="py-1.5 text-zinc-500 uppercase text-[10px]">
                      {sample.source}
                    </td>
                    <td className="py-1.5 font-bold text-white">
                      {sample.key || 'Packet'}
                    </td>
                    <td className="py-1.5 text-cyan-400 font-semibold">
                      {sample.deltaMs} ms
                    </td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sample.hz >= 750
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40'
                          : sample.hz >= 375
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {sample.hz} Hz
                      </span>
                    </td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-600">
                      No packet data recorded yet. Press any keys to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
