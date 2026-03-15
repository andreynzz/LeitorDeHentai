const { EmbedBuilder } = require("discord.js");
const {
    BASE_SCORE_WEIGHT,
    DIVORCE_PENALTY_POINTS,
    INFAMY_RANK_PENALTY,
    MANUAL_RANK_ADJUSTMENT_CAP,
    MARKET_ICON,
    PRESTIGE_FAVORITE_POINTS,
    PRESTIGE_OWNER_POINTS,
    PRESTIGE_TENURE_CAP,
    PRESTIGE_TENURE_PER_WEEK,
    RARITY_SCORE_MULTIPLIER,
} = require("./constants");

function createTopCharactersEmbed(characters) {
    return new EmbedBuilder()
        .setColor(0xf4c542)
        .setAuthor({ name: "Ranking Global", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Top Personagens")
        .setDescription(
            characters.length > 0
                ? characters.map((character, index) => `\`${index + 1}.\` **${character.name}**\nRank **${character.rankScore}** • Prestigio **${character.prestigeScore}** • Valor **${character.claimValue}**`).join("\n\n")
                : "Ainda nao ha personagens registrados.",
        )
        .setFooter({ text: "Top baseado em score estavel + prestigio do servidor", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createInfamyEmbed(characters) {
    return new EmbedBuilder()
        .setColor(0x992d22)
        .setAuthor({ name: "Infamia Semanal", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Mural da Vergonha")
        .setDescription(
            characters.length > 0
                ? characters.map((character, index) => `\`${index + 1}.\` **${character.name}**\nDivorcios **${character.divorciosSemanais}** • Valor atual **${character.claimValue}**`).join("\n\n")
                : "Nenhum personagem acumulou divorcios nesta semana.",
        )
        .setFooter({ text: "Os 10 mais divorciados entram em infamia", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createCharacterProfileEmbed(character, ownerCount = 0) {
    const embed = new EmbedBuilder()
        .setColor(character.isInfamous ? 0x992d22 : 0x5865f2)
        .setAuthor({ name: "Perfil de Personagem", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle(character.name)
        .setDescription(character.bio)
        .addFields(
            { name: "Base Score", value: `${character.baseScore}`, inline: true },
            { name: "Rank Score", value: `${character.rankScore}`, inline: true },
            { name: "Prestigio", value: `${character.prestigeScore}`, inline: true },
            { name: "Valor", value: `${character.claimValue}`, inline: true },
            { name: "Raridade", value: `${character.rarityMultiplier}x`, inline: true },
            { name: "Imagens", value: `${character.imageCount}`, inline: true },
            { name: "Obras", value: `${character.episodeOrChapterCount}`, inline: true },
            { name: "Rank Global", value: `${character.rankGlobal ?? "-"}`, inline: true },
            { name: "Infame", value: character.isInfamous ? "Sim" : "Nao", inline: true },
            { name: "Divorcios na semana", value: `${character.divorciosSemanais}`, inline: true },
            { name: "Donos", value: `${ownerCount}`, inline: true },
            {
                name: "Formula do rank",
                value: [
                    `Base ponderada: **${character.baseContribution}**`,
                    `Bonus de raridade: **${character.rarityScore}**`,
                    `Prestigio: **${character.prestigeScore}**`,
                    `Ajuste manual: **${character.manualRankAdjustment >= 0 ? "+" : ""}${character.manualRankAdjustment}**`,
                    `Penalidade de divorcio: **-${character.divorcePenalty}**`,
                    `Penalidade de infamia: **-${character.infamyPenalty}**`,
                ].join("\n"),
                inline: false,
            },
        )
        .setFooter({
            text: character.isInfamous
                ? "Meta de servidor pequeno: rank estavel com penalidade leve de infamia"
                : "Meta de servidor pequeno: colecao + retencao + favorito",
            iconURL: MARKET_ICON,
        })
        .setTimestamp();

    if (character.sourceUrl) {
        embed.setURL(character.sourceUrl);
    }

    if (character.imageUrl) {
        embed.setImage(character.imageUrl);
    }

    return embed;
}

function createCoinsEmbed(user, coins) {
    return new EmbedBuilder()
        .setColor(0xffd166)
        .setAuthor({ name: `${user.username} - Carteira`, iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Moedas do Bot")
        .setDescription(`Voce possui **${coins} moedas**.`)
        .setFooter({ text: "Ganhe moedas mantendo personagens infames com lealdade", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createAdminCoinsEmbed(targetUser, coins, actionLabel) {
    return new EmbedBuilder()
        .setColor(0xffd166)
        .setAuthor({ name: "Admin - Coins", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Carteira atualizada")
        .setDescription(`${targetUser} agora possui **${coins} moedas**.`)
        .setFooter({ text: actionLabel, iconURL: MARKET_ICON })
        .setTimestamp();
}

function createAdminInfamyResetEmbed(result) {
    const infamousNames = result.infamous.slice(0, 10).map((character) => `• ${character.name}`).join("\n");
    const rewardsText = result.loyaltyRewards.length > 0
        ? result.loyaltyRewards.slice(0, 10).map((reward) => `• <@${reward.ownerId}> recebeu **${reward.reward}** por **${reward.characterName}**`).join("\n")
        : "Nenhuma recompensa de lealdade foi distribuida.";

    return new EmbedBuilder()
        .setColor(0x992d22)
        .setAuthor({ name: "Admin - Infamia", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Reset de infamia executado")
        .addFields(
            { name: "Novos infames", value: infamousNames || "Nenhum personagem entrou em infamia neste reset.", inline: false },
            { name: "Recompensas de lealdade", value: rewardsText, inline: false },
            { name: "Proximo reset", value: `<t:${Math.floor(result.nextResetAt / 1000)}:F>`, inline: false },
        )
        .setTimestamp();
}

function createMetaEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: "Meta do Mercado", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Pesos atuais do ranking")
        .setDescription("O ranking foi calibrado para servidor pequeno: mais estabilidade, mais valor para colecao, favorito e retencao.")
        .addFields(
            { name: "Base Score", value: `peso **${BASE_SCORE_WEIGHT}x** sobre o score bruto`, inline: false },
            { name: "Raridade", value: `bonus de **(raridade - 1) * ${RARITY_SCORE_MULTIPLIER}**`, inline: false },
            { name: "Prestigio", value: `donos **+${PRESTIGE_OWNER_POINTS}** cada • favorito **+${PRESTIGE_FAVORITE_POINTS}** cada • retencao **+${PRESTIGE_TENURE_PER_WEEK}/semana** ate **${PRESTIGE_TENURE_CAP}**`, inline: false },
            { name: "Penalidades", value: `divorcio **-${DIVORCE_PENALTY_POINTS}** por evento • infamia **-${INFAMY_RANK_PENALTY}** temporario`, inline: false },
            { name: "Ajuste manual admin", value: `faixa de **-${MANUAL_RANK_ADJUSTMENT_CAP}** a **+${MANUAL_RANK_ADJUSTMENT_CAP}** pontos`, inline: false },
        )
        .setFooter({ text: "Use /perfil para ver o breakdown de um personagem", iconURL: MARKET_ICON })
        .setTimestamp();
}

function createAdminRankEmbed(character, actionLabel) {
    return new EmbedBuilder()
        .setColor(0xf1c40f)
        .setAuthor({ name: "Admin - Rank", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Ajuste manual atualizado")
        .setDescription(`**${character.name}** agora possui ajuste manual de **${character.manualRankAdjustment >= 0 ? "+" : ""}${character.manualRankAdjustment}**.`)
        .addFields(
            { name: "Rank Score", value: `${character.rankScore}`, inline: true },
            { name: "Prestigio", value: `${character.prestigeScore}`, inline: true },
            { name: "Valor", value: `${character.claimValue}`, inline: true },
            { name: "Acao", value: actionLabel, inline: false },
        )
        .setTimestamp();
}

function createAdminRankHistoryEmbed(entries) {
    return new EmbedBuilder()
        .setColor(0xf1c40f)
        .setAuthor({ name: "Admin - Historico de Rank", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Ultimos ajustes manuais")
        .setDescription(
            entries.length > 0
                ? entries.map((entry, index) => `\`${index + 1}.\` **${entry.characterName}**\n${entry.previousAmount >= 0 ? "+" : ""}${entry.previousAmount} -> ${entry.amount >= 0 ? "+" : ""}${entry.amount} • ${entry.actorId ? `<@${entry.actorId}>` : (entry.actorName ?? "desconhecido")}\n<t:${Math.floor(new Date(entry.recordedAt).getTime() / 1000)}:R>`).join("\n\n")
                : "Nenhum ajuste manual foi registrado ainda.",
        )
        .setTimestamp();
}

module.exports = {
    createAdminCoinsEmbed,
    createAdminInfamyResetEmbed,
    createAdminRankEmbed,
    createAdminRankHistoryEmbed,
    createCharacterProfileEmbed,
    createCoinsEmbed,
    createInfamyEmbed,
    createMetaEmbed,
    createTopCharactersEmbed,
};
