const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const { HAREM_CAROUSEL_PREFIX, MAX_HAREM_RESULTS } = require("./constants");
const { getFavoriteCharacter } = require("./service");

function createHaremEmbed(user, harem) {
    const favorite = getFavoriteCharacter(harem);
    const visibleCharacters = harem.characters.slice(0, MAX_HAREM_RESULTS);
    const description = visibleCharacters.length > 0
        ? visibleCharacters.map((character, index) => {
            const favoriteMark = favorite?.id === character.id ? " ❤️" : "";
            return `**${index + 1}.** ${character.name}${favoriteMark}\n\`${character.id}\``;
        }).join("\n\n")
        : "Seu harem ainda esta vazio.";

    const embed = new EmbedBuilder()
        .setColor(Colors.Fuchsia)
        .setAuthor({ name: `${user.username} - Harem` })
        .setTitle(`${harem.characters.length} personagem(ns)`)
        .setDescription(description)
        .setFooter({
            text: favorite
                ? `Favorito: ${favorite.name}`
                : "Use /character para capturar seu primeiro personagem",
        })
        .setTimestamp();

    if (favorite?.imageUrl) {
        embed.setThumbnail(favorite.imageUrl);
    }

    if (harem.characters.length > visibleCharacters.length) {
        embed.addFields({
            name: "Continuacao",
            value: `... e mais ${harem.characters.length - visibleCharacters.length} personagem(ns).`,
            inline: false,
        });
    }

    return embed;
}

function createHaremCarouselEmbed(user, harem, index = 0) {
    const favorite = getFavoriteCharacter(harem);
    const character = harem.characters[index];

    if (!character) {
        return new EmbedBuilder()
            .setColor(Colors.Grey)
            .setAuthor({ name: `${user.username} - Harem` })
            .setTitle("Seu harem esta vazio")
            .setDescription("Use /character para capturar seu primeiro personagem.")
            .setTimestamp();
    }

    return new EmbedBuilder()
        .setColor(favorite?.id === character.id ? Colors.Red : Colors.Fuchsia)
        .setAuthor({ name: `${user.username} - Harem` })
        .setTitle(character.name)
        .setURL(character.sourceUrl)
        .setDescription(favorite?.id === character.id ? "Este e o favorito atual do harem." : "Personagem do seu harem.")
        .addFields(
            { name: "Origem", value: `[${character.sourceTitle}](${character.sourceUrl})`, inline: true },
            { name: "ID", value: `\`${character.id}\``, inline: true },
            { name: "Posicao", value: `${index + 1}/${harem.characters.length}`, inline: true },
        )
        .setImage(character.imageUrl)
        .setFooter({
            text: favorite
                ? `Favorito: ${favorite.name}`
                : "Navegue pelo seu harem",
        })
        .setTimestamp();
}

function createHaremCarouselActionRow(index, total) {
    const hasCharacters = total > 0;
    const previousIndex = total > 0 ? (index - 1 + total) % total : 0;
    const nextIndex = total > 0 ? (index + 1) % total : 0;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${HAREM_CAROUSEL_PREFIX}prev:${previousIndex}`)
            .setLabel("Anterior")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasCharacters),
        new ButtonBuilder()
            .setCustomId(`${HAREM_CAROUSEL_PREFIX}next:${nextIndex}`)
            .setLabel("Proximo")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasCharacters),
    );
}

function createFavoriteEmbed(user, character) {
    const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({ name: `${user.username} favoritou um personagem` })
        .setTitle(character.name)
        .setURL(character.sourceUrl)
        .setDescription(`Agora este personagem e o favorito do harem de ${user}.`)
        .addFields(
            { name: "Origem", value: `[${character.sourceTitle}](${character.sourceUrl})`, inline: true },
            { name: "ID", value: `\`${character.id}\``, inline: true },
        )
        .setFooter({ text: "Favorito atualizado" })
        .setTimestamp();

    if (character.imageUrl) {
        embed.setThumbnail(character.imageUrl);
    }

    return embed;
}

module.exports = {
    createFavoriteEmbed,
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    createHaremEmbed,
};
