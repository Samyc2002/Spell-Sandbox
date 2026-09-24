import JSZip from "jszip";
import { generateBulkMetrics } from "spellbox/src/core/bulkMetricsGenerator";
import { DEFAULT_TIERS } from "spellbox/src/core/spellScoring";
import { metricsFromGenerated, type Metrics } from "@/lib/metrics";

export type NestingOrLinksType = "nesting" | "links";

export type BatchConfig = {
	id: string;
	amount: string;
	nestingOrLinksType: NestingOrLinksType;
	nestingOrLinks: string;
	normalization: string;
	seed: string;
};

export type BatchResult = {
	config: BatchConfig;
	metrics: Metrics;
};

export function createConfigId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export function createEmptyConfig(
	overrides: Partial<BatchConfig> = {},
): BatchConfig {
	return {
		id: createConfigId(),
		amount: "1200",
		nestingOrLinksType: "nesting",
		nestingOrLinks: "4",
		normalization: "exponential",
		seed: "12345",
		...overrides,
	};
}

export function runConfig(config: BatchConfig): BatchResult {
	const nestingOrLinksValue = Number(config.nestingOrLinks) || 0;
	const metrics = metricsFromGenerated(
		generateBulkMetrics(
			Number(config.amount) || 1,
			config.nestingOrLinksType === "nesting" ? nestingOrLinksValue : 0,
			config.nestingOrLinksType === "links" ? nestingOrLinksValue : 0,
			config.normalization,
			Number(config.seed) || 0,
		),
	);
	return { config, metrics };
}

export function highestTier(metrics: Metrics): string {
	let maxTier = 0;
	for (let i = 0; i < metrics.tierCounts.length; i++) {
		if (metrics.tierCounts[i] > metrics.tierCounts[maxTier]) {
			maxTier = Math.max(maxTier, i);
		}
	}
	return DEFAULT_TIERS.labels[maxTier] ?? "—";
}

export function validityPercent(metrics: Metrics): number {
	return metrics.total > 0
		? Math.round((metrics.valid / metrics.total) * 100)
		: 0;
}

export function uniquenessRatio(metrics: Metrics): number {
	return metrics.total > 0 ? metrics.unique / metrics.total : 0;
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function resultsToMarkdownTable(results: BatchResult[]): string {
	const header =
		"| Run / Simulation | Amount of Spells | Validity % | Average Uniqueness Ratio | Average Complexity Score | Average Raw Score | Highest Complexity Tier | Normalization | Max Nesting | Max Linking |\n" +
		"| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |";
	const rows = results.map(({ config, metrics }, index) => {
		return `| ${index + 1} | ${metrics.total} | ${validityPercent(metrics)} | ${uniquenessRatio(
			metrics,
		).toFixed(
			2,
		)} | ${metrics.avgScore.toFixed(2)} | ${metrics.avgRawScore.toFixed(
			2,
		)} | ${highestTier(metrics)} | ${capitalize(config.normalization)} | ${metrics.maxNesting} | ${metrics.maxLinks} |`;
	});
	return [header, ...rows].join("\n");
}

export function downloadTextFile(
	filename: string,
	contents: string,
	mime = "text/plain",
) {
	const blob = new Blob([contents], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function downloadBlobFile(
	filename: string,
	blob: Blob,
	mime = "application/octet-stream",
) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.type = mime;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export async function downloadJsonReportsZip(results: BatchResult[]) {
	const zip = new JSZip();
	const reportsFolder = zip.folder("batch-reports");

	for (const [index, result] of results.entries()) {
		reportsFolder?.file(
			`batch-run-${index + 1}.json`,
			JSON.stringify(result.metrics, null, 2),
		);
	}

	const blob = await zip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
	});
	downloadBlobFile("batch-reports.zip", blob, "application/zip");
}

export function downloadJsonReport(result: BatchResult, index: number) {
	downloadTextFile(
		`batch-run-${index + 1}.json`,
		JSON.stringify(result.metrics, null, 2),
		"application/json",
	);
}

export function downloadConfigs(configs: BatchConfig[]) {
	downloadTextFile(
		"batch-configs.json",
		JSON.stringify(configs, null, 2),
		"application/json",
	);
}

function isBatchConfig(value: unknown): value is BatchConfig {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.amount === "string" &&
		(record.nestingOrLinksType === "nesting" ||
			record.nestingOrLinksType === "links") &&
		typeof record.nestingOrLinks === "string" &&
		typeof record.normalization === "string" &&
		typeof record.seed === "string"
	);
}

export function parseConfigsFile(contents: string): BatchConfig[] {
	const parsed: unknown = JSON.parse(contents);
	const rows = Array.isArray(parsed) ? parsed : [parsed];
	if (rows.length === 0 || !rows.every(isBatchConfig)) {
		throw new Error("File doesn't look like a batch config export.");
	}
	return rows.map((row) => ({ ...row, id: createConfigId() }));
}
