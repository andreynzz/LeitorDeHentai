const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const CHARACTER_REGISTRY_KEY = "market:characters";
const MARKET_STATE_KEY = "market:state";
const USER_COINS_PREFIX = "coins:";
const INFAMY_REWARD = 100;
const INFAMY_RESET_MS = 7 * 24 * 60 * 60 * 1000;
const RARITY_MIN = 1.0;
const RARITY_MAX = 1.5;
const MARKET_ICON = "https://nhentai.net/static/favicon-32x32.png";

function randomRarityMultiplier() {
    return Number((RARITY_MIN + Math.random() * (RARITY_MAX - RARITY_MIN)).toFixed(3));
}

function calculateBaseScore({
    bioLength = 0,
    imageCount = 0,
    episodeOrChapterCount = 0,
}) {
    return Number(((bioLength * 0.5) + (imageCount * 10) + (episodeOrChapterCount * 2)).toFixed(2));
}

function buildCharacterBio(name, works) {
    const titles = works.map((work) => work.title).slice(0, 8).join(", ");
    return `${name} aparece em: ${titles}`.trim();
}

function ensureCharacterDefaults(character) {
    const works = Array.isArray(character.works) ? character.works : [];
    const bio = character.bio ?? buildCharacterBio(character.name, works);
    const bioLength = bio.length;
    const imageCount = character.imageCount ?? works.reduce((total, work) => total + (work.imageCount ?? 0), 0);
    const episodeOrChapterCount = character.episodeOrChapterCount ?? works.length;
    const rarityMultiplier = character.rarityMultiplier ?? randomRarityMultiplier();
    const baseScore = calculateBaseScore({ bioLength, imageCount, episodeOrChapterCount });
    const claimValue = Number((baseScore * rarityMultiplier * (character.isInfamous ? 0.5 : 1)).toFixed(2));

    return {
        divorciosSemanais: 0,
        isInfamous: false,
        lastInfamousAt: null,
        ...character,
        works,
        bio,
        bioLength,
        imageCount,
        episodeOrChapterCount,
        rarityMultiplier,
        baseScore,
        claimValue,
    };
}

async function getCharacterRegistry() {
    const registry = (await keyv.get(CHARACTER_REGISTRY_KEY)) ?? {};
    return registry;
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

function sortCharactersByRank(registry) {
    return Object.values(registry)
        .map((character) => ensureCharacterDefaults(character))
        .sort((a, b) => (b.baseScore - a.baseScore) || a.name.localeCompare(b.name));
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

function createTopCharactersEmbed(characters) {
    return new EmbedBuilder()
        .setColor(0xf4c542)
        .setAuthor({ name: "Ranking Global", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Top Personagens")
        .setDescription(
            characters.length > 0
                ? characters.map((character, index) => `\`${index + 1}.\` **${character.name}**\nScore **${character.baseScore}** • Valor **${character.claimValue}** • Raridade **${character.rarityMultiplier}x**`).join("\n\n")
                : "Ainda nao ha personagens registrados.",
        )
        .setFooter({ text: "Top baseado no base score", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createInfamyEmbed(characters) {
    return new EmbedBuilder()
        .setColor(0x992d22)
        .setAuthor({ name: "Infamia Semanal", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Mural da Vergonha")
        .setDescription(
            characters.length > 0
                ? characters.map((character, index) => `\`${index + 1}.\` **${character.name}**\nDivorcios **${character.divorciosSemanais}** • Valor atual **${character.claimValue}**`).join("\n\n")
                : "Nenhum personagem acumulou divorcios nesta semana.",
        )
        .setFooter({ text: "Os 10 mais divorciados entram em infamia", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createCharacterProfileEmbed(character, ownerCount = 0) {
    const embed = new EmbedBuilder()
        .setColor(character.isInfamous ? 0x992d22 : 0x5865f2)
        .setAuthor({ name: "Perfil de Personagem", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle(character.name)
        .setDescription(character.bio)
        .addFields(
            { name: "Base Score", value: `${character.baseScore}`, inline: true },
            { name: "Valor", value: `${character.claimValue}`, inline: true },
            { name: "Raridade", value: `${character.rarityMultiplier}x`, inline: true },
            { name: "Imagens", value: `${character.imageCount}`, inline: true },
            { name: "Obras", value: `${character.episodeOrChapterCount}`, inline: true },
            { name: "Rank Global", value: `${character.rankGlobal ?? "-"}`, inline: true },
            { name: "Infame", value: character.isInfamous ? "Sim" : "Nao", inline: true },
            { name: "Divorcios na semana", value: `${character.divorciosSemanais}`, inline: true },
            { name: "Donos", value: `${ownerCount}`, inline: true },
        )
        .setFooter({
            text: character.isInfamous ? "Status atual: INFAME" : "Status atual: estavel",
            iconURL: MARKET_ICON,
        })
        .setTimestamp();

    if (character.sourceUrl) {
        embed.setURL(character.sourceUrl);
    }

    if (character.imageUrl) {
        embed.setImage(character.imageUrl);
    }

    return embed;
}

function createCoinsEmbed(user, coins) {
    return new EmbedBuilder()
        .setColor(0xffd166)
        .setAuthor({ name: `${user.username} - Carteira`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Moedas do Bot")
        .setDescription(`Voce possui **${coins} moedas**.`)
        .setFooter({ text: "Ganhe moedas mantendo personagens infames com lealdade", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createAdminCoinsEmbed(targetUser, coins, actionLabel) {
    return new EmbedBuilder()
        .setColor(0xffd166)
        .setAuthor({ name: "Admin - Coins", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Carteira atualizada")
        .setDescription(`${targetUser} agora possui **${coins} moedas**.`)
        .setFooter({ text: actionLabel, iconURL: MARKET_ICON })
        .setTimestamp();
}

function createAdminInfamyResetEmbed(result) {
    const infamousNames = result.infamous.slice(0, 10).map((character) => `• ${character.name}`).join("\n");
    const rewardsText = result.loyaltyRewards.length > 0
        ? result.loyaltyRewards.slice(0, 10).map((reward) => `• <@${reward.ownerId}> recebeu **${reward.reward}** por **${reward.characterName}**`).join("\n")
        : "Nenhuma recompensa de lealdade foi distribuida.";

    return new EmbedBuilder()
        .setColor(0x992d22)
        .setAuthor({ name: "Admin - Infamia", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Reset de infamia executado")
        .addFields(
            {
                name: "Novos infames",
                value: infamousNames || "Nenhum personagem entrou em infamia neste reset.",
                inline: false,
            },
            {
                name: "Recompensas de lealdade",
                value: rewardsText,
                inline: false,
            },
            {
                name: "Proximo reset",
                value: `<t:${Math.floor(result.nextResetAt / 1000)}:F>`,
                inline: false,
            },
        )
        .setTimestamp();
}

module.exports = {
    INFAMY_REWARD,
    addCoins,
    createAdminCoinsEmbed,
    createAdminInfamyResetEmbed,
    createCoinsEmbed,
    createCharacterProfileEmbed,
    createInfamyEmbed,
    createTopCharactersEmbed,
    findCharacterByName,
    getCharacterById,
    getCurrentInfamyBoard,
    getCoins,
    getMarketState,
    getRankedCharacters,
    incrementWeeklyDivorces,
    processInfamyReset,
    registerCharacterFromDrop,
    saveMarketState,
    setCoins,
    sortCharactersByRank,
    updateCharacterMarketEntry,
};
