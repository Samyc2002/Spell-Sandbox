import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { DEFAULT_TIERS } from "../core/spellScoring.ts";
import { signature } from "../core/spellSignature.ts";
import { normalize } from "../utils.ts";
import { NORMALIZATION_TYPES } from "../constants.ts";
import type { BasicSpell, Spell } from "../models/spell.ts";

interface SpellRecord {
    id: number;
    spell: Spell;
    rawScore: number;
    score: number;
    tier: string;
    valid: boolean;
    features: {
        maxNestingDepth: number;
        linkedBranches: number;
        totalNodes: number;
    };
}

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
    spells: SpellRecord[];
}

interface Histogram {
    labels: string[];
    counts: number[];
}

/** Buckets a list of numbers into `binCount` equal-width bins for a histogram. */
function histogram(values: number[], binCount = 20): Histogram {
    if (values.length === 0) return { labels: [], counts: [] };

    const min = Math.min(...values);
    const max = Math.max(...values);
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

/** Downsamples an array of points to at most `maxPoints`, always keeping the first and last. */
function downsample<T>(points: T[], maxPoints: number): T[] {
    if (points.length <= maxPoints) return points;
    const step = points.length / maxPoints;
    const sampled: T[] = [];
    for (let i = 0; i < maxPoints; i++) {
        sampled.push(points[Math.floor(i * step)]!);
    }
    sampled[sampled.length - 1] = points[points.length - 1]!;
    return sampled;
}

function computeAnalysis(data: BulkOutput) {
    // Generation-order sequence, so saturation/repetition curves reflect the
    // actual order spells were produced in rather than any later resorting.
    const ordered = [...data.spells].sort((a, b) => a.id - b.id);
    const sigs = ordered.map((r) => signature(r.spell as BasicSpell));

    // --- Q1/Q2: structural signature frequency (does a structure dominate?) ---
    const structureCounts = new Map<string, number>();
    for (const s of sigs)
        structureCounts.set(s, (structureCounts.get(s) ?? 0) + 1);
    const topStructures = [...structureCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([sig, count], i) => ({
            label: `Structure #${i + 1}`,
            sig,
            count,
        }));

    // --- Q3: Master-tier frequency, zero-filled across the canonical tier order ---
    const tierLabels = DEFAULT_TIERS.labels;
    const tierCounts = tierLabels.map(
        (label) => data.summary.tierCounts[label] ?? 0
    );

    // --- Q4: normalization sensitivity — same rawScore, run through every known type ---
    const normTypes = Object.values(NORMALIZATION_TYPES);
    const rawScores = ordered.map((r) => r.rawScore);
    const normalizationHistograms = normTypes.map((type) => ({
        type,
        histogram: histogram(rawScores.map((raw) => normalize(raw, type))),
    }));

    // --- Q5/Q7: diversity saturation — cumulative distinct count vs. spells generated ---
    const seen = new Set<string>();
    const cumulativePoints: { n: number; unique: number }[] = [];
    sigs.forEach((s, i) => {
        seen.add(s);
        cumulativePoints.push({ n: i + 1, unique: seen.size });
    });
    const saturationCurve = downsample(cumulativePoints, 150);

    // New-unique-per-bucket: how many *first-ever* occurrences land in each
    // generation-order bucket. A bucket trending toward 0 means the system
    // is mostly re-rolling structures it's already produced (Q7).
    const bucketCount = Math.min(20, ordered.length) || 1;
    const bucketSize = Math.ceil(ordered.length / bucketCount) || 1;
    const seenForBuckets = new Set<string>();
    const newPerBucket: number[] = [];
    const bucketLabels: string[] = [];
    for (let b = 0; b < bucketCount; b++) {
        const start = b * bucketSize;
        const end = Math.min(start + bucketSize, ordered.length);
        let newCount = 0;
        for (let i = start; i < end; i++) {
            if (!seenForBuckets.has(sigs[i]!)) {
                seenForBuckets.add(sigs[i]!);
                newCount++;
            }
        }
        newPerBucket.push(newCount);
        bucketLabels.push(`${start + 1}-${end}`);
    }

    // --- Q6: does more nesting depth actually increase uniqueness? ---
    const byDepth = new Map<
        number,
        { total: number; signatures: Set<string> }
    >();
    ordered.forEach((r, i) => {
        const depth = r.features.maxNestingDepth;
        if (!byDepth.has(depth))
            byDepth.set(depth, { total: 0, signatures: new Set() });
        const bucket = byDepth.get(depth)!;
        bucket.total++;
        bucket.signatures.add(sigs[i]!);
    });
    const depthUniqueness = [...byDepth.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([depth, { total, signatures }]) => ({
            depth,
            total,
            uniqueRatio: signatures.size / total,
        }));

    return {
        topStructures,
        tierLabels,
        tierCounts,
        normalizationHistograms,
        saturationCurve,
        bucketLabels,
        newPerBucket,
        depthUniqueness,
    };
}

function buildHtml(data: BulkOutput): string {
    const scores = data.spells.map((s) => s.score);
    const rawScores = data.spells.map((s) => s.rawScore);
    const scoreHist = histogram(scores);
    const rawScoreHist = histogram(rawScores);

    const symbolEntries = sortedEntries(data.summary.symbolFrequency);
    const signEntries = sortedEntries(data.summary.signFrequency);
    const analysis = computeAnalysis(data);

    const payload = {
        generatedAt: data.generatedAt,
        config: data.config,
        summary: data.summary,
        scoreHist,
        rawScoreHist,
        symbolLabels: symbolEntries.map((e) => e[0]),
        symbolCounts: symbolEntries.map((e) => e[1]),
        signLabels: signEntries.map((e) => e[0]),
        signCounts: signEntries.map((e) => e[1]),
        validCounts: [data.summary.validCount, data.summary.invalidCount],
        ...analysis,
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
  h3 { font-size: 0.95rem; margin: 0 0 0.5rem 0; color: #aaa; font-weight: 500; }
  .meta { color: #999; margin-bottom: 2rem; font-size: 0.9rem; }
  .note { color: #888; font-size: 0.8rem; margin-top: 0.5rem; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
  .full { grid-column: 1 / -1; }
  .card { background: #1b1b1b; border: 1px solid #333; border-radius: 8px; padding: 1rem; }
  .card h2 { font-size: 1rem; margin: 0 0 0.75rem 0; color: #ccc; }
  canvas { max-height: 340px; }
  .tall canvas { max-height: 480px; }
  .quad { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .quad > div { min-width: 0; }
  .quad canvas { max-height: 180px; }
</style>
</head>
<body>
<h1>Spellbox bulk metrics</h1>
<div class="meta" id="meta"></div>
<div class="grid">

  <div class="card">
    <h2>Complexity tier distribution</h2>
    <p class="note">Answers: how often do Master-tier spells appear? All tiers shown in fixed order, including zero counts.</p>
    <canvas id="tierChart"></canvas>
  </div>

  <div class="card">
    <h2>Validation: valid vs invalid</h2>
    <canvas id="validityChart"></canvas>
  </div>

  <div class="card">
    <h2>Score distribution (as generated)</h2>
    <p class="note">Answers: what distributions emerge?</p>
    <canvas id="scoreHistChart"></canvas>
  </div>

  <div class="card">
    <h2>Raw score distribution</h2>
    <canvas id="rawScoreHistChart"></canvas>
  </div>

  <div class="card tall">
    <h2>Central symbol frequency (top 25)</h2>
    <p class="note">Answers: do certain elements/cores dominate?</p>
    <canvas id="symbolChart"></canvas>
  </div>

  <div class="card tall">
    <h2>Sign frequency (top 25)</h2>
    <canvas id="signChart"></canvas>
  </div>

  <div class="card tall full">
    <h2>Full-structure frequency (top 15)</h2>
    <p class="note">Distinct structures (symbol + all signs + nesting/linking shape) ranked by how often they recur. Answers: do certain <em>whole spell structures</em> dominate, not just individual symbols/signs?</p>
    <canvas id="structureChart"></canvas>
  </div>

  <div class="card full">
    <h2>Normalization sensitivity</h2>
    <p class="note">The same raw scores run through every normalization type. Answers: how sensitive are results to the choice of normalization? Similar shapes across panels = low sensitivity; very different shapes = the choice matters a lot.</p>
    <div class="quad" id="normGrid"></div>
  </div>

  <div class="card full">
    <h2>Diversity saturation</h2>
    <p class="note">Cumulative count of structurally distinct spells as more are generated, in generation order. Answers: how quickly does diversity saturate? A flattening curve means new spells are increasingly repeats.</p>
    <canvas id="saturationChart"></canvas>
  </div>

  <div class="card full">
    <h2>New structures per generation bucket</h2>
    <p class="note">Spells are split into ${20} equal buckets in generation order; each bar is how many <em>first-ever</em> structures appeared in that bucket. Answers: at what point do generated spells become repetitive? Bars trending toward 0 mark that point.</p>
    <canvas id="bucketChart"></canvas>
  </div>

  <div class="card full">
    <h2>Uniqueness ratio by nesting depth</h2>
    <p class="note">For spells at each nesting depth: (distinct structures at that depth) / (total spells at that depth). Answers: does increasing nesting actually increase uniqueness? Bar labels include the sample size (n) — small-n depths are noisy, read them cautiously.</p>
    <canvas id="depthChart"></canvas>
  </div>

</div>

<script>
const DATA = ${embedJson(payload)};

document.getElementById("meta").textContent =
  "Generated " + DATA.summary.totalGenerated + " spells (" + DATA.summary.uniqueSignatures + " structurally distinct) on " +
  DATA.generatedAt + " — normalization used at generation time: " + (DATA.config.normalization ?? "exponential") +
  " — avg score: " + DATA.summary.averageScore.toFixed(3);

// IMPORTANT: each chart gets its OWN options object (via this factory), never
// a shared reference. Chart.js mutates the options/scales objects it's given
// internally, so passing the same object (or the same nested "scales" object
// via a shallow {...spread}) to more than one new Chart() call corrupts every
// chart that shares it — this was the root cause of the symbol/sign charts
// rendering empty before.
function freshOptions(extra) {
  return Object.assign({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#ccc" }, beginAtZero: true },
      y: { ticks: { color: "#ccc" }, beginAtZero: true },
    },
  }, extra || {});
}

new Chart(document.getElementById("tierChart"), {
  type: "bar",
  data: { labels: DATA.tierLabels, datasets: [{ data: DATA.tierCounts, backgroundColor: "#4f8cff" }] },
  options: freshOptions(),
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
  options: freshOptions(),
});

new Chart(document.getElementById("rawScoreHistChart"), {
  type: "bar",
  data: { labels: DATA.rawScoreHist.labels, datasets: [{ data: DATA.rawScoreHist.counts, backgroundColor: "#ff8f4f" }] },
  options: freshOptions(),
});

new Chart(document.getElementById("symbolChart"), {
  type: "bar",
  data: { labels: DATA.symbolLabels, datasets: [{ data: DATA.symbolCounts, backgroundColor: "#c04fff" }] },
  options: freshOptions({ indexAxis: "y" }),
});

new Chart(document.getElementById("signChart"), {
  type: "bar",
  data: { labels: DATA.signLabels, datasets: [{ data: DATA.signCounts, backgroundColor: "#4fffd4" }] },
  options: freshOptions({ indexAxis: "y" }),
});

new Chart(document.getElementById("structureChart"), {
  type: "bar",
  data: {
    labels: DATA.topStructures.map(function (s) { return s.label; }),
    datasets: [{ data: DATA.topStructures.map(function (s) { return s.count; }), backgroundColor: "#ff5f9e" }],
  },
  options: freshOptions({ indexAxis: "y" }),
});

// Small-multiples grid, one mini histogram per normalization type — each
// with its own natural range, since e.g. "none" and "sigmoid" aren't on
// comparable scales and forcing them onto one shared axis would hide shape
// differences rather than reveal them.
const normGrid = document.getElementById("normGrid");
const normColors = { sigmoid: "#4f8cff", exponential: "#ffb84f", arctan: "#4caf50", none: "#c04fff" };
DATA.normalizationHistograms.forEach(function (entry) {
  const wrapper = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = entry.type;
  const canvas = document.createElement("canvas");
  wrapper.appendChild(title);
  wrapper.appendChild(canvas);
  normGrid.appendChild(wrapper);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: entry.histogram.labels,
      datasets: [{ data: entry.histogram.counts, backgroundColor: normColors[entry.type] || "#888" }],
    },
    options: freshOptions({
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#ccc", maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { ticks: { color: "#ccc" }, beginAtZero: true },
      },
    }),
  });
});

new Chart(document.getElementById("saturationChart"), {
  type: "line",
  data: {
    labels: DATA.saturationCurve.map(function (p) { return p.n; }),
    datasets: [{
      data: DATA.saturationCurve.map(function (p) { return p.unique; }),
      borderColor: "#4f8cff",
      backgroundColor: "rgba(79,140,255,0.15)",
      fill: true,
      pointRadius: 0,
      tension: 0.15,
    }],
  },
  options: freshOptions({
    scales: {
      x: { title: { display: true, text: "spells generated", color: "#999" }, ticks: { color: "#ccc", maxTicksLimit: 10 } },
      y: { title: { display: true, text: "distinct structures seen", color: "#999" }, ticks: { color: "#ccc" }, beginAtZero: true },
    },
  }),
});

new Chart(document.getElementById("bucketChart"), {
  type: "bar",
  data: {
    labels: DATA.bucketLabels,
    datasets: [{ data: DATA.newPerBucket, backgroundColor: "#4caf50" }],
  },
  options: freshOptions({
    scales: {
      x: { title: { display: true, text: "generation order range", color: "#999" }, ticks: { color: "#ccc" } },
      y: { title: { display: true, text: "new structures in bucket", color: "#999" }, ticks: { color: "#ccc" }, beginAtZero: true },
    },
  }),
});

new Chart(document.getElementById("depthChart"), {
  type: "bar",
  data: {
    labels: DATA.depthUniqueness.map(function (d) { return "Depth " + d.depth + " (n=" + d.total + ")"; }),
    datasets: [{ data: DATA.depthUniqueness.map(function (d) { return d.uniqueRatio; }), backgroundColor: "#ffb84f" }],
  },
  options: freshOptions({
    scales: {
      x: { ticks: { color: "#ccc" } },
      y: { title: { display: true, text: "unique / total at this depth", color: "#999" }, ticks: { color: "#ccc" }, min: 0, max: 1 },
    },
  }),
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
    let raw: string;
    try {
        raw = await readFile(resolvedIn, "utf-8");
    } catch (err) {
        console.log(
            `Could not read "${resolvedIn}": ${(err as Error).message}`
        );
        process.exitCode = 1;
        return;
    }

    let data: BulkOutput;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        console.log(
            `"${resolvedIn}" is not valid JSON: ${(err as Error).message}`
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
