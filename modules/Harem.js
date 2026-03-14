const { HAREM_CAROUSEL_PREFIX } = require("./harem/constants");
const {
    addCharacterToHarem,
    countOwnersForCharacter,
    getHarem,
    getOwnersForCharacterIds,
    isCharacterClaimed,
    removeCharacterFromHarem,
    setFavoriteCharacter,
} = require("./harem/repository");
const {
    buildCharacterId,
    createCharacterEntry,
    formatHaremList,
    getFavoriteCharacter,
} = require("./harem/service");
const {
    createFavoriteEmbed,
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    createHaremEmbed,
} = require("./harem/embeds");

module.exports = {
    addCharacterToHarem,
    buildCharacterId,
    countOwnersForCharacter,
    createCharacterEntry,
    createFavoriteEmbed,
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    createHaremEmbed,
    formatHaremList,
    getFavoriteCharacter,
    getHarem,
    getOwnersForCharacterIds,
    HAREM_CAROUSEL_PREFIX,
    isCharacterClaimed,
    removeCharacterFromHarem,
    setFavoriteCharacter,
};
