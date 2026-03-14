const { INFAMY_REWARD } = require("./market/constants");
const {
    addCoins,
    findCharacterByName,
    getCharacterById,
    getCoins,
    getCurrentInfamyBoard,
    getMarketState,
    getRankedCharacters,
    incrementWeeklyDivorces,
    processInfamyReset,
    registerCharacterFromDrop,
    saveMarketState,
    setCoins,
    updateCharacterMarketEntry,
} = require("./market/repository");
const {
    createAdminCoinsEmbed,
    createAdminInfamyResetEmbed,
    createCharacterProfileEmbed,
    createCoinsEmbed,
    createInfamyEmbed,
    createTopCharactersEmbed,
} = require("./market/embeds");
const { sortCharactersByRank } = require("./market/service");

module.exports = {
    INFAMY_REWARD,
    addCoins,
    createAdminCoinsEmbed,
    createAdminInfamyResetEmbed,
    createCharacterProfileEmbed,
    createCoinsEmbed,
    createInfamyEmbed,
    createTopCharactersEmbed,
    findCharacterByName,
    getCharacterById,
    getCoins,
    getCurrentInfamyBoard,
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
