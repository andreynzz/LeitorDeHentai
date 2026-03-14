const { SlashCommandBuilder } = require("discord.js");
const { createInfamyEmbed, getCurrentInfamyBoard } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("infamia")
        .setDescription("mostra o mural da vergonha da semana")
        .setDescriptionLocalizations({
            "pt-BR": "mostra o mural da vergonha da semana",
            "en-US": "shows the current wall of shame",
        }),
    async execute(interaction) {
        const board = await getCurrentInfamyBoard();
        await interaction.reply({
            embeds: [createInfamyEmbed(board)],
        });
    },
};
