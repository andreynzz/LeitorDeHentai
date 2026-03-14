const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const HAREM_PREFIX = "harem:";
const MAX_HAREM_RESULTS = 10;
const HAREM_CAROUSEL_PREFIX = "harem_carousel:";

function getHaremKey(userId) {
    return `${HAREM_PREFIX}${userId}`;
}

function normalizeCharacterId(value) {
    return value
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .slice(0, 60);
}

function buildCharacterId(characterName) {
    return normalizeCharacterId(characterName);
}

function createCharacterEntry(characterName, doujin) {
    return {
        id: buildCharacterId(characterName),
        name: characterName,
        sourceId: doujin.id,
        sourceTitle: doujin.titles.english || doujin.titles.pretty || "Doujin desconhecido",
        sourceUrl: doujin.url,
        imageUrl: doujin.cover.url,
        claimedAt: new Date().toISOString(),
    };
}

function normalizeCharacterEntry(entry) {
    if (!entry) {
        return null;
    }

    const normalizedId = buildCharacterId(entry.name ?? entry.id ?? "");
    if (!normalizedId) {
        return null;
    }

    return {
        ...entry,
        id: normalizedId,
    };
}

function sanitizeHaremData(harem) {
    const sourceCharacters = Array.isArray(harem?.characters) ? harem.characters : [];
    const seen = new Set();
    const idMap = new Map();
    const characters = [];
    let changed = false;

    for (const entry of sourceCharacters) {
        const normalized = normalizeCharacterEntry(entry);
        if (!normalized) {
            changed = true;
            continue;
        }

        idMap.set(entry.id, normalized.id);
        if (normalized.id !== entry.id) {
            changed = true;
        }

        if (seen.has(normalized.id)) {
            changed = true;
            continue;
        }

        seen.add(normalized.id);
        characters.push(normalized);
    }

    const favoriteId = harem?.favoriteId
        ? idMap.get(harem.favoriteId) ?? (seen.has(harem.favoriteId) ? harem.favoriteId : null)
        : null;
    const safeFavoriteId = favoriteId && seen.has(favoriteId) ? favoriteId : characters[0]?.id ?? null;

    if (safeFavoriteId !== (harem?.favoriteId ?? null)) {
        changed = true;
    }

    return {
        harem: {
            favoriteId: safeFavoriteId,
            characters,
        },
        changed,
    };
}

async function getHarem(userId) {
    const stored = (await keyv.get(getHaremKey(userId))) ?? { favoriteId: null, characters: [] };
    const { harem, changed } = sanitizeHaremData(stored);
    if (changed) {
        await saveHarem(userId, harem);
    }

    return harem;
}

async function saveHarem(userId, harem) {
    await keyv.set(getHaremKey(userId), harem);
}

async function addCharacterToHarem(userId, character) {
    const harem = await getHarem(userId);
    const existingCharacter = harem.characters.find((entry) => entry.id === character.id);
    if (existingCharacter) {
        return { added: false, harem, character: existingCharacter };
    }

    harem.characters.push(character);
    if (!harem.favoriteId) {
        harem.favoriteId = character.id;
    }

    await saveHarem(userId, harem);
    return { added: true, harem, character };
}

async function setFavoriteCharacter(userId, characterId) {
    const harem = await getHarem(userId);
    const character = harem.characters.find((entry) => entry.id === characterId);
    if (!character) {
        return { updated: false, harem };
    }

    harem.favoriteId = character.id;
    await saveHarem(userId, harem);
    return { updated: true, harem, character };
}

async function removeCharacterFromHarem(userId, characterId) {
    const harem = await getHarem(userId);
    const index = harem.characters.findIndex((entry) => entry.id === characterId);
    if (index === -1) {
        return { removed: false, harem };
    }

    const [character] = harem.characters.splice(index, 1);
    if (harem.favoriteId === characterId) {
        harem.favoriteId = harem.characters[0]?.id ?? null;
    }

    await saveHarem(userId, harem);
    return { removed: true, harem, character };
}

async function getOwnersForCharacterIds(characterIds) {
    const wanted = new Set(characterIds.map((characterId) => normalizeCharacterId(characterId)));
    const ownersByCharacterId = Object.fromEntries([...wanted].map((characterId) => [characterId, []]));
    const iterator = keyv.iterator();

    for await (const [key, value] of iterator) {
        if (!key.startsWith(HAREM_PREFIX)) {
            continue;
        }

        const userId = key.slice(HAREM_PREFIX.length);
        const rawHarem = value?.characters ? value : typeof value === "string" ? JSON.parse(value) : null;
        const { harem } = sanitizeHaremData(rawHarem);
        if (!harem?.characters) {
            continue;
        }

        for (const character of harem.characters) {
            if (wanted.has(character.id)) {
                ownersByCharacterId[character.id].push(userId);
            }
        }
    }

    return ownersByCharacterId;
}

async function countOwnersForCharacter(characterId) {
    const normalizedId = normalizeCharacterId(characterId);
    const owners = await getOwnersForCharacterIds([normalizedId]);
    return owners[normalizedId]?.length ?? 0;
}

async function isCharacterClaimed(characterId) {
    const normalizedId = normalizeCharacterId(characterId);
    const owners = await getOwnersForCharacterIds([normalizedId]);
    return (owners[normalizedId]?.length ?? 0) > 0;
}

function getFavoriteCharacter(harem) {
    if (!harem.favoriteId) {
        return null;
    }

    return harem.characters.find((entry) => entry.id === harem.favoriteId) ?? null;
}

function formatHaremList(harem) {
    if (harem.characters.length === 0) {
        return "Seu harem ainda esta vazio.";
    }

    const favorite = getFavoriteCharacter(harem);
    const visibleCharacters = harem.characters.slice(0, MAX_HAREM_RESULTS);
    const lines = visibleCharacters.map((character, index) => {
        const favoriteMark = favorite?.id === character.id ? " [favorito]" : "";
        return `${index + 1}. ${character.name} (${character.id})${favoriteMark}`;
    });

    if (harem.characters.length > visibleCharacters.length) {
        lines.push(`... e mais ${harem.characters.length - visibleCharacters.length} personagem(ns).`);
    }

    return lines.join("\n");
}

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
    addCharacterToHarem,
    buildCharacterId,
    createFavoriteEmbed,
    createCharacterEntry,
    createHaremEmbed,
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    formatHaremList,
    HAREM_CAROUSEL_PREFIX,
    countOwnersForCharacter,
    getFavoriteCharacter,
    getHarem,
    getOwnersForCharacterIds,
    isCharacterClaimed,
    removeCharacterFromHarem,
    setFavoriteCharacter,
};
