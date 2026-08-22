import type { Spell } from "../models/spell.ts";
import { computeFeatures } from "./spellFeatures.ts";

/**
 * Relative weights for the complexity/power score. These encode a judgment
 * call, not a rule from rules.md — tune them as the sandbox's sense of
 * "power" gets more defined. Rationale for the current values:
 *   - control signs are the mandatory baseline, so they're cheapest
 *   - manifestation signs add delivery-shape complexity
 *   - transformation signs change the *nature* of the effect, so cost more
 *   - a reversed sign requires drawing precision beyond a plain sign
 *   - a composition symbol is inherently a two-sigil effect, so it's a flat bonus
 *   - nesting compounds effects into each other (rules.md: nesting "boosts power"),
 *     so each level is weighted heavily
 *   - linking just adds parallel, independent casts — more scale, not more power per-cast
 */
export const SCORE_WEIGHTS = {
    control: 1,
    manifestation: 1.5,
    transformation: 2,
    reversed: 0.5,
    composition: 3,
    nestingLevel: 4,
    linkedBranchBeyondFirst: 2,
};

export function scoreSpell(spell: Spell): number {
    const f = computeFeatures(spell);

    return (
        f.signCounts.control * SCORE_WEIGHTS.control +
        f.signCounts.manifestation * SCORE_WEIGHTS.manifestation +
        f.signCounts.transformation * SCORE_WEIGHTS.transformation +
        f.reversedCount * SCORE_WEIGHTS.reversed +
        f.compositionCount * SCORE_WEIGHTS.composition +
        f.maxNestingDepth * SCORE_WEIGHTS.nestingLevel +
        Math.max(0, f.linkedBranches - 1) *
            SCORE_WEIGHTS.linkedBranchBeyondFirst
    );
}

export interface TierThresholds {
    /** Ascending score cutoffs. A spell scoring below thresholds[0] is tier 0, etc. */
    cutoffs: number[];
    labels: string[];
}

/**
 * Default cutoffs, derived empirically (not guessed) by sampling 2000 spells
 * from the actual generator (nesting 0-4, or linking 0-4 when unnested — the
 * two are mutually exclusive) and taking the quartile boundaries of their
 * scores (observed range across the sample: ~1 to ~52). Recompute with
 * calibrateTiers() if SCORE_WEIGHTS or the generator's random ranges change.
 */
export const DEFAULT_TIERS: TierThresholds = {
    cutoffs: [13.5, 22, 31],
    labels: ["Novice", "Apprentice", "Adept", "Master"],
};

export function classifySpell(
    spell: Spell,
    tiers: TierThresholds = DEFAULT_TIERS
): { score: number; tier: string } {
    const score = scoreSpell(spell);
    let index = tiers.cutoffs.findIndex((cutoff) => score < cutoff);
    if (index === -1) index = tiers.labels.length - 1;
    const tier = tiers.labels[index];

    if (tier === undefined) {
        throw new RangeError(
            "Tier thresholds must include at least one label."
        );
    }

    return { score, tier };
}

/**
 * Regenerates tier cutoffs from a fresh sample, using quartile boundaries so
 * tiers stay meaningful (roughly a quarter of generated spells per tier)
 * even if the scoring weights or generator change later.
 */
export function calibrateTiers(
    sampleScores: number[],
    labels: string[] = DEFAULT_TIERS.labels
): TierThresholds {
    const sorted = [...sampleScores].sort((a, b) => a - b);
    const quantileCount = labels.length;
    const cutoffs: number[] = [];
    for (let i = 1; i < quantileCount; i++) {
        const idx = Math.floor((sorted.length * i) / quantileCount);
        const value = sorted[Math.min(idx, sorted.length - 1)];

        if (value === undefined) {
            throw new RangeError(`Missing value at index ${idx}.`);
        }

        cutoffs.push(value);
    }
    return { cutoffs, labels };
}
