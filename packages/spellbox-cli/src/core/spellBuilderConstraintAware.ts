import {
    type BasicSpell,
    type CentralSymbol,
    type Composition,
    type Control,
    type Manifestation,
    type PlacedSign,
    type Sigil,
    type Sign,
    type Spell,
    type Transformation,
} from "../models/spell.ts";
import { randomElement, thisOrThat, type Generator } from "./random.ts";
import { getCompatibility } from "./compatibility.ts";

/**
 * Constraint-aware variant of spellBuilder.ts.
 *
 * This is a comparison generator for the research paper: it is identical to
 * the baseline generator (src/core/spellBuilder.ts) in every respect EXCEPT
 * how the two sigils for a Radial composition symbol are chosen. The
 * baseline picks both sigils uniformly at random and independently, which
 * frequently produces an "incompatible" pair per COMPATIBILITY_TABLE
 * (compatibility.ts) -- most notably anything paired with "Light" -- and
 * that is the dominant source of hard validation errors as nesting/linking
 * depth increases (spellValidator.ts's composition-symbol check).
 *
 * Here, the second sigil is instead sampled only from sigils that are
 * "compatible" with the first (falling back to uniform-random selection
 * among all sigils if no compatible partner exists for the first sigil --
 * this occurs for "Light", which is incompatible with every sigil including
 * itself per the table). Everything else (sign counts, nesting/linking
 * structure, reversed-sign chance, symbol-option selection, etc.) mirrors
 * spellBuilder.ts exactly so the comparison isolates this one change.
 *
 * Do not modify spellBuilder.ts's behavior to "share" this logic -- the
 * baseline generator must stay unchanged for existing experiments to remain
 * reproducible.
 */

/** Hardcoded for now; will move to the UI later. Mirrors spellBuilder.ts's SEED. */
export const SEED = 12345;

interface SpellBuilderConfig {
    nested: number;
    linked: number;
}

const sigils: Sigil[] = ["Air", "Water", "Earth", "Fire", "Light"];

const manifestations: Manifestation[] = [
    "Column",
    "Dispersion",
    "Bolt",
    "Rain",
    "Bird",
];

const controls: Control[] = [
    "Levitation",
    "Float",
    "Pull",
    "Collection",
    "Convergence",
];

const transformations: Transformation[] = [
    "Crush",
    "Billowing",
    "Repetition",
    "Weave",
    "Enlarge",
];

const composition: Composition[] = ["Radial"];

function buildSign(rng: Generator, sign: Sign): PlacedSign<typeof sign> {
    return {
        sign,
        reversed: thisOrThat(rng),
    };
}

function getSign(rng: Generator, signOption: number) {
    if (signOption === 1) return [buildSign(rng, randomElement(rng, controls))];

    if (signOption === 2) {
        const isTransformation = thisOrThat(rng);
        if (isTransformation)
            return [
                buildSign(rng, randomElement(rng, controls)),
                buildSign(rng, randomElement(rng, transformations)),
            ];
        else
            return [
                buildSign(rng, randomElement(rng, controls)),
                buildSign(rng, randomElement(rng, manifestations)),
            ];
    }

    if (signOption === 3)
        return [
            buildSign(rng, randomElement(rng, controls)),
            buildSign(rng, randomElement(rng, manifestations)),
            buildSign(rng, randomElement(rng, transformations)),
        ];

    return [];
}

/**
 * Picks the second sigil for a Radial composition, given the first, biased
 * toward compatibility per getCompatibility(). Falls back to a uniform-random
 * choice among all sigils if the first sigil has no compatible partner
 * (true for "Light", which is incompatible with everything including
 * itself).
 */
function pickCompatibleSecondSigil(rng: Generator, first: Sigil): Sigil {
    const compatiblePartners = sigils.filter(
        (candidate) => getCompatibility(first, candidate) === "compatible"
    );

    if (compatiblePartners.length === 0) {
        return randomElement(rng, sigils);
    }

    return randomElement(rng, compatiblePartners);
}

function getSpell(rng: Generator, hasChildren: number) {
    const firstSigil = randomElement(rng, sigils);

    const symbolOptions: CentralSymbol[] = [
        randomElement(rng, sigils),
        randomElement(rng, transformations),
        {
            composition: randomElement(rng, composition),
            sigils: [firstSigil, pickCompatibleSecondSigil(rng, firstSigil)],
        },
    ];

    const symbol = randomElement(rng, symbolOptions);

    const signOptions = [
        1, // Only Control
        2, // Control and one of Manifestation and Transformation
        3, // All three
    ];

    const sign = getSign(rng, randomElement(rng, signOptions));

    const spell: BasicSpell = {
        symbol,
        sign,
    };

    if (hasChildren > 1) {
        spell.spell = getSpell(rng, hasChildren - 1);
    }

    return spell;
}

export default function spellBuilderConstraintAware(
    rng: Generator,
    config: SpellBuilderConfig
) {
    const { nested, linked } = config;

    if (linked > 0) {
        const spell: Spell = [];
        for (let count = 0; count < linked; count++) {
            spell.push(getSpell(rng, 1));
        }

        return { spell };
    }

    const spell = getSpell(rng, nested);

    return { spell };
}
