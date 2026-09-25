import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";
import { generateBulkMetricsConstraintAware } from "../core/bulkMetricsGeneratorConstraintAware.ts";
import type { BulkOutput } from "../core/bulkMetricsShared.ts";

// Compares the baseline (uniform-random) generator against a constraint-aware
// generator that biases the second sigil of a Radial composition symbol
// toward compatibility (see spellBuilderConstraintAware.ts). Runs the SAME
// shapes/depths/seeds as runMultiSeed.ts's depth sweeps and discovery-rate
// sequences (that script is left untouched), under both generators, and
// reports validity %, uniqueness ratio, and (for a representative depth
// subset) discovery rate across a 30-run re-roll sequence per shape.
//
// Usage:
//   node --experimental-strip-types src/scripts/runGeneratorComparison.ts <outDir>

const SEEDS = [1, 2, 3, 4, 5];
const NORMALIZATION = "exponential";
const AMOUNT = 1200;
const DEPTHS = [0, 5, 10, 15, 20, 25, 30];
const DISCOVERY_DEPTHS = [0, 10, 20];
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

type GeneratorName = "baseline" | "constraintAware";

function runGenerator(
    generatorName: GeneratorName,
    amount: number,
    maxNested: number,
    maxLinked: number,
    normalization: string,
    seed: number,
): BulkOutput {
    return generatorName === "baseline"
        ? generateBulkMetrics(amount, maxNested, maxLinked, normalization, seed)
        : generateBulkMetricsConstraintAware(
              amount,
              maxNested,
              maxLinked,
              normalization,
              seed,
          );
}

// --- Depth sweeps (nesting + linking), multi-seed, per generator -----------

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

function runDepthSweep(
    generatorName: GeneratorName,
    operator: "nesting" | "links",
): DepthSweepRow[] {
    return DEPTHS.map((depth) => {
        const validity: number[] = [];
        const uniqueness: number[] = [];
        const uniquenessValidOnly: number[] = [];
        const rawScores: number[] = [];
        const complexityScores: number[] = [];

        for (const seed of SEEDS) {
            const bulk = runGenerator(
                generatorName,
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

// --- Discovery rate, multi-seed sequences, per generator --------------------
// Representative depth subset only (DISCOVERY_DEPTHS), each run under both
// nesting and links operators, mirroring runMultiSeed.ts's pattern.

interface DiscoverySeqShape {
    amount: number;
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: number;
}

function buildDiscoveryShapes(): DiscoverySeqShape[] {
    const shapes: DiscoverySeqShape[] = [];
    for (const depth of DISCOVERY_DEPTHS) {
        shapes.push({
            amount: AMOUNT,
            nestingOrLinksType: "nesting",
            nestingOrLinks: depth,
        });
        if (depth > 0) {
            // depth=0 nesting and depth=0 links are identical shapes; skip the dupe.
            shapes.push({
                amount: AMOUNT,
                nestingOrLinksType: "links",
                nestingOrLinks: depth,
            });
        }
    }
    return shapes;
}

const DISCOVERY_SHAPES = buildDiscoveryShapes();

interface DiscoveryRunAgg {
    runIndex: number;
    discoveryRatePct: Stat; // across the 5 seed-sequences, at this runIndex
    discoveryRatePctValidOnly: Stat;
}

interface DiscoverySequenceAgg {
    shape: DiscoverySeqShape;
    runs: DiscoveryRunAgg[];
    finalDiscoveryRatePct: Stat; // at runIndex = DISCOVERY_RUN_COUNT
    finalDiscoveryRatePctValidOnly: Stat;
}

function runDiscoverySequenceForSeed(
    generatorName: GeneratorName,
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
        const bulk = runGenerator(
            generatorName,
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
        validOnly.push(validTotal > 0 ? (newValidCount / validTotal) * 100 : 0);
    }

    return { allSpells, validOnly };
}

function runDiscoverySweep(generatorName: GeneratorName): DiscoverySequenceAgg[] {
    return DISCOVERY_SHAPES.map((shape) => {
        const perSeed = SEEDS.map((seed) =>
            runDiscoverySequenceForSeed(generatorName, shape, seed),
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
            "Usage: node --experimental-strip-types src/scripts/runGeneratorComparison.ts <outDir>",
        );
        process.exit(1);
    }
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    console.log(`Seeds: ${SEEDS.join(", ")}`);

    const generators: GeneratorName[] = ["baseline", "constraintAware"];
    const depthSweep: Record<
        GeneratorName,
        { nesting: DepthSweepRow[]; links: DepthSweepRow[] }
    > = {} as any;
    const discoverySweep: Record<GeneratorName, DiscoverySequenceAgg[]> =
        {} as any;

    for (const generatorName of generators) {
        console.log(`\n=== Generator: ${generatorName} ===`);

        console.log("Running nesting depth sweep...");
        const nesting = runDepthSweep(generatorName, "nesting");

        console.log("Running linking depth sweep...");
        const links = runDepthSweep(generatorName, "links");

        depthSweep[generatorName] = { nesting, links };

        console.log(
            `Running discovery-rate sequences (${DISCOVERY_SHAPES.length} shapes x ${SEEDS.length} seeds x ${DISCOVERY_RUN_COUNT} runs)...`,
        );
        discoverySweep[generatorName] = runDiscoverySweep(generatorName);
    }

    const output = {
        generatedAt: new Date().toISOString(),
        seeds: SEEDS,
        amount: AMOUNT,
        normalization: NORMALIZATION,
        depths: DEPTHS,
        discoveryDepths: DISCOVERY_DEPTHS,
        generators,
        depthSweep,
        discoverySweep,
    };

    const outPath = resolve(outDir, "generator-comparison.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\nDone: wrote ${outPath}`);
}

main();
