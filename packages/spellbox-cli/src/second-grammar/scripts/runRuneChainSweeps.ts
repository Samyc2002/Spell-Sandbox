import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateRuneBulkFixedShape } from "../bulk.ts";

// Runner for the rune-chain second grammar (generality check for H1/H2
// beyond Spellbox's specific rule set). Mirrors the pattern of
// ../../scripts/runMultiSeed.ts: amount sweep, depth sweep (refinement +
// chaining), and discovery-rate sequences, all averaged across 5 seeds
// with mean/std, written to a single JSON file.
//
// Usage:
//   node --experimental-strip-types src/second-grammar/scripts/runRuneChainSweeps.ts <outDir>

const SEEDS = [1, 2, 3, 4, 5];
const DISCOVERY_RUN_COUNT = 30;
const DISCOVERY_START_SEED_BASE = 1000; // offset so discovery seeds never collide with sweep seeds

// Rune-chain recipes are much smaller per-unit than spells (1-4 draws per
// base recipe vs. spells' larger sign sets), so refinement/chain depth is
// scaled down from Spellbox's 0-30 range to a budget that still stresses
// the over-refinement and redundant-chain rules meaningfully without
// producing absurdly deep structures for a toy grammar.
const AMOUNT = 1200;
const DEPTHS = [0, 2, 4, 6, 8, 10, 12];
const AMOUNTS = [50, 150, 300, 600, 1200, 2400];
const FIXED_DEPTH_FOR_AMOUNT_SWEEP = 4;

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

// --- Amount sweep, multi-seed ------------------------------------------

interface AmountSweepRow {
    amount: number;
    refinements: number;
    chainLinks: number;
    validityPct: Stat;
    uniquenessRatio: Stat;
    uniquenessRatioValidOnly: Stat;
    avgRawScore: Stat;
}

function runAmountSweep(): AmountSweepRow[] {
    return AMOUNTS.map((amount) => {
        const validity: number[] = [];
        const uniqueness: number[] = [];
        const uniquenessValidOnly: number[] = [];
        const rawScores: number[] = [];

        for (const seed of SEEDS) {
            const bulk = generateRuneBulkFixedShape(
                amount,
                FIXED_DEPTH_FOR_AMOUNT_SWEEP,
                0,
                seed
            );
            validity.push(pct(bulk.summary.validCount, bulk.summary.totalGenerated));
            uniqueness.push(
                bulk.summary.uniqueSignatures / bulk.summary.totalGenerated
            );
            uniquenessValidOnly.push(
                bulk.summary.validCount > 0
                    ? bulk.summary.uniqueValidSignatures / bulk.summary.validCount
                    : 0
            );
            rawScores.push(bulk.summary.averageRawScore);
        }

        return {
            amount,
            refinements: FIXED_DEPTH_FOR_AMOUNT_SWEEP,
            chainLinks: 0,
            validityPct: stat(validity),
            uniquenessRatio: stat(uniqueness),
            uniquenessRatioValidOnly: stat(uniquenessValidOnly),
            avgRawScore: stat(rawScores),
        };
    });
}

// --- Depth sweeps (refinement + chaining), multi-seed -------------------

interface DepthSweepRow {
    depth: number;
    operator: "refinement" | "chaining";
    amount: number;
    validityPct: Stat;
    uniquenessRatio: Stat;
    uniquenessRatioValidOnly: Stat;
    avgRawScore: Stat;
    avgNormalizedScore: Stat;
}

function runDepthSweep(operator: "refinement" | "chaining"): DepthSweepRow[] {
    return DEPTHS.map((depth) => {
        const validity: number[] = [];
        const uniqueness: number[] = [];
        const uniquenessValidOnly: number[] = [];
        const rawScores: number[] = [];
        const normScores: number[] = [];

        for (const seed of SEEDS) {
            const bulk = generateRuneBulkFixedShape(
                AMOUNT,
                operator === "refinement" ? depth : 0,
                operator === "chaining" ? depth : 0,
                seed
            );
            validity.push(pct(bulk.summary.validCount, bulk.summary.totalGenerated));
            uniqueness.push(
                bulk.summary.uniqueSignatures / bulk.summary.totalGenerated
            );
            uniquenessValidOnly.push(
                bulk.summary.validCount > 0
                    ? bulk.summary.uniqueValidSignatures / bulk.summary.validCount
                    : 0
            );
            rawScores.push(bulk.summary.averageRawScore);
            normScores.push(bulk.summary.averageScore);
        }

        return {
            depth,
            operator,
            amount: AMOUNT,
            validityPct: stat(validity),
            uniquenessRatio: stat(uniqueness),
            uniquenessRatioValidOnly: stat(uniquenessValidOnly),
            avgRawScore: stat(rawScores),
            avgNormalizedScore: stat(normScores),
        };
    });
}

// --- Discovery rate, multi-seed sequences --------------------------------

interface DiscoverySeqShape {
    amount: number;
    operator: "refinement" | "chaining";
    depth: number;
}

const DISCOVERY_SHAPES: DiscoverySeqShape[] = [
    { amount: AMOUNT, operator: "refinement", depth: 0 }, // flat baseline
    { amount: AMOUNT, operator: "refinement", depth: 2 },
    { amount: AMOUNT, operator: "refinement", depth: 4 },
    { amount: AMOUNT, operator: "refinement", depth: 8 },
    { amount: AMOUNT, operator: "chaining", depth: 2 },
    { amount: AMOUNT, operator: "chaining", depth: 4 },
    { amount: AMOUNT, operator: "chaining", depth: 8 },
];

interface DiscoveryRunAgg {
    runIndex: number;
    discoveryRatePct: Stat;
    discoveryRatePctValidOnly: Stat;
}

interface DiscoverySequenceAgg {
    shape: DiscoverySeqShape;
    runs: DiscoveryRunAgg[];
    finalDiscoveryRatePct: Stat;
    finalDiscoveryRatePctValidOnly: Stat;
}

function runDiscoverySequenceForSeed(
    shape: DiscoverySeqShape,
    anchorSeed: number
): { allRecipes: number[]; validOnly: number[] } {
    const seen = new Set<string>();
    const seenValid = new Set<string>();
    const allRecipes: number[] = [];
    const validOnly: number[] = [];
    const startSeed = anchorSeed * DISCOVERY_START_SEED_BASE;

    for (let i = 0; i < DISCOVERY_RUN_COUNT; i++) {
        const seed = startSeed + i;
        const bulk = generateRuneBulkFixedShape(
            shape.amount,
            shape.operator === "refinement" ? shape.depth : 0,
            shape.operator === "chaining" ? shape.depth : 0,
            seed
        );
        let newCount = 0;
        let newValidCount = 0;
        let validTotal = 0;
        for (const record of bulk.recipes) {
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
        const total = bulk.recipes.length;
        allRecipes.push(total > 0 ? (newCount / total) * 100 : 0);
        validOnly.push(validTotal > 0 ? (newValidCount / validTotal) * 100 : 0);
    }

    return { allRecipes, validOnly };
}

function runDiscoverySweep(): DiscoverySequenceAgg[] {
    return DISCOVERY_SHAPES.map((shape) => {
        const perSeed = SEEDS.map((seed) =>
            runDiscoverySequenceForSeed(shape, seed)
        );

        const runs: DiscoveryRunAgg[] = [];
        for (let runIndex = 1; runIndex <= DISCOVERY_RUN_COUNT; runIndex++) {
            const valuesAtRun = perSeed.map((seq) => seq.allRecipes[runIndex - 1]!);
            const valuesAtRunValidOnly = perSeed.map(
                (seq) => seq.validOnly[runIndex - 1]!
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
            "Usage: node --experimental-strip-types src/second-grammar/scripts/runRuneChainSweeps.ts <outDir>"
        );
        process.exit(1);
    }
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    console.log(`Seeds: ${SEEDS.join(", ")}`);

    console.log("Running amount sweep...");
    const amountSweep = runAmountSweep();

    console.log("Running refinement depth sweep...");
    const refinement = runDepthSweep("refinement");

    console.log("Running chaining depth sweep...");
    const chaining = runDepthSweep("chaining");

    console.log(
        "Running discovery-rate sequences (7 shapes x 5 seeds x 30 runs)..."
    );
    const discovery = runDiscoverySweep();

    const output = {
        grammar: "rune-chain",
        seeds: SEEDS,
        amount: AMOUNT,
        amountSweep,
        depthSweep: { refinement, chaining },
        discoverySweep: discovery,
    };

    const outPath = resolve(outDir, "rune-chain-results.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done: wrote ${outPath}`);
}

main();
