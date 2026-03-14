const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const { GetDoujin } = require("./Doujin");
const { createCharacterEntry, isCharacterClaimed } = require("./Harem");

const CLAIM_CHARACTER_PREFIX = "claim_character:";
const CLAIM_DURATION_SECONDS = 10;

function getCharacterNames(doujin) {
    return doujin?.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [];
}

async function getRandomCharacter(tag = "*") {
    const seenIds = new Set();
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const doujin = await GetDoujin(tag);
        if (!doujin) {
            return null;
        }

        const characters = getCharacterNames(doujin);
        if (characters.length === 0) {
            continue;
        }

        const shuffledCharacters = [...characters].sort(() => Math.random() - 0.5);
        for (const characterName of shuffledCharacters) {
            const character = createCharacterEntry(characterName, doujin);
            if (seenIds.has(character.id)) {
                continue;
            }

            seenIds.add(character.id);
            if (await isCharacterClaimed(character.id)) {
                continue;
            }

            return {
                doujin,
                character,
                characters,
            };
        }
    }

    return null;
}

function createCharacterEmbed(result) {
    const { character, doujin, characters } = result;
    const sourceTitle = doujin.titles.english || doujin.titles.pretty || "Doujin desconhecido";
    const relatedCharacters = characters.filter((name) => name !== character.name).slice(0, 5);
    const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle(character.name)
        .setURL(doujin.url)
        .setDescription(`Origem: **${sourceTitle}**\nID para favorito: \`${character.id}\``)
        .addFields(
            { name: "Doujin", value: `[${sourceTitle}](${doujin.url})`, inline: false },
            { name: "Claim", value: `A primeira pessoa tem ${CLAIM_DURATION_SECONDS}s para capturar.`, inline: false },
            {
                name: "Outros personagens",
                value: relatedCharacters.length > 0 ? relatedCharacters.join(", ") : "Nenhum outro personagem listado",
                inline: false,
            },
        )
        .setImage(doujin.cover.url)
        .setFooter({ text: `Fonte #${doujin.id}` })
        .setTimestamp();

    return embed;
}

function createClaimActionRow(characterId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${CLAIM_CHARACTER_PREFIX}${characterId}`)
            .setLabel("Adicionar ao harem")
            .setStyle(ButtonStyle.Success),
    );
}

function createDisabledClaimActionRow(characterId, label = "Captura encerrada") {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${CLAIM_CHARACTER_PREFIX}${characterId}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
    );
}

function createClaimWindowText(seconds = CLAIM_DURATION_SECONDS) {
    return `Voce tem ${seconds} segundos para capturar este personagem. Apenas a primeira pessoa consegue pegar.`;
}

function createClaimResultEmbed({ character, user, alreadyOwned = false }) {
    return new EmbedBuilder()
        .setColor(alreadyOwned ? Colors.Orange : Colors.Green)
        .setAuthor({ name: alreadyOwned ? "Claim processado" : "Personagem capturado" })
        .setTitle(character.name)
        .setURL(character.sourceUrl)
        .setDescription(
            alreadyOwned
                ? `${user} clicou primeiro e manteve este personagem no proprio harem.`
                : `${user} capturou este personagem para o proprio harem.`,
        )
        .addFields(
            { name: "Origem", value: `[${character.sourceTitle}](${character.sourceUrl})`, inline: true },
            { name: "ID", value: `\`${character.id}\``, inline: true },
        )
        .setImage(character.imageUrl)
        .setFooter({ text: "Claim encerrado" })
        .setTimestamp();
}

function createClaimExpiredEmbed(currentEmbed) {
    const embed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
    return embed
        .setColor(Colors.DarkGrey)
        .setFooter({ text: "Tempo de captura encerrado" })
        .setTimestamp();
}

function createClaimUnavailableEmbed(currentEmbed) {
    const embed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
    return embed
        .setColor(Colors.DarkRed)
        .setFooter({ text: "Captura indisponivel" })
        .setTimestamp();
}

module.exports = {
    CLAIM_CHARACTER_PREFIX,
    CLAIM_DURATION_SECONDS,
    createCharacterEmbed,
    createClaimActionRow,
    createClaimWindowText,
    createDisabledClaimActionRow,
    createClaimExpiredEmbed,
    createClaimResultEmbed,
    createClaimUnavailableEmbed,
    getRandomCharacter,
};
