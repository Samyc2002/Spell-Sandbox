// Runs the real web-app generator (same runConfig used by apps/web/lib/batch.ts)
// for the amount-of-spells sweep, single seed 12345, matching the shape of
// compiled-analysis.md's Section 1 table (nesting=4/links=0 and nesting=0/links=4
// and the flat 0/0 baseline), across all 3 normalizations.

import { writeFileSync } from "node:fs";
import { runConfig, type BatchConfig } from "../lib/batch";

const AMOUNTS = [12, 120, 1200, 12000, 120000];
const NORMALIZATIONS = ["sigmoid", "exponential", "arctan"];
const SEED = "12345";

type Row = {
  amount: number;
  normalization: string;
  maxNesting: number;
  maxLinking: number;
  validityPct: number;
  uniquenessRatio: number;
  avgRawScore: number;
  avgComplexityScore: number;
  highestTier: string;
};

function highestTierFromCounts(tierCounts: number[], tierLabels: string[]): string {
  let maxIdx = 0;
  for (let i = 0; i < tierCounts.length; i++) {
    if (tierCounts[i] > tierCounts[maxIdx]) maxIdx = i;
  }
  return tierLabels[maxIdx] ?? "—";
}

const DEFAULT_TIER_LABELS = ["Novice", "Apprentice", "Adept", "Master"];

function runShape(maxNesting: number, maxLinking: number): Row[] {
  const rows: Row[] = [];
  for (const normalization of NORMALIZATIONS) {
    for (const amount of AMOUNTS) {
      const config: BatchConfig = {
        id: "x",
        amount: String(amount),
        nestingOrLinksType: maxNesting > 0 ? "nesting" : "links",
        nestingOrLinks: String(maxNesting > 0 ? maxNesting : maxLinking),
        normalization,
        seed: SEED,
      };
      const { metrics } = runConfig(config);
      const validityPct = metrics.total > 0 ? (metrics.valid / metrics.total) * 100 : 0;
      const uniquenessRatio = metrics.total > 0 ? metrics.unique / metrics.total : 0;
      rows.push({
        amount,
        normalization,
        maxNesting: metrics.maxNesting,
        maxLinking: metrics.maxLinks,
        validityPct,
        uniquenessRatio,
        avgRawScore: metrics.avgRawScore,
        avgComplexityScore: metrics.avgScore,
        highestTier: highestTierFromCounts(metrics.tierCounts, DEFAULT_TIER_LABELS),
      });
    }
  }
  return rows;
}

const originalInfo = console.info;
console.info = () => {};

const nestingShapeRows = runShape(4, 0);
const linkingShapeRows = runShape(0, 4);
const flatShapeRows = runShape(0, 0);

console.info = originalInfo;

writeFileSync(
  "scripts_tmp/amount_sweep_output.json",
  JSON.stringify({ nestingShapeRows, linkingShapeRows, flatShapeRows }, null, 2),
);
console.error("wrote scripts_tmp/amount_sweep_output.json");
