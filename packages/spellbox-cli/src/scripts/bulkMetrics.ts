import { createReadStream, createWriteStream } from "fs";
import { rm } from "fs/promises";
import { resolve } from "path";
import {
    generateBulkMetrics,
    type BulkOutput,
} from "../core/bulkMetricsGenerator.ts";
import { SEED } from "../core/spellBuilder.ts";
import { NORMALIZATION_TYPES } from "../utils.ts";

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
    const seed = Number(getArg(argv, "--seed", null, String(SEED)));
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

    const generated: BulkOutput = generateBulkMetrics(
        count,
        maxNested,
        maxLinked,
        resolvedNormalization,
        seed
    );

    for (const [index, record] of generated.spells.entries()) {
        const recordJson = JSON.stringify(record, null, 2)
            .split("\n")
            .map((line) => "    " + line)
            .join("\n");
        await writeSpells((index > 0 ? ",\n" : "") + recordJson);
    }

    await new Promise<void>((res, rej) =>
        spellsStream.end((err: unknown) => (err ? rej(err) : res()))
    );

    const summary = generated.summary;
    const header = {
        generatedAt: generated.generatedAt,
        seed: generated.seed,
        config: generated.config,
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

    console.log(`Generated ${count} spells (seed=${seed}) -> ${resolvedPath}`);
    console.log("Summary:");
    console.log(JSON.stringify(summary, null, 2));
}

main();
