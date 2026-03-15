const test = require("node:test");
const assert = require("node:assert/strict");
const {
    createFakeInteraction,
    mockModuleExports,
    requireFresh,
} = require("./helpers/command-test-utils");

test("meta command replies with the market meta embed", async () => {
    const restoreMarket = mockModuleExports("./modules/Market.js", {
        createMetaEmbed: () => ({ mock: "meta-embed" }),
    });

    const command = requireFresh("./commands/search/meta.js");
    const interaction = createFakeInteraction();

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    assert.equal(interaction.calls.reply[0].embeds[0].mock, "meta-embed");

    restoreMarket();
});
