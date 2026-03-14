const test = require("node:test");
const assert = require("node:assert/strict");
const {
    applyRollConsumption,
    createFreshRollState,
    normalizeRollState,
    MAX_ROLLS,
} = require("../modules/Rolls");

test("normalizeRollState resets stale windows", () => {
    const now = new Date("2026-03-14T14:30:00.000Z");
    const stale = {
        used: 8,
        slotKey: "2026-03-14:10",
        resetAt: new Date("2026-03-14T14:00:00.000Z").getTime(),
    };

    const normalized = normalizeRollState(stale, now);
    assert.equal(normalized.used, 0);
    assert.notEqual(normalized.slotKey, stale.slotKey);
});

test("applyRollConsumption decrements remaining rolls", () => {
    const state = createFreshRollState(new Date("2026-03-14T14:30:00.000Z"));
    const result = applyRollConsumption(state);

    assert.equal(result.allowed, true);
    assert.equal(result.state.used, 1);
    assert.equal(result.remaining, MAX_ROLLS - 1);
});

test("applyRollConsumption blocks when rolls are exhausted", () => {
    const result = applyRollConsumption({
        used: MAX_ROLLS,
        slotKey: "2026-03-14:11",
        resetAt: new Date("2026-03-14T15:00:00.000Z").getTime(),
    });

    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
});
