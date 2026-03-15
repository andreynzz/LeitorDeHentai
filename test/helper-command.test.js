const test = require("node:test");
const assert = require("node:assert/strict");
const { SlashCommandBuilder } = require("discord.js");
const {
    createFakeInteraction,
    requireFresh,
} = require("./helpers/command-test-utils");

function createCommand(name, description, options = []) {
    const builder = new SlashCommandBuilder()
        .setName(name)
        .setDescription(description);

    for (const option of options) {
        builder.addStringOption((stringOption) => stringOption
            .setName(option.name)
            .setDescription(option.description)
            .setRequired(Boolean(option.required)));
    }

    return {
        data: builder,
        execute: async () => {},
    };
}

test("helper command lists available commands", async () => {
    const command = requireFresh("./commands/harem/helper.js");
    const commands = new Map([
        ["character", createCommand("character", "busca um personagem aleatorio")],
        ["coins", createCommand("coins", "mostra quantas moedas voce possui")],
        ["helper", command],
    ]);
    const interaction = createFakeInteraction({ commands });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    const embed = interaction.calls.reply[0].embeds[0].data;
    assert.equal(embed.title, "Central de comandos");
    assert.match(embed.description, /\/character/);
    assert.match(embed.description, /\/coins/);
});

test("helper command shows command details when a name is provided", async () => {
    const command = requireFresh("./commands/harem/helper.js");
    const commands = new Map([
        ["coins", createCommand("coins", "mostra quantas moedas voce possui", [
            { name: "usuario", description: "usuario para consultar", required: false },
        ])],
        ["helper", command],
    ]);
    const interaction = createFakeInteraction({
        commands,
        options: { comando: "coins" },
    });

    await command.execute(interaction);

    assert.equal(interaction.calls.reply.length, 1);
    const embed = interaction.calls.reply[0].embeds[0].data;
    assert.equal(embed.title, "Ajuda do /coins");
    assert.match(embed.description, /mostra quantas moedas/);
    assert.match(embed.fields[0].value, /usuario/);
});
