import spellBuilder, { SEED } from "./spellBuilder.ts";
import { defaultRng, type Generator } from "./random.ts";
import { computeFeatures, type SpellFeatures } from "./spellFeatures.ts";
import { classifySpell, rawScoreSpell } from "./spellScoring.ts";
import { signature } from "./spellSignature.ts";
import { validateSpell } from "./spellValidator.ts";
import type { Spell } from "../models/spell.ts";
import { NORMALIZATION_TYPES } from "./normalization.ts";

export interface SpellRecord {
    id: number;
    spell: Spell;
    signature: string;
    rawScore: number;
    score: number;
    tier: string;
    valid: boolean;
    errorCount: number;
    warningCount: number;
    features: {
        totalNodes: number;
        linkedBranches: number;
        maxNestingDepth: number;
        signCounts: SpellFeatures["signCounts"];
        reversedCount: number;
        compositionCount: number;
        incompatibleCompositionCount: number;
        signMultiset: Record<string, number>;
        controlMultiset: Record<string, number>;
        manifestationMultiset: Record<string, number>;
        transformationMultiset: Record<string, number>;
        symbolMultiset: Record<string, number>;
    };
}

export interface BulkSummary {
    totalGenerated: number;
    uniqueSignatures: number;
    validCount: number;
    invalidCount: number;
    averageScore: number;
    tierCounts: Record<string, number>;
    symbolFrequency: Record<string, number>;
    signFrequency: Record<string, number>;
}

export interface BulkOutput {
    generatedAt: string;
    seed: number;
    config: {
        count: number;
        maxNested: number;
        maxLinked: number;
        normalization: string;
        seed: number;
    };
    summary: BulkSummary;
    spells: SpellRecord[];
}

function mapToObject(map: Map<string, number>): Record<string, number> {
    return Object.fromEntries(map);
}

function randomSpellConfig(
    rng: Generator,
    maxNested: number,
    maxLinked: number
): { nested: number; linked: number } {
    const nested = rng.integers(maxNested + 1);
    const linked = nested === 0 ? rng.integers(maxLinked + 1) : 0;
    return { nested, linked };
}

function buildRecord(
    id: number,
    spell: Spell,
    normalizationType: string
): SpellRecord {
    const features = computeFeatures(spell);
    const raw = rawScoreSpell(spell);
    const { score, tier } = classifySpell(spell, undefined, normalizationType);
    const validation = validateSpell(spell);

    return {
        id,
        spell,
        signature: signature(spell),
        rawScore: raw,
        score,
        tier,
        valid: validation.valid,
        errorCount: validation.issues.filter((i) => i.severity === "error")
            .length,
        warningCount: validation.issues.filter((i) => i.severity === "warning")
            .length,
        features: {
            totalNodes: features.totalNodes,
            linkedBranches: features.linkedBranches,
            maxNestingDepth: features.maxNestingDepth,
            signCounts: features.signCounts,
            reversedCount: features.reversedCount,
            compositionCount: features.compositionCount,
            incompatibleCompositionCount: features.incompatibleCompositionCount,
            signMultiset: mapToObject(features.signMultiset),
            controlMultiset: mapToObject(features.controlMultiset),
            manifestationMultiset: mapToObject(features.manifestationMultiset),
            transformationMultiset: mapToObject(
                features.transformationMultiset
            ),
            symbolMultiset: mapToObject(features.symbolMultiset),
        },
    };
}

class SummaryAccumulator {
    private tierCounts: Record<string, number> = {};
    private symbolFrequency: Record<string, number> = {};
    private signFrequency: Record<string, number> = {};
    private signatures = new Set<string>();
    private totalScore = 0;
    private validCount = 0;
    private totalGenerated = 0;

    add(record: SpellRecord): void {
        this.totalGenerated++;
        this.tierCounts[record.tier] = (this.tierCounts[record.tier] ?? 0) + 1;
        this.totalScore += record.score;
        if (record.valid) this.validCount++;
        this.signatures.add(record.signature);
        for (const [key, value] of Object.entries(
            record.features.symbolMultiset
        )) {
            this.symbolFrequency[key] =
                (this.symbolFrequency[key] ?? 0) + value;
        }
        for (const [key, value] of Object.entries(
            record.features.signMultiset
        )) {
            this.signFrequency[key] = (this.signFrequency[key] ?? 0) + value;
        }
    }

    finalize(): BulkSummary {
        return {
            totalGenerated: this.totalGenerated,
            uniqueSignatures: this.signatures.size,
            validCount: this.validCount,
            invalidCount: this.totalGenerated - this.validCount,
            averageScore: this.totalGenerated
                ? this.totalScore / this.totalGenerated
                : 0,
            tierCounts: this.tierCounts,
            symbolFrequency: this.symbolFrequency,
            signFrequency: this.signFrequency,
        };
    }
}

export function generateBulkMetrics(
    count: number,
    maxNested = 4,
    maxLinked = 4,
    normalization: string = NORMALIZATION_TYPES.EXPONENTIAL,
    seed: number = SEED
): BulkOutput {
    const safeCount = Math.max(0, Math.floor(count));
    const spells: SpellRecord[] = [];
    const accumulator = new SummaryAccumulator();
    const rng = defaultRng(seed);

    for (let id = 0; id < safeCount; id++) {
        const { nested, linked } = randomSpellConfig(rng, maxNested, maxLinked);
        const { spell } = spellBuilder(rng, { nested, linked });
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
