const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
    addCoins,
    createAdminCoinsEmbed,
    getCoins,
    setCoins,
} = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admincoins")
        .setDescription("gerencia moedas de um usuario")
        .setDescriptionLocalizations({
            "pt-BR": "gerencia moedas de um usuario",
            "en-US": "manages a user's coins",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((option) => option
            .setName("usuario")
            .setDescription("usuario que tera a carteira alterada")
            .setDescriptionLocalizations({
                "pt-BR": "usuario que tera a carteira alterada",
                "en-US": "user whose wallet will be changed",
            })
            .setRequired(true))
        .addStringOption((option) => option
            .setName("acao")
            .setDescription("operacao para aplicar na carteira")
            .setDescriptionLocalizations({
                "pt-BR": "operacao para aplicar na carteira",
                "en-US": "operation to apply to the wallet",
            })
            .addChoices(
                { name: "add", value: "add" },
                { name: "remove", value: "remove" },
                { name: "set", value: "set" },
            )
            .setRequired(true))
        .addIntegerOption((option) => option
            .setName("quantidade")
            .setDescription("quantidade de moedas")
            .setDescriptionLocalizations({
                "pt-BR": "quantidade de moedas",
                "en-US": "coin amount",
            })
            .setMinValue(0)
            .setRequired(true)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario", true);
        const action = interaction.options.getString("acao", true);
        const amount = interaction.options.getInteger("quantidade", true);

        let coins;
        let actionLabel;
        if (action === "set") {
            coins = await setCoins(targetUser.id, amount);
            actionLabel = `Saldo definido para ${amount}`;
        } else if (action === "remove") {
            const current = await getCoins(targetUser.id);
            coins = await setCoins(targetUser.id, Math.max(0, current - amount));
            actionLabel = `${amount} moedas removidas`;
        } else {
            coins = await addCoins(targetUser.id, amount);
            actionLabel = `${amount} moedas adicionadas`;
        }

        await interaction.reply({
            embeds: [createAdminCoinsEmbed(targetUser, coins, actionLabel)],
        });
    },
};
