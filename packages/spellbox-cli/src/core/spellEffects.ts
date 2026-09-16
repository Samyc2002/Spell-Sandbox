import type {
    Control,
    Manifestation,
    Transformation,
} from "../models/spell.ts";

export interface EffectText {
    /** What the sign does in its normal orientation. */
    normal: string;
    /** What it does reversed. */
    reversed: string;
}

/**
 * Reversed effects below fall into two groups:
 *   - Direction, Pull, Crush, Enlarge: explicitly documented in rules.md.
 *   - Everything else: rules.md only states the general principle ("a
 *     reversed sign produces the opposite effect") without specifics, so
 *     these are a reasoned interpretation of what "opposite" means for that
 *     sign's own mechanic. This is a design choice, not a fact pulled from the doc.
 *     Treat these as an editable starting point.
 */

/** Manifestation signs: decide the shape/delivery of the magical effect. */
export const MANIFESTATION_EFFECTS: Record<Manifestation, EffectText> = {
    Column: {
        normal: "sends the magic out as a column or beam rising above the glyph",
        reversed:
            "draws the magic down into the glyph instead of beaming it upward",
    },
    Dispersion: {
        normal: "lets the magic pour or leak outward, rather than shooting in one direction like a Column",
        reversed:
            "draws the magic inward and condenses it, instead of letting it pour outward",
    },
    Bolt: {
        normal: "fires the magic out as bolts",
        reversed:
            "fires the magic in as bolts",
    },
    Rain: {
        normal: "showers the magic down like rainfall across the immediate area (the central symbol sits in the empty space at its middle)",
        reversed:
            "draws scattered magic upward and inward, instead of showering it down",
    },
    Bird: {
        normal: "projects the magic as a bird-like shape that flies around for a while, carrying the central symbol within it",
        reversed:
            "keeps the magic still and grounded, instead of letting it fly around",
    },
};

/** Control signs: govern position, movement, direction, attraction, and concentration. */
export const CONTROL_EFFECTS: Record<Control, EffectText> = {
    Levitation: {
        normal: "makes the magic float above the glyph, or moves whatever the glyph is drawn on, depending on which way it points",
        reversed:
            "grounds the object and weighs it down, instead of lifting or moving it",
    },
    Float: {
        normal: "makes the object it's drawn on float in midair regardless of gravity, a more deliberate, controlled version of Levitation",
        reversed:
            "anchors the object firmly to the ground, overriding any tendency to float",
    },
    Pull: {
        normal: "pulls matching material toward the glyph, with a twisting motion if the sign is angled",
        reversed:
            "pushes matching material away from the glyph instead of pulling it in",
    },
    Collection: {
        normal: "gathers material (and possibly magic) from above and around the glyph for the spell to use",
        reversed:
            "scatters material outward and away from the glyph, instead of gathering it in",
    },
    Convergence: {
        normal: "focuses the magic down to a single point, and can make loose particles more rigid",
        reversed:
            "spreads the magic outward and loosens whatever would otherwise become rigid",
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
        normal: "converts material into a soft, cloud-like form (needs a Collection sign to gather the material first). This can stand in for a central sigil",
        reversed:
            "compresses material into a dense, solid form instead of a soft cloud",
    },
    Repetition: {
        normal: "continually resets whatever it affects back to a previous state, effectively rewinding it. This can stand in for a central sigil",
        reversed:
            "pushes whatever it affects forward, accelerating it toward a future state instead of rewinding it",
    },
    Weave: {
        normal: "turns solid objects it touches into long, flexible ribbons; meant to surround the central symbol",
        reversed: "hardens flexible material back into a rigid solid",
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

/**
 * Condensed verb-phrase versions of the same effects, for the one-line summary
 * where full sentences don't fit.
 */
export const SHORT_MANIFESTATION: Record<Manifestation, EffectText> = {
    Column: {
        normal: "beams upward",
        reversed: "draws downward into the glyph instead",
    },
    Dispersion: {
        normal: "pours outward",
        reversed: "draws inward instead of pouring out",
    },
    Bolt: {
        normal: "fires as bolts",
        reversed: "trickles slowly instead of firing bolts",
    },
    Rain: {
        normal: "showers down",
        reversed: "draws upward instead of raining down",
    },
    Bird: {
        normal: "flies around as a bird shape",
        reversed: "stays still instead of flying around",
    },
};

export const SHORT_CONTROL: Record<Control, EffectText> = {
    Levitation: {
        normal: "floats/moves the object",
        reversed: "grounds the object instead of lifting it",
    },
    Float: {
        normal: "floats in midair",
        reversed: "anchors it to the ground instead",
    },
    Pull: {
        normal: "pulls matching material in",
        reversed: "pushes matching material away",
    },
    Collection: {
        normal: "gathers material for use",
        reversed: "scatters material away instead",
    },
    Convergence: {
        normal: "focuses to a point",
        reversed: "spreads out and loosens instead",
    },
};

export const SHORT_TRANSFORMATION: Record<Transformation, EffectText> = {
    Crush: {
        normal: "disintegrates the target",
        reversed: "reforms the target instead",
    },
    Billowing: {
        normal: "turns material into cloud",
        reversed: "compresses it into something dense instead",
    },
    Repetition: {
        normal: "rewinds the target",
        reversed: "pushes the target forward in time instead",
    },
    Weave: {
        normal: "turns solids into ribbons",
        reversed: "hardens ribbons back into rigid solids",
    },
    Enlarge: {
        normal: "grows the target",
        reversed: "shrinks the target instead",
    },
};
