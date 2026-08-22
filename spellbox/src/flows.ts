import spellBuilder from "./core/spellBuilder.ts";
import { validateSpell } from "./core/spellValidator.ts";
import {
    describeSpell,
    describeValidatedSpell,
} from "./core/spellDescription.ts";
import { similarity } from "./core/spellSimilarity.ts";
import { diffSpells, formatDiff } from "./core/spellDiff.ts";
import {
    ask,
    loadOrReport,
    printSimilarity,
    printValidationResult,
} from "./utils.ts";

export async function generateFlow() {
    const nested = Number(
        await ask(
            "What nesting level do you want? Answer in number if you're straight: "
        )
    );
    const linked = Number(
        await ask(
            "How many links do you want? Answer in number if you're straight: "
        )
    );

    if (nested > 0 && linked > 0) {
        console.log(
            "Don't be greedy. You can either nest or link spells, not both. Try again, dumbass."
        );
        return;
    }

    const generated = spellBuilder({ nested, linked });
    console.log(JSON.stringify(generated, null, 4));
    console.log("\n" + describeValidatedSpell(generated.spell));
}

export async function validateFlow(filePath: string, describe: boolean) {
    const spell = await loadOrReport(filePath);
    if (!spell) {
        process.exitCode = 1;
        return;
    }

    if (describe) {
        console.log(describeValidatedSpell(spell));
        if (!validateSpell(spell).valid) process.exitCode = 1;
        return;
    }

    const result = validateSpell(spell);
    printValidationResult(result);
    if (!result.valid) process.exitCode = 1;
}

export async function compareFlow(filePathA: string, filePathB: string) {
    const spellA = await loadOrReport(filePathA);
    const spellB = await loadOrReport(filePathB);
    if (!spellA || !spellB) {
        process.exitCode = 1;
        return;
    }

    console.log("=== Spell A ===");
    console.log(describeSpell(spellA));
    console.log("\n=== Spell B ===");
    console.log(describeSpell(spellB));

    console.log("\n" + "=".repeat(20));
    printSimilarity(similarity(spellA, spellB));

    console.log("\nDifferences:");
    console.log(formatDiff(diffSpells(spellA, spellB)));
}
