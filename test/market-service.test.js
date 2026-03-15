const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePrestigeScore, ensureCharacterDefaults, sortCharactersByRank } = require("../modules/market/service");

test("ensureCharacterDefaults calculates market values", () => {
    const character = ensureCharacterDefaults({
        id: "rias-gremory",
        name: "Rias Gremory",
        works: [
            { id: 1, title: "DxD", imageCount: 20 },
            { id: 2, title: "DxD 2", imageCount: 10 },
        ],
        manualRankAdjustment: 8,
        rarityMultiplier: 1.2,
    });

    assert.equal(character.imageCount, 30);
    assert.equal(character.episodeOrChapterCount, 2);
    assert.ok(character.baseScore > 0);
    assert.ok(character.baseContribution > 0);
    assert.equal(character.manualRankAdjustment, 8);
    assert.ok(character.rarityScore >= 0);
    assert.ok(character.rankScore > 0);
    assert.ok(character.claimValue > 0);
});

test("sortCharactersByRank uses stable rank score and prestige", () => {
    const ranked = sortCharactersByRank({
        a: { id: "a", name: "A", works: [{ id: 1, title: "One", imageCount: 1 }], rarityMultiplier: 1 },
        b: { id: "b", name: "B", works: [{ id: 1, title: "Two", imageCount: 50 }], rarityMultiplier: 1 },
    }, {
        a: { ownerCount: 2, favoriteCount: 1, oldestClaimedAt: "2026-02-01T00:00:00.000Z" },
        b: { ownerCount: 0, favoriteCount: 0, oldestClaimedAt: null },
    });

    assert.ok(ranked[0].rankScore >= ranked[1].rankScore);
    assert.ok(ranked.find((character) => character.name === "A").prestigeScore > ranked.find((character) => character.name === "B").prestigeScore);
});

test("calculatePrestigeScore rewards retention and favorites in a small server", () => {
    const prestige = calculatePrestigeScore({
        ownerCount: 2,
        favoriteCount: 1,
        oldestClaimedAt: "2026-02-01T00:00:00.000Z",
    }, new Date("2026-03-14T00:00:00.000Z").getTime());

    assert.ok(prestige > 0);
});
