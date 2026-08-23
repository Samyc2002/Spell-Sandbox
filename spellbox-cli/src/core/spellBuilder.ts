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
import { randomElement, thisOrThat } from "../utils.ts";
import { validateSpell } from "./spellValidator.ts";

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

function buildSign(sign: Sign): PlacedSign<typeof sign> {
    return {
        sign,
        reversed: thisOrThat(),
    };
}

function getSign(signOption: number) {
    if (signOption === 1) return [buildSign(randomElement(controls))];

    if (signOption === 2) {
        const isTransformation = thisOrThat();
        if (isTransformation)
            return [
                buildSign(randomElement(controls)),
                buildSign(randomElement(transformations)),
            ];
        else
            return [
                buildSign(randomElement(controls)),
                buildSign(randomElement(manifestations)),
            ];
    }

    if (signOption === 3)
        return [
            buildSign(randomElement(controls)),
            buildSign(randomElement(manifestations)),
            buildSign(randomElement(transformations)),
        ];

    return [];
}

function getSpell(hasChildren: number) {
    const symbolOptions: CentralSymbol[] = [
        randomElement(sigils),
        randomElement(transformations),
        {
            composition: randomElement(composition),
            sigils: [randomElement(sigils), randomElement(sigils)],
        },
    ];

    const symbol = randomElement(symbolOptions);

    const signOptions = [
        1, // Only Control
        2, // Control and one of Manifestation and Transformation
        3, // All three
    ];

    const sign = getSign(randomElement(signOptions));

    const spell: BasicSpell = {
        symbol,
        sign,
    };

    if (hasChildren > 1) {
        spell.spell = getSpell(hasChildren - 1);
    }

    return spell;
}

export default function spellBuilder(config: SpellBuilderConfig) {
    const { nested, linked } = config;

    if (linked > 0) {
        const spell: Spell = [];
        for (let count = 0; count < linked; count++) {
            spell.push(getSpell(1));
        }

        return { spell };
    }

    const spell = getSpell(nested);

    return { spell };
}
