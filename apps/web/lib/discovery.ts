export type NestingOrLinksType = "nesting" | "links";

export type DiscoverySequenceConfig = {
	id: string;
	amount: string;
	nestingOrLinksType: NestingOrLinksType;
	nestingOrLinks: string;
	normalization: string;
	startSeed: string;
	runCount: string;
};

export type DiscoveryRunResult = {
	runIndex: number;
	seed: number;
	total: number;
	newCount: number;
	discoveryRate: number;
	cumulativeUnique: number;
	cumulativeTotal: number;
	newValidCount: number;
	validTotal: number;
	discoveryRateValidOnly: number;
	cumulativeUniqueValid: number;
};

export type DiscoverySequenceResult = {
	config: DiscoverySequenceConfig;
	shapeKey: string;
	amount: number;
	nestingOrLinksType: NestingOrLinksType;
	nestingOrLinks: number;
	normalization: string;
	runs: DiscoveryRunResult[];
};

// A sequence this large starts stressing the same main-thread limits that
// used to crash the tab on big single/batch runs (see lib/batch.ts,
// lib/metrics.ts) -- amount * runCount spells all get generated and their
// signatures deduped in one request. The API route runs server-side in
// Node so it won't freeze the page, but an extreme sequence can still be
// slow to respond, so the UI caps what it'll submit.
export const MAX_SEQUENCE_SPELLS = 2_000_000;

export function createSequenceId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export function createEmptySequence(
	overrides: Partial<DiscoverySequenceConfig> = {},
): DiscoverySequenceConfig {
	return {
		id: createSequenceId(),
		amount: "1200",
		nestingOrLinksType: "nesting",
		nestingOrLinks: "4",
		normalization: "exponential",
		startSeed: "1",
		runCount: "20",
		...overrides,
	};
}

export function sequenceSpellCount(config: DiscoverySequenceConfig): number {
	return (Number(config.amount) || 0) * (Number(config.runCount) || 0);
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

export function downloadSequenceConfigs(configs: DiscoverySequenceConfig[]) {
	downloadTextFile(
		"discovery-sequences.json",
		JSON.stringify(configs, null, 2),
		"application/json",
	);
}

function isDiscoverySequenceConfig(
	value: unknown,
): value is DiscoverySequenceConfig {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.amount === "string" &&
		(record.nestingOrLinksType === "nesting" ||
			record.nestingOrLinksType === "links") &&
		typeof record.nestingOrLinks === "string" &&
		typeof record.normalization === "string" &&
		typeof record.startSeed === "string" &&
		typeof record.runCount === "string"
	);
}

export function parseSequencesFile(
	contents: string,
): DiscoverySequenceConfig[] {
	const parsed: unknown = JSON.parse(contents);
	const rows = Array.isArray(parsed) ? parsed : [parsed];
	if (rows.length === 0 || !rows.every(isDiscoverySequenceConfig)) {
		throw new Error("File doesn't look like a discovery sequence export.");
	}
	return rows.map((row) => ({ ...row, id: createSequenceId() }));
}

export function sequenceLabel(result: DiscoverySequenceResult): string {
	if (result.nestingOrLinks === 0) {
		return `amount=${result.amount}, no nesting/linking`;
	}
	return `amount=${result.amount}, ${result.nestingOrLinksType}=${result.nestingOrLinks}`;
}

export function downloadSequenceResults(results: DiscoverySequenceResult[]) {
	downloadTextFile(
		"discovery-reports.json",
		JSON.stringify(results, null, 2),
		"application/json",
	);
}

export function resultsToMarkdownTable(
	results: DiscoverySequenceResult[],
): string {
	const header =
		"| Sequence | Run | Seed | Total | New | Discovery Rate % | Cumulative Unique | Valid Total | New (valid only) | Discovery Rate % (valid only) | Cumulative Unique (valid only) |\n" +
		"| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |";
	const rows = results.flatMap((result) =>
		result.runs.map(
			(run) =>
				`| ${sequenceLabel(result)} | ${run.runIndex} | ${run.seed} | ${run.total} | ${run.newCount} | ${(run.discoveryRate * 100).toFixed(1)} | ${run.cumulativeUnique} | ${run.validTotal} | ${run.newValidCount} | ${(run.discoveryRateValidOnly * 100).toFixed(1)} | ${run.cumulativeUniqueValid} |`,
		),
	);
	return [header, ...rows].join("\n");
}
