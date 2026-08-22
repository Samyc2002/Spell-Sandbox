import type {
    BasicSpell,
    CentralSymbol,
    Control,
    Manifestation,
    Sigil,
    Sign,
    Spell,
    Transformation,
} from "../models/spell.ts";
import { getCompatibility } from "./compatibility.ts";

const SIGILS: readonly Sigil[] = ["Air", "Water", "Earth", "Fire", "Light"];
const CONTROL_SIGNS: readonly Control[] = [
    "Direction",
    "Levitation",
    "Float",
    "Pull",
    "Collection",
    "Convergence",
];
const MANIFESTATION_SIGNS: readonly Manifestation[] = [
    "Column",
    "Dispersion",
    "Bolt",
    "Rain",
    "Bird",
];
const TRANSFORMATION_SIGNS: readonly Transformation[] = [
    "Crush",
    "Billowing",
    "Repetition",
    "Weave",
    "Enlarge",
];

function isSigil(value: unknown): value is Sigil {
    return (
        typeof value === "string" &&
        (SIGILS as readonly string[]).includes(value)
    );
}

function isControlSign(sign: Sign): sign is Control {
    return (CONTROL_SIGNS as readonly string[]).includes(sign);
}

function isManifestationSign(sign: Sign): sign is Manifestation {
    return (MANIFESTATION_SIGNS as readonly string[]).includes(sign);
}

function isTransformationSign(sign: Sign): sign is Transformation {
    return (TRANSFORMATION_SIGNS as readonly string[]).includes(sign);
}

export type Severity = "error" | "warning";

export interface ValidationIssue {
    path: string;
    message: string;
    severity: Severity;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}

function validateSymbol(
    symbol: CentralSymbol,
    path: string
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Composition case: { composition, sigils: [Sigil, Sigil] }
    if (typeof symbol === "object" && symbol !== null) {
        if (symbol.composition !== "Radial") {
            issues.push({
                path: `${path}.composition`,
                severity: "error",
                message: `Unknown composition "${String(symbol.composition)}".`,
            });
        }

        if (!Array.isArray(symbol.sigils) || symbol.sigils.length !== 2) {
            issues.push({
                path: `${path}.sigils`,
                severity: "error",
                message: "A composition symbol requires exactly two sigils.",
            });
            return issues;
        }

        const [a, b] = symbol.sigils;
        if (!isSigil(a) || !isSigil(b)) {
            issues.push({
                path: `${path}.sigils`,
                severity: "error",
                message: `Composition sigils must both be valid Sigils, got "${String(a)}" and "${String(b)}".`,
            });
            return issues;
        }

        const compatibility = getCompatibility(a, b);
        if (compatibility === "incompatible") {
            issues.push({
                path: `${path}.sigils`,
                severity: "error",
                message: `"${a}" and "${b}" cannot be combined (per rules.md).`,
            });
        } else if (compatibility === "unspecified") {
            issues.push({
                path: `${path}.sigils`,
                severity: "warning",
                message: `Compatibility of "${a}" + "${b}" is not specified in rules.md — verify before relying on this combination.`,
            });
        }

        return issues;
    }

    // Non-composition case: symbol should be a bare Sigil or a Transformation.
    if (isSigil(symbol) || isTransformationSign(symbol as Sign)) {
        return issues;
    }

    issues.push({
        path,
        severity: "error",
        message: `"${String(symbol)}" is not a valid central symbol (must be a Sigil, a Transformation sign, or a composition object).`,
    });

    return issues;
}

function validateBasicSpell(
    spell: BasicSpell,
    path: string,
    allowFurtherNesting: boolean
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!spell || typeof spell !== "object") {
        issues.push({
            path,
            severity: "error",
            message: "Spell is not an object.",
        });
        return issues;
    }

    if (spell.symbol === undefined) {
        issues.push({
            path: `${path}.symbol`,
            severity: "error",
            message: "Missing central symbol.",
        });
    } else {
        issues.push(...validateSymbol(spell.symbol, `${path}.symbol`));
    }

    if (!Array.isArray(spell.sign)) {
        issues.push({
            path: `${path}.sign`,
            severity: "error",
            message: "Missing or invalid sign array.",
        });
    } else {
        const controlCount = spell.sign.filter((s) =>
            isControlSign(s.sign)
        ).length;
        if (controlCount < 1) {
            issues.push({
                path: `${path}.sign`,
                severity: "error",
                message: "A spell requires at least one Control sign.",
            });
        }

        spell.sign.forEach((placed, i) => {
            const isKnown =
                isControlSign(placed.sign) ||
                isManifestationSign(placed.sign) ||
                isTransformationSign(placed.sign);
            if (!isKnown) {
                issues.push({
                    path: `${path}.sign[${i}]`,
                    severity: "error",
                    message: `"${String(placed.sign)}" is not a recognized sign.`,
                });
            }
        });
    }

    if (spell.spell !== undefined) {
        if (!allowFurtherNesting) {
            issues.push({
                path: `${path}.spell`,
                severity: "error",
                message:
                    "A linked spell cannot itself contain a nested/linked spell.",
            });
        }

        if (Array.isArray(spell.spell)) {
            spell.spell.forEach((child, i) => {
                // A linked branch's children may not themselves be further linked or nested.
                issues.push(
                    ...validateBasicSpell(child, `${path}.spell[${i}]`, false)
                );
            });
        } else {
            issues.push(
                ...validateBasicSpell(
                    spell.spell,
                    `${path}.spell`,
                    allowFurtherNesting
                )
            );
        }
    }

    return issues;
}

/** Validates a full Spell (top-level BasicSpell or array of linked BasicSpells). */
export function validateSpell(spell: Spell, path = "spell"): ValidationResult {
    let issues: ValidationIssue[];

    if (Array.isArray(spell)) {
        // A top-level array means this spell is "linked". Per rules.md
        // architectural decision #8, a spell is either nested or linked, not
        // both — so none of these branches may carry their own nested spell.
        issues = spell.flatMap((child, i) =>
            validateBasicSpell(child, `${path}[${i}]`, false)
        );
    } else {
        issues = validateBasicSpell(spell, path, true);
    }

    return {
        valid: !issues.some((issue) => issue.severity === "error"),
        issues,
    };
}
