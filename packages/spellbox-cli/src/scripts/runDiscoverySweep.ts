import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";

// Measures "discovery rate": across a sequence of runs that share the same
// generation shape (amount / nestingOrLinksType / nestingOrLinks) but use a
// different seed each time, how many of each run's spells are structurally
// new -- i.e. their signature was never produced by any earlier run in that
// same sequence. This answers "if I keep re-rolling this config, does the
// generator keep finding new spells, or does it run out and just repeat
// itself?" It is a different question from the existing "uniqueness ratio"
// metric, which only measures duplicates *within* a single run.
//
// Runs entirely in Node (no browser) since sequences can be large. Config
// rows are grouped into sequences by their (amount, nestingOrLinksType,
// nestingOrLinks) shape; within a group, rows are processed in the order
// they appear in the input file (the discovery-rate-dataset.json generator
// orders each sequence by ascending seed, and this script preserves that
// order rather than re-sorting, so a custom seed order is respected too).
// Each sequence gets its own signature store -- discovery state is never
// shared across sequences, since they represent separate experiments.
//
// Usage:
//   node --experimental-strip-types src/scripts/runDiscoverySweep.ts <configs.json> <out.json>

type BatchConfig = {
    id: string;
    amount: string;
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: string;
    normalization: string;
    seed: string;
};

type DiscoveryRunResult = {
    runIndex: number; // 1-based position within its sequence
    seed: number;
    total: number;
    newCount: number;
    discoveryRate: number; // newCount / total for this run
    cumulativeUnique: number; // distinct signatures seen across the sequence so far, including this run
    cumulativeTotal: number; // spells generated across the sequence so far, including this run
};

type DiscoverySequence = {
    shapeKey: string;
    amount: number;
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: number;
    normalization: string;
    runs: DiscoveryRunResult[];
};

function shapeKeyOf(config: BatchConfig): string {
    return `${config.amount}|${config.nestingOrLinksType}|${config.nestingOrLinks}`;
}

function main() {
    const configsArg = process.argv[2];
    const outArg = process.argv[3];
    if (!configsArg || !outArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runDiscoverySweep.ts <configs.json> <out.json>",
        );
        process.exit(1);
    }

    const configsPath = resolve(configsArg);
    const outPath = resolve(outArg);
    mkdirSync(resolve(outPath, ".."), { recursive: true });

    const configs: BatchConfig[] = JSON.parse(readFileSync(configsPath, "utf-8"));

    const sequenceOrder: string[] = [];
    const sequences = new Map<string, DiscoverySequence>();
    const seenPerSequence = new Map<string, Set<string>>();

    configs.forEach((config, i) => {
        const shapeKey = shapeKeyOf(config);
        if (!sequences.has(shapeKey)) {
            sequenceOrder.push(shapeKey);
            sequences.set(shapeKey, {
                shapeKey,
                amount: Number(config.amount) || 0,
                nestingOrLinksType: config.nestingOrLinksType,
                nestingOrLinks: Number(config.nestingOrLinks) || 0,
                normalization: config.normalization,
                runs: [],
            });
            seenPerSequence.set(shapeKey, new Set());
        }

        const nestingOrLinksValue = Number(config.nestingOrLinks) || 0;
        const bulk = generateBulkMetrics(
            Number(config.amount) || 1,
            config.nestingOrLinksType === "nesting" ? nestingOrLinksValue : 0,
            config.nestingOrLinksType === "links" ? nestingOrLinksValue : 0,
            config.normalization,
            Number(config.seed) || 0,
        );

        const seen = seenPerSequence.get(shapeKey)!;
        const sequence = sequences.get(shapeKey)!;

        let newCount = 0;
        for (const record of bulk.spells) {
            if (!seen.has(record.signature)) {
                seen.add(record.signature);
                newCount++;
            }
        }

        const total = bulk.spells.length;
        const priorTotal = sequence.runs.reduce((acc, r) => acc + r.total, 0);

        sequence.runs.push({
            runIndex: sequence.runs.length + 1,
            seed: Number(config.seed) || 0,
            total,
            newCount,
            discoveryRate: total > 0 ? newCount / total : 0,
            cumulativeUnique: seen.size,
            cumulativeTotal: priorTotal + total,
        });

        console.log(
            `[${i + 1}/${configs.length}] shape=${shapeKey} seed=${config.seed} -> ${newCount}/${total} new (cumulative unique: ${seen.size})`,
        );
    });

    const output = sequenceOrder.map((key) => sequences.get(key)!);
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done: ${output.length} sequences written to ${outPath}`);
}

main();
