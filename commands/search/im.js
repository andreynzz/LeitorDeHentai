const { SlashCommandBuilder } = require("discord.js");
const {
    buildImageAttachment,
    createCharacterSearchCarouselActionRow,
    createCharacterSearchEmbed,
    getCharacterImageCarousel,
    searchCharacters,
} = require("../../modules/Search");
const { getOwnersForCharacterIds } = require("../../modules/Harem");
const { findCharacterByName } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("im")
        .setDescription("pesquisa personagens parecidos com o nome informado")
        .setDescriptionLocalizations({
            "pt-BR": "pesquisa personagens parecidos com o nome informado",
            "en-US": "searches for characters matching the provided name",
        })
        .addStringOption((option) => option
            .setName("query")
            .setNameLocalizations({
                "pt-BR": "pesquisa",
            })
            .setDescription("nome do personagem para pesquisar")
            .setDescriptionLocalizations({
                "pt-BR": "nome do personagem para pesquisar",
                "en-US": "character name to search for",
            })
            .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString("query", true);
        await interaction.deferReply();

        const results = await searchCharacters(query);
        const marketCharacter = results.length > 0
            ? await findCharacterByName(results[0].name)
            : null;
        const ownerIds = marketCharacter
            ? (await getOwnersForCharacterIds([marketCharacter.id]))[marketCharacter.id] ?? []
            : [];
        const characterImageCarousel = results.length > 0
            ? await getCharacterImageCarousel(results[0].name)
            : null;
        const carouselLength = characterImageCarousel?.imageUrls?.length ?? results[0]?.works?.length ?? 0;
        const firstImageCandidates = characterImageCarousel?.imageCandidates?.[0]
            ?? characterImageCarousel?.imageUrls?.[0]
            ?? null;
        const imageAttachment = await buildImageAttachment(firstImageCandidates, "im-image-0");
        const message = await interaction.editReply({
            embeds: [createCharacterSearchEmbed(
                query,
                results,
                0,
                marketCharacter,
                characterImageCarousel,
                imageAttachment?.name ?? null,
                ownerIds,
            )],
            components: results.length > 0 ? [createCharacterSearchCarouselActionRow(carouselLength, 0)] : [],
            files: imageAttachment ? [imageAttachment] : [],
        });

        if (results.length === 0) {
            return;
        }

        return {
            imCarousel: {
                message,
                ownerId: interaction.user.id,
                query,
                results,
                marketCharacter,
                characterImageCarousel,
                ownerIds,
            },
        };
    },
};
