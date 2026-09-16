import { createReadStream, createWriteStream } from "fs";
import { rm } from "fs/promises";
import { resolve } from "path";
import spellBuilder from "../core/spellBuilder.ts";
import { computeFeatures, type SpellFeatures } from "../core/spellFeatures.ts";
import { classifySpell, rawScoreSpell } from "../core/spellScoring.ts";
import { signature } from "../core/spellSignature.ts";
import { validateSpell } from "../core/spellValidator.ts";
import { NORMALIZATION_TYPES } from "../utils.ts";
import type { Spell } from "../models/spell.ts";

interface SpellRecord {
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

    add(r: SpellRecord, sig: string): void {
        this.totalGenerated++;
        this.tierCounts[r.tier] = (this.tierCounts[r.tier] ?? 0) + 1;
        this.totalScore += r.score;
        if (r.valid) this.validCount++;
        this.signatures.add(sig);
        for (const [k, v] of Object.entries(r.features.symbolMultiset)) {
            this.symbolFrequency[k] = (this.symbolFrequency[k] ?? 0) + v;
        }
        for (const [k, v] of Object.entries(r.features.signMultiset)) {
            this.signFrequency[k] = (this.signFrequency[k] ?? 0) + v;
        }
    }

    finalize() {
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

function getArg(
    argv: string[],
    long: string,
    short: string | null,
    fallback: string
): string {
    const idx = argv.findIndex(
        (a) => a === long || (short !== null && a === short)
    );
    return idx !== -1 && argv[idx + 1] !== undefined
        ? argv[idx + 1]!
        : fallback;
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
    const resolvedPath = resolve(outPath);
    const spellsPath = resolvedPath + ".spells.tmp";

    // Spell records are streamed to a temp file first since the summary (which
    // must appear before "spells" in the output) can only be finalized after
    // every record has been generated. The temp file is then appended onto the
    // real output after the header+summary are written, and removed.
    const spellsStream = createWriteStream(spellsPath, { encoding: "utf-8" });
    const writeSpells = (chunk: string) =>
        new Promise<void>((res, rej) =>
            spellsStream.write(chunk, (err) => (err ? rej(err) : res()))
        );

    const accumulator = new SummaryAccumulator();

    for (let i = 0; i < count; i++) {
        const { nested, linked } = randomSpellConfig(maxNested, maxLinked);
        const { spell } = spellBuilder({ nested, linked });
        const record = buildRecord(i, spell, resolvedNormalization);
        const sig = signature(spell);
        accumulator.add(record, sig);

        const recordJson = JSON.stringify(record, null, 2)
            .split("\n")
            .map((line) => "    " + line)
            .join("\n");
        await writeSpells((i > 0 ? ",\n" : "") + recordJson);
    }

    await new Promise<void>((res, rej) =>
        spellsStream.end((err: unknown) => (err ? rej(err) : res()))
    );

    const summary = accumulator.finalize();
    const header = {
        generatedAt: new Date().toISOString(),
        config: {
            count,
            maxNested,
            maxLinked,
            normalization: resolvedNormalization,
        },
        summary,
    };
    const headerJson = JSON.stringify(header, null, 2);

    const outStream = createWriteStream(resolvedPath, { encoding: "utf-8" });
    const writeOut = (chunk: string) =>
        new Promise<void>((res, rej) =>
            outStream.write(chunk, (err) => (err ? rej(err) : res()))
        );

    await writeOut(headerJson.slice(0, -2) + ',\n  "spells": [\n');
    await new Promise<void>((res, rej) => {
        const reader = createReadStream(spellsPath, { encoding: "utf-8" });
        reader.on("data", (chunk) => outStream.write(chunk));
        reader.on("end", () => res());
        reader.on("error", rej);
    });
    await writeOut("\n  ]\n}\n");
    await new Promise<void>((res, rej) =>
        outStream.end((err: unknown) => (err ? rej(err) : res()))
    );
    await rm(spellsPath);

    console.log(`Generated ${count} spells -> ${resolvedPath}`);
    console.log("Summary:");
    console.log(JSON.stringify(summary, null, 2));
}

main();
