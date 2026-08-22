import type {
    Control,
    Manifestation,
    Transformation,
} from "../models/spell.ts";

export interface EffectText {
    /** What the sign does in its normal orientation. */
    normal: string;
    /** What it does reversed. Only a few are explicitly documented in rules.md; the rest
     * fall back to the general "produces the opposite effect" rule rather than a guess. */
    reversed: string;
}

const GENERIC_REVERSED =
    "(reversed: produces the opposite of its normal effect)";

/** Manifestation signs: decide the shape/delivery of the magical effect. */
export const MANIFESTATION_EFFECTS: Record<Manifestation, EffectText> = {
    Column: {
        normal: "sends the magic out as a column or beam rising above the glyph",
        reversed: GENERIC_REVERSED,
    },
    Dispersion: {
        normal: "lets the magic pour or leak outward, rather than shooting in one direction like a Column",
        reversed: GENERIC_REVERSED,
    },
    Bolt: {
        normal: "fires the magic out as bolts",
        reversed: GENERIC_REVERSED,
    },
    Rain: {
        normal: "showers the magic down like rainfall across the immediate area (the central symbol sits in the empty space at its middle)",
        reversed: GENERIC_REVERSED,
    },
    Bird: {
        normal: "projects the magic as a bird-like shape that flies around for a while, carrying the central symbol within it",
        reversed: GENERIC_REVERSED,
    },
};

/** Control signs: govern position, movement, direction, attraction, and concentration. */
export const CONTROL_EFFECTS: Record<Control, EffectText> = {
    Direction: {
        normal: "aims the spell's force the way its signs point. Forward if pointed forward, upward if pointed inward, outward if pointed outward, or pouring only from the gap between signs pointed at each other",
        reversed:
            "aims the spell in the opposite direction from what its orientation would otherwise suggest",
    },
    Levitation: {
        normal: "makes the magic float above the glyph, or moves whatever the glyph is drawn on, depending on which way it points",
        reversed: GENERIC_REVERSED,
    },
    Float: {
        normal: "makes the object it's drawn on float in midair regardless of gravity, a more deliberate, controlled version of Levitation",
        reversed: GENERIC_REVERSED,
    },
    Pull: {
        normal: "pulls matching material toward the glyph, with a twisting motion if the sign is angled",
        reversed:
            "pushes matching material away from the glyph instead of pulling it in",
    },
    Collection: {
        normal: "gathers material (and possibly magic) from above and around the glyph for the spell to use",
        reversed: GENERIC_REVERSED,
    },
    Convergence: {
        normal: "focuses the magic down to a single point, and can make loose particles more rigid",
        reversed: GENERIC_REVERSED,
    },
};

/** Transformation signs: change the properties or condition of an object or material. */
export const TRANSFORMATION_EFFECTS: Record<Transformation, EffectText> = {
    Crush: {
        normal: "disintegrates whatever it affects",
        reversed:
            "causes the affected material to come back together instead of disintegrating (at least temporarily, and reliably only paired with an Earth sigil)",
    },
    Billowing: {
        normal: "converts material into a soft, cloud-like form (needs a Collection sign to gather the material first)",
        reversed: GENERIC_REVERSED,
    },
    Repetition: {
        normal: "continually resets whatever it affects back to a previous state, effectively rewinding it",
        reversed: GENERIC_REVERSED,
    },
    Weave: {
        normal: "turns solid objects it touches into long, flexible ribbons; meant to surround the central symbol",
        reversed: GENERIC_REVERSED,
    },
    Enlarge: {
        normal: "grows the object it affects",
        reversed: "shrinks the object instead of growing it",
    },
};

export function describeControl(sign: Control, reversed: boolean): string {
    const effect = CONTROL_EFFECTS[sign];
    return `${sign} ${reversed ? effect.reversed : effect.normal}`;
}

export function describeManifestation(
    sign: Manifestation,
    reversed: boolean
): string {
    const effect = MANIFESTATION_EFFECTS[sign];
    return `${sign} ${reversed ? effect.reversed : effect.normal}`;
}

export function describeTransformation(
    sign: Transformation,
    reversed: boolean
): string {
    const effect = TRANSFORMATION_EFFECTS[sign];
    return `${sign} ${reversed ? effect.reversed : effect.normal}`;
}
