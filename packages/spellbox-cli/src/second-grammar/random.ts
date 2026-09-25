/**
 * Deterministic, seedable PRNG for the second-grammar (rune-chain) toy
 * system. This is a deliberate, standalone mirror of
 * ../core/random.ts's mulberry32-based Generator, NOT a shared import --
 * the whole point of the second grammar is that it does not depend on
 * anything under core/ or models/. Any resemblance in API shape is
 * intentional (reproducibility contract), the implementation is
 * duplicated on purpose.
 */
export interface RuneGenerator {
    /** Uniform float in [0, 1). */
    random(): number;
    /** Uniform integer in [0, maxExclusive). */
    integers(maxExclusive: number): number;
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function runeRng(seed: number): RuneGenerator {
    const next = mulberry32(seed);
    return {
        random: () => next(),
        integers: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    };
}

export function runeRandomElement<T>(
    rng: RuneGenerator,
    items: readonly T[]
): T {
    return items[rng.integers(items.length)]!;
}
