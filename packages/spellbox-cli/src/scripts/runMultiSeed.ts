import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";

// Reruns the depth sweeps (nesting, linking) and the discovery-rate
// sequences across multiple seeds, so the paper can report mean +/- std
// instead of single-seed point estimates. This does not replace the
// existing seed=12345 tables in compiled-analysis.md (left untouched); it
// produces a parallel, seed-averaged dataset for the research paper.
//
// Usage:
//   node --experimental-strip-types src/scripts/runMultiSeed.ts <outDir>

const SEEDS = [1, 2, 3, 4, 5];
const NORMALIZATION = "exponential";
const AMOUNT = 1200;
const DEPTHS = [0, 5, 10, 15, 20, 25, 30];
const DISCOVERY_RUN_COUNT = 30;
const DISCOVERY_START_SEED_BASE = 1000; // offset so discovery seeds never collide with sweep seeds

type Stat = { mean: number; std: number; values: number[] };

function stat(values: number[]): Stat {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
        values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, std: Math.sqrt(variance), values };
}

function pct(n: number, total: number): number {
    return total > 0 ? (n / total) * 100 : 0;
}

// --- Depth sweeps (nesting + linking), multi-seed --------------------------

interface DepthSweepRow {
    depth: number;
    operator: "nesting" | "links";
    amount: number;
    validityPct: Stat;
    uniquenessRatio: Stat;
    uniquenessRatioValidOnly: Stat;
    avgRawScore: Stat;
    avgComplexityScore: Stat;
}

function runDepthSweep(operator: "nesting" | "links"): DepthSweepRow[] {
    return DEPTHS.map((depth) => {
        const validity: number[] = [];
        const uniqueness: number[] = [];
        const uniquenessValidOnly: number[] = [];
        const rawScores: number[] = [];
        const complexityScores: number[] = [];

        for (const seed of SEEDS) {
            const bulk = generateBulkMetrics(
                AMOUNT,
                operator === "nesting" ? depth : 0,
                operator === "links" ? depth : 0,
                NORMALIZATION,
                seed,
            );
            validity.push(pct(bulk.summary.validCount, bulk.summary.totalGenerated));
            uniqueness.push(
                bulk.summary.uniqueSignatures / bulk.summary.totalGenerated,
            );
            // Valid-only uniqueness: distinct signatures among valid spells,
            // as a fraction of valid spells generated (not of total generated),
            // so this is comparable in scale to the all-spells uniqueness ratio.
            uniquenessValidOnly.push(
                bulk.summary.validCount > 0
                    ? bulk.summary.uniqueValidSignatures / bulk.summary.validCount
                    : 0,
            );
            const avgRaw =
                bulk.spells.reduce((acc, s) => acc + s.rawScore, 0) /
                bulk.spells.length;
            rawScores.push(avgRaw);
            complexityScores.push(bulk.summary.averageScore);
        }

        return {
            depth,
            operator,
            amount: AMOUNT,
            validityPct: stat(validity),
            uniquenessRatio: stat(uniqueness),
            uniquenessRatioValidOnly: stat(uniquenessValidOnly),
            avgRawScore: stat(rawScores),
            avgComplexityScore: stat(complexityScores),
        };
    });
}

// --- Discovery rate, multi-seed sequences -----------------------------------
// Each seed in SEEDS anchors an independent 30-run sequence
// (startSeed = SEED*DISCOVERY_START_SEED_BASE .. +29), so we get 5
// independent discovery-rate trajectories per shape instead of one.

interface DiscoverySeqShape {
    amount: number;
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: number;
}

const DISCOVERY_SHAPES: DiscoverySeqShape[] = [
    { amount: AMOUNT, nestingOrLinksType: "nesting", nestingOrLinks: 0 },
    { amount: AMOUNT, nestingOrLinksType: "nesting", nestingOrLinks: 5 },
    { amount: AMOUNT, nestingOrLinksType: "nesting", nestingOrLinks: 10 },
    { amount: AMOUNT, nestingOrLinksType: "nesting", nestingOrLinks: 20 },
    { amount: AMOUNT, nestingOrLinksType: "links", nestingOrLinks: 5 },
    { amount: AMOUNT, nestingOrLinksType: "links", nestingOrLinks: 10 },
    { amount: AMOUNT, nestingOrLinksType: "links", nestingOrLinks: 20 },
];

interface DiscoveryRunAgg {
    runIndex: number;
    discoveryRatePct: Stat; // across the 5 seed-sequences, at this runIndex
    discoveryRatePctValidOnly: Stat; // same, but only counting valid spells
}

interface DiscoverySequenceAgg {
    shape: DiscoverySeqShape;
    runs: DiscoveryRunAgg[];
    finalDiscoveryRatePct: Stat; // at runIndex = DISCOVERY_RUN_COUNT
    finalDiscoveryRatePctValidOnly: Stat;
}

function runDiscoverySequenceForSeed(
    shape: DiscoverySeqShape,
    anchorSeed: number,
): { allSpells: number[]; validOnly: number[] } {
    const seen = new Set<string>();
    const seenValid = new Set<string>();
    const allSpells: number[] = [];
    const validOnly: number[] = [];
    const startSeed = anchorSeed * DISCOVERY_START_SEED_BASE;

    for (let i = 0; i < DISCOVERY_RUN_COUNT; i++) {
        const seed = startSeed + i;
        const bulk = generateBulkMetrics(
            shape.amount,
            shape.nestingOrLinksType === "nesting" ? shape.nestingOrLinks : 0,
            shape.nestingOrLinksType === "links" ? shape.nestingOrLinks : 0,
            NORMALIZATION,
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
        allSpells.push(total > 0 ? (newCount / total) * 100 : 0);
        // Valid-only discovery rate: new valid signatures as a fraction of
        // valid spells generated this run (not of total generated), so a
        // shape with low validity isn't penalized twice by this metric.
        validOnly.push(validTotal > 0 ? (newValidCount / validTotal) * 100 : 0);
    }

    return { allSpells, validOnly };
}

function runDiscoverySweep(): DiscoverySequenceAgg[] {
    return DISCOVERY_SHAPES.map((shape) => {
        const perSeed = SEEDS.map((seed) =>
            runDiscoverySequenceForSeed(shape, seed),
        );

        const runs: DiscoveryRunAgg[] = [];
        for (let runIndex = 1; runIndex <= DISCOVERY_RUN_COUNT; runIndex++) {
            const valuesAtRun = perSeed.map((seq) => seq.allSpells[runIndex - 1]!);
            const valuesAtRunValidOnly = perSeed.map(
                (seq) => seq.validOnly[runIndex - 1]!,
            );
            runs.push({
                runIndex,
                discoveryRatePct: stat(valuesAtRun),
                discoveryRatePctValidOnly: stat(valuesAtRunValidOnly),
            });
        }

        return {
            shape,
            runs,
            finalDiscoveryRatePct: runs[runs.length - 1]!.discoveryRatePct,
            finalDiscoveryRatePctValidOnly:
                runs[runs.length - 1]!.discoveryRatePctValidOnly,
        };
    });
}

function main() {
    const outDirArg = process.argv[2];
    if (!outDirArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runMultiSeed.ts <outDir>",
        );
        process.exit(1);
    }
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    console.log(`Seeds: ${SEEDS.join(", ")}`);

    console.log("Running nesting depth sweep...");
    const nesting = runDepthSweep("nesting");

    console.log("Running linking depth sweep...");
    const links = runDepthSweep("links");

    console.log("Running discovery-rate sequences (7 shapes x 5 seeds x 30 runs)...");
    const discovery = runDiscoverySweep();

    const output = {
        seeds: SEEDS,
        amount: AMOUNT,
        normalization: NORMALIZATION,
        depthSweep: { nesting, links },
        discoverySweep: discovery,
    };

    const outPath = resolve(outDir, "multi-seed-results.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done: wrote ${outPath}`);
}

main();
