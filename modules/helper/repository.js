const { keyv } = require("../Database");
const { HELPER_STATS_PREFIX } = require("./constants");
const { createEmptyHelperStats, normalizeHelperStats } = require("./service");

function getHelperStatsKey(userId) {
    return `${HELPER_STATS_PREFIX}${userId}`;
}

async function getHelperStats(userId) {
    const stored = await keyv.get(getHelperStatsKey(userId));
    return normalizeHelperStats(stored);
}

async function saveHelperStats(userId, stats) {
    await keyv.set(getHelperStatsKey(userId), stats);
}

async function recordHelperCollection(userId, reward) {
    const stats = await getHelperStats(userId);
    const next = {
        ...createEmptyHelperStats(),
        ...stats,
        collectedCount: stats.collectedCount + 1,
        totalCoinsEarned: stats.totalCoinsEarned + reward,
        lastCollectedAt: new Date().toISOString(),
    };

    await saveHelperStats(userId, next);
    return next;
}

module.exports = {
    getHelperStats,
    recordHelperCollection,
    saveHelperStats,
};
