/**
 * Raw complexity/power score and structural signature for rune-chain
 * recipes. Mirrors the design philosophy of ../core/spellScoring.ts's
 * SCORE_WEIGHTS (nesting weighted heavily, linking weighted as
 * "more scale, not more power") with its own concrete weights and
 * features, and ../core/spellSignature.ts's idea of a deterministic
 * structural fingerprint for discovery-rate/uniqueness tracking.
 */
import {
    allDraws,
    chainWidth,
    leafCount,
    refinementDepth,
    type Recipe,
    type ReagentDraw,
} from "./recipe.ts";

/**
 * Weight rationale (independent judgment call from Spellbox's, on purpose):
 *   - each reagent draw is the mandatory baseline unit, so cheapest
 *   - a distilled catalyst requires extra process precision, so costs more
 *     than a raw draw of the same reagent
 *   - refinement (nesting-equivalent) compounds the whole recipe's potency
 *     inside another shell -- each level is weighted heavily, mirroring
 *     Spellbox nesting's "boosts power" design note
 *   - chaining (linking-equivalent) just adds more independent, parallel
 *     recipes -- more scale, not more power per recipe, so each link
 *     beyond the first is weighted lightly
 */
export const RUNE_SCORE_WEIGHTS = {
    draw: 1,
    distilledBonus: 0.5,
    refinementLevel: 4.5,
    chainLinkBeyondFirst: 1.5,
};

export function rawScoreRecipe(recipe: Recipe): number {
    const draws = allDraws(recipe);
    const distilledCount = draws.filter((d) => d.catalyst === "distilled").length;
    const depth = refinementDepth(recipe);
    const width = chainWidth(recipe);

    return (
        draws.length * RUNE_SCORE_WEIGHTS.draw +
        distilledCount * RUNE_SCORE_WEIGHTS.distilledBonus +
        depth * RUNE_SCORE_WEIGHTS.refinementLevel +
        Math.max(0, width - 1) * RUNE_SCORE_WEIGHTS.chainLinkBeyondFirst
    );
}

/** Bounded [0,1) normalization, same shape idea as core/normalization.ts's exponential option. */
export function normalizeScore(raw: number): number {
    return 1 - Math.exp(-raw / 12);
}

function drawSig(d: ReagentDraw): string {
    return `${d.reagent[0]}${d.catalyst === "distilled" ? "d" : "r"}`;
}

/**
 * Deterministic structural signature: a canonical string encoding the full
 * shape (refinement nesting, chain links, and each base recipe's ordered
 * draws). Two recipes with the same signature are structurally identical
 * for discovery-rate purposes, regardless of which seed produced them.
 */
export function signatureRecipe(recipe: Recipe): string {
    switch (recipe.kind) {
        case "base":
            return `B[${recipe.draws.map(drawSig).join(",")}]`;
        case "refined":
            return `R[${recipe.shellDraws.map(drawSig).join(",")}]>${signatureRecipe(recipe.core)}`;
        case "chained":
            return `C(${recipe.links.map(signatureRecipe).join("|")})`;
    }
}

export interface RecipeFeatures {
    totalDraws: number;
    leafCount: number;
    refinementDepth: number;
    chainWidth: number;
    distilledCount: number;
    rawCount: number;
}

export function computeRecipeFeatures(recipe: Recipe): RecipeFeatures {
    const draws = allDraws(recipe);
    return {
        totalDraws: draws.length,
        leafCount: leafCount(recipe),
        refinementDepth: refinementDepth(recipe),
        chainWidth: chainWidth(recipe),
        distilledCount: draws.filter((d) => d.catalyst === "distilled").length,
        rawCount: draws.filter((d) => d.catalyst === "raw").length,
    };
}
