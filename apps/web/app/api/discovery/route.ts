import { generateBulkMetrics } from "spellbox/src/core/bulkMetricsGenerator";
import {
	MAX_SEQUENCE_SPELLS,
	sequenceSpellCount,
	type DiscoverySequenceConfig,
	type DiscoverySequenceResult,
	type NestingOrLinksType,
} from "@/lib/discovery";

// Runs discovery-rate sequences on the server (Node runtime) instead of in
// the browser. Same reasoning as packages/spellbox-cli/src/scripts/
// runDiscoverySweep.ts: a sequence of repeated large generations is exactly
// the workload that used to freeze/crash the tab on big single/batch runs,
// so this keeps that work off the client's main thread entirely. The route
// mirrors runDiscoverySweep.ts's grouping/signature logic so the web UI and
// the CLI script always agree on how discovery rate is computed.
export const runtime = "nodejs";

function shapeKeyOf(config: DiscoverySequenceConfig): string {
	return `${config.amount}|${config.nestingOrLinksType}|${config.nestingOrLinks}|${config.startSeed}|${config.runCount}`;
}

function isValidConfig(value: unknown): value is DiscoverySequenceConfig {
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

function runSequence(config: DiscoverySequenceConfig): DiscoverySequenceResult {
	const amount = Number(config.amount) || 1;
	const nestingOrLinksValue = Number(config.nestingOrLinks) || 0;
	const startSeed = Number(config.startSeed) || 0;
	const runCount = Math.max(1, Number(config.runCount) || 1);
	const nestingOrLinksType: NestingOrLinksType = config.nestingOrLinksType;

	const seen = new Set<string>();
	const seenValid = new Set<string>();
	const runs: DiscoverySequenceResult["runs"] = [];
	let cumulativeTotal = 0;

	for (let i = 0; i < runCount; i++) {
		const seed = startSeed + i;
		const bulk = generateBulkMetrics(
			amount,
			nestingOrLinksType === "nesting" ? nestingOrLinksValue : 0,
			nestingOrLinksType === "links" ? nestingOrLinksValue : 0,
			config.normalization,
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

		const total = bulk.spells.length;
		cumulativeTotal += total;

		runs.push({
			runIndex: i + 1,
			seed,
			total,
			newCount,
			discoveryRate: total > 0 ? newCount / total : 0,
			cumulativeUnique: seen.size,
			cumulativeTotal,
			newValidCount,
			validTotal,
			discoveryRateValidOnly: validTotal > 0 ? newValidCount / validTotal : 0,
			cumulativeUniqueValid: seenValid.size,
		});
	}

	return {
		config,
		shapeKey: shapeKeyOf(config),
		amount,
		nestingOrLinksType,
		nestingOrLinks: nestingOrLinksValue,
		normalization: config.normalization,
		runs,
	};
}

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const configs = (body as { configs?: unknown })?.configs;
	if (!Array.isArray(configs) || configs.length === 0) {
		return Response.json(
			{ error: "Expected a non-empty `configs` array." },
			{ status: 400 },
		);
	}
	if (!configs.every(isValidConfig)) {
		return Response.json(
			{ error: "One or more sequence configs are malformed." },
			{ status: 400 },
		);
	}

	const totalSpells = configs.reduce(
		(acc, config) => acc + sequenceSpellCount(config),
		0,
	);
	if (totalSpells > MAX_SEQUENCE_SPELLS) {
		return Response.json(
			{
				error: `Requested ${totalSpells.toLocaleString("en-US")} total spells across all sequences, which is above the ${MAX_SEQUENCE_SPELLS.toLocaleString("en-US")} cap. Reduce amount, run count, or the number of queued sequences.`,
			},
			{ status: 400 },
		);
	}

	const results = configs.map(runSequence);
	return Response.json({ results });
}
