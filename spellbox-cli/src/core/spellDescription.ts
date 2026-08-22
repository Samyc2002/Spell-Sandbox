import type {
    BasicSpell,
    CentralSymbol,
    Sigil,
    Spell,
} from "../models/spell.ts";
import { getCompositionResult } from "./compatibility.ts";
import {
    describeControl,
    describeManifestation,
    describeTransformation,
    TRANSFORMATION_EFFECTS,
} from "./spellEffects.ts";
import { signCategory } from "./spellFeatures.ts";
import { classifySpell } from "./spellScoring.ts";
import { validateSpell } from "./spellValidator.ts";

function isTransformationName(
    value: string
): value is keyof typeof TRANSFORMATION_EFFECTS {
    return value in TRANSFORMATION_EFFECTS;
}

/** What the central symbol itself contributes: an element, a resultant compound, or a transformation acting alone. */
function describeCore(symbol: CentralSymbol): string {
    if (typeof symbol === "object" && symbol !== null) {
        const [a, b] = symbol.sigils as [Sigil, Sigil];
        const result = getCompositionResult(a, b);
        return result
            ? `Its core combines ${a} and ${b} into ${result}.`
            : `Its core combines ${a} and ${b} (the resulting effect isn't defined yet).`;
    }

    if (isTransformationName(symbol)) {
        return `Rather than an element, its core is the ${symbol} transformation itself: it ${TRANSFORMATION_EFFECTS[symbol].normal}.`;
    }

    return `Its core channels the element of ${symbol}.`;
}

/** The spell's behavior: what it delivers as, how it moves/positions itself, and what it transforms. */
function describeBehavior(node: BasicSpell): string[] {
    const lines: string[] = [];
    const delivery = (node.sign ?? []).filter(
        (s) => signCategory(s.sign) === "manifestation"
    );
    const movement = (node.sign ?? []).filter(
        (s) => signCategory(s.sign) === "control"
    );
    const transform = (node.sign ?? []).filter(
        (s) => signCategory(s.sign) === "transformation"
    );

    if (delivery.length) {
        lines.push(
            "Delivery: " +
                delivery
                    .map((s) =>
                        describeManifestation(
                            s.sign as never,
                            Boolean(s.reversed)
                        )
                    )
                    .join("; ")
        );
    }
    if (movement.length) {
        lines.push(
            "Movement/position: " +
                movement
                    .map((s) =>
                        describeControl(s.sign as never, Boolean(s.reversed))
                    )
                    .join("; ")
        );
    }
    if (transform.length) {
        lines.push(
            "Transformation: " +
                transform
                    .map((s) =>
                        describeTransformation(
                            s.sign as never,
                            Boolean(s.reversed)
                        )
                    )
                    .join("; ")
        );
    }

    return lines;
}

function describeBasicSpell(node: BasicSpell, indent = ""): string {
    const lines = [
        `${indent}${describeCore(node.symbol)}`,
        ...describeBehavior(node).map((l) => indent + l),
    ];

    if (node.spell && !Array.isArray(node.spell)) {
        lines.push(
            `${indent}Nested inside it (its effect resolves first, then feeds into the spell above):`
        );
        lines.push(describeBasicSpell(node.spell, indent + "  "));
    }

    return lines.join("\n");
}

/** Plain-language description of what a spell actually does — no GenAI, purely templated from rules.md's semantics. */
export function describeSpell(spell: Spell): string {
    if (Array.isArray(spell)) {
        const branches = spell
            .map((branch, i) => `  ${i + 1}. ${describeBasicSpell(branch)}`)
            .join("\n");
        return `${spell.length} linked spells, each firing independently with its own separate effect:\n${branches}`;
    }
    return describeBasicSpell(spell);
}

/** Effect description, then complexity tier and validation as supporting facts underneath it. */
export function describeValidatedSpell(spell: Spell): string {
    const effectDescription = describeSpell(spell);
    const { score, tier } = classifySpell(spell);
    const result = validateSpell(spell);

    const validationLines =
        result.issues.length === 0
            ? "Valid. no issues found."
            : result.issues
                  .map(
                      (issue) =>
                          `[${issue.severity === "error" ? "ERROR" : "WARNING"}] ${issue.path}: ${issue.message}`
                  )
                  .join("\n") +
              (result.valid
                  ? "\n\nValid, with warnings above."
                  : "\n\nINVALID.");

    return [
        effectDescription,
        "",
        `Complexity: ${tier} (score ${score})`,
        "",
        "Validation:",
        validationLines,
    ].join("\n");
}
