/**
 * Random generator for the rune-chain grammar. Mirrors the seeded-RNG,
 * shape-parameterized approach of ../core/spellBuilder.ts (nested/linked
 * counts chosen up front, then structure built to match), but is a
 * self-contained implementation using second-grammar/random.ts.
 */
import { runeRng, runeRandomElement, type RuneGenerator } from "./random.ts";
import {
    REAGENTS,
    type Catalyst,
    type ReagentDraw,
    type BaseRecipe,
    type Recipe,
} from "./recipe.ts";

const CATALYSTS: readonly Catalyst[] = ["raw", "distilled"];

// A base recipe draws exactly this many reagents (5 reagents x 2 catalysts
// = 10 choices per draw). Kept small and FIXED (not a random 1..N range)
// on purpose: each refinement level or chain link multiplies the
// structural-signature space by another ~10x, so a tiny per-unit branching
// factor is what keeps that growth from instantly blowing past any
// realistic sample size and flatlining uniqueness/discovery rate at 100%
// for every non-zero depth (the degenerate outcome the paper's reviewer
// asked us to rule out). With base=2 draws and 1 draw per refinement
// level/chain link, the signature space grows roughly as 10^(2+depth),
// which stays comparable to our sweep's sample sizes (~1200-36000) across
// the depths we actually sweep (0-12), producing a real, gradual
// saturation curve instead of an instant ceiling.
const BASE_DRAW_COUNT = 2;
const SHELL_DRAW_COUNT = 1;
const CHAIN_LINK_DRAW_COUNT = 1;

function randomDraw(rng: RuneGenerator): ReagentDraw {
    return {
        reagent: runeRandomElement(rng, REAGENTS),
        catalyst: runeRandomElement(rng, CATALYSTS),
    };
}

function randomDraws(rng: RuneGenerator, count: number): ReagentDraw[] {
    const draws: ReagentDraw[] = [];
    for (let i = 0; i < count; i++) draws.push(randomDraw(rng));
    return draws;
}

function randomBaseRecipe(rng: RuneGenerator, drawCount = BASE_DRAW_COUNT): BaseRecipe {
    return { kind: "base", draws: randomDraws(rng, drawCount) };
}

/**
 * Build a recipe with exactly `refinements` levels of refinement
 * (nesting-equivalent) wrapped around a randomly generated core, and,
 * if refinements === 0, optionally `chainLinks` independent links
 * chained together (linking-equivalent). Mirrors bulkMetricsGenerator's
 * rule that nesting and linking are chosen mutually exclusively per draw
 * (a spell is either nested or linked, not both), which keeps the two
 * composition axes cleanly separable in the sweeps.
 */
export function buildRecipe(
    rng: RuneGenerator,
    config: { refinements: number; chainLinks: number }
): Recipe {
    const { refinements, chainLinks } = config;

    if (refinements > 0) {
        let recipe: Recipe = randomBaseRecipe(rng);
        for (let level = 0; level < refinements; level++) {
            const shellDraws = randomDraws(rng, SHELL_DRAW_COUNT);
            recipe = { kind: "refined", shellDraws, core: recipe };
        }
        return recipe;
    }

    if (chainLinks > 0) {
        const links: Recipe[] = [];
        for (let i = 0; i <= chainLinks; i++) {
            links.push(randomBaseRecipe(rng, CHAIN_LINK_DRAW_COUNT));
        }
        return { kind: "chained", links };
    }

    return randomBaseRecipe(rng);
}

export function randomRecipeConfig(
    rng: RuneGenerator,
    maxRefinements: number,
    maxChainLinks: number
): { refinements: number; chainLinks: number } {
    const refinements = rng.integers(maxRefinements + 1);
    const chainLinks = refinements === 0 ? rng.integers(maxChainLinks + 1) : 0;
    return { refinements, chainLinks };
}

export { runeRng };
