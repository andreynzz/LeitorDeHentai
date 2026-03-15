const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");

function normalizeCommandName(value) {
    return value?.trim().replace(/^\//, "").toLowerCase() ?? null;
}

function getCommandEntries(commands) {
    return [...commands.values()]
        .map((command) => command.data?.toJSON?.())
        .filter(Boolean)
        .sort((left, right) => left.name.localeCompare(right.name));
}

function formatOption(option) {
    const required = option.required ? "obrigatorio" : "opcional";
    return `\`/${option.name}\` (${required}) - ${option.description}`;
}

function createCommandListEmbed(entries) {
    return new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle("Central de comandos")
        .setDescription(entries.map((entry) => `\`/${entry.name}\` - ${entry.description}`).join("\n"))
        .addFields({
            name: "Dica",
            value: "Use `/helper comando:<nome>` para ver os detalhes de um comando especifico.",
            inline: false,
        })
        .setFooter({ text: `${entries.length} comandos disponiveis` })
        .setTimestamp();
}

function createCommandDetailEmbed(entry) {
    const options = Array.isArray(entry.options) ? entry.options : [];

    return new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`Ajuda do /${entry.name}`)
        .setDescription(entry.description)
        .addFields({
            name: "Opcoes",
            value: options.length > 0
                ? options.map(formatOption).join("\n")
                : "Este comando nao possui opcoes.",
            inline: false,
        })
        .setFooter({ text: "Use /helper para ver a lista completa" })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("helper")
        .setDescription("lista os comandos do bot e explica o que cada um faz")
        .setDescriptionLocalizations({
            "pt-BR": "lista os comandos do bot e explica o que cada um faz",
            "en-US": "lists the bot commands and explains what each one does",
        })
        .addStringOption((option) => option
            .setName("comando")
            .setDescription("nome do comando para ver detalhes")
            .setDescriptionLocalizations({
                "pt-BR": "nome do comando para ver detalhes",
                "en-US": "command name to view details for",
            })),
    async execute(interaction) {
        const entries = getCommandEntries(interaction.client.commands);
        const requestedCommand = normalizeCommandName(interaction.options.getString("comando"));

        if (requestedCommand) {
            const entry = entries.find((command) => command.name === requestedCommand);

            if (!entry) {
                await interaction.reply({
                    content: `Nao encontrei o comando \`/${requestedCommand}\`. Use \`/helper\` para ver a lista completa.`,
                });
                return;
            }

            await interaction.reply({
                embeds: [createCommandDetailEmbed(entry)],
            });
            return;
        }

        await interaction.reply({
            embeds: [createCommandListEmbed(entries)],
        });
    },
};
