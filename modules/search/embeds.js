const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const { IM_CAROUSEL_PREFIX, NHENTAI_ICON } = require("./constants");

function createCharacterSearchEmbed(query, results, currentImageIndex = 0, characterImageCarousel = null, attachmentName = null) {
    if (results.length === 0) {
        return new EmbedBuilder()
            .setColor(Colors.Orange)
            .setAuthor({ name: "Pesquisa de Personagem", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
            .setTitle("Nenhum personagem encontrado")
            .setDescription(`Nao encontrei personagens para **${query}**.`)
            .setFooter({ text: "Tente outro nome ou uma pesquisa mais curta", iconURL: NHENTAI_ICON })
            .setTimestamp();
    }

    const topResult = results[0];
    const topWork = topResult.works[currentImageIndex] ?? topResult.works[0];
    const usingCharacterImages = characterImageCarousel && characterImageCarousel.imageUrls.length > 0;
    const currentImageUrl = usingCharacterImages
        ? characterImageCarousel.imageUrls[currentImageIndex] ?? characterImageCarousel.imageUrls[0]
        : topWork?.imageUrl;
    const embed = new EmbedBuilder()
        .setColor(0xe84aa6)
        .setAuthor({ name: "Resultados IM", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
        .setTitle(`Personagens encontrados para "${query}"`)
        .setDescription(results.map((result, index) => {
            const works = result.works.slice(0, 2).map((work) => `[\`${work.id}\` ${work.title}](${work.url})`).join("\n");
            const extraWorks = result.works.length > 2 ? `\n+${result.works.length - 2} obra(s)` : "";
            return `\`${index + 1}.\` **${result.name}**\n${works || "_sem obra listada_"}${extraWorks}`;
        }).join("\n\n"))
        .addFields(
            { name: "Melhor match", value: topWork ? `[${topResult.name}](${topWork.url})` : topResult.name, inline: false },
            {
                name: "Fonte das imagens",
                value: usingCharacterImages
                    ? characterImageCarousel.mixedSources
                        ? `${characterImageCarousel.mixedSources.join(" + ")}`
                        : `[${characterImageCarousel.source}](${characterImageCarousel.profileUrl})`
                    : "Capas de obras relacionadas",
                inline: false,
            },
            {
                name: "Tipo",
                value: usingCharacterImages
                    ? (characterImageCarousel.nsfw ? "Imagens NSFW do personagem" : "Imagens gerais do personagem")
                    : "Capas das obras encontradas",
                inline: false,
            },
        )
        .setFooter({
            text: usingCharacterImages
                ? `${results.length} resultado(s) • imagem ${Math.min(currentImageIndex + 1, characterImageCarousel.imageUrls.length)}/${characterImageCarousel.imageUrls.length}`
                : topResult.works.length > 0
                    ? `${results.length} resultado(s) • obra ${Math.min(currentImageIndex + 1, topResult.works.length)}/${topResult.works.length}`
                    : `${results.length} resultado(s) • estilo IM`,
            iconURL: NHENTAI_ICON,
        })
        .setTimestamp();

    if (attachmentName) {
        embed.setImage(`attachment://${attachmentName}`);
    } else if (currentImageUrl) {
        embed.setImage(currentImageUrl);
    }

    return embed;
}

function createWorkSearchEmbed(query, results) {
    if (results.length === 0) {
        return new EmbedBuilder()
            .setColor(Colors.Orange)
            .setAuthor({ name: "Pesquisa de Obra", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
            .setTitle("Nenhuma obra encontrada")
            .setDescription(`Nao encontrei obras para **${query}**.`)
            .setFooter({ text: "Tente outro titulo ou menos palavras", iconURL: NHENTAI_ICON })
            .setTimestamp();
    }

    const topResult = results[0];
    return new EmbedBuilder()
        .setColor(0x4ab4e8)
        .setAuthor({ name: "Resultados IMA", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
        .setTitle(`Obras encontradas para "${query}"`)
        .setDescription(results.map((result, index) => {
            const characterList = result.characters.slice(0, 3).join(", ");
            const extraCharacters = result.characters.length > 3 ? ` +${result.characters.length - 3}` : "";
            return `\`${index + 1}.\` **[${result.title}](${result.url})**\n\`#${result.id}\` • Likes **${result.favorites}**${characterList ? `\n${characterList}${extraCharacters}` : ""}`;
        }).join("\n\n"))
        .setThumbnail(topResult.imageUrl)
        .setFooter({ text: `${results.length} resultado(s) • estilo IMA`, iconURL: NHENTAI_ICON })
        .setTimestamp();
}

function createCharacterSearchCarouselActionRow(totalImages, currentImageIndex = 0) {
    const previousIndex = totalImages > 0 ? (currentImageIndex - 1 + totalImages) % totalImages : 0;
    const nextIndex = totalImages > 0 ? (currentImageIndex + 1) % totalImages : 0;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${IM_CAROUSEL_PREFIX}prev:${previousIndex}`)
            .setLabel("Anterior")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalImages <= 1),
        new ButtonBuilder()
            .setCustomId(`${IM_CAROUSEL_PREFIX}next:${nextIndex}`)
            .setLabel("Proxima obra")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalImages <= 1),
    );
}

module.exports = {
    createCharacterSearchCarouselActionRow,
    createCharacterSearchEmbed,
    createWorkSearchEmbed,
};
