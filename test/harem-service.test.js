const test = require("node:test");
const assert = require("node:assert/strict");
const {
    buildCharacterId,
    createCharacterEntry,
    formatHaremList,
    sanitizeHaremData,
} = require("../modules/harem/service");

test("buildCharacterId normalizes names consistently", () => {
    assert.equal(buildCharacterId("Rias Gremory"), "rias-gremory");
    assert.equal(buildCharacterId("Rias, Gremory!"), "rias-gremory");
});

test("sanitizeHaremData deduplicates entries and fixes favorite id", () => {
    const { harem, changed } = sanitizeHaremData({
        favoriteId: "Rias Gremory",
        characters: [
            { id: "abc", name: "Rias Gremory" },
            { id: "def", name: "Rias Gremory" },
            { id: "ghi", name: "Akeno Himejima" },
        ],
    });

    assert.equal(changed, true);
    assert.equal(harem.characters.length, 2);
    assert.equal(harem.favoriteId, "rias-gremory");
});

test("createCharacterEntry uses normalized id from doujin data", () => {
    const entry = createCharacterEntry("Rias Gremory", {
        id: 123,
        titles: { english: "High School DxD" },
        url: "https://example.com",
        cover: { url: "https://example.com/image.jpg" },
    });

    assert.equal(entry.id, "rias-gremory");
    assert.equal(entry.sourceTitle, "High School DxD");
});

test("formatHaremList marks favorite entries", () => {
    const text = formatHaremList({
        favoriteId: "rias-gremory",
        characters: [
            { id: "rias-gremory", name: "Rias Gremory" },
            { id: "akeno-himejima", name: "Akeno Himejima" },
        ],
    }, 10);

    assert.match(text, /\[favorito\]/);
});
