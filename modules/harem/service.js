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

function getFavoriteCharacter(harem) {
    if (!harem.favoriteId) {
        return null;
    }

    return harem.characters.find((entry) => entry.id === harem.favoriteId) ?? null;
}

function formatHaremList(harem, maxResults) {
    if (harem.characters.length === 0) {
        return "Seu harem ainda esta vazio.";
    }

    const favorite = getFavoriteCharacter(harem);
    const visibleCharacters = harem.characters.slice(0, maxResults);
    const lines = visibleCharacters.map((character, index) => {
        const favoriteMark = favorite?.id === character.id ? " [favorito]" : "";
        return `${index + 1}. ${character.name} (${character.id})${favoriteMark}`;
    });

    if (harem.characters.length > visibleCharacters.length) {
        lines.push(`... e mais ${harem.characters.length - visibleCharacters.length} personagem(ns).`);
    }

    return lines.join("\n");
}

module.exports = {
    buildCharacterId,
    createCharacterEntry,
    formatHaremList,
    getFavoriteCharacter,
    normalizeCharacterEntry,
    normalizeCharacterId,
    sanitizeHaremData,
};
