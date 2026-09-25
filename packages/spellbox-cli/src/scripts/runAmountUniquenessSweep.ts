import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";

// Dense amount sweep (uniqueness ratio vs. amount of spells generated) for
// curve-fitting purposes. Single seed is sufficient here since we're fitting
// a smooth trend across many amount points, not comparing point estimates.
//
// Usage:
//   node --experimental-strip-types src/scripts/runAmountUniquenessSweep.ts <outFile>

const SEED = 12345;
const NORMALIZATION = "exponential";
const AMOUNTS = [
    12, 25, 50, 100, 200, 400, 800, 1200, 2000, 3000, 5000, 8000, 12000,
    20000, 35000, 60000, 100000, 150000, 200000,
];

function runShape(maxNested: number, maxLinked: number) {
    return AMOUNTS.map((amount) => {
        const bulk = generateBulkMetrics(
            amount,
            maxNested,
            maxLinked,
            NORMALIZATION,
            SEED,
        );
        return {
            amount,
            uniquenessRatio:
                bulk.summary.uniqueSignatures / bulk.summary.totalGenerated,
            uniquenessRatioValidOnly:
                bulk.summary.validCount > 0
                    ? bulk.summary.uniqueValidSignatures / bulk.summary.validCount
                    : 0,
            validityPct:
                (bulk.summary.validCount / bulk.summary.totalGenerated) * 100,
        };
    });
}

function main() {
    const outArg = process.argv[2];
    if (!outArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runAmountUniquenessSweep.ts <outFile>",
        );
        process.exit(1);
    }

    const nesting = runShape(4, 0);
    const links = runShape(0, 4);
    const flat = runShape(0, 0);

    const outPath = resolve(outArg);
    writeFileSync(
        outPath,
        JSON.stringify({ seed: SEED, nesting, links, flat }, null, 2),
    );
    console.log(`Done: wrote ${outPath}`);
}

main();
