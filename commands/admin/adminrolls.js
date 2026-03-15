const { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { MAX_ROLLS, getRollState, resetAllRolls, resetRolls } = require("../../modules/Rolls");

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
            .setRequired(false))
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
                { name: "reset_all", value: "reset_all" },
            )),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario");
        const action = interaction.options.getString("acao") ?? "status";

        if (action !== "reset_all" && !targetUser) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setAuthor({ name: "Admin - Rolls" })
                        .setTitle("Usuario obrigatorio")
                        .setDescription("Informe um usuario para consultar ou resetar os rolls.")
                        .setTimestamp(),
                ],
            });
            return;
        }

        if (action === "reset_all") {
            const state = await resetAllRolls();
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setAuthor({ name: "Admin - Rolls" })
                        .setTitle("Rolls resetados para todos")
                        .setDescription(`Resetei os rolls de **${state.resetCount}** usuario(s) com registro ativo.`)
                        .addFields({
                            name: "Proximo reset",
                            value: `<t:${Math.floor(state.resetAt / 1000)}:R>`,
                            inline: false,
                        })
                        .setTimestamp(),
                ],
            });
            return;
        }

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
