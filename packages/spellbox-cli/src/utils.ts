import { readFile } from "fs/promises";
import { resolve } from "path";
import { type ValidationResult } from "./core/spellValidator.ts";
import type { SimilarityBreakdown } from "./core/spellSimilarity.ts";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import type { Spell } from "./models/spell.ts";

/**
 * Loads a Spell from a JSON file on disk. Accepts either a bare Spell
 * (BasicSpell or BasicSpell[]) or the `{ spell: ... }` wrapper that
 * spellBuilder's own output uses, so a generated spell can be edited and
 * fed straight back in without reshaping it.
 */
export async function loadSpellFromFile(filePath: string): Promise<Spell> {
    const absolutePath = resolve(filePath);

    let raw: string;
    try {
        raw = await readFile(absolutePath, "utf-8");
    } catch (err) {
        throw new Error(
            `Could not read "${absolutePath}": ${(err as Error).message}`
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(
            `"${absolutePath}" is not valid JSON: ${(err as Error).message}`
        );
    }

    // A real BasicSpell always carries "symbol" alongside "spell" when it's
    // nested. Only the generator's { spell: ... } wrapper has "spell" with
    // no sibling "symbol". Checking for "spell" alone would strip the outer
    // layer off any nested spell loaded from disk.
    if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "spell" in (parsed as Record<string, unknown>) &&
        !("symbol" in (parsed as Record<string, unknown>))
    ) {
        return (parsed as { spell: Spell }).spell;
    }

    return parsed as Spell;
}

/** Loads a spell from disk, reporting and swallowing the error (returns null) rather than throwing. */
export async function loadOrReport(filePath: string): Promise<Spell | null> {
    try {
        return await loadSpellFromFile(filePath);
    } catch (err) {
        console.log((err as Error).message);
        return null;
    }
}

export function printValidationResult(result: ValidationResult) {
    if (result.issues.length === 0) {
        console.log("Spell is valid. No issues found.");
        return;
    }

    for (const issue of result.issues) {
        const label = issue.severity === "error" ? "ERROR" : "WARNING";
        console.log(`[${label}] ${issue.path}: ${issue.message}`);
    }

    console.log(
        result.valid
            ? "\nSpell is valid (see warnings above)."
            : "\nSpell is INVALID."
    );
}

export function printSimilarity(sim: SimilarityBreakdown) {
    console.log("Similarity:");
    console.log(`  Element:        ${(sim.element * 100).toFixed(0)}%`);
    console.log(`  Delivery:       ${(sim.delivery * 100).toFixed(0)}%`);
    console.log(`  Movement:       ${(sim.movement * 100).toFixed(0)}%`);
    console.log(`  Transformation: ${(sim.transformation * 100).toFixed(0)}%`);
    console.log(`  Shape:          ${(sim.shape * 100).toFixed(0)}%`);
    console.log(`  Overall:        ${(sim.overall * 100).toFixed(0)}%`);
}

export async function ask(question: string) {
    // Create the interface
    const rl = readline.createInterface({ input, output });

    // Ask a question and wait for the response
    const answer = await rl.question(question);

    // Always close the interface when done
    rl.close();

    return answer;
}

const NORMALIZATION_VALUE = 15;

export const NORMALIZATION_TYPES = {
    SIGMOID: "sigmoid",
    EXPONENTIAL: "exponential",
    ARCTAN: "arctan",
    NONE: "none",
};

function sigmoid(value: number): number {
    return 2 / (1 + Math.exp((-1 * value) / NORMALIZATION_VALUE)) - 1;
}

function exponential(value: number): number {
    return Math.exp(-NORMALIZATION_VALUE / value);
}

function arctan(value: number): number {
    return (1 / Math.PI) * Math.atan(value / NORMALIZATION_VALUE);
}

export function normalize(value: number, type: string): number {
    switch (type) {
        case NORMALIZATION_TYPES.SIGMOID:
            return sigmoid(value);
        case NORMALIZATION_TYPES.EXPONENTIAL:
            return exponential(value);
        case NORMALIZATION_TYPES.ARCTAN:
            return arctan(value);
        case NORMALIZATION_TYPES.NONE:
            return value;
        default:
            return value;
    }
}
