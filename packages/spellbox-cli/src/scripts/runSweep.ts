import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
    generateBulkMetrics,
    type BulkOutput,
} from "../core/bulkMetricsGenerator.ts";
import { DEFAULT_TIERS } from "../core/spellScoring.ts";

// Runs a batch of BatchConfig rows (the same JSON shape the web app's
// "Load config" button accepts) directly in Node, bypassing the browser.
// This exists because large sweeps (spell counts in the tens/hundreds of
// thousands) generate more data than a browser tab can hold without
// freezing or crashing. Output is one Metrics JSON file per config, in the
// exact shape apps/web/lib/metrics.ts::metricsFromGenerated produces, ready
// for test_files/spell-sweeps/plot_sweeps.py.
//
// Usage:
//   node --experimental-strip-types src/scripts/runSweep.ts <configs.json> <outDir>

type BatchConfig = {
    id: string;
    amount: string;
    nestingOrLinksType: "nesting" | "links";
    nestingOrLinks: string;
    normalization: string;
    seed: string;
};

type Histogram = { labels: string[]; counts: number[] };

function histogram(values: number[], binCount = 12): Histogram {
    if (values.length === 0) return { labels: [], counts: [] };
    let min = values[0]!;
    let max = values[0]!;
    for (const value of values) {
        if (value < min) min = value;
        if (value > max) max = value;
    }
    const binSize = (max - min || 1) / binCount;
    const counts = Array.from({ length: binCount }, () => 0);
    values.forEach((value) => {
        counts[Math.min(binCount - 1, Math.floor((value - min) / binSize))]!++;
    });
    return {
        labels: counts.map((_, index) => (min + index * binSize).toFixed(1)),
        counts,
    };
}

// Mirrors apps/web/lib/metrics.ts::metricsFromGenerated exactly, so the
// output here matches what the "Export all reports (.zip)" button would
// have produced from the browser.
function metricsFromGenerated(data: BulkOutput) {
    const records = [...data.spells].sort((a, b) => a.id - b.id);
    const signatures = records.map((record) => record.signature);
    const sorted = (values: Record<string, number>, limit: number) =>
        Object.entries(values)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    const seen = new Set<string>();
    const saturation = records.map((record, index) => {
        seen.add(record.signature);
        return { n: index + 1, unique: seen.size };
    });
    const bucketCount = Math.min(10, records.length) || 1;
    const bucketSize = Math.ceil(records.length / bucketCount) || 1;
    const buckets = Array.from({ length: bucketCount }, (_, bucket) => {
        const start = bucket * bucketSize;
        const end = Math.min(start + bucketSize, records.length);
        const uniqueInBucket = new Set(signatures.slice(start, end));
        return { label: `${start + 1}-${end}`, count: uniqueInBucket.size };
    });
    const depthMap = new Map<
        number,
        { total: number; signatures: Set<string> }
    >();
    records.forEach((record) => {
        const depth = record.features.maxNestingDepth;
        const entry = depthMap.get(depth) ?? {
            total: 0,
            signatures: new Set<string>(),
        };
        entry.total++;
        entry.signatures.add(record.signature);
        depthMap.set(depth, entry);
    });

    const tierCounts = DEFAULT_TIERS.labels.map(
        (tier) => data.summary.tierCounts[tier] ?? 0,
    );

    return {
        generatedAt: data.generatedAt,
        total: data.summary.totalGenerated,
        unique: data.summary.uniqueSignatures,
        valid: data.summary.validCount,
        average: data.summary.averageScore,
        maxNesting: data.config.maxNested,
        maxLinks: data.config.maxLinked,
        normalization: data.config.normalization,
        seed: data.config.seed,
        tierLabels: DEFAULT_TIERS.labels.map(
            (tier, i) =>
                `${tier} ${Number(tierCounts[i] / data.summary.totalGenerated).toFixed(2)}`,
        ),
        tierCounts,
        symbolLabels: sorted(data.summary.symbolFrequency, 5).map(
            ([label]) => label,
        ),
        symbolCounts: sorted(data.summary.symbolFrequency, 5).map(
            ([, value]) => value,
        ),
        signLabels: sorted(data.summary.signFrequency, 6).map(
            ([label]) => label,
        ),
        signCounts: sorted(data.summary.signFrequency, 6).map(
            ([, value]) => value,
        ),
        avgScore:
            records.reduce((acc, curr) => acc + curr.score, 0) / records.length,
        scoreHist: histogram(records.map((r) => r.score)),
        avgRawScore:
            records.reduce((acc, curr) => acc + curr.rawScore, 0) /
            records.length,
        rawScoreHist: histogram(records.map((r) => r.rawScore)),
        normalizationHistograms: ["sigmoid", "exponential", "arctan", "none"].map(
            (type) => ({
                type,
                histogram: histogram(records.map((r) => r.rawScore)),
            }),
        ),
        saturation:
            saturation.length > 150
                ? saturation.filter(
                      (_, index) => index % Math.ceil(saturation.length / 150) === 0,
                  )
                : saturation,
        buckets,
        depth: [...depthMap.entries()]
            .sort(([a], [b]) => a - b)
            .map(([depth, value]) => ({
                label: `Depth ${depth}`,
                ratio: value.signatures.size / value.total,
                total: value.total,
            })),
        avgRatio:
            [...depthMap.values()].reduce(
                (acc, value) => acc + value.signatures.size / value.total,
                0,
            ) / [...depthMap.values()].length,
    };
}

function main() {
    const configsArg = process.argv[2];
    const outDirArg = process.argv[3];
    if (!configsArg || !outDirArg) {
        console.error(
            "Usage: node --experimental-strip-types src/scripts/runSweep.ts <configs.json> <outDir>",
        );
        process.exit(1);
    }

    const configsPath = resolve(configsArg);
    const outDir = resolve(outDirArg);
    mkdirSync(outDir, { recursive: true });

    const configs: BatchConfig[] = JSON.parse(readFileSync(configsPath, "utf-8"));

    configs.forEach((config, i) => {
        const nestingOrLinksValue = Number(config.nestingOrLinks) || 0;
        const bulk = generateBulkMetrics(
            Number(config.amount) || 1,
            config.nestingOrLinksType === "nesting" ? nestingOrLinksValue : 0,
            config.nestingOrLinksType === "links" ? nestingOrLinksValue : 0,
            config.normalization,
            Number(config.seed) || 0,
        );
        const metrics = metricsFromGenerated(bulk);
        const outPath = resolve(outDir, `batch-run-${i + 1}.json`);
        writeFileSync(outPath, JSON.stringify(metrics, null, 2));
        console.log(
            `[${i + 1}/${configs.length}] ${config.nestingOrLinksType}=${config.nestingOrLinks} amount=${config.amount} normalization=${config.normalization} -> ${outPath}`,
        );
    });

    console.log(`Done: ${configs.length} reports written to ${outDir}`);
}

main();
