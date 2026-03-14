const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getOwnersForCharacterIds } = require("../../modules/Harem");
const {
    createAdminInfamyResetEmbed,
    createInfamyEmbed,
    getCurrentInfamyBoard,
    processInfamyReset,
} = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admininfamy")
        .setDescription("consulta ou executa o reset de infamia")
        .setDescriptionLocalizations({
            "pt-BR": "consulta ou executa o reset de infamia",
            "en-US": "checks or runs the infamy reset",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) => option
            .setName("acao")
            .setDescription("acao administrativa da infamia")
            .setDescriptionLocalizations({
                "pt-BR": "acao administrativa da infamia",
                "en-US": "infamy admin action",
            })
            .addChoices(
                { name: "board", value: "board" },
                { name: "reset", value: "reset" },
            )),
    async execute(interaction) {
        const action = interaction.options.getString("acao") ?? "board";

        if (action === "reset") {
            const result = await processInfamyReset(getOwnersForCharacterIds);
            await interaction.reply({
                embeds: [createAdminInfamyResetEmbed(result)],
            });
            return;
        }

        const board = await getCurrentInfamyBoard();
        await interaction.reply({
            embeds: [createInfamyEmbed(board)],
        });
    },
};
