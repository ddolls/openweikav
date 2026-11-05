import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Timer,
  Type,
  Quote,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  Award,
  Globe,
  Hash,
} from 'lucide-react';
import {
  QUOTES_DATABASE,
  getCoherentWords,
} from '../data/typingWords';
import { soundService, SOUND_PROFILES, type SoundState } from '../services/soundService';

type TestMode = 'time' | 'words' | 'quote' | 'zen';
type Language = 'indonesian' | 'english';

interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  totalKeystrokes: number;
  timeSeconds: number;
  mode: TestMode;
  modeVal: string | number;
  language: Language;
  weakKeys: { char: string; errors: number; total: number }[];
  missedWords: string[];
}

export const TypingTestTab: React.FC = () => {
  // Test Configuration
  const [mode, setMode] = useState<TestMode>('time');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [wordCount, setWordCount] = useState<number>(25);
  const [language, setLanguage] = useState<Language>('english');
  const [hasPunctuation, setHasPunctuation] = useState<boolean>(false);
  const [hasNumbers, setHasNumbers] = useState<boolean>(false);

  // Sound Engine State
  const [soundState, setSoundState] = useState<SoundState>(soundService.getState());
  const [isSoundMenuOpen, setIsSoundMenuOpen] = useState<boolean>(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Close sound menu when clicking outside
  useEffect(() => {
    if (!isSoundMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
        setIsSoundMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSoundMenuOpen]);

  // Engine State
  const [words, setWords] = useState<string[]>([]);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [testState, setTestState] = useState<'idle' | 'running' | 'finished'>('idle');

  // Timer & Metrics
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);

  // Keystroke Heatmap Tracking
  const charStatsRef = useRef<Map<string, { total: number; errors: number }>>(new Map());
  const totalKeystrokesRef = useRef<number>(0);
  const correctKeystrokesRef = useRef<number>(0);
  const incorrectKeystrokesRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DOM & Timing references
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);

  // Auto-scroll words container so active line is always comfortably visible without vertical clipping
  useEffect(() => {
    if (!wordsContainerRef.current || !activeWordRef.current) return;
    const container = wordsContainerRef.current;
    const activeEl = activeWordRef.current;

    const wordTop = activeEl.offsetTop;
    const wordHeight = activeEl.offsetHeight || 44;

    // When the active word is on line 2 or deeper, scroll smoothly so active line is in the middle
    if (wordTop > wordHeight * 0.8) {
      container.scrollTo({
        top: wordTop - wordHeight - 6,
        behavior: 'smooth',
      });
    } else {
      container.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [activeWordIdx]);

  // Subscribe to sound service
  useEffect(() => {
    return soundService.subscribe((s) => setSoundState(s));
  }, []);



  // Generate words for test
  const generateTestWords = useCallback(
    (customWordList?: string[]) => {
      if (customWordList && customWordList.length > 0) {
        setWords(customWordList);
        return;
      }

      if (mode === 'quote') {
        const matchingQuotes = QUOTES_DATABASE.filter((q) => q.language === language);
        const quotePool = matchingQuotes.length > 0 ? matchingQuotes : QUOTES_DATABASE;
        const selectedQuote = quotePool[Math.floor(Math.random() * quotePool.length)];
        setWords(selectedQuote.text.trim().split(/\s+/));
        return;
      }

      // Generate natural, grammatically coherent sentences for both languages
      const needed = mode === 'words' ? wordCount : Math.max(120, timeLimit * 3);
      const coherentWords = getCoherentWords(language, needed, hasPunctuation, hasNumbers);
      setWords(coherentWords);
    },
    [mode, wordCount, timeLimit, language, hasPunctuation, hasNumbers]
  );

  // Initialize or reset test
  const startNewTest = useCallback(
    (practiceWords?: string[]) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setTestState('idle');
      setActiveWordIdx(0);
      setCurrentInput('');
      setHistory([]);
      setElapsedSeconds(0);
      setRemainingSeconds(timeLimit);
      setWpmHistory([]);
      setResult(null);
      startTimeRef.current = null;

      charStatsRef.current.clear();
      totalKeystrokesRef.current = 0;
      correctKeystrokesRef.current = 0;
      incorrectKeystrokesRef.current = 0;

      generateTestWords(practiceWords);

      if (wordsContainerRef.current) {
        wordsContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }

      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 50);
    },
    [timeLimit, generateTestWords]
  );

  // Initialize words on config change
  useEffect(() => {
    startNewTest();
  }, [mode, timeLimit, wordCount, language, hasPunctuation, hasNumbers, startNewTest]);

  // Compute live metrics on every keystroke and timer tick
  const liveMetrics = useMemo(() => {
    if (testState !== 'running' || !startTimeRef.current) {
      return { wpm: 0, rawWpm: 0, acc: 100 };
    }

    const now = Date.now();
    const elapsedSec = Math.max(0.8, (now - startTimeRef.current) / 1000);
    const minutes = elapsedSec / 60;
    const totalCorrectChars = correctKeystrokesRef.current;
    const totalChars = totalKeystrokesRef.current;

    const wpm = Math.round(totalCorrectChars / 5 / minutes) || 0;
    const rawWpm = Math.round(totalChars / 5 / minutes) || 0;
    const acc = totalChars > 0 ? Math.round((totalCorrectChars / totalChars) * 100) : 100;

    return { wpm, rawWpm, acc };
  }, [testState, elapsedSeconds, activeWordIdx, currentInput]);

  // Finish test and compute analytics
  const finishTest = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setTestState('finished');

    const duration = mode === 'time'
      ? timeLimit
      : Math.max(1, startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : elapsedSeconds);
    const minutes = duration / 60;

    let correctChars = 0;
    let incorrectChars = 0;
    let extraChars = 0;
    let missedChars = 0;
    const missedWords: string[] = [];

    words.forEach((targetWord, wIdx) => {
      const typed = wIdx < activeWordIdx ? history[wIdx] || '' : wIdx === activeWordIdx ? currentInput : '';

      if (wIdx < activeWordIdx || (wIdx === activeWordIdx && typed.length > 0)) {
        let wordHasError = false;
        for (let i = 0; i < targetWord.length; i++) {
          if (i >= typed.length) {
            missedChars++;
            wordHasError = true;
          } else if (typed[i] === targetWord[i]) {
            correctChars++;
          } else {
            incorrectChars++;
            wordHasError = true;
          }
        }
        if (typed.length > targetWord.length) {
          extraChars += typed.length - targetWord.length;
          wordHasError = true;
        }
        if (wordHasError) {
          missedWords.push(targetWord);
        }
      } else {
        missedChars += targetWord.length;
      }
    });

    // Space characters for completed words
    correctChars += Math.max(0, activeWordIdx);

    const totalKey = totalKeystrokesRef.current;
    const finalWpm = Math.round(correctChars / 5 / minutes) || 0;
    const finalRaw = Math.round((correctChars + incorrectChars + extraChars) / 5 / minutes) || 0;
    const finalAcc = totalKey > 0 ? Math.round((correctChars / totalKey) * 100) : 100;

    // Consistency score from second-by-second WPM history
    let consistency = 85;
    if (wpmHistory.length > 2) {
      const avg = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
      const variance = wpmHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / wpmHistory.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(10, Math.min(100, Math.round(100 - (stdDev / (avg || 1)) * 100)));
    }

    // Weakest keys from heatmap stats
    const weakList: { char: string; errors: number; total: number }[] = [];
    charStatsRef.current.forEach((val, char) => {
      if (val.errors > 0) {
        weakList.push({ char, errors: val.errors, total: val.total });
      }
    });
    weakList.sort((a, b) => b.errors - a.errors);

    setResult({
      wpm: finalWpm,
      rawWpm: finalRaw,
      accuracy: finalAcc,
      consistency,
      correctChars,
      incorrectChars,
      extraChars,
      missedChars,
      totalKeystrokes: totalKey,
      timeSeconds: duration,
      mode,
      modeVal: mode === 'time' ? `${timeLimit}s` : mode === 'words' ? `${wordCount} words` : mode,
      language,
      weakKeys: weakList.slice(0, 5),
      missedWords: Array.from(new Set(missedWords)),
    });
  }, [mode, timeLimit, elapsedSeconds, words, activeWordIdx, history, currentInput, wpmHistory, language, wordCount]);

  // Stable ref for finishTest so timer interval is never torn down on keystroke
  const finishTestRef = useRef(finishTest);
  finishTestRef.current = finishTest;

  // Tick timer & countdown (completely decoupled from keystrokes)
  useEffect(() => {
    if (testState === 'running') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // 250ms cadence for responsive, stutter-free countdown and metrics
      timerIntervalRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const now = Date.now();
        const totalElapsedSec = (now - startTimeRef.current) / 1000;
        const wholeSec = Math.floor(totalElapsedSec);

        setElapsedSeconds(wholeSec);

        if (mode === 'time') {
          const rem = Math.max(0, timeLimit - wholeSec);
          setRemainingSeconds(rem);
          if (rem <= 0) {
            finishTestRef.current();
          }
        }
      }, 250);

      // Track second-by-second WPM for consistency graph
      const wpmTracker = setInterval(() => {
        if (!startTimeRef.current) return;
        const mins = Math.max(0.05, (Date.now() - startTimeRef.current) / 60000);
        const currentWpm = Math.round(correctKeystrokesRef.current / 5 / mins) || 0;
        setWpmHistory((hist) => [...hist, currentWpm]);
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        clearInterval(wpmTracker);
      };
    }
  }, [testState, mode, timeLimit]);

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (testState === 'finished') {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        startNewTest();
      }
      return;
    }

    // Start test on first valid alphanumeric or punctuation key
    if (testState === 'idle') {
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
        soundService.init();
        startTimeRef.current = Date.now();
        setTestState('running');
      }
    }

    const targetWord = words[activeWordIdx] || '';

    // Spacebar: advance to next word
    if (e.key === ' ') {
      e.preventDefault();
      if (currentInput.trim().length === 0) return;

      const isExactMatch = currentInput === targetWord;
      soundService.playKeypress(!isExactMatch);

      totalKeystrokesRef.current++;
      if (isExactMatch) {
        correctKeystrokesRef.current++;
      } else {
        incorrectKeystrokesRef.current++;
      }

      setHistory((prev) => [...prev, currentInput]);
      setCurrentInput('');

      // Dynamically refill coherent sentences in time mode so fast typists never run out
      if (mode === 'time' && activeWordIdx >= words.length - 12) {
        const moreWords = getCoherentWords(language, 60, hasPunctuation, hasNumbers);
        setWords((prev) => [...prev, ...moreWords]);
      }

      // Check test completion for words mode or end of word list
      if (activeWordIdx + 1 >= words.length) {
        finishTest();
      } else {
        setActiveWordIdx((prev) => prev + 1);
      }
      return;
    }

    // Backspace handling
    if (e.key === 'Backspace') {
      soundService.playKeypress(false);
      if (currentInput.length > 0) {
        if (e.ctrlKey) {
          // Ctrl+Backspace deletes entire current word input
          setCurrentInput('');
        } else {
          setCurrentInput((prev) => prev.slice(0, -1));
        }
      } else if (activeWordIdx > 0) {
        // Step back into previous word to allow correcting mistyped characters!
        const prevIdx = activeWordIdx - 1;
        const prevTyped = history[prevIdx] || '';
        setActiveWordIdx(prevIdx);
        setCurrentInput(prevTyped);
        setHistory((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Single character typing
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const char = e.key;
      const targetChar = targetWord[currentInput.length];
      const isCorrect = char === targetChar;

      // Play synthesized mechanical switch audio
      soundService.playKeypress(!isCorrect);

      totalKeystrokesRef.current++;
      if (isCorrect) {
        correctKeystrokesRef.current++;
      } else {
        incorrectKeystrokesRef.current++;
      }

      // Record heatmap stats
      const keyStat = charStatsRef.current.get(char) || { total: 0, errors: 0 };
      keyStat.total++;
      if (!isCorrect) keyStat.errors++;
      charStatsRef.current.set(char, keyStat);

      const nextInput = currentInput + char;
      setCurrentInput(nextInput);

      // In quote or zen mode, auto advance if last character matches
      if (mode === 'quote' && activeWordIdx === words.length - 1 && nextInput === targetWord) {
        setHistory((prev) => [...prev, nextInput]);
        finishTest();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Intro Banner (overflow-visible to prevent sound dropdown clipping) */}
      <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                Speed &amp; Accuracy Benchmark
              </span>
              <span className="text-xs text-zinc-500 font-mono">100% Offline Benchmark</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              <span>Typing Test</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Measure your raw typing velocity, consistency, and keystroke accuracy on your Weikav WK75. Features real-time mechanical switch sound synthesis, live WPM calculations, and key heatmap analytics.
            </p>
          </div>

          {/* Sound Pack Quick Selector */}
          <div ref={soundMenuRef} className="relative">
            <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => soundService.setEnabled(!soundState.enabled)}
                title={soundState.enabled ? 'Mute Mechanical Switch Audio' : 'Enable Mechanical Switch Audio'}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                {soundState.enabled && soundState.soundType !== 'off' ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsSoundMenuOpen(!isSoundMenuOpen)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-zinc-400 text-[11px]">Sound:</span>
                <span className="font-bold text-white capitalize">{soundState.soundType}</span>
                <Sliders className="w-3 h-3 text-zinc-400 ml-0.5" />
              </button>
            </div>

            {/* Sound Profile Dropdown Popup */}
            {isSoundMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 bg-[#121212] border border-[#2b2b2b] rounded-xl shadow-2xl p-3 space-y-2">
                <div className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider px-1">
                  Mechanical Sound Profile
                </div>
                <div className="space-y-1">
                  {SOUND_PROFILES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        soundService.setSoundType(p.id);
                        setIsSoundMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex flex-col cursor-pointer ${
                        soundState.soundType === p.id
                          ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-200'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{p.label}</span>
                        {soundState.soundType === p.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">{p.description}</span>
                    </button>
                  ))}
                </div>

                {/* Volume Slider */}
                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Volume</span>
                    <span className="font-mono">{Math.round(soundState.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundState.volume}
                    onChange={(e) => soundService.setVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Config Bar (Time, Words, Language, Punctuation) */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Punctuation & Numbers Toggles */}
          <button
            type="button"
            onClick={() => setHasPunctuation(!hasPunctuation)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              hasPunctuation
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>punctuation</span>
          </button>

          <button
            type="button"
            onClick={() => setHasNumbers(!hasNumbers)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              hasNumbers
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Hash className="w-3 h-3" />
            <span>numbers</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          {/* Test Modes */}
          <button
            type="button"
            onClick={() => setMode('time')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'time'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Timer className="w-3 h-3" />
            <span>time</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('words')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'words'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span>words</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('quote')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'quote'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Quote className="w-3 h-3" />
            <span>quote</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('zen')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'zen'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#181818] border-[#282828] text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>zen</span>
          </button>
        </div>

        {/* Sub Config: Time or Words count */}
        <div className="flex items-center gap-1.5">
          {mode === 'time' && (
            <div className="flex items-center gap-1 bg-[#161616] border border-[#242424] rounded-lg p-0.5">
              {[15, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimeLimit(sec)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    timeLimit === sec
                      ? 'bg-cyan-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}

          {mode === 'words' && (
            <div className="flex items-center gap-1 bg-[#161616] border border-[#242424] rounded-lg p-0.5">
              {[10, 25, 50, 100].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setWordCount(cnt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    wordCount === cnt
                      ? 'bg-cyan-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-[#161616] border border-[#242424] rounded-lg p-0.5 ml-1">
            <Globe className="w-3 h-3 text-zinc-500 ml-1.5" />
            {(['indonesian', 'english'] as Language[]).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  language === lng
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lng === 'indonesian' ? 'ID' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Typing View OR Results Screen */}
      {testState !== 'finished' ? (
        <div
          onClick={() => hiddenInputRef.current?.focus()}
          className="bg-[#111111] border border-[#222222] hover:border-zinc-700 rounded-2xl p-8 min-h-[340px] flex flex-col justify-between cursor-text relative transition-all shadow-xl"
        >
          {/* Hidden real input field for smooth keystroke capture */}
          <input
            ref={hiddenInputRef}
            type="text"
            value={currentInput}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Live HUD Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-900 font-mono text-sm text-zinc-400">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 text-xs uppercase font-bold">Time:</span>
                <span className="text-lg font-black text-cyan-400">
                  {mode === 'time' ? `${remainingSeconds}s` : `${elapsedSeconds}s`}
                </span>
              </div>

              {testState === 'running' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs uppercase font-bold">Live WPM:</span>
                    <span className="text-lg font-black text-white">{liveMetrics.wpm}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs uppercase font-bold">Accuracy:</span>
                    <span className="text-lg font-black text-emerald-400">{liveMetrics.acc}%</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-zinc-600 font-mono hidden sm:block">
              {testState === 'idle' ? 'Start typing to begin' : 'Type space to submit word'}
            </div>
          </div>

          {/* Words Matrix Container */}
          <div
            ref={wordsContainerRef}
            className="my-6 h-[142px] sm:h-[152px] overflow-hidden leading-relaxed font-mono text-xl sm:text-2xl select-none flex flex-wrap content-start gap-x-3.5 gap-y-2.5 relative scroll-smooth"
          >
            {words.map((word, wIdx) => {
              const isPast = wIdx < activeWordIdx;
              const isCurrent = wIdx === activeWordIdx;
              const typedSoFar = isPast ? history[wIdx] || '' : isCurrent ? currentInput : '';

              return (
                <div
                  key={`${word}-${wIdx}`}
                  ref={isCurrent ? activeWordRef : undefined}
                  className={`relative flex items-center transition-opacity duration-150 ${
                    wIdx > activeWordIdx + 20 ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  {word.split('').map((char, cIdx) => {
                    let charColor = 'text-zinc-600'; // Default untyped
                    let underline = false;

                    if (cIdx < typedSoFar.length) {
                      if (typedSoFar[cIdx] === char) {
                        charColor = 'text-white font-semibold'; // Correct
                      } else {
                        charColor = 'text-rose-500 font-bold'; // Incorrect
                        underline = true;
                      }
                    }

                    return (
                      <span
                        key={cIdx}
                        className={`relative ${charColor} ${underline ? 'underline decoration-rose-500' : ''}`}
                      >
                        {/* Caret positioning */}
                        {isCurrent && cIdx === typedSoFar.length && (
                          <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-cyan-400 animate-pulse z-10 shadow-[0_0_8px_#22d3ee]" />
                        )}
                        {char}
                      </span>
                    );
                  })}

                  {/* Render extra erroneous characters */}
                  {typedSoFar.length > word.length &&
                    typedSoFar
                      .slice(word.length)
                      .split('')
                      .map((extraChar, eIdx) => (
                        <span key={`extra-${eIdx}`} className="text-rose-700 opacity-90 line-through text-lg">
                          {extraChar}
                        </span>
                      ))}

                  {/* Caret at the end of word */}
                  {isCurrent && typedSoFar.length >= word.length && (
                    <span className="w-[2px] h-6 bg-cyan-400 animate-pulse ml-0.5 shadow-[0_0_8px_#22d3ee]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => startNewTest()}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Test</span>
            </button>

            <span className="text-[11px] font-mono text-zinc-600">
              Shortcut: press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Tab</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Enter</kbd> to restart
            </span>
          </div>
        </div>
      ) : (
        /* Results View */
        result && (
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8 space-y-8 shadow-2xl">
            {/* Main KPI Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#161616] border border-[#262626] rounded-xl p-5 space-y-1">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Typing Speed</span>
                  <Award className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-4xl font-black text-cyan-400 tracking-tight">
                  {result.wpm} <span className="text-base font-normal text-zinc-500">WPM</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  Raw Speed: <span className="text-white font-bold">{result.rawWpm}</span> WPM
                </div>
              </div>

              <div className="bg-[#161616] border border-[#262626] rounded-xl p-5 space-y-1">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Accuracy</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-4xl font-black text-emerald-400 tracking-tight">
                  {result.accuracy}%
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  {result.correctChars} correct / {result.incorrectChars + result.extraChars} errors
                </div>
              </div>

              <div className="bg-[#161616] border border-[#262626] rounded-xl p-5 space-y-1">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Consistency</span>
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-4xl font-black text-purple-400 tracking-tight">
                  {result.consistency}%
                </div>
                <div className="text-xs text-zinc-400 font-mono">Keystroke rhythm variance</div>
              </div>

              <div className="bg-[#161616] border border-[#262626] rounded-xl p-5 space-y-1">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Test Type</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white capitalize mt-2">
                  {result.mode} {result.modeVal}
                </div>
                <div className="text-xs text-zinc-400 font-mono capitalize">
                  Language: {result.language}
                </div>
              </div>
            </div>

            {/* Character Analysis Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Character Details Breakdown */}
              <div className="bg-[#151515] border border-[#242424] rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Character Breakdown
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-lg font-bold text-emerald-400">{result.correctChars}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Correct</div>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-lg font-bold text-rose-400">{result.incorrectChars}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Incorrect</div>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-lg font-bold text-amber-400">{result.extraChars}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Extra</div>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="text-lg font-bold text-zinc-400">{result.missedChars}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Missed</div>
                  </div>
                </div>
              </div>

              {/* Weakest Key Heatmap Alert */}
              <div className="bg-[#151515] border border-[#242424] rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                  <span>Weakest Keys (Error Rates)</span>
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                </h4>
                {result.weakKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.weakKeys.map((item) => (
                      <div
                        key={item.char}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-xs font-mono flex items-center gap-2"
                      >
                        <span className="font-bold text-white bg-rose-900/60 px-1.5 py-0.5 rounded">
                          {item.char === ' ' ? 'Space' : item.char}
                        </span>
                        <span className="text-[11px] text-rose-300">
                          {item.errors} error{item.errors > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-mono py-2">
                    Clean run with zero character mistypes.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-900">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startNewTest()}
                  className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Next Test</span>
                </button>

                {result.missedWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => startNewTest(result.missedWords)}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Practice Missed Words ({result.missedWords.length})</span>
                  </button>
                )}
              </div>

              <span className="text-xs text-zinc-500 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Tab</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Enter</kbd> to restart immediately
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
};

