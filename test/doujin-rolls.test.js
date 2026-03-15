const test = require("node:test");
const assert = require("node:assert/strict");
const {
    MAX_DOUJIN_ROLLS,
    applyDoujinRollConsumption,
    createFreshDoujinRollState,
    normalizeDoujinRollState,
} = require("../modules/DoujinRolls");

test("normalizeDoujinRollState resets stale windows", () => {
    const now = new Date("2026-03-15T14:30:00.000Z");
    const stale = {
        used: 18,
        slotKey: "2026-03-15:10",
        resetAt: new Date("2026-03-15T14:00:00.000Z").getTime(),
    };

    const normalized = normalizeDoujinRollState(stale, now);
    assert.equal(normalized.used, 0);
    assert.notEqual(normalized.slotKey, stale.slotKey);
});

test("applyDoujinRollConsumption decrements remaining doujin rolls", () => {
    const state = createFreshDoujinRollState(new Date("2026-03-15T14:30:00.000Z"));
    const result = applyDoujinRollConsumption(state);

    assert.equal(result.allowed, true);
    assert.equal(result.state.used, 1);
    assert.equal(result.remaining, MAX_DOUJIN_ROLLS - 1);
});

test("applyDoujinRollConsumption blocks when doujin rolls are exhausted", () => {
    const result = applyDoujinRollConsumption({
        used: MAX_DOUJIN_ROLLS,
        slotKey: "2026-03-15:11",
        resetAt: new Date("2026-03-15T15:00:00.000Z").getTime(),
    });

    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
});
