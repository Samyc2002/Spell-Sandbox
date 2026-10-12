// Runs the real web-app discovery-sequence logic (the same code as
// apps/web/app/api/discovery/route.ts's runSequence, which calls
// spellbox/src/core/bulkMetricsGenerator directly) across 5 seed-anchors
// for 7 generation shapes, 30 re-rolls each. No numbers here are hand-derived.

import { writeFileSync } from "node:fs";
import { generateBulkMetrics } from "spellbox/src/core/bulkMetricsGenerator";

type NestingOrLinksType = "nesting" | "links";

type DiscoverySequenceConfig = {
  amount: number;
  nestingOrLinksType: NestingOrLinksType;
  nestingOrLinks: number;
  normalization: string;
  startSeed: number;
  runCount: number;
};

type DiscoveryRunResult = {
  runIndex: number;
  seed: number;
  total: number;
  newCount: number;
  discoveryRate: number;
  cumulativeUnique: number;
  cumulativeTotal: number;
  newValidCount: number;
  validTotal: number;
  discoveryRateValidOnly: number;
  cumulativeUniqueValid: number;
};

// Mirrors apps/web/app/api/discovery/route.ts's runSequence() exactly.
function runSequence(config: DiscoverySequenceConfig): DiscoveryRunResult[] {
  const { amount, nestingOrLinksType, nestingOrLinks, normalization, startSeed, runCount } = config;

  const seen = new Set<string>();
  const seenValid = new Set<string>();
  const runs: DiscoveryRunResult[] = [];
  let cumulativeTotal = 0;

  for (let i = 0; i < runCount; i++) {
    const seed = startSeed + i;
    const bulk = generateBulkMetrics(
      amount,
      nestingOrLinksType === "nesting" ? nestingOrLinks : 0,
      nestingOrLinksType === "links" ? nestingOrLinks : 0,
      normalization,
      seed,
    );

    let newCount = 0;
    let newValidCount = 0;
    let validTotal = 0;
    for (const record of bulk.spells) {
      if (!seen.has(record.signature)) {
        seen.add(record.signature);
        newCount++;
      }
      if (record.valid) {
        validTotal++;
        if (!seenValid.has(record.signature)) {
          seenValid.add(record.signature);
          newValidCount++;
        }
      }
    }

    const total = bulk.spells.length;
    cumulativeTotal += total;

    runs.push({
      runIndex: i + 1,
      seed,
      total,
      newCount,
      discoveryRate: total > 0 ? newCount / total : 0,
      cumulativeUnique: seen.size,
      cumulativeTotal,
      newValidCount,
      validTotal,
      discoveryRateValidOnly: validTotal > 0 ? newValidCount / validTotal : 0,
      cumulativeUniqueValid: seenValid.size,
    });
  }

  return runs;
}

const SHAPES: { key: string; type: NestingOrLinksType; depth: number }[] = [
  { key: "flat", type: "nesting", depth: 0 },
  { key: "nesting_5", type: "nesting", depth: 5 },
  { key: "nesting_10", type: "nesting", depth: 10 },
  { key: "nesting_20", type: "nesting", depth: 20 },
  { key: "links_5", type: "links", depth: 5 },
  { key: "links_10", type: "links", depth: 10 },
  { key: "links_20", type: "links", depth: 20 },
];

const SEED_ANCHORS = [1, 2, 3, 4, 5];
const AMOUNT = 1200;
const RUN_COUNT = 30;
const NORMALIZATION = "exponential";

const results: Record<string, DiscoveryRunResult[][]> = {};

for (const shape of SHAPES) {
  const perAnchor: DiscoveryRunResult[][] = [];
  for (const anchor of SEED_ANCHORS) {
    const startSeed = anchor * 1000;
    const runs = runSequence({
      amount: AMOUNT,
      nestingOrLinksType: shape.type,
      nestingOrLinks: shape.depth,
      normalization: NORMALIZATION,
      startSeed,
      runCount: RUN_COUNT,
    });
    perAnchor.push(runs);
  }
  results[shape.key] = perAnchor;
  console.error(`done: ${shape.key}`);
}

writeFileSync(
  "scripts_tmp/discovery_sweep_output.json",
  JSON.stringify(results, null, 2),
);
console.error("wrote scripts_tmp/discovery_sweep_output.json");
