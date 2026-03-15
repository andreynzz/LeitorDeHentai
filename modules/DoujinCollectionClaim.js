const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");

const CLAIM_DOUJIN_PREFIX = "claim_doujin:";
const DOUJIN_CLAIM_DURATION_SECONDS = 10;

function getDoujinTitle(doujin) {
    return doujin.titles?.english || doujin.titles?.pretty || doujin.titles?.japanese || `Doujin #${doujin.id}`;
}

function createRolledDoujinEmbed(doujin) {
    return new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({ name: "Doujin Roll", url: doujin.url })
        .setTitle(getDoujinTitle(doujin))
        .setURL(doujin.url)
        .setDescription([
            `**Likes:** ${doujin.favorites ?? 0}`,
            doujin.tags?.artists?.length > 0
                ? `Artistas: ${doujin.tags.artists.map((value) => value.name).join(", ")}`
                : "Artistas indisponiveis",
        ].join("\n"))
        .addFields(
            {
                name: "Tags",
                value: doujin.tags?.tags?.slice(0, 8).map((value) => value.name).join(", ") || "Sem tags visiveis",
                inline: false,
            },
            {
                name: "Claim",
                value: `${DOUJIN_CLAIM_DURATION_SECONDS}s para capturar`,
                inline: true,
            },
            {
                name: "ID",
                value: `\`#${doujin.id}\``,
                inline: true,
            },
        )
        .setImage(doujin.cover?.url ?? null)
        .setFooter({ text: "Toque no botao para capturar este doujin" })
        .setTimestamp();
}

function createDoujinClaimActionRow(doujinId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${CLAIM_DOUJIN_PREFIX}${doujinId}`)
            .setLabel("Adicionar aos doujins")
            .setStyle(ButtonStyle.Success),
    );
}

function createDisabledDoujinClaimActionRow(doujinId, label = "Captura encerrada") {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${CLAIM_DOUJIN_PREFIX}${doujinId}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
    );
}

function createDoujinClaimExpiredEmbed(currentEmbed) {
    const embed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
    return embed
        .setColor(Colors.DarkGrey)
        .setFooter({ text: "Tempo de captura encerrado" })
        .setTimestamp();
}

function createDoujinClaimUnavailableEmbed(currentEmbed) {
    const embed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
    return embed
        .setColor(Colors.DarkRed)
        .setFooter({ text: "Captura indisponivel" })
        .setTimestamp();
}

function createDoujinClaimResultEmbed({ doujin, user, alreadyOwned = false }) {
    return new EmbedBuilder()
        .setColor(alreadyOwned ? Colors.Orange : Colors.Green)
        .setAuthor({ name: alreadyOwned ? "Claim processado" : "Claim bem-sucedido" })
        .setTitle(doujin.title)
        .setURL(doujin.url)
        .setDescription(
            alreadyOwned
                ? `${user} clicou primeiro e manteve esse doujin na propria colecao.`
                : `${user} adicionou esse doujin a propria colecao.`,
        )
        .addFields(
            { name: "ID", value: `\`#${doujin.id}\``, inline: true },
            { name: "Likes", value: `${doujin.favorites ?? 0}`, inline: true },
        )
        .setImage(doujin.imageUrl)
        .setTimestamp();
}

module.exports = {
    CLAIM_DOUJIN_PREFIX,
    DOUJIN_CLAIM_DURATION_SECONDS,
    createDisabledDoujinClaimActionRow,
    createDoujinClaimActionRow,
    createDoujinClaimExpiredEmbed,
    createDoujinClaimResultEmbed,
    createDoujinClaimUnavailableEmbed,
    createRolledDoujinEmbed,
    getDoujinTitle,
};
