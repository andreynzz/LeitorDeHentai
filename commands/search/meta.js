const { SlashCommandBuilder } = require("discord.js");
const { createMetaEmbed } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meta")
        .setDescription("mostra como o rank de mercado e calculado")
        .setDescriptionLocalizations({
            "pt-BR": "mostra como o rank de mercado e calculado",
            "en-US": "shows how the market rank is calculated",
        }),
    async execute(interaction) {
        await interaction.reply({
            embeds: [createMetaEmbed()],
        });
    },
};
