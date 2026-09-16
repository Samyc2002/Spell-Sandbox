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
    SHORT_CONTROL,
    SHORT_MANIFESTATION,
    SHORT_TRANSFORMATION,
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

function coreLabel(symbol: CentralSymbol): string {
    if (typeof symbol === "object" && symbol !== null) {
        const [a, b] = symbol.sigils as [Sigil, Sigil];
        const result = getCompositionResult(a, b);
        return result
            ? `combines ${a} and ${b} into ${result}`
            : `combines ${a} and ${b} (result undefined)`;
    }
    if (isTransformationName(symbol)) {
        return `channels a raw ${symbol} effect that ${SHORT_TRANSFORMATION[symbol].normal}`;
    }
    return `channels ${symbol} energy`;
}

function shortBehaviorClauses(node: BasicSpell): string[] {
    const clauses: string[] = [];
    for (const placed of node.sign ?? []) {
        const category = signCategory(placed.sign);
        const reversed = Boolean(placed.reversed);
        let text: string | undefined;
        if (category === "manifestation") {
            text =
                SHORT_MANIFESTATION[placed.sign as never][
                    reversed ? "reversed" : "normal"
                ];
        } else if (category === "control") {
            text =
                SHORT_CONTROL[placed.sign as never][
                    reversed ? "reversed" : "normal"
                ];
        } else if (category === "transformation") {
            text =
                SHORT_TRANSFORMATION[placed.sign as never][
                    reversed ? "reversed" : "normal"
                ];
        }
        if (text) clauses.push(`${placed.sign}: ${text}`);
    }
    return clauses;
}

/** One node's effect, condensed to a single clause: what it is, plus what it does. */
function shortNodeSummary(node: BasicSpell): string {
    const parts = [coreLabel(node.symbol), ...shortBehaviorClauses(node)];
    return parts.join(", ");
}

/** The full nested chain for one root, from outermost to innermost (i.e. as written in the data). */
function outerToInnerChain(node: BasicSpell): BasicSpell[] {
    const chain = [node];
    let current = node;
    while (current.spell && !Array.isArray(current.spell)) {
        chain.push(current.spell);
        current = current.spell;
    }
    return chain;
}

/**
 * One-line effect summary, in the order the spell actually resolves: innermost
 * nested spell first, each layer's effect then feeding into the one enclosing
 * it, per rules.md ("the innermost spell takes effect first, and the effects
 * then move outward through each enclosing spell").
 */
function oneLineEffect(root: BasicSpell): string {
    const innermostFirst = outerToInnerChain(root).reverse();

    if (innermostFirst.length === 1) {
        return shortNodeSummary(innermostFirst[0]!);
    }

    return innermostFirst
        .map((node, i) =>
            i === 0
                ? `First, it ${shortNodeSummary(node)}`
                : `then ${shortNodeSummary(node)}`
        )
        .join(", ");
}

function summarizeEffect(spell: Spell): string {
    if (Array.isArray(spell)) {
        return spell
            .map((branch, i) => `(${i + 1}) ${oneLineEffect(branch)}`)
            .join(" | ");
    }
    return oneLineEffect(spell);
}

/** Plain-language description of what a spell actually does. */
export function describeSpell(spell: Spell): string {
    let body: string;
    if (Array.isArray(spell)) {
        const branches = spell
            .map((branch, i) => `  ${i + 1}. ${describeBasicSpell(branch)}`)
            .join("\n");
        body = `${spell.length} linked spells, each firing independently with its own separate effect:\n${branches}`;
    } else {
        body = describeBasicSpell(spell);
    }

    return `${body}\n\nIn short: ${summarizeEffect(spell)}`;
}

/** Effect description, then complexity tier and validation as supporting facts underneath it. */
export function describeValidatedSpell(spell: Spell): string {
    const effectDescription = describeSpell(spell);
    const { score, tier } = classifySpell(spell);
    const result = validateSpell(spell);

    const validationLines =
        result.issues.length === 0
            ? "Valid. No issues found."
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
