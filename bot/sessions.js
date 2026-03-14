function createBotSessions() {
    return {
        characterClaims: new Map(),
        haremCarousels: new Map(),
        imCarousels: new Map(),
        infamyResetInterval: null,
        waveIntervals: {},
    };
}

module.exports = {
    createBotSessions,
};
