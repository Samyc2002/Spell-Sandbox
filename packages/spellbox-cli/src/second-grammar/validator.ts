/**
 * Structural validity for rune-chain recipes: an adjacency binding rule,
 * analogous in spirit to ../core/compatibility.ts's sigil pair table, but
 * with its own independent logic so validity % is a genuinely different
 * (not copy-pasted) non-trivial metric.
 *
 * Rule: within a single base recipe's draw sequence, each ADJACENT pair of
 * reagents must be "bindable." Some element pairs are volatile together
 * (they react and ruin the recipe) unless at least one of the two draws is
 * "distilled" (distillation tames volatility). Additionally, refinement
 * introduces its own constraint: a shell's outermost draw must not be the
 * same raw reagent as the core's outermost draw two refinements in a row
 * (representing "over-refining" with the same raw reagent, which curdles
 * the batch) -- this makes validity meaningfully sensitive to refinement
 * depth, mirroring Spellbox's H2 (validity should fall as compositional
 * depth rises).
 */
import type { BaseRecipe, Recipe, ReagentDraw } from "./recipe.ts";

// Volatile pairs: order-independent. Two reagents in this set react badly
// when adjacent unless tamed by distillation.
const VOLATILE_PAIRS = new Set<string>([
    pairKey("Ash", "Brine"),
    pairKey("Ash", "Verdant"),
    pairKey("Mercuric", "Umbral"),
    pairKey("Mercuric", "Brine"),
    pairKey("Verdant", "Umbral"),
]);

function pairKey(a: string, b: string): string {
    return [a, b].sort().join("+");
}

export interface ValidityIssue {
    severity: "error" | "warning";
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidityIssue[];
}

function checkAdjacency(draws: ReagentDraw[], issues: ValidityIssue[]): void {
    for (let i = 0; i < draws.length - 1; i++) {
        const a = draws[i]!;
        const b = draws[i + 1]!;
        const volatile = VOLATILE_PAIRS.has(pairKey(a.reagent, b.reagent));
        const tamed = a.catalyst === "distilled" || b.catalyst === "distilled";
        if (volatile && !tamed) {
            issues.push({
                severity: "error",
                message: `Volatile untamed adjacency: ${a.reagent} next to ${b.reagent}`,
            });
        }
    }

    // A raw recipe (all draws raw) with 3+ draws is flagged as unstable --
    // a softer, warning-level rule so validity has both hard failures and
    // near-misses, similar to Spellbox's error/warning split.
    if (draws.length >= 3 && draws.every((d) => d.catalyst === "raw")) {
        issues.push({
            severity: "warning",
            message: "All-raw recipe with 3+ draws is unstable",
        });
    }
}

function outermostDraw(recipe: Recipe): ReagentDraw | undefined {
    if (recipe.kind === "base") return recipe.draws[0];
    if (recipe.kind === "refined") return recipe.shellDraws[0];
    return undefined; // chains have no single outermost draw
}

function checkRecipe(
    recipe: Recipe,
    issues: ValidityIssue[],
    parentShellReagent?: { reagent: string; catalyst: string }
): void {
    switch (recipe.kind) {
        case "base": {
            checkAdjacency(recipe.draws, issues);
            break;
        }
        case "refined": {
            checkAdjacency(recipe.shellDraws, issues);

            const outer = recipe.shellDraws[0];
            if (
                outer &&
                parentShellReagent &&
                outer.reagent === parentShellReagent.reagent &&
                outer.catalyst === "raw" &&
                parentShellReagent.catalyst === "raw"
            ) {
                issues.push({
                    severity: "error",
                    message: `Over-refined with repeated raw ${outer.reagent} across adjacent refinement levels`,
                });
            }

            checkRecipe(
                recipe.core,
                issues,
                outer ? { reagent: outer.reagent, catalyst: outer.catalyst } : undefined
            );
            break;
        }
        case "chained": {
            for (const link of recipe.links) {
                checkRecipe(link, issues, undefined);
            }
            // A chain where two adjacent links share the exact same
            // outermost reagent+catalyst is flagged as a warning ("wasted
            // link" -- redundant chaining).
            for (let i = 0; i < recipe.links.length - 1; i++) {
                const a = outermostDraw(recipe.links[i]!);
                const b = outermostDraw(recipe.links[i + 1]!);
                if (
                    a &&
                    b &&
                    a.reagent === b.reagent &&
                    a.catalyst === b.catalyst
                ) {
                    issues.push({
                        severity: "warning",
                        message: `Redundant adjacent chain links (${a.reagent}/${a.catalyst})`,
                    });
                }
            }
            break;
        }
    }
}

export function validateRecipe(recipe: Recipe): ValidationResult {
    const issues: ValidityIssue[] = [];
    checkRecipe(recipe, issues, undefined);
    const valid = !issues.some((i) => i.severity === "error");
    return { valid, issues };
}
