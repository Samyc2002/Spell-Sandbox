export function randomElement<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

export function thisOrThat(): boolean {
    return Boolean(Math.floor(Math.random() * 2));
}
