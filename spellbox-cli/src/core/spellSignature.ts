import { computeFeatures } from "./spellFeatures.ts";
import type { Spell } from "../models/spell.ts";

/**
 * A structural "fingerprint" for counting distinct spells (plan.md Q1/Q2).
 * Deliberately effect-based rather than raw JSON equality: two spells with
 * the same signs/symbols/shape but signs listed in a different array order,
 * or nested/linked children in a different order, count as the *same* spell
 * here, since sign order doesn't change what the spell does. This is a
 * design choice — if you want strict positional equality instead, compare
 * JSON.stringify(spell) directly rather than this signature.
 *
 * Shared between bulkMetrics.ts (dedup at generation time) and
 * plotMetrics.ts (recomputing signatures from stored spell JSON) so both
 * always agree on what counts as "the same spell".
 */
export function signature(spell: Spell): string {
    const f = computeFeatures(spell);
    const sortedEntries = (m: Map<string, number>) =>
        [...m.entries()].sort(([a], [b]) => a.localeCompare(b));

    return JSON.stringify({
        symbol: sortedEntries(f.symbolMultiset),
        control: sortedEntries(f.controlMultiset),
        manifestation: sortedEntries(f.manifestationMultiset),
        transformation: sortedEntries(f.transformationMultiset),
        reversedCount: f.reversedCount,
        nesting: f.maxNestingDepth,
        linked: f.linkedBranches,
        compositionCount: f.compositionCount,
    });
}
