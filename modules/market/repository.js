const { keyv } = require("../Database");
const {
    CHARACTER_REGISTRY_KEY,
    INFAMY_REWARD,
    INFAMY_RESET_MS,
    MARKET_STATE_KEY,
    USER_COINS_PREFIX,
} = require("./constants");
const { ensureCharacterDefaults, randomRarityMultiplier, sortCharactersByRank } = require("./service");

async function getCharacterRegistry() {
    return (await keyv.get(CHARACTER_REGISTRY_KEY)) ?? {};
}

async function saveCharacterRegistry(registry) {
    await keyv.set(CHARACTER_REGISTRY_KEY, registry);
}

async function getMarketState() {
    const state = (await keyv.get(MARKET_STATE_KEY)) ?? {
        nextInfamyResetAt: Date.now() + INFAMY_RESET_MS,
        currentInfamousIds: [],
    };

    if (!state.nextInfamyResetAt) {
        state.nextInfamyResetAt = Date.now() + INFAMY_RESET_MS;
    }

    if (!Array.isArray(state.currentInfamousIds)) {
        state.currentInfamousIds = [];
    }

    return state;
}

async function saveMarketState(state) {
    await keyv.set(MARKET_STATE_KEY, state);
}

async function addCoins(userId, amount) {
    const key = `${USER_COINS_PREFIX}${userId}`;
    const current = (await keyv.get(key)) ?? 0;
    const next = current + amount;
    await keyv.set(key, next);
    return next;
}

async function getCoins(userId) {
    return (await keyv.get(`${USER_COINS_PREFIX}${userId}`)) ?? 0;
}

async function setCoins(userId, amount) {
    const next = Math.max(0, Math.floor(amount));
    await keyv.set(`${USER_COINS_PREFIX}${userId}`, next);
    return next;
}

async function getRankedCharacters() {
    const registry = await getCharacterRegistry();
    return sortCharactersByRank(registry).map((character, index) => ({
        ...character,
        rankGlobal: index + 1,
    }));
}

async function getCharacterById(characterId) {
    const registry = await getCharacterRegistry();
    const character = registry[characterId];
    return character ? ensureCharacterDefaults(character) : null;
}

async function findCharacterByName(query) {
    const normalizedQuery = query.trim().toLowerCase();
    const ranked = await getRankedCharacters();
    return ranked.find((character) => character.name.toLowerCase() === normalizedQuery)
        ?? ranked.find((character) => character.name.toLowerCase().includes(normalizedQuery))
        ?? null;
}

async function updateCharacterMarketEntry(entry) {
    const registry = await getCharacterRegistry();
    const current = registry[entry.id] ?? {
        id: entry.id,
        name: entry.name,
        works: [],
        divorciosSemanais: 0,
        isInfamous: false,
        lastInfamousAt: null,
        rarityMultiplier: randomRarityMultiplier(),
    };

    const worksMap = new Map(current.works?.map((work) => [work.id, work]) ?? []);
    for (const work of entry.works ?? []) {
        worksMap.set(work.id, work);
    }

    const next = ensureCharacterDefaults({
        ...current,
        name: entry.name ?? current.name,
        imageUrl: entry.imageUrl ?? current.imageUrl,
        sourceUrl: entry.sourceUrl ?? current.sourceUrl,
        works: [...worksMap.values()],
    });

    registry[next.id] = next;
    await saveCharacterRegistry(registry);
    return next;
}

async function registerCharacterFromDrop(result) {
    const work = {
        id: result.doujin.id,
        title: result.doujin.titles.english || result.doujin.titles.pretty || `Obra #${result.doujin.id}`,
        url: result.doujin.url,
        imageCount: result.doujin.length ?? 0,
    };

    return updateCharacterMarketEntry({
        id: result.character.id,
        name: result.character.name,
        imageUrl: result.character.imageUrl,
        sourceUrl: result.character.sourceUrl,
        works: [work],
    });
}

async function incrementWeeklyDivorces(characterId) {
    const registry = await getCharacterRegistry();
    const current = registry[characterId];
    if (!current) {
        return null;
    }

    const next = ensureCharacterDefaults({
        ...current,
        divorciosSemanais: (current.divorciosSemanais ?? 0) + 1,
    });
    registry[characterId] = next;
    await saveCharacterRegistry(registry);
    return next;
}

async function processInfamyReset(getOwnersForCharacterIds) {
    const registry = await getCharacterRegistry();
    const state = await getMarketState();
    const rankedByDivorces = Object.values(registry)
        .map((character) => ensureCharacterDefaults(character))
        .sort((a, b) => (b.divorciosSemanais - a.divorciosSemanais) || a.name.localeCompare(b.name));

    const topInfamous = rankedByDivorces.filter((character) => character.divorciosSemanais > 0).slice(0, 10);
    const previousInfamousIds = new Set(state.currentInfamousIds);
    const nextInfamousIds = new Set(topInfamous.map((character) => character.id));
    const loyaltyRewards = [];
    const ownersByCharacterId = await getOwnersForCharacterIds([...previousInfamousIds]);

    for (const character of Object.values(registry)) {
        const normalized = ensureCharacterDefaults(character);
        const wasInfamous = previousInfamousIds.has(normalized.id);
        const stillOwnedBy = ownersByCharacterId[normalized.id] ?? [];

        if (wasInfamous && stillOwnedBy.length > 0) {
            for (const ownerId of stillOwnedBy) {
                const balance = await addCoins(ownerId, INFAMY_REWARD);
                loyaltyRewards.push({
                    ownerId,
                    characterId: normalized.id,
                    characterName: normalized.name,
                    reward: INFAMY_REWARD,
                    balance,
                });
            }
        }

        registry[normalized.id] = ensureCharacterDefaults({
            ...normalized,
            isInfamous: nextInfamousIds.has(normalized.id),
            lastInfamousAt: nextInfamousIds.has(normalized.id) ? new Date().toISOString() : normalized.lastInfamousAt,
            divorciosSemanais: 0,
        });
    }

    state.currentInfamousIds = [...nextInfamousIds];
    state.nextInfamyResetAt = Date.now() + INFAMY_RESET_MS;

    await saveCharacterRegistry(registry);
    await saveMarketState(state);

    return {
        infamous: [...nextInfamousIds].map((id) => registry[id]).filter(Boolean),
        loyaltyRewards,
        nextResetAt: state.nextInfamyResetAt,
    };
}

async function getCurrentInfamyBoard() {
    const registry = await getCharacterRegistry();
    return Object.values(registry)
        .map((character) => ensureCharacterDefaults(character))
        .sort((a, b) => (b.divorciosSemanais - a.divorciosSemanais) || a.name.localeCompare(b.name))
        .slice(0, 10);
}

module.exports = {
    addCoins,
    findCharacterByName,
    getCharacterById,
    getCharacterRegistry,
    getCoins,
    getCurrentInfamyBoard,
    getMarketState,
    getRankedCharacters,
    incrementWeeklyDivorces,
    processInfamyReset,
    registerCharacterFromDrop,
    saveCharacterRegistry,
    saveMarketState,
    setCoins,
    updateCharacterMarketEntry,
};
