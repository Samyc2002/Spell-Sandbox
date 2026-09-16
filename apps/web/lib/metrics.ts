import { type BulkOutput } from "spellbox/src/core/bulkMetricsGenerator";

export type Histogram = { labels: string[]; counts: number[] };

export type Metrics = {
  generatedAt: string;
  total: number;
  unique: number;
  valid: number;
  average: number;
  tierCounts: number[];
  tierLabels: string[];
  symbolLabels: string[];
  symbolCounts: number[];
  signLabels: string[];
  signCounts: number[];
  scoreHist: Histogram;
  rawScoreHist: Histogram;
  normalizationHistograms: { type: string; histogram: Histogram }[];
  saturation: { n: number; unique: number }[];
  buckets: { label: string; count: number }[];
  depth: { label: string; ratio: number; total: number }[];
};

export const palette = ["#f5a65b", "#58c8b0", "#e56b8a", "#8c7cf4", "#e8d36b"];

function histogram(values: number[], binCount = 12): Histogram {
  if (values.length === 0) return { labels: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
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

export function metricsFromGenerated(data: BulkOutput): Metrics {
  const records = [...data.spells].sort((a, b) => a.id - b.id);
  const signatures = records.map((record) => record.signature);
  const counts = new Map<string, number>();
  signatures.forEach((value) =>
    counts.set(value, (counts.get(value) ?? 0) + 1),
  );
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
    const entry = depthMap.get(depth) ?? { total: 0, signatures: new Set() };
    entry.total++;
    entry.signatures.add(record.signature);
    depthMap.set(depth, entry);
  });

  return {
    generatedAt: data.generatedAt,
    total: data.summary.totalGenerated,
    unique: data.summary.uniqueSignatures,
    valid: data.summary.validCount,
    average: data.summary.averageScore,
    tierLabels: ["Cantrip", "Apprentice", "Adept", "Master"],
    tierCounts: ["Cantrip", "Apprentice", "Adept", "Master"].map(
      (tier) => data.summary.tierCounts[tier] ?? 0,
    ),
    symbolLabels: sorted(data.summary.symbolFrequency, 5).map(
      ([label]) => label,
    ),
    symbolCounts: sorted(data.summary.symbolFrequency, 5).map(
      ([, value]) => value,
    ),
    signLabels: sorted(data.summary.signFrequency, 6).map(([label]) => label),
    signCounts: sorted(data.summary.signFrequency, 6).map(([, value]) => value),
    scoreHist: histogram(records.map((record) => record.score)),
    rawScoreHist: histogram(records.map((record) => record.rawScore)),
    normalizationHistograms: ["sigmoid", "exponential", "arctan", "none"].map(
      (type) => ({
        type,
        histogram: histogram(records.map((record) => record.rawScore)),
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
  };
}
