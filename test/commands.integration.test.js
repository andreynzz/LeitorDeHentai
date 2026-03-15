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
        createCharacterSearchEmbed: (query, results, currentImageIndex, marketCharacter, characterImageCarousel, attachmentName, ownerIds) => ({
            mock: "im-embed",
            query,
            marketCharacter,
            results,
            currentImageIndex,
            ownerIds,
        }),
        getCharacterImageCarousel: async () => null,
        searchCharacters: async () => [{
            name: "Rias Gremory",
            works: [{ id: 1, title: "High School DxD", url: "https://example.com" }],
        }],
    });
    const restoreHarem = mockModuleExports("./modules/Harem.js", {
        getOwnersForCharacterIds: async () => ({ "rias-gremory": ["user-2"] }),
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        findCharacterByName: async () => ({ id: "rias-gremory", name: "Rias Gremory", rankGlobal: 7, isInfamous: false }),
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
    assert.deepEqual(interaction.calls.editReply[0].embeds[0].ownerIds, ["user-2"]);
    assert.equal(result.imCarousel.marketCharacter.rankGlobal, 7);
    assert.deepEqual(result.imCarousel.ownerIds, ["user-2"]);

    restoreMarket();
    restoreHarem();
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
    assert.equal(result.claimCharacter.id, "rias-gremory");
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
    assert.match(interaction.calls.editReply[0].content, /Fragmento Safira: reaja para coletar/);
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
    const restoreDoujinMarriage = mockModuleExports("./modules/DoujinMarriage.js", {
        getDoujinMarriageState: async () => ({ slotKey: "2026-03-14:09" }),
        getCurrentDoujinMarriageWindow: () => ({ slotKey: "2026-03-14:09", nextSlotAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
    });
    const restoreRolls = mockModuleExports("./modules/Rolls.js", {
        MAX_ROLLS: 10,
        getRollState: async () => ({ used: 3, resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
        getCurrentRollWindow: () => ({ resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
    });
    const restoreDoujinRolls = mockModuleExports("./modules/DoujinRolls.js", {
        MAX_DOUJIN_ROLLS: 20,
        getDoujinRollState: async () => ({ used: 4, resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
        getCurrentDoujinRollWindow: () => ({ resetAt: new Date("2026-03-14T15:00:00.000Z").getTime() }),
    });

    const command = requireFresh("./commands/harem/tu.js");
    const interaction = createFakeInteraction();

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    const embed = interaction.calls.reply[0].embeds[0].data;
    assert.equal(embed.title, "Seu status");
    assert.match(embed.fields[0].name, /Casamento/);
    assert.match(embed.fields[1].name, /Doujin/);
    assert.match(embed.fields[2].name, /Rolls$/);
    assert.match(embed.fields[3].name, /Doujin/);

    restoreDoujinRolls();
    restoreRolls();
    restoreDoujinMarriage();
    restoreMarriage();
});

test("harem command supports list and carousel views", async () => {
    const restoreHarem = mockModuleExports("./modules/Harem.js", {
        getHarem: async () => ({ favoriteId: "rias-gremory", characters: [{ id: "rias-gremory", name: "Rias Gremory" }] }),
        createHaremEmbed: () => ({ mock: "list-embed" }),
        createHaremCarouselEmbed: () => ({ mock: "carousel-embed" }),
        createHaremCarouselActionRow: () => ({ mock: "carousel-row" }),
    });
    const restoreDoujins = mockModuleExports("./modules/DoujinCollection.js", {
        getDoujinCollection: async () => ({ doujins: [{ id: "1", title: "Test Doujin" }] }),
        createDoujinCollectionEmbed: () => ({ mock: "doujin-list-embed" }),
        createDoujinCollectionCarouselEmbed: () => ({ mock: "doujin-carousel-embed" }),
        createDoujinCollectionActionRow: () => ({ mock: "doujin-carousel-row" }),
    });

    const command = requireFresh("./commands/harem/harem.js");
    const listInteraction = createFakeInteraction({ options: { view: "list" } });
    const carouselInteraction = createFakeInteraction({ options: { view: "carousel" } });
    const doujinInteraction = createFakeInteraction({ options: { colecao: "doujins" } });

    const listResult = await command.execute(listInteraction);
    const carouselResult = await command.execute(carouselInteraction);
    const doujinResult = await command.execute(doujinInteraction);

    assert.equal(listResult, undefined);
    assert.equal(listInteraction.calls.reply[0].embeds[0].mock, "list-embed");
    assert.equal(carouselInteraction.calls.reply[0].fetchReply, true);
    assert.equal(carouselResult.haremCarousel.ownerId, "user-1");
    assert.equal(carouselResult.haremCarousel.targetUser.id, "user-1");
    assert.equal(carouselResult.haremCarousel.message.id, "message-1");
    assert.equal(doujinResult, undefined);
    assert.equal(doujinInteraction.calls.reply[0].embeds[0].mock, "doujin-list-embed");

    restoreDoujins();
    restoreHarem();
});

test("random command returns a doujin claim payload", async () => {
    const restoreDoujin = mockModuleExports("./modules/Doujin.js", {
        GetDoujin: async () => ({
            id: 123,
            titles: { english: "Test Doujin" },
            url: "https://example.com/d/123",
            cover: { url: "https://example.com/cover.jpg" },
            favorites: 45,
            tags: {
                artists: [{ name: "Artist" }],
                tags: [{ name: "tag1" }],
            },
        }),
    });
    const restoreDoujinRolls = mockModuleExports("./modules/DoujinRolls.js", {
        consumeDoujinRoll: async () => ({ allowed: true, remaining: 19, state: { used: 1 } }),
        createDoujinRollLimitEmbed: () => ({ mock: "doujin-roll-limit-embed" }),
        createDoujinRollStatusText: (remaining) => `Doujin rolls restantes: ${remaining}`,
    });
    const restoreClaim = mockModuleExports("./modules/DoujinCollectionClaim.js", {
        createDoujinClaimActionRow: () => ({ mock: "doujin-claim-row" }),
        createRolledDoujinEmbed: () => ({ mock: "rolled-doujin-embed" }),
    });

    const command = requireFresh("./commands/random/random.js");
    const interaction = createFakeInteraction();

    const result = await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].fetchReply, true);
    assert.match(interaction.calls.reply[0].content, /Doujin rolls restantes: 19/);
    assert.equal(interaction.calls.reply[0].embeds[0].mock, "rolled-doujin-embed");
    assert.equal(result.doujinClaim.doujin.id, 123);

    restoreClaim();
    restoreDoujinRolls();
    restoreDoujin();
});

test("adminrank command applies a manual rank adjustment", async () => {
    const restoreHarem = mockModuleExports("./modules/Harem.js", {
        buildCharacterId: (name) => name.toLowerCase().replace(/\s+/g, "-"),
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        createAdminRankEmbed: () => ({ mock: "admin-rank-embed" }),
        findCharacterByName: async () => ({
            id: "rias-gremory",
            name: "Rias Gremory",
        }),
        setCharacterManualRankAdjustment: async () => ({
            id: "rias-gremory",
            name: "Rias Gremory",
            manualRankAdjustment: 12,
            rankScore: 88,
            prestigeScore: 10,
            claimValue: 123,
        }),
        updateCharacterMarketEntry: async () => {},
    });
    const restoreSearch = mockModuleExports("./modules/Search.js", {
        searchCharacters: async () => [],
    });

    const command = requireFresh("./commands/admin/adminrank.js");
    const interaction = createFakeInteraction({
        options: { nome: "Rias Gremory", ajuste: 12 },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].embeds[0].mock, "admin-rank-embed");

    restoreSearch();
    restoreMarket();
    restoreHarem();
});

test("adminrankhistory command shows recent manual rank changes", async () => {
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        createAdminRankHistoryEmbed: () => ({ mock: "admin-rank-history-embed" }),
        getRankAdjustmentHistory: async () => [{
            characterName: "Rias Gremory",
            amount: 12,
            previousAmount: 0,
            actorId: "user-1",
            recordedAt: "2026-03-14T12:00:00.000Z",
        }],
    });

    const command = requireFresh("./commands/admin/adminrankhistory.js");
    const interaction = createFakeInteraction({
        options: { limite: 5 },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].embeds[0].mock, "admin-rank-history-embed");

    restoreMarket();
});

test("adminrolls command can reset all tracked users", async () => {
    const restoreRolls = mockModuleExports("./modules/Rolls.js", {
        MAX_ROLLS: 10,
        getRollState: async () => ({ used: 2, resetAt: Date.now() + 60_000 }),
        resetAllRolls: async () => ({
            used: 0,
            remaining: 10,
            resetAt: new Date("2026-03-14T15:00:00.000Z").getTime(),
            resetCount: 3,
        }),
        resetRolls: async () => ({ used: 0, resetAt: Date.now() + 60_000 }),
    });

    const command = requireFresh("./commands/admin/adminrolls.js");
    const interaction = createFakeInteraction({
        options: { acao: "reset_all" },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].embeds[0].data.title, "Rolls resetados para todos");
    assert.match(interaction.calls.reply[0].embeds[0].data.description, /3/);

    restoreRolls();
});

test("admindivorce command can force-divorce an entire harem", async () => {
    const restoreHarem = mockModuleExports("./modules/Harem.js", {
        getHarem: async () => ({
            favoriteId: "rias-gremory",
            characters: [
                { id: "rias-gremory", name: "Rias Gremory" },
                { id: "akeno-himejima", name: "Akeno Himejima" },
            ],
        }),
        removeCharacterFromHarem: async (userId, characterId) => ({
            removed: true,
            character: {
                id: characterId,
                name: characterId === "rias-gremory" ? "Rias Gremory" : "Akeno Himejima",
            },
        }),
    });
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        incrementWeeklyDivorces: async () => ({ divorciosSemanais: 1 }),
    });

    const command = requireFresh("./commands/admin/admindivorce.js");
    const interaction = createFakeInteraction({
        options: {
            usuario: { id: "user-2", username: "Akumu", toString: () => "<@user-2>" },
            acao: "all",
        },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].embeds[0].data.title, "Harem divorciado");
    assert.match(interaction.calls.reply[0].embeds[0].data.description, /2/);

    restoreMarket();
    restoreHarem();
});
