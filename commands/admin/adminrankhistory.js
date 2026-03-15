const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createAdminRankHistoryEmbed, getRankAdjustmentHistory } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adminrankhistory")
        .setDescription("mostra o historico recente de ajustes manuais de rank")
        .setDescriptionLocalizations({
            "pt-BR": "mostra o historico recente de ajustes manuais de rank",
            "en-US": "shows recent manual rank adjustment history",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption((option) => option
            .setName("limite")
            .setDescription("quantidade de registros para exibir")
            .setDescriptionLocalizations({
                "pt-BR": "quantidade de registros para exibir",
                "en-US": "number of entries to display",
            })
            .setMinValue(1)
            .setMaxValue(20)),
    async execute(interaction) {
        const limit = interaction.options.getInteger("limite") ?? 10;
        const history = await getRankAdjustmentHistory(limit);

        await interaction.reply({
            embeds: [createAdminRankHistoryEmbed(history)],
        });
    },
};
