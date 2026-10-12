// Runs the real web-app generator (apps/web/lib/batch.ts's runConfig, which
// calls spellbox/src/core/bulkMetricsGenerator directly, same as the web UI)
// across 5 seeds for the nesting and linking depth sweeps, and writes raw
// JSON output. No numbers here are hand-derived or recomputed independently.

import { writeFileSync } from "node:fs";
import { runConfig, type BatchConfig } from "../lib/batch";

const DEPTHS = [0, 5, 10, 15, 20, 25, 30];
const SEEDS = [1, 2, 3, 4, 5];
const NORMALIZATIONS = ["sigmoid", "exponential", "arctan"];
const AMOUNT = "1200";

type Row = {
  depth: number;
  seed: number;
  normalization: string;
  validityPct: number;
  uniquenessRatio: number;
  uniquenessRatioValidOnly: number;
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

function runSweep(shapeType: "nesting" | "links"): Row[] {
  const rows: Row[] = [];
  for (const depth of DEPTHS) {
    for (const normalization of NORMALIZATIONS) {
      for (const seed of SEEDS) {
        const config: BatchConfig = {
          id: "x",
          amount: AMOUNT,
          nestingOrLinksType: shapeType,
          nestingOrLinks: String(depth),
          normalization,
          seed: String(seed),
        };
        const { metrics } = runConfig(config);
        const validityPct =
          metrics.total > 0 ? (metrics.valid / metrics.total) * 100 : 0;
        const uniquenessRatio =
          metrics.total > 0 ? metrics.unique / metrics.total : 0;
        const uniquenessRatioValidOnly =
          metrics.valid > 0 ? metrics.uniqueValid / metrics.valid : 0;
        const DEFAULT_TIER_LABELS = ["Novice", "Apprentice", "Adept", "Master"];
        rows.push({
          depth,
          seed,
          normalization,
          validityPct,
          uniquenessRatio,
          uniquenessRatioValidOnly,
          avgRawScore: metrics.avgRawScore,
          avgComplexityScore: metrics.avgScore,
          highestTier: highestTierFromCounts(metrics.tierCounts, DEFAULT_TIER_LABELS),
        });
      }
    }
  }
  return rows;
}

const originalInfo = console.info;
console.info = () => {};

const nestingRows = runSweep("nesting");
const linkingRows = runSweep("links");

console.info = originalInfo;

writeFileSync(
  "scripts_tmp/depth_sweep_output.json",
  JSON.stringify({ nestingRows, linkingRows }, null, 2),
);
console.error("wrote scripts_tmp/depth_sweep_output.json");
