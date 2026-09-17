/**
 * Deterministic, seedable PRNG. Mirrors the shape of numpy's
 * `default_rng(seed)`: create one Generator per run and thread it explicitly
 * through every function that needs randomness. Never reach for a
 * module-level/global RNG.
 */
export interface Generator {
    /** Uniform float in [0, 1). */
    random(): number;
    /** Uniform integer in [0, maxExclusive). */
    integers(maxExclusive: number): number;
}

// mulberry32: small, fast, deterministic 32-bit PRNG.
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

export function defaultRng(seed: number): Generator {
    const next = mulberry32(seed);
    return {
        random: () => next(),
        integers: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    };
}

export function randomElement<T>(rng: Generator, items: readonly T[]): T {
    return items[rng.integers(items.length)]!;
}

export function thisOrThat(rng: Generator): boolean {
    return Boolean(rng.integers(2));
}
