const {
    HELPER_DROP_CHANCE,
    HELPER_MAX_REWARD,
    HELPER_MIN_REWARD,
} = require("./constants");

function createEmptyHelperStats() {
    return {
        collectedCount: 0,
        totalCoinsEarned: 0,
        lastCollectedAt: null,
    };
}

function normalizeHelperStats(stats) {
    return {
        ...createEmptyHelperStats(),
        ...(stats ?? {}),
    };
}

function shouldSpawnHelper(randomValue = Math.random()) {
    return randomValue < HELPER_DROP_CHANCE;
}

function calculateHelperReward(character = {}, ownerCount = 1) {
    const claimValue = Number(character.claimValue) || 0;
    const rarityMultiplier = Number(character.rarityMultiplier) || 1;
    const safeOwnerCount = Math.max(1, ownerCount);
    const reward = Math.round((claimValue * 0.45) + (rarityMultiplier * 8) + (safeOwnerCount * 6));
    return Math.max(HELPER_MIN_REWARD, Math.min(HELPER_MAX_REWARD, reward));
}

function formatLastCollectedAt(value) {
    if (!value) {
        return "Nunca coletado.";
    }

    return `<t:${Math.floor(new Date(value).getTime() / 1000)}:R>`;
}

module.exports = {
    calculateHelperReward,
    createEmptyHelperStats,
    formatLastCollectedAt,
    normalizeHelperStats,
    shouldSpawnHelper,
};
