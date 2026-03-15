const { Colors, EmbedBuilder } = require("discord.js");

function getDoujinTitle(doujin) {
    return doujin.titles?.english || doujin.titles?.pretty || doujin.titles?.japanese || `Doujin #${doujin.id}`;
}

function pickTags(doujin, limit = 2) {
    return (doujin.tags?.tags ?? [])
        .map((tag) => tag.name)
        .filter(Boolean)
        .slice(0, limit);
}

function pickCharacters(doujin, limit = 2) {
    return (doujin.tags?.characters ?? [])
        .map((tag) => tag.name)
        .filter(Boolean)
        .slice(0, limit);
}

function createChallengePool(doujin, payload) {
    const tags = pickTags(doujin);
    const characters = pickCharacters(doujin);
    const waveTag = payload.tag && payload.tag !== "*" ? payload.tag : null;
    const title = getDoujinTitle(doujin);

    return [
        {
            name: "Desafio da Rodada",
            description: waveTag
                ? `Capture um doujin da onda com a vibe **${waveTag}** antes da proxima rodada.`
                : `Capture qualquer doujin da rodada e prove que **${title}** combinou com sua sorte.`,
        },
        {
            name: "Caça de Tags",
            description: tags.length > 0
                ? `Meta rapida: encontre um doujin com **${tags.join("** ou **")}**.`
                : "Meta rapida: encontre um doujin com uma tag inesperada e compartilhe no chat.",
        },
        {
            name: "Modo Colecionador",
            description: characters.length > 0
                ? `Valendo estilo: tente pegar um doujin com **${characters.join("** ou **")}** na rodada.`
                : "Valendo estilo: tente pegar um doujin com elenco marcante nesta rodada.",
        },
        {
            name: "Desafio de Popularidade",
            description: `A referencia da vez tem **${doujin.favorites ?? 0} likes**. Tente superar essa faixa no proximo roll.`,
        },
    ];
}

function createWaveChallengeEmbed(doujin, payload, randomValue = Math.random()) {
    const pool = createChallengePool(doujin, payload);
    const index = Math.min(pool.length - 1, Math.floor(randomValue * pool.length));
    const challenge = pool[index];

    return new EmbedBuilder()
        .setColor(Colors.DarkPurple)
        .setAuthor({ name: "Onda de Desafio" })
        .setTitle(challenge.name)
        .setDescription(challenge.description)
        .setFooter({ text: "Desafio tematico aleatorio da rodada" })
        .setTimestamp();
}

module.exports = {
    createWaveChallengeEmbed,
};
