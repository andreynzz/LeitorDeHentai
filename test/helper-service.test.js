const test = require("node:test");
const assert = require("node:assert/strict");
const {
    calculateHelperReward,
    rollHelperVariant,
    shouldSpawnHelper,
} = require("../modules/Helper");

test("helper reward scales with character value and owner count", () => {
    const lowReward = calculateHelperReward({ claimValue: 5, rarityMultiplier: 1 }, 1, { multiplier: 0.85 });
    const highReward = calculateHelperReward({ claimValue: 120, rarityMultiplier: 2.5 }, 4, { multiplier: 1.9 });

    assert.equal(lowReward, 15);
    assert.equal(highReward, 90);
});

test("helper drop chance threshold is deterministic with injected value", () => {
    assert.equal(shouldSpawnHelper(0.1), true);
    assert.equal(shouldSpawnHelper(0.9), false);
});

test("helper variant roll follows configured weights", () => {
    assert.equal(rollHelperVariant(0.2).id, "bronze");
    assert.equal(rollHelperVariant(0.99).id, "gold");
});
