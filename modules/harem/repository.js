const { keyv } = require("../Database");
const { HAREM_PREFIX } = require("./constants");
const { normalizeCharacterId, sanitizeHaremData } = require("./service");

function getHaremKey(userId) {
    return `${HAREM_PREFIX}${userId}`;
}

async function saveHarem(userId, harem) {
    await keyv.set(getHaremKey(userId), harem);
}

async function getHarem(userId) {
    const stored = (await keyv.get(getHaremKey(userId))) ?? { favoriteId: null, characters: [] };
    const { harem, changed } = sanitizeHaremData(stored);
    if (changed) {
        await saveHarem(userId, harem);
    }

    return harem;
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

module.exports = {
    addCharacterToHarem,
    countOwnersForCharacter,
    getHarem,
    getOwnersForCharacterIds,
    isCharacterClaimed,
    removeCharacterFromHarem,
    saveHarem,
    setFavoriteCharacter,
};
