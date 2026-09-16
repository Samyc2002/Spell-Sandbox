export type Sigil = "Air" | "Water" | "Earth" | "Fire" | "Light";
export type Manifestation = "Column" | "Dispersion" | "Bolt" | "Rain" | "Bird";
export type Control =
    | "Levitation"
    | "Float"
    | "Pull"
    | "Collection"
    | "Convergence";
export type Transformation =
    | "Crush"
    | "Billowing"
    | "Repetition"
    | "Weave"
    | "Enlarge";
export type Composition = "Radial";

export type Sign = Manifestation | Control | Transformation;

export interface PlacedSign<T extends Sign> {
    sign: T;

    reversed?: boolean;
}

export type CentralSymbol =
    | Sigil
    | Transformation
    | {
          composition: Composition;
          sigils: [Sigil, Sigil];
      };

export interface BasicSpell {
    symbol: CentralSymbol;

    // At least one control sign is required by the current rules.
    sign: PlacedSign<Sign>[];

    spell?: BasicSpell | BasicSpell[];
}

export type Spell = BasicSpell | BasicSpell[];
