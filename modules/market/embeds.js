const { EmbedBuilder } = require("discord.js");
const { MARKET_ICON } = require("./constants");

function createTopCharactersEmbed(characters) {
    return new EmbedBuilder()
        .setColor(0xf4c542)
        .setAuthor({ name: "Ranking Global", iconURL: MARKET_ICON, url: "https://nhentai.net/" })
        .setTitle("Top Personagens")
        .setDescription(
            characters.length > 0
                ? characters.map((character, index) => `\`${index + 1}.\` **${character.name}**\nScore **${character.baseScore}** • Valor **${character.claimValue}** • Raridade **${character.rarityMultiplier}x**`).join("\n\n")
                : "Ainda nao ha personagens registrados.",
        )
        .setFooter({ text: "Top baseado no base score", iconURL: MARKET_ICON })
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
            { name: "Valor", value: `${character.claimValue}`, inline: true },
            { name: "Raridade", value: `${character.rarityMultiplier}x`, inline: true },
            { name: "Imagens", value: `${character.imageCount}`, inline: true },
            { name: "Obras", value: `${character.episodeOrChapterCount}`, inline: true },
            { name: "Rank Global", value: `${character.rankGlobal ?? "-"}`, inline: true },
            { name: "Infame", value: character.isInfamous ? "Sim" : "Nao", inline: true },
            { name: "Divorcios na semana", value: `${character.divorciosSemanais}`, inline: true },
            { name: "Donos", value: `${ownerCount}`, inline: true },
        )
        .setFooter({
            text: character.isInfamous ? "Status atual: INFAME" : "Status atual: estavel",
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

module.exports = {
    createAdminCoinsEmbed,
    createAdminInfamyResetEmbed,
    createCharacterProfileEmbed,
    createCoinsEmbed,
    createInfamyEmbed,
    createTopCharactersEmbed,
};
