import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";
import { defaultRng } from "../core/random.ts";

// Reviewer-round-2 data collection:
//   A. Per-seed (not per-seed-averaged) discovery sequences with raw
//      new/total counts, so cumulative-unique-vs-run can be reconstructed
//      exactly per seed (needed for the effective-space inversion and for
//      per-seed AIC/BIC curve fits instead of fits to seed-means).
//   B. Achieved per-spell nested/linked depth distribution at each configured
//      ceiling, since "depth" in every sweep is a ceiling each spell draws
//      independently under (bulkMetricsGenerator.ts randomSpellConfig), not
//      a level every spell reaches.
//   C. Empirical per-node validity-error rate (missing Control sign, or
//      incompatible Radial composition-symbol pair), to build a theoretical
//      geometric decay-in-node-count baseline for H2.
//
// Usage:
//   node --experimental-strip-types src/scripts/runReviewRound2.ts <outDir>

const SEEDS = [1, 2, 3, 4, 5];
const NORMALIZATION = "exponential";
const AMOUNT = 1200;
const DEPTHS = [0, 5, 10, 15, 20, 25, 30];
const DISCOVERY_RUN_COUNT = 30;
const DISCOVERY_START_SEED_BASE = 1000;

const DISCOVERY_SHAPES: {
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: number;
}[] = [
    { nestingOrLinksType: "nesting", nestingOrLinks: 0 },
    { nestingOrLinksType: "nesting", nestingOrLinks: 5 },
    { nestingOrLinksType: "nesting", nestingOrLinks: 10 },
    { nestingOrLinksType: "nesting", nestingOrLinks: 20 },
    { nestingOrLinksType: "links", nestingOrLinks: 5 },
    { nestingOrLinksType: "links", nestingOrLinks: 10 },
    { nestingOrLinksType: "links", nestingOrLinks: 20 },
];

// --- A. Per-seed discovery sequences with raw new/total counts -------------

function runDiscoverySequenceForSeed(
    nestingOrLinksType: "nesting" | "links",
    nestingOrLinks: number,
    anchorSeed: number,
) {
    const seen = new Set<string>();
    const seenValid = new Set<string>();
    const runs: {
        runIndex: number;
        newCount: number;
        total: number;
        cumulativeUnique: number;
        newValidCount: number;
        validTotal: number;
        cumulativeUniqueValid: number;
    }[] = [];
    const startSeed = anchorSeed * DISCOVERY_START_SEED_BASE;

    for (let i = 0; i < DISCOVERY_RUN_COUNT; i++) {
        const seed = startSeed + i;
        const bulk = generateBulkMetrics(
            AMOUNT,
            nestingOrLinksType === "nesting" ? nestingOrLinks : 0,
            nestingOrLinksType === "links" ? nestingOrLinks : 0,
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
        runs.push({
            runIndex: i + 1,
            newCount,
            total: bulk.spells.length,
            cumulativeUnique: seen.size,
            newValidCount,
            validTotal,
            cumulativeUniqueValid: seenValid.size,
        });
    }

    return runs;
}

function collectDiscoveryPerSeed() {
    return DISCOVERY_SHAPES.map((shape) => ({
        shape,
        perSeed: SEEDS.map((seed) => ({
            seed,
            runs: runDiscoverySequenceForSeed(
                shape.nestingOrLinksType,
                shape.nestingOrLinks,
                seed,
            ),
        })),
    }));
}

// --- B. Achieved per-spell depth distribution -------------------------------
// Mirrors bulkMetricsGenerator.ts's randomSpellConfig exactly (same RNG calls,
// same order) but records the drawn (nested, linked) pair per spell instead
// of discarding it, so we can report what depth spells actually reached
// under a given ceiling.

function collectAchievedDepths(maxNested: number, maxLinked: number, seed: number) {
    const rng = defaultRng(seed);
    const nestedCounts: number[] = [];
    const linkedCounts: number[] = [];
    for (let i = 0; i < AMOUNT; i++) {
        const nested = rng.integers(maxNested + 1);
        const linked = nested === 0 ? rng.integers(maxLinked + 1) : 0;
        nestedCounts.push(nested);
        linkedCounts.push(linked);
    }
    return { nestedCounts, linkedCounts };
}

function summarizeDepths(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = sorted[Math.floor(n / 2)]!;
    const histogram: Record<number, number> = {};
    for (const v of values) histogram[v] = (histogram[v] ?? 0) + 1;
    return {
        mean,
        median,
        min: sorted[0],
        max: sorted[n - 1],
        histogram,
    };
}

function collectDepthDistributions() {
    const nesting = DEPTHS.map((ceiling) => {
        const { nestedCounts } = collectAchievedDepths(ceiling, 0, SEEDS[0]!);
        return { ceiling, achieved: summarizeDepths(nestedCounts) };
    });
    const links = DEPTHS.map((ceiling) => {
        const { linkedCounts } = collectAchievedDepths(0, ceiling, SEEDS[0]!);
        return { ceiling, achieved: summarizeDepths(linkedCounts) };
    });
    return { nesting, links };
}

// --- C. Empirical per-node validity-error rate ------------------------------
// A spell is invalid iff ANY node in its nesting/linking chain has an error:
// (i) zero Control signs among its sign array, or (ii) a Radial composition
// symbol whose two sigils are incompatible per compatibility.ts (exactly the
// checks in spellValidator.ts's validateBasicSpell/validateSymbol).
//
// We measure P(node has an error) directly from the generator's actual draw
// distribution (not assumed uniform), by generating many single, depth-0
// nodes and checking validateSpell on each.

import { validateSpell } from "../core/spellValidator.ts";
import spellBuilder from "../core/spellBuilder.ts";

function measurePerNodeErrorRate(seed: number, sampleSize: number): number {
    const rng = defaultRng(seed);
    let errorCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        const { spell } = spellBuilder(rng, { nested: 0, linked: 0 });
        const result = validateSpell(spell);
        if (!result.valid) errorCount++;
    }
    return errorCount / sampleSize;
}

function main() {
    const outDirArg = process.argv[2];
    if (!outDirArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runReviewRound2.ts <outDir>",
        );
        process.exit(1);
    }
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    console.log("A. Collecting per-seed discovery sequences (raw counts)...");
    const discoveryPerSeed = collectDiscoveryPerSeed();

    console.log("B. Collecting achieved per-spell depth distributions...");
    const depthDistributions = collectDepthDistributions();

    console.log("C. Measuring empirical per-node validity-error rate...");
    const perNodeErrorRate = measurePerNodeErrorRate(99999, 200000);

    const output = {
        seeds: SEEDS,
        amount: AMOUNT,
        normalization: NORMALIZATION,
        discoveryPerSeed,
        depthDistributions,
        perNodeErrorRate,
    };

    const outPath = resolve(outDir, "review-round2-results.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done: wrote ${outPath}`);
}

main();
