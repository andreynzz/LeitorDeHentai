const { SlashCommandBuilder } = require("discord.js");
const { createWorkSearchEmbed, searchWorks } = require("../../modules/Search");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ima")
        .setDescription("pesquisa obras parecidas com o nome informado")
        .setDescriptionLocalizations({
            "pt-BR": "pesquisa obras parecidas com o nome informado",
            "en-US": "searches for works matching the provided name",
        })
        .addStringOption((option) => option
            .setName("query")
            .setNameLocalizations({
                "pt-BR": "pesquisa",
            })
            .setDescription("nome da obra para pesquisar")
            .setDescriptionLocalizations({
                "pt-BR": "nome da obra para pesquisar",
                "en-US": "work title to search for",
            })
            .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString("query", true);
        await interaction.deferReply();

        const results = await searchWorks(query);
        await interaction.editReply({
            embeds: [createWorkSearchEmbed(query, results)],
        });
    },
};
