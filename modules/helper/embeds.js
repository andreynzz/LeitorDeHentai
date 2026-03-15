const { Colors, EmbedBuilder } = require("discord.js");
const { MARKET_ICON } = require("../market/constants");
const { HELPER_DROP_DURATION_SECONDS, HELPER_REACTION_EMOJI } = require("./constants");
const { formatLastCollectedAt } = require("./service");

function cloneEmbed(currentEmbed) {
    return currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
}

function createHelperDropEmbed(currentEmbed, { reward, ownerCount }) {
    return cloneEmbed(currentEmbed)
        .setColor(Colors.Aqua)
        .setAuthor({ name: "Helper apareceu", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription(
            [
                currentEmbed?.data?.description ?? currentEmbed?.description ?? null,
                `Este personagem ja faz parte de ${ownerCount} harem(ns).`,
                `${HELPER_REACTION_EMOJI} Reaja com ${HELPER_REACTION_EMOJI} para coletar **${reward} moedas**.`,
            ].filter(Boolean).join("\n\n"),
        )
        .setFooter({ text: `A primeira pessoa tem ${HELPER_DROP_DURATION_SECONDS}s para coletar o helper`, iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperClaimedEmbed(currentEmbed, { user, reward, balance }) {
    return cloneEmbed(currentEmbed)
        .setColor(Colors.Green)
        .setAuthor({ name: "Helper coletado", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription(`${user} coletou o helper e ganhou **${reward} moedas**.\nSaldo atual: **${balance} moedas**.`)
        .setFooter({ text: "Helper encerrado", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperExpiredEmbed(currentEmbed) {
    return cloneEmbed(currentEmbed)
        .setColor(Colors.DarkGrey)
        .setAuthor({ name: "Helper expirado", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setDescription("Ninguem reagiu a tempo. O helper desapareceu.")
        .setFooter({ text: "Helper encerrado", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createHelperStatusEmbed(user, stats, coins) {
    return new EmbedBuilder()
        .setColor(Colors.Aqua)
        .setAuthor({ name: `${user.username} - Helper`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Status do Helper")
        .setDescription("Helpers podem aparecer em rolls de personagens que ja pertencem ao harem de alguem. Reaja rapido para coletar moedas.")
        .addFields(
            { name: "Coletas", value: `${stats.collectedCount}`, inline: true },
            { name: "Moedas via helper", value: `${stats.totalCoinsEarned}`, inline: true },
            { name: "Carteira atual", value: `${coins}`, inline: true },
            { name: "Ultima coleta", value: formatLastCollectedAt(stats.lastCollectedAt), inline: false },
            { name: "Como coletar", value: `Quando o helper aparecer, reaja com ${HELPER_REACTION_EMOJI} antes de expirar.`, inline: false },
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
