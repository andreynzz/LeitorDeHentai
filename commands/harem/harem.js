const { SlashCommandBuilder } = require("discord.js");
const {
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    createHaremEmbed,
    getHarem,
} = require("../../modules/Harem");
const {
    createDoujinCollectionActionRow,
    createDoujinCollectionCarouselEmbed,
    createDoujinCollectionEmbed,
    getDoujinCollection,
} = require("../../modules/DoujinCollection");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("harem")
        .setDescription("lista os personagens que voce ja adicionou ao seu harem")
        .setDescriptionLocalizations({
            "pt-BR": "lista os personagens que voce ja adicionou ao seu harem",
            "en-US": "lists the characters you have already added to your harem",
        })
        .addUserOption((option) => option
            .setName("usuario")
            .setDescription("usuario dono do harem")
            .setDescriptionLocalizations({
                "pt-BR": "usuario dono do harem",
                "en-US": "harem owner",
            }))
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
            ))
        .addStringOption((option) => option
            .setName("colecao")
            .setDescription("qual colecao voce quer abrir")
            .setDescriptionLocalizations({
                "pt-BR": "qual colecao voce quer abrir",
                "en-US": "which collection to open",
            })
            .addChoices(
                { name: "Personagens", value: "characters" },
                { name: "Doujins", value: "doujins" },
            )),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
        const view = interaction.options.getString("view") ?? "list";
        const collectionType = interaction.options.getString("colecao") ?? "characters";

        if (collectionType === "doujins") {
            const collection = await getDoujinCollection(targetUser.id);

            if (view === "carousel") {
                const message = await interaction.reply({
                    embeds: [createDoujinCollectionCarouselEmbed(targetUser, collection, 0)],
                    components: [createDoujinCollectionActionRow(0, collection.doujins.length)],
                    fetchReply: true,
                });

                return {
                    haremCarousel: {
                        message,
                        ownerId: interaction.user.id,
                        targetUser,
                        collectionType,
                    },
                };
            }

            await interaction.reply({
                embeds: [createDoujinCollectionEmbed(targetUser, collection)],
            });
            return;
        }

        const harem = await getHarem(targetUser.id);

        if (view === "carousel") {
            const message = await interaction.reply({
                embeds: [createHaremCarouselEmbed(targetUser, harem, 0)],
                components: [createHaremCarouselActionRow(0, harem.characters.length)],
                fetchReply: true,
            });

            return {
                haremCarousel: {
                    message,
                    ownerId: interaction.user.id,
                    targetUser,
                    collectionType,
                },
            };
        }

        await interaction.reply({
            embeds: [createHaremEmbed(targetUser, harem)],
        });
    },
};
