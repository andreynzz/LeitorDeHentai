const test = require("node:test");
const assert = require("node:assert/strict");
const {
    createFakeInteraction,
    mockModuleExports,
    requireFresh,
} = require("./helpers/command-test-utils");

test("character command blocks character names used as tags", async () => {
    const restoreSearch = mockModuleExports("./modules/Search.js", {
        isLikelyCharacterQuery: async () => true,
    });
    const command = requireFresh("./commands/harem/character.js");
    const interaction = createFakeInteraction({
        options: { tag: "rias gremory" },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.deferReply, 0);
    assert.equal(interaction.calls.reply[0].embeds[0].data.title, "Tag invalida");
    restoreSearch();
});

test("im command shows market rank for the best match", async () => {
    const restoreSearch = mockModuleExports("./modules/Search.js", {
        buildImageAttachment: async () => null,
        createCharacterSearchCarouselActionRow: () => ({ mock: "im-row" }),
        createCharacterSearchEmbed: (query, results, currentImageIndex, marketCharacter) => ({
            mock: "im-embed",
            query,
            marketCharacter,
            results,
            currentImageIndex,
        }),
        getCharacterImageCarousel: async () => null,
        searchCharacters: async () => [{
            name: "Rias Gremory",
            works: [{ id: 1, title: "High School DxD", url: "https://example.com" }],
        }],
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        findCharacterByName: async () => ({ name: "Rias Gremory", rankGlobal: 7, isInfamous: false }),
    });

    const command = requireFresh("./commands/search/im.js");
    const interaction = createFakeInteraction({
        options: { query: "rias" },
    });

    const result = await command.execute(interaction);

    assert.equal(interaction.calls.deferReply, 1);
    assert.equal(interaction.calls.editReply.length, 1);
    assert.equal(interaction.calls.editReply[0].embeds[0].mock, "im-embed");
    assert.equal(interaction.calls.editReply[0].embeds[0].marketCharacter.rankGlobal, 7);
    assert.equal(result.imCarousel.marketCharacter.rankGlobal, 7);

    restoreMarket();
    restoreSearch();
});

test("character command returns claim payload on successful drop", async () => {
    const restoreCharacter = mockModuleExports("./modules/Character.js", {
        getRandomCharacter: async () => ({
            alreadyClaimed: false,
            character: { id: "rias-gremory", name: "Rias Gremory" },
            doujin: { id: 1 },
        }),
        createCharacterEmbed: () => ({ mock: "character-embed" }),
        createClaimActionRow: (id) => ({ mock: "claim-row", id }),
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        getCharacterById: async () => ({ claimValue: 40, rarityMultiplier: 1.4 }),
        registerCharacterFromDrop: async () => {},
    });
    const restoreHelper = mockModuleExports("./modules/Helper.js", {
        calculateHelperReward: () => 20,
        createHelperDropEmbed: () => ({ mock: "helper-embed" }),
        rollHelperVariant: () => ({ emoji: "🔷", name: "Fragmento Safira" }),
        shouldSpawnHelper: () => false,
    });
    const restoreRolls = mockModuleExports("./modules/Rolls.js", {
        consumeRoll: async () => ({ allowed: true, remaining: 9, state: { used: 1 } }),
        createRollStatusText: (remaining) => `Rolls restantes: ${remaining}`,
    });
    const restoreSearch = mockModuleExports("./modules/Search.js", {
        isLikelyCharacterQuery: async () => false,
    });
    const restoreWish = mockModuleExports("./modules/Wish.js", {
        getWishMatches: async () => ["user-2"],
        createWishAlertContent: () => "@user-2 wished this",
    });

    const command = requireFresh("./commands/harem/character.js");
    const interaction = createFakeInteraction();

    const result = await command.execute(interaction);

    assert.equal(interaction.calls.deferReply, 1);
    assert.equal(interaction.calls.editReply.length, 1);
    assert.match(interaction.calls.editReply[0].content, /@user-2 wished this/);
    assert.match(interaction.calls.editReply[0].content, /Rolls restantes: 9/);
    assert.equal(result.claimCharacterId, "rias-gremory");
    assert.equal(result.message.id, "message-1");

    restoreWish();
    restoreSearch();
    restoreRolls();
    restoreHelper();
    restoreMarket();
    restoreCharacter();
});

test("character command can turn an owned roll into a helper drop", async () => {
    const restoreCharacter = mockModuleExports("./modules/Character.js", {
        getRandomCharacter: async () => ({
            alreadyClaimed: true,
            ownerCount: 2,
            character: { id: "rias-gremory", name: "Rias Gremory" },
            doujin: { id: 1 },
        }),
        createCharacterEmbed: () => ({ mock: "character-embed" }),
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        getCharacterById: async () => ({ claimValue: 40, rarityMultiplier: 1.4 }),
        registerCharacterFromDrop: async () => {},
    });
    const restoreHelper = mockModuleExports("./modules/Helper.js", {
        calculateHelperReward: () => 33,
        createHelperDropEmbed: () => ({ mock: "helper-embed" }),
        rollHelperVariant: () => ({ emoji: "🔷", name: "Fragmento Safira" }),
        shouldSpawnHelper: () => true,
    });
    const restoreRolls = mockModuleExports("./modules/Rolls.js", {
        consumeRoll: async () => ({ allowed: true, remaining: 8, state: { used: 2 } }),
        createRollStatusText: (remaining) => `Rolls restantes: ${remaining}`,
    });
    const restoreSearch = mockModuleExports("./modules/Search.js", {
        isLikelyCharacterQuery: async () => false,
    });
    const restoreWish = mockModuleExports("./modules/Wish.js", {
        getWishMatches: async () => [],
        createWishAlertContent: () => null,
    });

    const command = requireFresh("./commands/harem/character.js");
    const interaction = createFakeInteraction();

    const result = await command.execute(interaction);

    assert.equal(interaction.calls.editReply.length, 1);
    assert.match(interaction.calls.editReply[0].content, /Fragmento Safira disponivel/);
    assert.equal(interaction.calls.editReply[0].embeds[0].mock, "helper-embed");
    assert.equal(result.helperDrop.reward, 33);
    assert.equal(result.helperDrop.variant.emoji, "🔷");

    restoreWish();
    restoreSearch();
    restoreRolls();
    restoreHelper();
    restoreMarket();
    restoreCharacter();
});

test("tu command replies with marriage and roll status embed", async () => {
    const restoreMarriage = mockModuleExports("./modules/Marriage.js", {
        getMarriageState: async () => ({ slotKey: "2026-03-14:09" }),
        getCurrentMarriageWindow: () => ({ slotKey: "2026-03-14:09", nextSlotAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
    });
    const restoreRolls = mockModuleExports("./modules/Rolls.js", {
        MAX_ROLLS: 10,
        getRollState: async () => ({ used: 3, resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
        getCurrentRollWindow: () => ({ resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
    });

    const command = requireFresh("./commands/harem/tu.js");
    const interaction = createFakeInteraction();

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    const embed = interaction.calls.reply[0].embeds[0].data;
    assert.equal(embed.title, "Seu status");
    assert.match(embed.fields[0].name, /Casamento/);
    assert.match(embed.fields[1].name, /Rolls/);

    restoreRolls();
    restoreMarriage();
});

test("harem command supports list and carousel views", async () => {
    const restoreHarem = mockModuleExports("./modules/Harem.js", {
        getHarem: async () => ({ favoriteId: "rias-gremory", characters: [{ id: "rias-gremory", name: "Rias Gremory" }] }),
        createHaremEmbed: () => ({ mock: "list-embed" }),
        createHaremCarouselEmbed: () => ({ mock: "carousel-embed" }),
        createHaremCarouselActionRow: () => ({ mock: "carousel-row" }),
    });

    const command = requireFresh("./commands/harem/harem.js");
    const listInteraction = createFakeInteraction({ options: { view: "list" } });
    const carouselInteraction = createFakeInteraction({ options: { view: "carousel" } });

    const listResult = await command.execute(listInteraction);
    const carouselResult = await command.execute(carouselInteraction);

    assert.equal(listResult, undefined);
    assert.equal(listInteraction.calls.reply[0].embeds[0].mock, "list-embed");
    assert.equal(carouselInteraction.calls.reply[0].fetchReply, true);
    assert.equal(carouselResult.haremCarousel.ownerId, "user-1");
    assert.equal(carouselResult.haremCarousel.message.id, "message-1");

    restoreHarem();
});
