const test = require("node:test");
const assert = require("node:assert/strict");
const { ensureCharacterDefaults, sortCharactersByRank } = require("../modules/market/service");

test("ensureCharacterDefaults calculates market values", () => {
    const character = ensureCharacterDefaults({
        id: "rias-gremory",
        name: "Rias Gremory",
        works: [
            { id: 1, title: "DxD", imageCount: 20 },
            { id: 2, title: "DxD 2", imageCount: 10 },
        ],
        rarityMultiplier: 1.2,
    });

    assert.equal(character.imageCount, 30);
    assert.equal(character.episodeOrChapterCount, 2);
    assert.ok(character.baseScore > 0);
    assert.ok(character.claimValue > 0);
});

test("sortCharactersByRank sorts by base score descending", () => {
    const ranked = sortCharactersByRank({
        a: { id: "a", name: "A", works: [{ id: 1, title: "One", imageCount: 1 }], rarityMultiplier: 1 },
        b: { id: "b", name: "B", works: [{ id: 1, title: "Two", imageCount: 50 }], rarityMultiplier: 1 },
    });

    assert.equal(ranked[0].name, "B");
    assert.equal(ranked[1].name, "A");
});
