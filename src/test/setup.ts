import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup, renderHook as rtlRenderHook } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend vitest matchers with jest-dom matchers
expect.extend(matchers);

// The vitest `Assertion` type augmentation for these matchers lives in
// src/test/globals.d.ts (via `@testing-library/jest-dom/vitest`), covering
// the full jest-dom matcher set rather than a hand-picked subset here.

// Expose renderHook globally for vitest globals mode
if (typeof globalThis !== 'undefined') {
  const global = globalThis as typeof globalThis & { renderHook: typeof rtlRenderHook };
  global.renderHook = rtlRenderHook;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(public callback: IntersectionObserverCallback) {}
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

// happy-dom reports a 0x0 layout size for every element (no real layout
// engine), so recharts' `ResponsiveContainer` (used by the analytics
// dashboard charts) never measures a usable size and renders nothing.
// Give every element a stand-in, non-zero bounding rect so chart
// components under test actually render their SVG content.
HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 600,
  height: 300,
  top: 0,
  left: 0,
  bottom: 300,
  right: 600,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

// Performance benchmarking helpers.
// Provides a consistent way to measure component render times across the
// suite and to assert against configured thresholds so regressions are
// caught in CI.

export interface RenderBenchmarkResult {
  /** Name of the benchmarked component. */
  name: string;
  /** Median render time in milliseconds. */
  medianMs: number;
  /** Minimum render time in milliseconds. */
  minMs: number;
  /** Maximum render time in milliseconds. */
  maxMs: number;
  /** Number of iterations performed. */
  iterations: number;
}

export interface RenderBenchmarkOptions {
  /** Number of warm-up renders excluded from the measurement. */
  warmUp?: number;
  /** Number of measured renders. */
  iterations?: number;
  /** Optional max render time threshold in ms for this component. */
  thresholdMs?: number;
}

/**
 * Measure the render time of a component across multiple iterations.
 * Returns statistics that can be compared against a baseline or threshold.
 */
export function benchmarkRender(
  name: string,
  render: () => void,
  options: RenderBenchmarkOptions = {},
): RenderBenchmarkResult {
  const { warmUp = 3, iterations = 10, thresholdMs } = options;

  for (let i = 0; i < warmUp; i++) {
    render();
  }

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    render();
    samples.push(performance.now() - start);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  const result: RenderBenchmarkResult = {
    name,
    medianMs: medianMs,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    iterations,
  };

  if (typeof thresholdMs === 'number') {
    expect(
      result.medianMs,
      `[${name}] median render time ${result.medianMs.toFixed(2)}ms exceeds threshold ${thresholdM}ms`,
    ).toBeLessThan(thresholdMs);
  }

  return result;
}

/**
 * Compare a benchmark result against a previously recorded baseline and
 * fail when the regression exceeds the allowed percentage.
 */
export function assertNoRegression(
  current: RenderBenchmarkResult,
  baseline: RenderBenchmarkResult,
  allowedRegressionPercent = 20,
): void {
  const allowedMax = baseline.medianMs * (1 + allowedRegressionPercent / 100);
  expect(
    current.medianMs,
    `[${current.name}] median ${current.medianMs.toFixed(2)}ms regressed from baseline ${baseline.medianMs.toFixed(2)}ms`,
  ).toBeLessThan(allowedMax);
}

// Expose benchmark helpers globally for vitest globals mode.
if (typeof globalThis !== 'undefined') {
  const global = globalThis as typeof globalThis & {
    benchmarkRender: typeof benchmarkRender;
    assertNoRegression: typeof assertNoRegression;
  };
  global.benchmarkRender = benchmarkRender;
  global.assertNoRegression = assertNoRegression;
}
