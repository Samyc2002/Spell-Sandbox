/**
 * Rune-chain: a second, independent toy grammar for the generality check
 * described in the research paper (H1/H2 beyond Spellbox's specific rule
 * set). It is intentionally a *different* flavor from spells/sigils:
 * "reagents" bound by "binding rules" into "recipes," composed via
 * "refinement" (nesting-equivalent: wrap a recipe as the volatile core of
 * an outer recipe, compounding potency) and "chaining" (linking-equivalent:
 * sequence independent recipes side by side).
 *
 * This module owns only the data model + pure structural helpers
 * (adjacency pairs, depth/width measurement). Generation lives in
 * generator.ts, validity in validator.ts, scoring/signature in scoring.ts.
 */

/** The five base reagents. Each carries an element used by the binding rule. */
export type Reagent = "Ash" | "Brine" | "Verdant" | "Mercuric" | "Umbral";

export const REAGENTS: readonly Reagent[] = [
    "Ash",
    "Brine",
    "Verdant",
    "Mercuric",
    "Umbral",
];

/** A catalyst modifies how a reagent binds; analogous to a "reversed" sign flag. */
export type Catalyst = "raw" | "distilled";

export interface ReagentDraw {
    reagent: Reagent;
    catalyst: Catalyst;
}

/**
 * A base recipe: an ordered sequence of reagent draws that must satisfy the
 * adjacency binding rule (see validator.ts). This is the grammar's leaf
 * unit, roughly analogous to a BasicSpell's flat sign list.
 */
export interface BaseRecipe {
    kind: "base";
    draws: ReagentDraw[];
}

/**
 * Refinement (nesting-equivalent): wraps a "core" recipe inside an outer
 * shell recipe. The outer shell's own draws surround/compound the core's
 * effect. Each level of refinement is one nesting level.
 */
export interface RefinedRecipe {
    kind: "refined";
    shellDraws: ReagentDraw[];
    core: Recipe;
}

/**
 * Chaining (linking-equivalent): sequences multiple independent recipes
 * side by side. Each link is independent (not nested inside the others),
 * analogous to Spellbox's linked branches.
 */
export interface ChainedRecipe {
    kind: "chained";
    links: Recipe[];
}

export type Recipe = BaseRecipe | RefinedRecipe | ChainedRecipe;

/** Refinement depth: how many "refined" wrappers deep the recipe goes. */
export function refinementDepth(recipe: Recipe): number {
    switch (recipe.kind) {
        case "base":
            return 0;
        case "refined":
            return 1 + refinementDepth(recipe.core);
        case "chained":
            return Math.max(0, ...recipe.links.map(refinementDepth));
    }
}

/** Chain width: the number of top-level independent links, 1 if unchained. */
export function chainWidth(recipe: Recipe): number {
    if (recipe.kind === "chained") return recipe.links.length;
    return 1;
}

/** All reagent draws appearing anywhere in the recipe (for scoring/validity). */
export function allDraws(recipe: Recipe): ReagentDraw[] {
    switch (recipe.kind) {
        case "base":
            return [...recipe.draws];
        case "refined":
            return [...recipe.shellDraws, ...allDraws(recipe.core)];
        case "chained":
            return recipe.links.flatMap(allDraws);
    }
}

/** Total number of base recipe leaves in the structure. */
export function leafCount(recipe: Recipe): number {
    switch (recipe.kind) {
        case "base":
            return 1;
        case "refined":
            return leafCount(recipe.core);
        case "chained":
            return recipe.links.reduce((sum, l) => sum + leafCount(l), 0);
    }
}
