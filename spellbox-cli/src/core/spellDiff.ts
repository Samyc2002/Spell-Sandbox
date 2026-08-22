import type { BasicSpell, CentralSymbol, Spell } from "../models/spell.ts";

export interface DiffEntry {
    path: string;
    message: string;
}

function symbolKey(symbol: CentralSymbol): string {
    if (typeof symbol === "object" && symbol !== null) {
        return `Radial(${[...symbol.sigils].sort().join("+")})`;
    }
    return String(symbol);
}

function diffBasicSpell(
    a: BasicSpell,
    b: BasicSpell,
    path: string
): DiffEntry[] {
    const entries: DiffEntry[] = [];

    const symbolA = symbolKey(a.symbol);
    const symbolB = symbolKey(b.symbol);
    if (symbolA !== symbolB) {
        entries.push({
            path: `${path}.symbol`,
            message: `symbol changed: ${symbolA} -> ${symbolB}`,
        });
    }

    const countsA = new Map<string, number>();
    for (const s of a.sign ?? [])
        countsA.set(s.sign, (countsA.get(s.sign) ?? 0) + 1);
    const countsB = new Map<string, number>();
    for (const s of b.sign ?? [])
        countsB.set(s.sign, (countsB.get(s.sign) ?? 0) + 1);

    const allSigns = new Set([...countsA.keys(), ...countsB.keys()]);
    for (const sign of allSigns) {
        const na = countsA.get(sign) ?? 0;
        const nb = countsB.get(sign) ?? 0;
        if (na > nb) {
            entries.push({
                path: `${path}.sign`,
                message: `removed ${na - nb}x "${sign}"`,
            });
        } else if (nb > na) {
            entries.push({
                path: `${path}.sign`,
                message: `added ${nb - na}x "${sign}"`,
            });
        }
    }

    const aHasNested = a.spell && !Array.isArray(a.spell);
    const bHasNested = b.spell && !Array.isArray(b.spell);
    if (aHasNested && bHasNested) {
        entries.push(
            ...diffBasicSpell(
                a.spell as BasicSpell,
                b.spell as BasicSpell,
                `${path}.spell`
            )
        );
    } else if (aHasNested && !bHasNested) {
        entries.push({
            path: `${path}.spell`,
            message: "nested child removed",
        });
    } else if (!aHasNested && bHasNested) {
        entries.push({ path: `${path}.spell`, message: "nested child added" });
    }

    return entries;
}

/**
 * Structural, positional diff: linked branches are compared by index (branch 0
 * vs branch 0, etc.) since nothing in the model gives spells a stable identity
 * to match by. If branch counts differ, or one side is linked and the other
 * isn't, that's reported as a top-level shape change rather than diffed further.
 */
export function diffSpells(a: Spell, b: Spell): DiffEntry[] {
    const aIsLinked = Array.isArray(a);
    const bIsLinked = Array.isArray(b);

    if (aIsLinked !== bIsLinked) {
        return [
            {
                path: "spell",
                message: `shape changed: ${aIsLinked ? "linked" : "single/nested"} -> ${
                    bIsLinked ? "linked" : "single/nested"
                }`,
            },
        ];
    }

    if (aIsLinked && bIsLinked) {
        const branchesA = a as BasicSpell[];
        const branchesB = b as BasicSpell[];
        if (branchesA.length !== branchesB.length) {
            return [
                {
                    path: "spell",
                    message: `linked branch count changed: ${branchesA.length} -> ${branchesB.length}`,
                },
            ];
        }
        return branchesA.flatMap((branch, i) =>
            diffBasicSpell(branch, branchesB[i]!, `spell[${i}]`)
        );
    }

    return diffBasicSpell(a as BasicSpell, b as BasicSpell, "spell");
}

export function formatDiff(entries: DiffEntry[]): string {
    if (entries.length === 0) return "No differences found.";
    return entries.map((e) => `${e.path}: ${e.message}`).join("\n");
}
