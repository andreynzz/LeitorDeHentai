const nhentai = require("nhentai");
const { MAX_CHARACTER_RESULTS, MAX_SEARCH_PAGES, MAX_WORK_RESULTS } = require("./constants");
const { getCharacterImageCarousel, normalizeQuery } = require("./media");

const api = new nhentai.API();

function getDoujinTitle(doujin) {
    return doujin.titles.english || doujin.titles.pretty || doujin.titles.japanese || `Obra #${doujin.id}`;
}

function scoreCharacterMatch(name, query) {
    const normalizedName = normalizeQuery(name);
    if (normalizedName === query) return 4;
    if (normalizedName.startsWith(query)) return 3;
    if (normalizedName.includes(query)) return 2;

    const queryParts = query.split(/\s+/).filter(Boolean);
    return queryParts.every((part) => normalizedName.includes(part)) ? 1 : 0;
}

async function searchCharacters(query) {
    const normalizedQuery = normalizeQuery(query);
    const firstPage = await api.search(query).catch(console.error);
    if (!firstPage) {
        return [];
    }

    const pagesToRead = Math.min(firstPage.numPages, MAX_SEARCH_PAGES);
    const allDoujins = [...firstPage.doujins];
    for (let page = 2; page <= pagesToRead; page += 1) {
        const nextPage = await api.search(query, { page }).catch(console.error);
        if (nextPage) {
            allDoujins.push(...nextPage.doujins);
        }
    }

    const characterMap = new Map();
    for (const doujin of allDoujins) {
        const characters = doujin?.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [];
        for (const characterName of characters) {
            const score = scoreCharacterMatch(characterName, normalizedQuery);
            if (score === 0) {
                continue;
            }

            const key = normalizeQuery(characterName);
            const entry = characterMap.get(key) ?? { name: characterName, score, works: [] };
            entry.score = Math.max(entry.score, score);
            if (!entry.works.find((work) => work.id === doujin.id)) {
                entry.works.push({
                    id: doujin.id,
                    title: getDoujinTitle(doujin),
                    url: doujin.url,
                    imageUrl: doujin.cover.url,
                });
            }
            characterMap.set(key, entry);
        }
    }

    return [...characterMap.values()]
        .sort((a, b) => (b.score - a.score) || (b.works.length - a.works.length) || a.name.localeCompare(b.name))
        .slice(0, MAX_CHARACTER_RESULTS);
}

async function searchWorks(query) {
    const result = await api.search(query).catch(console.error);
    if (!result) {
        return [];
    }

    return result.doujins.slice(0, MAX_WORK_RESULTS).map((doujin) => ({
        id: doujin.id,
        title: getDoujinTitle(doujin),
        url: doujin.url,
        favorites: doujin.favorites,
        characters: doujin?.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [],
        imageUrl: doujin.cover.url,
    }));
}

async function isLikelyCharacterQuery(query) {
    const results = await searchCharacters(query);
    if (results.length === 0) {
        return false;
    }

    const normalizedQuery = normalizeQuery(query);
    const normalizedName = normalizeQuery(results[0].name);
    return normalizedName === normalizedQuery || normalizedName.startsWith(normalizedQuery);
}

module.exports = {
    getCharacterImageCarousel,
    searchCharacters,
    searchWorks,
    isLikelyCharacterQuery,
};
