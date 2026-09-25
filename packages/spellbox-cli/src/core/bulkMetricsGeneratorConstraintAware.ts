import spellBuilderConstraintAware, {
    SEED,
} from "./spellBuilderConstraintAware.ts";
import { defaultRng } from "./random.ts";
import { NORMALIZATION_TYPES } from "./normalization.ts";
import {
    buildRecord,
    randomSpellConfig,
    SummaryAccumulator,
    type BulkOutput,
} from "./bulkMetricsShared.ts";

/**
 * Mirrors generateBulkMetrics in bulkMetricsGenerator.ts exactly, except it
 * drives the constraint-aware spell builder (spellBuilderConstraintAware.ts)
 * instead of the default spellBuilder. Shared record-building/summary logic
 * is factored into bulkMetricsShared.ts and reused by both, rather than
 * duplicated. Does not change generateBulkMetrics's existing behavior.
 */
export function generateBulkMetricsConstraintAware(
    count: number,
    maxNested = 4,
    maxLinked = 4,
    normalization: string = NORMALIZATION_TYPES.EXPONENTIAL,
    seed: number = SEED
): BulkOutput {
    const safeCount = Math.max(0, Math.floor(count));
    const spells = [];
    const accumulator = new SummaryAccumulator();
    const rng = defaultRng(seed);

    for (let id = 0; id < safeCount; id++) {
        const { nested, linked } = randomSpellConfig(rng, maxNested, maxLinked);
        const { spell } = spellBuilderConstraintAware(rng, { nested, linked });
        const record = buildRecord(id, spell, normalization);
        accumulator.add(record);
        spells.push(record);
    }

    return {
        generatedAt: new Date().toISOString(),
        seed,
        config: { count: safeCount, maxNested, maxLinked, normalization, seed },
        summary: accumulator.finalize(),
        spells,
    };
}
