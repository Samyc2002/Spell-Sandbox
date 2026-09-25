/**
 * Bulk generation of rune-chain recipes for a given shape (amount,
 * refinement depth ceiling, chain-link ceiling), analogous to
 * ../core/bulkMetricsGenerator.ts's generateBulkMetrics but built entirely
 * on second-grammar's own generator/validator/scoring modules.
 */
import { buildRecipe, randomRecipeConfig, runeRng } from "./generator.ts";
import { validateRecipe } from "./validator.ts";
import {
    computeRecipeFeatures,
    normalizeScore,
    rawScoreRecipe,
    signatureRecipe,
    type RecipeFeatures,
} from "./scoring.ts";
import type { Recipe } from "./recipe.ts";

export interface RuneRecord {
    id: number;
    signature: string;
    rawScore: number;
    score: number;
    valid: boolean;
    errorCount: number;
    warningCount: number;
    features: RecipeFeatures;
}

export interface RuneBulkSummary {
    totalGenerated: number;
    uniqueSignatures: number;
    uniqueValidSignatures: number;
    validCount: number;
    invalidCount: number;
    averageRawScore: number;
    averageScore: number;
}

export interface RuneBulkOutput {
    seed: number;
    config: {
        count: number;
        maxRefinements: number;
        maxChainLinks: number;
        seed: number;
    };
    summary: RuneBulkSummary;
    recipes: RuneRecord[];
}

function buildRecord(id: number, recipe: Recipe): RuneRecord {
    const raw = rawScoreRecipe(recipe);
    const validation = validateRecipe(recipe);
    return {
        id,
        signature: signatureRecipe(recipe),
        rawScore: raw,
        score: normalizeScore(raw),
        valid: validation.valid,
        errorCount: validation.issues.filter((i) => i.severity === "error").length,
        warningCount: validation.issues.filter((i) => i.severity === "warning").length,
        features: computeRecipeFeatures(recipe),
    };
}

export function generateRuneBulk(
    count: number,
    maxRefinements: number,
    maxChainLinks: number,
    seed: number
): RuneBulkOutput {
    const safeCount = Math.max(0, Math.floor(count));
    const rng = runeRng(seed);
    const recipes: RuneRecord[] = [];

    let validCount = 0;
    let totalRaw = 0;
    let totalScore = 0;
    const signatures = new Set<string>();
    const validSignatures = new Set<string>();

    for (let id = 0; id < safeCount; id++) {
        const { refinements, chainLinks } = randomRecipeConfig(
            rng,
            maxRefinements,
            maxChainLinks
        );
        const recipe = buildRecipe(rng, { refinements, chainLinks });
        const record = buildRecord(id, recipe);
        recipes.push(record);
        if (record.valid) {
            validCount++;
            validSignatures.add(record.signature);
        }
        totalRaw += record.rawScore;
        totalScore += record.score;
        signatures.add(record.signature);
    }

    return {
        seed,
        config: { count: safeCount, maxRefinements, maxChainLinks, seed },
        summary: {
            totalGenerated: safeCount,
            uniqueSignatures: signatures.size,
            uniqueValidSignatures: validSignatures.size,
            validCount,
            invalidCount: safeCount - validCount,
            averageRawScore: safeCount ? totalRaw / safeCount : 0,
            averageScore: safeCount ? totalScore / safeCount : 0,
        },
        recipes,
    };
}

/**
 * Generate a bulk batch at a FIXED shape (no random refinements/chainLinks
 * draw per item) -- used by depth sweeps and discovery sequences where we
 * want every item in the batch built at exactly the same depth/width, not
 * a random draw up to a ceiling.
 */
export function generateRuneBulkFixedShape(
    count: number,
    refinements: number,
    chainLinks: number,
    seed: number
): RuneBulkOutput {
    const safeCount = Math.max(0, Math.floor(count));
    const rng = runeRng(seed);
    const recipes: RuneRecord[] = [];

    let validCount = 0;
    let totalRaw = 0;
    let totalScore = 0;
    const signatures = new Set<string>();
    const validSignatures = new Set<string>();

    for (let id = 0; id < safeCount; id++) {
        const recipe = buildRecipe(rng, { refinements, chainLinks });
        const record = buildRecord(id, recipe);
        recipes.push(record);
        if (record.valid) {
            validCount++;
            validSignatures.add(record.signature);
        }
        totalRaw += record.rawScore;
        totalScore += record.score;
        signatures.add(record.signature);
    }

    return {
        seed,
        config: {
            count: safeCount,
            maxRefinements: refinements,
            maxChainLinks: chainLinks,
            seed,
        },
        summary: {
            totalGenerated: safeCount,
            uniqueSignatures: signatures.size,
            uniqueValidSignatures: validSignatures.size,
            validCount,
            invalidCount: safeCount - validCount,
            averageRawScore: safeCount ? totalRaw / safeCount : 0,
            averageScore: safeCount ? totalScore / safeCount : 0,
        },
        recipes,
    };
}
