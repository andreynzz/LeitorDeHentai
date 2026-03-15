const test = require("node:test");
const assert = require("node:assert/strict");
const {
    calculateHelperReward,
    shouldSpawnHelper,
} = require("../modules/Helper");

test("helper reward scales with character value and owner count", () => {
    const lowReward = calculateHelperReward({ claimValue: 5, rarityMultiplier: 1 }, 1);
    const highReward = calculateHelperReward({ claimValue: 120, rarityMultiplier: 2.5 }, 4);

    assert.equal(lowReward, 16);
    assert.equal(highReward, 90);
});

test("helper drop chance threshold is deterministic with injected value", () => {
    assert.equal(shouldSpawnHelper(0.1), true);
    assert.equal(shouldSpawnHelper(0.9), false);
});
