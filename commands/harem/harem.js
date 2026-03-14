const { SlashCommandBuilder } = require("discord.js");
const {
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    createHaremEmbed,
    getHarem,
} = require("../../modules/Harem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("harem")
        .setDescription("lista os personagens que voce ja adicionou ao seu harem")
        .setDescriptionLocalizations({
            "pt-BR": "lista os personagens que voce ja adicionou ao seu harem",
            "en-US": "lists the characters you have already added to your harem",
        })
        .addStringOption((option) => option
            .setName("view")
            .setNameLocalizations({
                "pt-BR": "visualizacao",
            })
            .setDescription("forma de exibir o seu harem")
            .setDescriptionLocalizations({
                "pt-BR": "forma de exibir o seu harem",
                "en-US": "how to display your harem",
            })
            .addChoices(
                { name: "Lista", value: "list" },
                { name: "Carrossel", value: "carousel" },
            )),
    async execute(interaction) {
        const harem = await getHarem(interaction.user.id);
        const view = interaction.options.getString("view") ?? "list";

        if (view === "carousel") {
            const message = await interaction.reply({
                embeds: [createHaremCarouselEmbed(interaction.user, harem, 0)],
                components: [createHaremCarouselActionRow(0, harem.characters.length)],
                fetchReply: true,
            });

            return {
                haremCarousel: {
                    message,
                    ownerId: interaction.user.id,
                },
            };
        }

        await interaction.reply({
            embeds: [createHaremEmbed(interaction.user, harem)],
        });
    },
};
