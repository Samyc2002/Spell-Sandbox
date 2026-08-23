import type { Spell } from "../models/spell.ts";
import { computeFeatures } from "./spellFeatures.ts";

function jaccard(a: Map<string, number>, b: Map<string, number>): number {
    const keys = new Set([...a.keys(), ...b.keys()]);
    if (keys.size === 0) return 1; // both empty on this axis: vacuously identical
    let intersection = 0;
    let union = 0;
    for (const key of keys) {
        const countA = a.get(key) ?? 0;
        const countB = b.get(key) ?? 0;
        intersection += Math.min(countA, countB);
        union += Math.max(countA, countB);
    }
    return union === 0 ? 1 : intersection / union;
}

export interface SimilarityBreakdown {
    element: number; // same core symbol(s). The spell's element/compound
    delivery: number; // same manifestation signs. How it's shot/shaped
    movement: number; // same control signs. How it's positioned/aimed
    transformation: number; // same transformation signs .What property it changes
    shape: number; // similar nesting depth / linked-branch count / total node count
    overall: number; // weighted combination
}

/**
 * Similarity in [0, 1], broken down by effect axis rather than collapsed into
 * one number blindly. Two spells that share an element but differ entirely in
 * delivery/movement will score very differently on `element` vs `delivery` —
 * that's the point: "similar" should mean "does something similar", not just
 * "uses overlapping signs regardless of what those signs do".
 */
export function similarity(a: Spell, b: Spell): SimilarityBreakdown {
    const fa = computeFeatures(a);
    const fb = computeFeatures(b);

    const element = jaccard(fa.symbolMultiset, fb.symbolMultiset);
    const delivery = jaccard(
        fa.manifestationMultiset,
        fb.manifestationMultiset
    );
    const movement = jaccard(fa.controlMultiset, fb.controlMultiset);
    const transformation = jaccard(
        fa.transformationMultiset,
        fb.transformationMultiset
    );

    const shapeVectorA = [fa.maxNestingDepth, fa.linkedBranches, fa.totalNodes];
    const shapeVectorB = [fb.maxNestingDepth, fb.linkedBranches, fb.totalNodes];
    const distance = Math.sqrt(
        shapeVectorA.reduce((sum, v, i) => sum + (v - shapeVectorB[i]!) ** 2, 0)
    );
    const shape = 1 / (1 + distance);

    const overall =
        0.35 * element +
        0.25 * delivery +
        0.25 * movement +
        0.1 * transformation +
        0.05 * shape;

    return { element, delivery, movement, transformation, shape, overall };
}
