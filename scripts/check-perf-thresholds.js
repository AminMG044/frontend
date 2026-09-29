#!/usr/bin/env node
/**
 * Performance threshold gate for component render benchmarks.
 *
 * Reads the Vitest benchmark JSON report (benchmark.json), compares each
 * component's mean render time against the thresholds defined in
 * src/test/benchmarks/component-benchmarks.bench.tsx, and fails the build
 * when a component exceeds its budget or when a regression is detected
 * against the committed baseline.
 *
 * Usage:
 *   node scripts/check-perf-thresholds.js [report.json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPORT = path.join(ROOT, 'benchmark.json');
const BASELINE_FILE = path.join(ROOT, 'src', 'test', 'benchmarks', 'baseline.json');

const reportPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_REPORT;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    return null;
  }
}

// Vitest benchmark reports are an array of { name, hz, mean, min, max, samples }
// or an object with a `files` array of { group, benchmarks }. Normalise both.
function normalizeReport(report) {
  const results = [];
  if (!report) return results;

  if (Array.isArray(report)) {
    for (const entry of report) {
      if (entry && typeof entry.name === 'string') {
        results.push({
          name: entry.name,
          mean: numberOrDefault(entry.mean),
          hz : numberOrDefault(entry.hz || entry.ops),
        });
      }
    }
    return results;
  }

  const files = Array.isArray(report.files) ? report.files : [];
  for (const file of files) {
    const benchmarks = Array.isArray(file.benchmarks) ? file.benchmarks : [];
    for (const b of benchmarks) {
      if (!b || typeof b.name !== 'string') continue;
      results.push({
        name: b.name,
        mean: numberOrDefault(b.mean || b.average),
        hz: numberOrDefault(b.hz || b.ops),
      });
    }
  }
  return results;
}

function numberOrDefault(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMs(ms) {
  return `${ms.toFixed(3)}ms`;
}

const report = readJson(reportPath);
if (!report) {
  console.error(`[perf] Benchmark report not found at ${reportPath}`);
  console.error('[perf] Run `npm run bench` first to generate the report.');
  process.exit(1);
}

const measurements = normalizeReport(report);
if (measurements.length === 0) {
  console.error('[perf] No benchmark measurements found in the report.');
  process.exit(1);
}

// Thresholds are duplicated here in JS form so the gate can run without a
// TypeScript transpile step. Keep in sync with PERF_THRESHOLDS in
// src/test/benchmarks/component-benchmarks.bench.tsx.
const THRESHOLDS = {
  Button: 5,
  Card: 5,
  Input: 5,
  Label: 3,
  Badge: 3,
  Avatar: 5,
  LoadingSpinner: 5,
  Skeleton: 5,
  EmptyState: 8,
  ErrorMessage: 5,
  CreatorVerificationBadge: 5,
  SupporterBadge: 5,
  SubscriberBadge: 5,
  CreatorBio: 10,
  CreatorPortfolio: 15,
  CreatorSearchBar: 10,
  DorisioButton: 5,
  TransactionFilterBar: 15,
  TipSourceBreakdown: 20,
  TopTippersTable: 25,
  SupporterLeaderboard: 25,
  AnalyticsSummaryCards: 20,
  AnalyticsDateRangePicker: 15,
  EarningsTrendChart: 30,
  SubscriptionTiers: 20,
  SubscriptionManagement: 20,
  SubscriptionSettings: 20,
};

// Allowed regression ratio before the gate fails. 1.25 = 25% slower than
// the baseline is considered a regression.
const REGRESSION_RATIO = 1.25;

const baseline = readJson(BASELINE_FILE) || {};

const failures = [];
console.log('[perf] Component render benchmark results:');

for (const m of measurements) {
  const threshold = THRESHOLDS[m.name];
  const base = baseline[m.name];
  const parts = [`${m.name}: mean ${formatMs(m.mean)}`];

  if (typeof threshold === 'number') {
    parts.push(`threshold ${formatMs(threshold)}`);
    if (m.mean > threshold) {
      failures.push(
        `${m.name} exceeded threshold: ${formatMs(m.mean)} > ${formatMs(threshold)}`,
      );
    }
  } else {
    parts.push('no threshold defined');
  }

  if (typeof base === 'number' && base > 0) {
    const ratio = m.mean / base;
    parts.push(`baseline ${formatMs(base)} (${ratio.toFixed(2)}x)`);
    if (ratio > REGRESSION_RATIO) {
      failures.push(
        `${m.name} regressed: ${formatMs(m.mean)} is ${ratio.toFixed(2)}x the baseline ${formatMs(base)}`,
      );
    }
  }

  console.log(`[perf]   ${parts.join(' | ')}`);
}

if (failures.length > 0) {
  console.error('');
  console.error('[perf] Performance gate failed:');
  for (const f of failures) console.error(`[perf]   - ${f}`);
  process.exit(1);
}

console.log('');
console.log('[perf] All component render benchmarks passed.');
