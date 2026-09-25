import { type BulkOutput } from "spellbox/src/core/bulkMetricsGenerator";
import { DEFAULT_TIERS } from "spellbox/src/core/spellScoring";

export type Histogram = { labels: string[]; counts: number[] };

export type Metrics = {
	generatedAt: string;
	total: number;
	unique: number;
	uniqueValid: number;
	valid: number;
	average: number;
	maxNesting: number;
	maxLinks: number;
	normalization: string;
	seed: number;
	tierCounts: number[];
	tierLabels: string[];
	symbolLabels: string[];
	symbolCounts: number[];
	signLabels: string[];
	signCounts: number[];
	avgScore: number;
	scoreHist: Histogram;
	avgRawScore: number;
	rawScoreHist: Histogram;
	normalizationHistograms: { type: string; histogram: Histogram }[];
	saturation: { n: number; unique: number; uniqueValid: number }[];
	buckets: { label: string; count: number }[];
	depth: { label: string; ratio: number; total: number }[];
	avgRatio: number;
};

export const palette = ["#f5a65b", "#58c8b0", "#e56b8a", "#8c7cf4", "#e8d36b"];

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

export function metricsFromGenerated(data: BulkOutput): Metrics {
	console.info("Raw Data", data);
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
	const seenValid = new Set<string>();
	const saturation = records.map((record, index) => {
		seen.add(record.signature);
		if (record.valid) {
			seenValid.add(record.signature);
		}
		return { n: index + 1, unique: seen.size, uniqueValid: seenValid.size };
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
			signatures: new Set(),
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
		uniqueValid: data.summary.uniqueValidSignatures,
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
		tierCounts: tierCounts,
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
		scoreHist: histogram(records.map((record) => record.score)),
		avgRawScore:
			records.reduce((acc, curr) => acc + curr.rawScore, 0) /
			records.length,
		rawScoreHist: histogram(records.map((record) => record.rawScore)),
		normalizationHistograms: [
			"sigmoid",
			"exponential",
			"arctan",
			"none",
		].map((type) => ({
			type,
			histogram: histogram(records.map((record) => record.rawScore)),
		})),
		saturation:
			saturation.length > 150
				? saturation.filter(
						(_, index) =>
							index % Math.ceil(saturation.length / 150) === 0,
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
