import assert from "node:assert";
import { validateSpell } from "./spellValidator.ts";
import type { BasicSpell } from "../models/spell.ts";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (err) {
        console.log(`✗ ${name}`);
        console.log(`  ${(err as Error).message}`);
        failed++;
    }
}

// A minimally valid spell: one control sign, simple sigil symbol.
const validSpell: BasicSpell = {
    symbol: "Earth",
    sign: [{ sign: "Direction" }],
};

check("a minimal valid spell passes", () => {
    const result = validateSpell(validSpell);
    assert.strictEqual(result.valid, true, JSON.stringify(result.issues));
});

check("no Control sign is an error", () => {
    const spell: BasicSpell = {
        symbol: "Fire",
        sign: [{ sign: "Column" }], // manifestation only, no control
    };
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, false);
    assert.ok(
        result.issues.some((i) => /at least one Control/.test(i.message))
    );
});

check("unknown sign name is an error", () => {
    const spell = {
        symbol: "Fire",
        sign: [{ sign: "Direction" }, { sign: "NotARealSign" }],
    } as unknown as BasicSpell;
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, false);
    assert.ok(
        result.issues.some((i) => /not a recognized sign/.test(i.message))
    );
});

check("Water + Light composition is an error", () => {
    const spell: BasicSpell = {
        symbol: { composition: "Radial", sigils: ["Water", "Light"] },
        sign: [{ sign: "Direction" }],
    };
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, false);
    assert.ok(
        result.issues.some(
            (i) =>
                i.severity === "error" && /cannot be combined/.test(i.message)
        )
    );
});

check("Fire + Air composition is valid, no warning", () => {
    const spell: BasicSpell = {
        symbol: { composition: "Radial", sigils: ["Fire", "Air"] },
        sign: [{ sign: "Direction" }],
    };
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, true);
    assert.ok(!result.issues.some((i) => /sigils/.test(i.path)));
});

check("unspecified sigil pair is a warning, not an error", () => {
    const spell: BasicSpell = {
        symbol: { composition: "Radial", sigils: ["Earth", "Light"] },
        sign: [{ sign: "Direction" }],
    };
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, true); // warnings don't invalidate
    assert.ok(
        result.issues.some(
            (i) => i.severity === "warning" && /not specified/.test(i.message)
        )
    );
});

check("nested spell inside a linked branch is an error", () => {
    const spell: BasicSpell[] = [
        {
            symbol: "Air",
            sign: [{ sign: "Direction" }],
            spell: {
                symbol: "Water",
                sign: [{ sign: "Pull" }],
            },
        },
    ];
    const result = validateSpell(spell);
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some((i) => /mutually exclusive/.test(i.message)));
});

check(
    "plain nesting (no linking) is allowed to go multiple levels deep",
    () => {
        const spell: BasicSpell = {
            symbol: "Air",
            sign: [{ sign: "Direction" }],
            spell: {
                symbol: "Fire",
                sign: [{ sign: "Pull" }],
                spell: {
                    symbol: "Earth",
                    sign: [{ sign: "Float" }],
                },
            },
        };
        const result = validateSpell(spell);
        assert.strictEqual(result.valid, true, JSON.stringify(result.issues));
    }
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
