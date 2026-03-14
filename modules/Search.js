const { IM_CAROUSEL_PREFIX } = require("./search/constants");
const { buildImageAttachment } = require("./search/media");
const {
    createCharacterSearchCarouselActionRow,
    createCharacterSearchEmbed,
    createWorkSearchEmbed,
} = require("./search/embeds");
const {
    getCharacterImageCarousel,
    isLikelyCharacterQuery,
    searchCharacters,
    searchWorks,
} = require("./search/service");

module.exports = {
    buildImageAttachment,
    createCharacterSearchCarouselActionRow,
    createCharacterSearchEmbed,
    createWorkSearchEmbed,
    getCharacterImageCarousel,
    IM_CAROUSEL_PREFIX,
    isLikelyCharacterQuery,
    searchCharacters,
    searchWorks,
};
