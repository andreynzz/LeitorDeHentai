const {
    BASE_SCORE_WEIGHT,
    DIVORCE_PENALTY_POINTS,
    INFAMY_CLAIM_VALUE_MULTIPLIER,
    INFAMY_RANK_PENALTY,
    PRESTIGE_FAVORITE_POINTS,
    PRESTIGE_OWNER_POINTS,
    PRESTIGE_TENURE_CAP,
    PRESTIGE_TENURE_PER_WEEK,
    RARITY_MAX,
    RARITY_MIN,
    RARITY_SCORE_MULTIPLIER,
} = require("./constants");

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

function calculatePrestigeScore({
    ownerCount = 0,
    favoriteCount = 0,
    oldestClaimedAt = null,
}, now = Date.now()) {
    const ownerScore = ownerCount * PRESTIGE_OWNER_POINTS;
    const favoriteScore = favoriteCount * PRESTIGE_FAVORITE_POINTS;
    const oldestClaimedAtMs = oldestClaimedAt ? new Date(oldestClaimedAt).getTime() : null;
    const retainedWeeks = oldestClaimedAtMs ? Math.max(0, (now - oldestClaimedAtMs) / (7 * 24 * 60 * 60 * 1000)) : 0;
    const tenureScore = Math.min(PRESTIGE_TENURE_CAP, retainedWeeks * PRESTIGE_TENURE_PER_WEEK);

    return Number((ownerScore + favoriteScore + tenureScore).toFixed(2));
}

function calculateRankScore(character, haremInsights = {}) {
    const baseContribution = character.baseScore * BASE_SCORE_WEIGHT;
    const rarityScore = (character.rarityMultiplier - 1) * RARITY_SCORE_MULTIPLIER;
    const prestigeScore = calculatePrestigeScore(haremInsights);
    const divorcePenalty = (character.divorciosSemanais ?? 0) * DIVORCE_PENALTY_POINTS;
    const infamyPenalty = character.isInfamous ? INFAMY_RANK_PENALTY : 0;
    const manualRankAdjustment = character.manualRankAdjustment ?? 0;
    const rankScore = baseContribution + rarityScore + prestigeScore + manualRankAdjustment - divorcePenalty - infamyPenalty;

    return {
        baseContribution: Number(baseContribution.toFixed(2)),
        divorcePenalty: Number(divorcePenalty.toFixed(2)),
        infamyPenalty: Number(infamyPenalty.toFixed(2)),
        manualRankAdjustment: Number(manualRankAdjustment.toFixed(2)),
        prestigeScore,
        rarityScore: Number(rarityScore.toFixed(2)),
        rankScore: Number(rankScore.toFixed(2)),
    };
}

function ensureCharacterDefaults(character, haremInsights = {}) {
    const works = Array.isArray(character.works) ? character.works : [];
    const bio = character.bio ?? buildCharacterBio(character.name, works);
    const bioLength = bio.length;
    const imageCount = character.imageCount ?? works.reduce((total, work) => total + (work.imageCount ?? 0), 0);
    const episodeOrChapterCount = character.episodeOrChapterCount ?? works.length;
    const rarityMultiplier = character.rarityMultiplier ?? randomRarityMultiplier();
    const baseScore = calculateBaseScore({ bioLength, imageCount, episodeOrChapterCount });
    const claimBase = (baseScore * rarityMultiplier) + calculatePrestigeScore(haremInsights);
    const claimValue = Number((claimBase * (character.isInfamous ? INFAMY_CLAIM_VALUE_MULTIPLIER : 1)).toFixed(2));
    const {
        baseContribution,
        divorcePenalty,
        infamyPenalty,
        manualRankAdjustment,
        prestigeScore,
        rarityScore,
        rankScore,
    } = calculateRankScore({
        ...character,
        baseScore,
        rarityMultiplier,
    }, haremInsights);

    return {
        divorciosSemanais: 0,
        isInfamous: false,
        lastInfamousAt: null,
        ...character,
        manualRankAdjustment: character.manualRankAdjustment ?? 0,
        works,
        bio,
        bioLength,
        imageCount,
        episodeOrChapterCount,
        rarityMultiplier,
        baseScore,
        claimValue,
        baseContribution,
        divorcePenalty,
        infamyPenalty,
        manualRankAdjustment,
        prestigeScore,
        rarityScore,
        rankScore,
    };
}

function sortCharactersByRank(registry, insightsByCharacterId = {}) {
    return Object.values(registry)
        .map((character) => ensureCharacterDefaults(character, insightsByCharacterId[character.id] ?? {}))
        .sort((a, b) => (b.rankScore - a.rankScore) || (b.baseScore - a.baseScore) || a.name.localeCompare(b.name));
}

module.exports = {
    buildCharacterBio,
    calculateBaseScore,
    calculatePrestigeScore,
    calculateRankScore,
    ensureCharacterDefaults,
    randomRarityMultiplier,
    sortCharactersByRank,
};
