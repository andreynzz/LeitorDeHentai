const WAVE_PREFIX = "wave:";
const KEYV_PREFIX = "keyv:";

function removeKeyvPrefix(key) {
    if (key.startsWith(KEYV_PREFIX)) {
        return key.slice(KEYV_PREFIX.length);
    }

    return key;
}

function getWaveKey(channelId) {
    return `${WAVE_PREFIX}${channelId}`;
}

function getChannelIdFromWaveKey(key) {
    const normalizedKey = removeKeyvPrefix(key);
    if (normalizedKey.startsWith(WAVE_PREFIX)) {
        return normalizedKey.slice(WAVE_PREFIX.length);
    }

    return normalizedKey;
}

function isWaveEntry(key, value) {
    if (!value) {
        return false;
    }

    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        const hasWaveShape = typeof parsed?.time === "number" && typeof parsed?.tag === "string";
        if (!hasWaveShape) {
            return false;
        }

        const normalizedKey = removeKeyvPrefix(key);
        return normalizedKey.startsWith(WAVE_PREFIX) || /^\d+$/.test(normalizedKey);
    } catch {
        return false;
    }
}

async function getWaveValue(keyv, channelId) {
    const namespaced = await keyv.get(getWaveKey(channelId));
    if (namespaced !== undefined) {
        return namespaced;
    }

    return keyv.get(channelId);
}

async function setWaveValue(keyv, channelId, value) {
    await keyv.set(getWaveKey(channelId), value);
}

async function deleteWaveValue(keyv, channelId) {
    await keyv.delete(getWaveKey(channelId));
    await keyv.delete(channelId);
}

module.exports = {
    deleteWaveValue,
    getChannelIdFromWaveKey,
    getWaveKey,
    getWaveValue,
    isWaveEntry,
    setWaveValue,
};
