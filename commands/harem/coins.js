const { SlashCommandBuilder } = require("discord.js");
const { createCoinsEmbed, getCoins } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coins")
        .setDescription("mostra quantas moedas um usuario possui")
        .setDescriptionLocalizations({
            "pt-BR": "mostra quantas moedas um usuario possui",
            "en-US": "shows how many coins a user has",
        })
        .addUserOption((option) => option
            .setName("usuario")
            .setDescription("usuario para consultar; deixe vazio para ver a sua carteira")
            .setDescriptionLocalizations({
                "pt-BR": "usuario para consultar; deixe vazio para ver a sua carteira",
                "en-US": "user to inspect; leave empty to see your own wallet",
            })),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
        const coins = await getCoins(targetUser.id);

        await interaction.reply({
            embeds: [createCoinsEmbed(targetUser, coins)],
        });
    },
};
