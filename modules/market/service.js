const { RARITY_MAX, RARITY_MIN } = require("./constants");

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

function sortCharactersByRank(registry) {
    return Object.values(registry)
        .map((character) => ensureCharacterDefaults(character))
        .sort((a, b) => (b.baseScore - a.baseScore) || a.name.localeCompare(b.name));
}

module.exports = {
    buildCharacterBio,
    calculateBaseScore,
    ensureCharacterDefaults,
    randomRarityMultiplier,
    sortCharactersByRank,
};
