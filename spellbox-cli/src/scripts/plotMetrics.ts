import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import * as readline from "readline";

interface BulkOutput {
    generatedAt: string;
    config: Record<string, unknown>;
    summary: {
        totalGenerated: number;
        uniqueSignatures: number;
        validCount: number;
        invalidCount: number;
        averageScore: number;
        tierCounts: Record<string, number>;
        symbolFrequency: Record<string, number>;
        signFrequency: Record<string, number>;
    };
    spells: Array<{
        id: number;
        rawScore: number;
        score: number;
        tier: string;
        valid: boolean;
    }>;
}

/**
 * Streams bulkMetrics.ts's output line-by-line instead of reading it into one
 * string, since at large --count the file can exceed V8's max string length
 * (~536M chars) and readFile()+JSON.parse() would throw "Invalid string length".
 * Only pulls the small per-spell fields plot needs (id/score/tier/valid), never
 * materializing the full "spell" tree or feature multisets from each record.
 */
async function readBulkOutput(path: string): Promise<BulkOutput> {
    const rl = readline.createInterface({
        input: createReadStream(path, { encoding: "utf-8" }),
        crlfDelay: Infinity,
    });

    const headerLines: string[] = [];
    let inSpells = false;
    let objectLines: string[] = [];
    let depth = 0;
    const spells: BulkOutput["spells"] = [];

    for await (const line of rl) {
        if (!inSpells) {
            if (line.trim() === '"spells": [') {
                inSpells = true;
                continue;
            }
            headerLines.push(line);
            continue;
        }

        if (objectLines.length === 0 && !line.trim().startsWith("{")) {
            // closing "]" of the spells array (or trailing comma/whitespace)
            continue;
        }

        objectLines.push(line);
        for (const ch of line) {
            if (ch === "{") depth++;
            else if (ch === "}") depth--;
        }

        if (depth === 0) {
            let objText = objectLines.join("\n").trim();
            if (objText.endsWith(",")) objText = objText.slice(0, -1);
            const record = JSON.parse(objText);
            spells.push({
                id: record.id,
                rawScore: record.rawScore,
                score: record.score,
                tier: record.tier,
                valid: record.valid,
            });
            objectLines = [];
        }
    }

    const headerText = headerLines.join("\n").replace(/,\s*$/, "") + "\n}";
    const header = JSON.parse(headerText);

    return {
        generatedAt: header.generatedAt,
        config: header.config,
        summary: header.summary,
        spells,
    };
}

interface Histogram {
    labels: string[];
    counts: number[];
}

/** Buckets a list of numbers into `binCount` equal-width bins for a histogram. */
function histogram(values: number[], binCount = 20): Histogram {
    if (values.length === 0) return { labels: [], counts: [] };

    let min = values[0]!;
    let max = values[0]!;
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = max - min || 1; // avoid divide-by-zero if all values are identical
    const binSize = range / binCount;
    const counts = new Array(binCount).fill(0);

    for (const v of values) {
        let idx = Math.floor((v - min) / binSize);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        counts[idx]++;
    }

    const labels = Array.from({ length: binCount }, (_, i) =>
        (min + i * binSize).toFixed(2)
    );
    return { labels, counts };
}

function getArg(
    argv: string[],
    long: string,
    short: string | null,
    fallback: string
): string {
    const idx = argv.findIndex(
        (a) => a === long || (short !== null && a === short)
    );
    return idx !== -1 && argv[idx + 1] !== undefined
        ? argv[idx + 1]!
        : fallback;
}

/** Embeds a JSON payload safely inside an inline <script> tag (escapes "</" so a literal string value can't close the tag early). */
function embedJson(value: unknown): string {
    return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function sortedEntries(
    record: Record<string, number>,
    limit = 25
): [string, number][] {
    return Object.entries(record)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function buildHtml(data: BulkOutput): string {
    const scores = data.spells.map((s) => s.score);
    const rawScores = data.spells.map((s) => s.rawScore);
    const scoreHist = histogram(scores);
    const rawScoreHist = histogram(rawScores);

    const tierEntries = sortedEntries(data.summary.tierCounts, 10);
    const symbolEntries = sortedEntries(data.summary.symbolFrequency);
    const signEntries = sortedEntries(data.summary.signFrequency);

    const payload = {
        generatedAt: data.generatedAt,
        config: data.config,
        summary: data.summary,
        scoreHist,
        rawScoreHist,
        tierLabels: tierEntries.map((e) => e[0]),
        tierCounts: tierEntries.map((e) => e[1]),
        symbolLabels: symbolEntries.map((e) => e[0]),
        symbolCounts: symbolEntries.map((e) => e[1]),
        signLabels: signEntries.map((e) => e[0]),
        signCounts: signEntries.map((e) => e[1]),
        validCounts: [data.summary.validCount, data.summary.invalidCount],
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Spellbox bulk metrics</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #111; color: #eee; }
  h1 { font-size: 1.4rem; }
  .meta { color: #999; margin-bottom: 2rem; font-size: 0.9rem; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
  .card { background: #1b1b1b; border: 1px solid #333; border-radius: 8px; padding: 1rem; }
  .card h2 { font-size: 1rem; margin: 0 0 0.75rem 0; color: #ccc; }
  canvas { max-height: 320px; }
</style>
</head>
<body>
<h1>Spellbox bulk metrics</h1>
<div class="meta" id="meta"></div>
<div class="grid">
  <div class="card"><h2>Complexity tier distribution</h2><canvas id="tierChart"></canvas></div>
  <div class="card"><h2>Validation: valid vs invalid</h2><canvas id="validityChart"></canvas></div>
  <div class="card"><h2>Score distribution (normalized)</h2><canvas id="scoreHistChart"></canvas></div>
  <div class="card"><h2>Raw score distribution</h2><canvas id="rawScoreHistChart"></canvas></div>
  <div class="card"><h2>Central symbol frequency (top 25)</h2><canvas id="symbolChart"></canvas></div>
  <div class="card"><h2>Sign frequency (top 25)</h2><canvas id="signChart"></canvas></div>
</div>

<script>
const DATA = ${embedJson(payload)};

document.getElementById("meta").textContent =
  "Generated " + DATA.summary.totalGenerated + " spells (" + DATA.summary.uniqueSignatures + " structurally distinct) on " +
  DATA.generatedAt + " — normalization: " + (DATA.config.normalization ?? "exponential") +
  " — avg score: " + DATA.summary.averageScore.toFixed(3);

const barOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { x: { ticks: { color: "#ccc" } }, y: { ticks: { color: "#ccc" } } },
};

new Chart(document.getElementById("tierChart"), {
  type: "bar",
  data: { labels: DATA.tierLabels, datasets: [{ data: DATA.tierCounts, backgroundColor: "#4f8cff" }] },
  options: barOptions,
});

new Chart(document.getElementById("validityChart"), {
  type: "doughnut",
  data: {
    labels: ["Valid", "Invalid"],
    datasets: [{ data: DATA.validCounts, backgroundColor: ["#4caf50", "#e05555"] }],
  },
  options: { responsive: true, plugins: { legend: { labels: { color: "#ccc" } } } },
});

new Chart(document.getElementById("scoreHistChart"), {
  type: "bar",
  data: { labels: DATA.scoreHist.labels, datasets: [{ data: DATA.scoreHist.counts, backgroundColor: "#ffb84f" }] },
  options: barOptions,
});

new Chart(document.getElementById("rawScoreHistChart"), {
  type: "bar",
  data: { labels: DATA.rawScoreHist.labels, datasets: [{ data: DATA.rawScoreHist.counts, backgroundColor: "#ff8f4f" }] },
  options: barOptions,
});

new Chart(document.getElementById("symbolChart"), {
  type: "bar",
  data: { labels: DATA.symbolLabels, datasets: [{ data: DATA.symbolCounts, backgroundColor: "#c04fff" }] },
  options: { ...barOptions, indexAxis: "y" },
});

new Chart(document.getElementById("signChart"), {
  type: "bar",
  data: { labels: DATA.signLabels, datasets: [{ data: DATA.signCounts, backgroundColor: "#4fffd4" }] },
  options: { ...barOptions, indexAxis: "y" },
});
</script>
</body>
</html>
`;
}

async function main() {
    const argv = process.argv;
    const inPath = getArg(argv, "--in", "-i", "./bulk-spells.json");
    const outPath = getArg(argv, "--out", "-o", "./bulk-metrics-plot.html");

    const resolvedIn = resolve(inPath);
    let data: BulkOutput;
    try {
        data = await readBulkOutput(resolvedIn);
    } catch (err) {
        console.log(
            `Could not read "${resolvedIn}": ${(err as Error).message}`
        );
        process.exitCode = 1;
        return;
    }

    if (!Array.isArray(data.spells) || !data.summary) {
        console.log(
            `"${resolvedIn}" doesn't look like bulkMetrics.ts output (missing "spells"/"summary").`
        );
        process.exitCode = 1;
        return;
    }

    const html = buildHtml(data);
    const resolvedOut = resolve(outPath);
    await writeFile(resolvedOut, html, "utf-8");
    console.log(`Wrote plot -> ${resolvedOut}`);
    console.log(
        "Open it directly in a browser (it's self-contained aside from the Chart.js CDN script)."
    );
}

main();
