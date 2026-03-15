const { EmbedBuilder } = require("discord.js");
const { MARKET_ICON } = require("../market/constants");
const { HELPER_DROP_DURATION_SECONDS } = require("./constants");
const { formatLastCollectedAt } = require("./service");

function cloneEmbed(currentEmbed) {
    return currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
}

function createHelperDropEmbed(currentEmbed, { reward, ownerCount, variant }) {
    return cloneEmbed(currentEmbed)
        .setColor(variant.color)
        .setAuthor({ name: `${variant.name} apareceu`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription(
            [
                currentEmbed?.data?.description ?? currentEmbed?.description ?? null,
                `Este personagem ja faz parte de ${ownerCount} harem(ns).`,
                `${variant.emoji} Reaja com ${variant.emoji} para coletar **${reward} moedas**.`,
            ].filter(Boolean).join("\n\n"),
        )
        .setFooter({ text: `A primeira pessoa tem ${HELPER_DROP_DURATION_SECONDS}s para coletar o fragmento`, iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperClaimedEmbed(currentEmbed, { user, reward, balance, variant }) {
    return cloneEmbed(currentEmbed)
        .setColor(variant.color)
        .setAuthor({ name: `${variant.name} coletado`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription(`${user} coletou ${variant.emoji} **${variant.name}** e ganhou **${reward} moedas**.\nSaldo atual: **${balance} moedas**.`)
        .setFooter({ text: "Fragmento encerrado", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperExpiredEmbed(currentEmbed) {
    return cloneEmbed(currentEmbed)
        .setColor(0x2f3136)
        .setAuthor({ name: "Fragmento expirado", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription("Ninguem reagiu a tempo. O fragmento desapareceu.")
        .setFooter({ text: "Fragmento encerrado", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperStatusEmbed(user, stats, coins) {
    return new EmbedBuilder()
        .setColor(Colors.Aqua)
        .setAuthor({ name: `${user.username} - Helper`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Status do Helper")
        .setDescription("Fragmentos podem aparecer em rolls de personagens que ja pertencem ao harem de alguem. Reaja rapido para coletar moedas.")
        .addFields(
            { name: "Coletas", value: `${stats.collectedCount}`, inline: true },
            { name: "Moedas via fragmentos", value: `${stats.totalCoinsEarned}`, inline: true },
            { name: "Carteira atual", value: `${coins}`, inline: true },
            { name: "Ultima coleta", value: formatLastCollectedAt(stats.lastCollectedAt), inline: false },
            { name: "Como coletar", value: "Quando um fragmento aparecer, reaja com o emoji exibido antes de expirar.", inline: false },
        )
        .setFooter({ text: "Sistema inspirado em drops raros durante os rolls", iconURL: MARKET_ICON })
        .setTimestamp();
}

module.exports = {
    createHelperClaimedEmbed,
    createHelperDropEmbed,
    createHelperExpiredEmbed,
    createHelperStatusEmbed,
};
