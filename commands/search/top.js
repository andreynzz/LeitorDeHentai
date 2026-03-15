const { SlashCommandBuilder } = require("discord.js");
const { createTopCharactersEmbed, getRankedCharacters } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("top")
        .setDescription("lista os personagens com maior rank de mercado")
        .setDescriptionLocalizations({
            "pt-BR": "lista os personagens com maior rank de mercado",
            "en-US": "lists the characters with the highest market rank",
        }),
    async execute(interaction) {
        const ranked = await getRankedCharacters();
        await interaction.reply({
            embeds: [createTopCharactersEmbed(ranked.slice(0, 10))],
        });
    },
};
