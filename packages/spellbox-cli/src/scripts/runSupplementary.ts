import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";

// Supplementary data for the research paper's Tier 3 additions:
//   1. Raw-score distributions (histogram source data) at representative
//      nesting depths, to check whether compositionality widens the score
//      distribution or just shifts its mean.
//   2. Wall-clock generation time vs. depth, for both operators.
//
// Usage:
//   node --experimental-strip-types src/scripts/runSupplementary.ts <outDir>

const SEED = 12345;
const NORMALIZATION = "exponential";
const AMOUNT = 1200;
const HIST_DEPTHS = [0, 5, 10, 20, 30];
const TIMING_DEPTHS = [0, 5, 10, 15, 20, 25, 30];
const TIMING_REPEATS = 5;

function collectRawScores(maxNested: number, maxLinked: number, depth: number) {
    const bulk = generateBulkMetrics(AMOUNT, maxNested, maxLinked, NORMALIZATION, SEED);
    return {
        depth,
        rawScores: bulk.spells.map((s) => s.rawScore),
    };
}

function timeGeneration(maxNested: number, maxLinked: number): number[] {
    const times: number[] = [];
    for (let i = 0; i < TIMING_REPEATS; i++) {
        const start = performance.now();
        generateBulkMetrics(AMOUNT, maxNested, maxLinked, NORMALIZATION, SEED + i);
        times.push(performance.now() - start);
    }
    return times;
}

function main() {
    const outDirArg = process.argv[2];
    if (!outDirArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runSupplementary.ts <outDir>",
        );
        process.exit(1);
    }
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    console.log("Collecting raw-score distributions...");
    const nestingHist = HIST_DEPTHS.map((d) => collectRawScores(d, 0, d));
    const linksHist = HIST_DEPTHS.map((d) => collectRawScores(0, d, d));

    console.log("Timing generation across depths...");
    const nestingTiming = TIMING_DEPTHS.map((depth) => ({
        depth,
        msSamples: timeGeneration(depth, 0),
    }));
    const linksTiming = TIMING_DEPTHS.map((depth) => ({
        depth,
        msSamples: timeGeneration(0, depth),
    }));

    const output = {
        amount: AMOUNT,
        seed: SEED,
        histograms: { nesting: nestingHist, links: linksHist },
        timing: { nesting: nestingTiming, links: linksTiming },
    };

    const outPath = resolve(outDir, "supplementary-results.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done: wrote ${outPath}`);
}

main();
