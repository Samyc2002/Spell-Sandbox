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
import { validateSpell } from "./spellValidator.ts";

/** Hardcoded for now; will move to the UI later. */
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

function getSpell(rng: Generator, hasChildren: number) {
    const symbolOptions: CentralSymbol[] = [
        randomElement(rng, sigils),
        randomElement(rng, transformations),
        {
            composition: randomElement(rng, composition),
            sigils: [randomElement(rng, sigils), randomElement(rng, sigils)],
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

export default function spellBuilder(rng: Generator, config: SpellBuilderConfig) {
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
