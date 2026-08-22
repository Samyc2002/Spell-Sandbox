import type { Sigil } from "../models/spell.ts";

export type CompatibilityStatus = "compatible" | "incompatible" | "unspecified";

/**
 * rules.md only confirms a handful of pairs explicitly:
 *   - Fire + Air    -> heat        (compatible)
 *   - Water + Fire  -> steam       (compatible)
 *   - Water + Air   -> mist        (compatible)
 *   - Water + Light -> (called out as NOT combinable)
 *
 * Every other pair is genuinely unspecified in the doc — rather than guessing,
 * unlisted pairs resolve to "unspecified" so the validator can flag them as a
 * warning instead of silently treating them as valid or invalid. Update this
 * table as the rules get nailed down.
 */
const COMPATIBILITY_TABLE: Record<string, CompatibilityStatus> = {
    "Air+Air": "compatible",
    "Air+Water": "compatible",
    "Air+Earth": "compatible",
    "Air+Fire": "compatible",
    "Air+Light": "incompatible",
    "Water+Air": "compatible",
    "Water+Water": "compatible",
    "Water+Earth": "compatible",
    "Water+Fire": "compatible",
    "Water+Light": "incompatible",
    "Earth+Air": "compatible",
    "Earth+Water": "compatible",
    "Earth+Earth": "compatible",
    "Earth+Fire": "compatible",
    "Earth+Light": "incompatible",
    "Fire+Air": "compatible",
    "Fire+Water": "compatible",
    "Fire+Earth": "compatible",
    "Fire+Fire": "compatible",
    "Fire+Light": "incompatible",
    "Light+Air": "incompatible",
    "Light+Water": "incompatible",
    "Light+Earth": "incompatible",
    "Light+Fire": "incompatible",
    "Light+Light": "incompatible",
};
const COMPATIBILITY_RESULT: Record<string, string> = {
    "Air+Air": "Air",
    "Air+Water": "Mist",
    "Air+Earth": "Dust",
    "Air+Fire": "Heat",
    "Water+Air": "Mist",
    "Water+Water": "Water",
    "Water+Earth": "Mud",
    "Water+Fire": "Steam",
    "Earth+Air": "Dust",
    "Earth+Water": "Mud",
    "Earth+Earth": "Earth",
    "Earth+Fire": "Magma",
    "Fire+Air": "Heat",
    "Fire+Water": "Steam",
    "Fire+Earth": "Magma",
    "Fire+Fire": "Fire",
};

function pairKey(a: Sigil, b: Sigil): string {
    return [a, b].sort().join("+");
}

export function getCompatibility(a: Sigil, b: Sigil): CompatibilityStatus {
    return COMPATIBILITY_TABLE[pairKey(a, b)] ?? "unspecified";
}

/** The named elemental result of combining two sigils (e.g. Fire+Air -> "Heat"), if known. */
export function getCompositionResult(a: Sigil, b: Sigil): string | undefined {
    return COMPATIBILITY_RESULT[pairKey(a, b)];
}
