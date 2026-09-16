import type {
    BasicSpell,
    CentralSymbol,
    Sigil,
    Sign,
    Spell,
} from "../models/spell.ts";
import { getCompatibility, getCompositionResult } from "./compatibility.ts";

const CONTROL_SIGNS = new Set([
    "Levitation",
    "Float",
    "Pull",
    "Collection",
    "Convergence",
]);
const MANIFESTATION_SIGNS = new Set([
    "Column",
    "Dispersion",
    "Bolt",
    "Rain",
    "Bird",
]);
const TRANSFORMATION_SIGNS = new Set([
    "Crush",
    "Billowing",
    "Repetition",
    "Weave",
    "Enlarge",
]);

export function signCategory(
    sign: Sign
): "control" | "manifestation" | "transformation" | "unknown" {
    if (CONTROL_SIGNS.has(sign)) return "control";
    if (MANIFESTATION_SIGNS.has(sign)) return "manifestation";
    if (TRANSFORMATION_SIGNS.has(sign)) return "transformation";
    return "unknown";
}

function isCompositionSymbol(
    symbol: CentralSymbol
): symbol is { composition: "Radial"; sigils: [Sigil, Sigil] } {
    return typeof symbol === "object" && symbol !== null;
}

/** Flattens a Spell into every BasicSpell node it contains, through both nesting and linking. */
export function collectNodes(spell: Spell): BasicSpell[] {
    const roots = Array.isArray(spell) ? spell : [spell];
    const nodes: BasicSpell[] = [];

    function visit(node: BasicSpell) {
        nodes.push(node);
        if (Array.isArray(node.spell)) {
            node.spell.forEach(visit);
        } else if (node.spell) {
            visit(node.spell);
        }
    }

    roots.forEach(visit);
    return nodes;
}

/** How many BasicSpell nodes deep the *nested* chain (single .spell, not linked array) goes, from this node. 0 = no nested child. */
function nestingDepthFrom(node: BasicSpell): number {
    if (!node.spell || Array.isArray(node.spell)) return 0;
    return 1 + nestingDepthFrom(node.spell);
}

export interface SpellFeatures {
    /** Total nodes across the whole structure (all linked branches + all nested levels). */
    totalNodes: number;
    /** Number of top-level linked branches (1 if not linked). */
    linkedBranches: number;
    /** Deepest nested (.spell single-chain) depth found in any branch. */
    maxNestingDepth: number;
    /** Sign counts by category, summed across every node. */
    signCounts: {
        control: number;
        manifestation: number;
        transformation: number;
    };
    /** Multiset of sign names present anywhere, e.g. { Direction: 2, Column: 1 }. */
    signMultiset: Map<string, number>;
    /** Same signs, split by effect axis, for axis-aware comparison (movement vs. delivery vs. transformation). */
    controlMultiset: Map<string, number>;
    manifestationMultiset: Map<string, number>;
    transformationMultiset: Map<string, number>;
    /** Count of signs marked reversed, summed across every node. */
    reversedCount: number;
    /** Count of nodes whose central symbol is a Radial composition. */
    compositionCount: number;
    /** Count of composition symbols whose sigil pair is flagged incompatible. */
    incompatibleCompositionCount: number;
    /** Multiset of central-symbol values seen (Sigil or Transformation name; compositions recorded as "Sigil1+Sigil2"). Represents the spell's *element/core effect*. */
    symbolMultiset: Map<string, number>;
}

export function computeFeatures(spell: Spell): SpellFeatures {
    const nodes = collectNodes(spell);
    const roots = Array.isArray(spell) ? spell : [spell];

    const signCounts = { control: 0, manifestation: 0, transformation: 0 };
    const signMultiset = new Map<string, number>();
    const controlMultiset = new Map<string, number>();
    const manifestationMultiset = new Map<string, number>();
    const transformationMultiset = new Map<string, number>();
    const symbolMultiset = new Map<string, number>();
    let reversedCount = 0;
    let compositionCount = 0;
    let incompatibleCompositionCount = 0;

    const bump = (map: Map<string, number>, key: string) =>
        map.set(key, (map.get(key) ?? 0) + 1);

    for (const node of nodes) {
        for (const placed of node.sign ?? []) {
            const category = signCategory(placed.sign);
            if (category !== "unknown") signCounts[category]++;
            bump(signMultiset, placed.sign);
            if (category === "control") bump(controlMultiset, placed.sign);
            if (category === "manifestation")
                bump(manifestationMultiset, placed.sign);
            if (category === "transformation")
                bump(transformationMultiset, placed.sign);
            if (placed.reversed) reversedCount++;
        }

        if (isCompositionSymbol(node.symbol)) {
            compositionCount++;
            const [a, b] = node.symbol.sigils;
            const key = [a, b].sort().join("+");
            bump(symbolMultiset, key);
            if (getCompatibility(a, b) === "incompatible") {
                incompatibleCompositionCount++;
            }
        } else {
            bump(symbolMultiset, String(node.symbol));
        }
    }

    return {
        totalNodes: nodes.length,
        linkedBranches: roots.length,
        maxNestingDepth: Math.max(0, ...roots.map(nestingDepthFrom)),
        signCounts,
        signMultiset,
        controlMultiset,
        manifestationMultiset,
        transformationMultiset,
        reversedCount,
        compositionCount,
        incompatibleCompositionCount,
        symbolMultiset,
    };
}

export { getCompositionResult };
