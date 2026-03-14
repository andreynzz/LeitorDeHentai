const { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { MAX_ROLLS, getRollState, resetRolls } = require("../../modules/Rolls");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adminrolls")
        .setDescription("consulta ou reseta os rolls de um usuario")
        .setDescriptionLocalizations({
            "pt-BR": "consulta ou reseta os rolls de um usuario",
            "en-US": "checks or resets a user's rolls",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((option) => option
            .setName("usuario")
            .setDescription("usuario para consultar")
            .setDescriptionLocalizations({
                "pt-BR": "usuario para consultar",
                "en-US": "user to inspect",
            })
            .setRequired(true))
        .addStringOption((option) => option
            .setName("acao")
            .setDescription("acao a executar nos rolls")
            .setDescriptionLocalizations({
                "pt-BR": "acao a executar nos rolls",
                "en-US": "action to perform on rolls",
            })
            .addChoices(
                { name: "status", value: "status" },
                { name: "reset", value: "reset" },
            )),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario", true);
        const action = interaction.options.getString("acao") ?? "status";

        const state = action === "reset"
            ? await resetRolls(targetUser.id)
            : await getRollState(targetUser.id);
        const remaining = MAX_ROLLS - state.used;

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(action === "reset" ? Colors.Green : Colors.Blurple)
                    .setAuthor({ name: "Admin - Rolls" })
                    .setTitle(action === "reset" ? "Rolls resetados" : "Status dos rolls")
                    .setDescription(`${targetUser} possui **${remaining}/${MAX_ROLLS}** rolls disponiveis.`)
                    .addFields({
                        name: "Proximo reset",
                        value: `<t:${Math.floor(state.resetAt / 1000)}:R>`,
                        inline: false,
                    })
                    .setTimestamp(),
            ],
        });
    },
};
