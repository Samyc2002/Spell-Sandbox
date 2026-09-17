import { test } from "node:test";
import assert from "node:assert/strict";
import { generateBulkMetrics } from "../core/bulkMetricsGenerator.ts";

function spellsOnly(output: ReturnType<typeof generateBulkMetrics>) {
    return output.spells.map(({ spell }) => spell);
}

test("same seed produces identical output across runs", () => {
    const runA = generateBulkMetrics(100);
    const runB = generateBulkMetrics(100);

    assert.deepEqual(spellsOnly(runA), spellsOnly(runB));
});

test("different seeds produce different output", async () => {
    const { defaultRng } = await import("../core/random.ts");
    const spellBuilder = (await import("../core/spellBuilder.ts")).default;

    const rngA = defaultRng(1);
    const rngB = defaultRng(2);

    const spellsA = Array.from({ length: 100 }, () =>
        spellBuilder(rngA, { nested: 4, linked: 0 })
    );
    const spellsB = Array.from({ length: 100 }, () =>
        spellBuilder(rngB, { nested: 4, linked: 0 })
    );

    assert.notDeepEqual(spellsA, spellsB);
});
