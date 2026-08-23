import { writeFile } from "fs/promises";
import { resolve } from "path";
import spellBuilder from "../core/spellBuilder.ts";
import { computeFeatures, type SpellFeatures } from "../core/spellFeatures.ts";
import { classifySpell, rawScoreSpell } from "../core/spellScoring.ts";
import { validateSpell } from "../core/spellValidator.ts";
import { NORMALIZATION_TYPES } from "../utils.ts";
import type { Spell } from "../models/spell.ts";

interface SpellRecord {
    id: number;
    spell: Spell;
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

function mapToObject(map: Map<string, number>): Record<string, number> {
    return Object.fromEntries(map);
}

/**
 * Picks a random (nested, linked) pair that respects the same mutual-exclusivity
 * rule the CLI's generateFlow enforces manually (spellBuilder itself doesn't
 * enforce it — it just prioritizes `linked` if both are nonzero).
 */
function randomSpellConfig(
    maxNested: number,
    maxLinked: number
): { nested: number; linked: number } {
    const nested = Math.floor(Math.random() * (maxNested + 1));
    const linked =
        nested === 0 ? Math.floor(Math.random() * (maxLinked + 1)) : 0;
    return { nested, linked };
}

/**
 * A structural "fingerprint" for counting distinct spells (plan.md Q1/Q2).
 * Deliberately effect-based rather than raw JSON equality: two spells with
 * the same signs/symbols/shape but signs listed in a different array order,
 * or nested/linked children in a different order, count as the *same* spell
 * here, since sign order doesn't change what the spell does. This is a
 * design choice — if you want strict positional equality instead, compare
 * JSON.stringify(spell) directly rather than this signature.
 */
function signature(spell: Spell): string {
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

function summarize(records: SpellRecord[], signatures: string[]) {
    const tierCounts: Record<string, number> = {};
    const symbolFrequency: Record<string, number> = {};
    const signFrequency: Record<string, number> = {};
    let totalScore = 0;
    let validCount = 0;

    for (const r of records) {
        tierCounts[r.tier] = (tierCounts[r.tier] ?? 0) + 1;
        totalScore += r.score;
        if (r.valid) validCount++;
        for (const [k, v] of Object.entries(r.features.symbolMultiset)) {
            symbolFrequency[k] = (symbolFrequency[k] ?? 0) + v;
        }
        for (const [k, v] of Object.entries(r.features.signMultiset)) {
            signFrequency[k] = (signFrequency[k] ?? 0) + v;
        }
    }

    return {
        totalGenerated: records.length,
        uniqueSignatures: new Set(signatures).size,
        validCount,
        invalidCount: records.length - validCount,
        averageScore: records.length ? totalScore / records.length : 0,
        tierCounts,
        symbolFrequency,
        signFrequency,
    };
}

function getArg(
    argv: string[],
    long: string,
    short: string | null,
    fallback: string
): string {
    const idx = argv.findIndex(
        (a) => a === long || (short !== null && a === short)
    );
    return idx !== -1 && argv[idx + 1] !== undefined ? argv[idx + 1]! : fallback;
}

async function main() {
    const argv = process.argv;

    const count = Number(getArg(argv, "--count", "-n", "100"));
    const outPath = getArg(argv, "--out", "-o", "./bulk-spells.json");
    const maxNested = Number(getArg(argv, "--max-nested", null, "4"));
    const maxLinked = Number(getArg(argv, "--max-linked", null, "4"));
    const normalizationType = getArg(
        argv,
        "--normalization",
        null,
        NORMALIZATION_TYPES.EXPONENTIAL
    );

    const knownTypes = Object.values(NORMALIZATION_TYPES);
    if (!knownTypes.includes(normalizationType)) {
        console.log(
            `Unknown --normalization "${normalizationType}" (known: ${knownTypes.join(", ")}). Falling back to "${NORMALIZATION_TYPES.EXPONENTIAL}".`
        );
    }
    const resolvedNormalization = knownTypes.includes(normalizationType)
        ? normalizationType
        : NORMALIZATION_TYPES.EXPONENTIAL;

    if (resolvedNormalization !== NORMALIZATION_TYPES.EXPONENTIAL) {
        console.log(
            `Note: DEFAULT_TIERS cutoffs were calibrated for "${NORMALIZATION_TYPES.EXPONENTIAL}" — tier labels under "${resolvedNormalization}" normalization are not calibrated and may not be meaningful; the "score" and "rawScore" fields remain accurate regardless.`
        );
    }

    const records: SpellRecord[] = [];
    const signatures: string[] = [];

    for (let i = 0; i < count; i++) {
        const { nested, linked } = randomSpellConfig(maxNested, maxLinked);
        const { spell } = spellBuilder({ nested, linked });
        records.push(buildRecord(i, spell, resolvedNormalization));
        signatures.push(signature(spell));
    }

    const summary = summarize(records, signatures);
    const output = {
        generatedAt: new Date().toISOString(),
        config: {
            count,
            maxNested,
            maxLinked,
            normalization: resolvedNormalization,
        },
        summary,
        spells: records,
    };

    const resolvedPath = resolve(outPath);
    await writeFile(resolvedPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`Generated ${count} spells -> ${resolvedPath}`);
    console.log("Summary:");
    console.log(JSON.stringify(summary, null, 2));
}

main();
