export const NORMALIZATION_TYPES = {
    SIGMOID: "sigmoid",
    EXPONENTIAL: "exponential",
    ARCTAN: "arctan",
    NONE: "none",
} as const;

const NORMALIZATION_VALUE = 15;

function sigmoid(value: number): number {
    return 2 / (1 + Math.exp((-1 * value) / NORMALIZATION_VALUE)) - 1;
}

function exponential(value: number): number {
    return Math.exp(-NORMALIZATION_VALUE / value);
}

function arctan(value: number): number {
    return (1 / Math.PI) * Math.atan(value / NORMALIZATION_VALUE);
}

export function normalize(value: number, type: string): number {
    switch (type) {
        case NORMALIZATION_TYPES.SIGMOID:
            return sigmoid(value);
        case NORMALIZATION_TYPES.EXPONENTIAL:
            return exponential(value);
        case NORMALIZATION_TYPES.ARCTAN:
            return arctan(value);
        case NORMALIZATION_TYPES.NONE:
            return value;
        default:
            return value;
    }
}
