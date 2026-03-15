const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const {
    createCharacterEmbed,
    createClaimActionRow,
    getRandomCharacter,
} = require("../../modules/Character");
const {
    getCharacterById,
    registerCharacterFromDrop,
} = require("../../modules/Market");
const {
    calculateHelperReward,
    createHelperDropEmbed,
    rollHelperVariant,
    shouldSpawnHelper,
} = require("../../modules/Helper");
const { consumeRoll, createRollLimitEmbed, createRollStatusText } = require("../../modules/Rolls");
const { isLikelyCharacterQuery } = require("../../modules/Search");
const { createWishAlertContent, getWishMatches } = require("../../modules/Wish");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("character")
        .setNameLocalizations({
            "pt-BR": "personagem",
        })
        .setDescription("busca um personagem aleatorio para adicionar ao seu harem")
        .setDescriptionLocalizations({
            "pt-BR": "busca um personagem aleatorio para adicionar ao seu harem",
            "en-US": "fetches a random character to add to your harem",
        })
        .addStringOption((option) => option
            .setName("tag")
            .setDescription("tag do doujin para pesquisar")
            .setDescriptionLocalizations({
                "pt-BR": "tag do doujin para pesquisar",
                "en-US": "doujin tag to search for",
            })),
    async execute(interaction) {
        const tag = interaction.options.getString("tag") ?? "*";

        if (tag !== "*" && await isLikelyCharacterQuery(tag)) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Tag invalida")
                        .setDescription("Nao use nome de personagem como tag no /character. Use /im para pesquisar personagens ou escolha uma tag real do nhentai.")
                        .setTimestamp(),
                ],
            });
            return;
        }

        const rollResult = await consumeRoll(interaction.user.id);

        if (!rollResult.allowed) {
            await interaction.reply({
                embeds: [createRollLimitEmbed(interaction.user, rollResult.state)],
            });
            return;
        }

        await interaction.deferReply();

        let result = null;
        let helperReward = null;
        let helperVariant = null;

        for (let attempt = 0; attempt < 15; attempt += 1) {
            const candidate = await getRandomCharacter(tag, { includeClaimed: true });
            if (!candidate) {
                break;
            }

            await registerCharacterFromDrop(candidate);

            if (!candidate.alreadyClaimed) {
                result = candidate;
                break;
            }

            if (!shouldSpawnHelper()) {
                continue;
            }

            const marketCharacter = await getCharacterById(candidate.character.id);
            helperVariant = rollHelperVariant();
            result = candidate;
            helperReward = calculateHelperReward(marketCharacter ?? candidate.character, candidate.ownerCount, helperVariant);
            break;
        }

        if (!result) {
            await interaction.editReply("Não encontrei personagens com essa tag.");
            return;
        }

        const wishMatches = await getWishMatches(result.character.id);
        const headerLines = [];
        const wishAlert = createWishAlertContent(result.character.name, wishMatches);
        if (wishAlert) {
            headerLines.push(wishAlert);
        }
        headerLines.push(createRollStatusText(rollResult.remaining));

        if (helperReward !== null) {
            const message = await interaction.editReply({
                content: [...headerLines, `${helperVariant.emoji} ${helperVariant.name} disponivel: reaja na mensagem para coletar **${helperReward} moedas**.`].join("\n"),
                embeds: [createHelperDropEmbed(createCharacterEmbed(result), {
                    reward: helperReward,
                    ownerCount: result.ownerCount,
                    variant: helperVariant,
                })],
                components: [],
            });

            return {
                helperDrop: {
                    characterId: result.character.id,
                    message,
                    reward: helperReward,
                    variant: helperVariant,
                },
            };
        }

        const message = await interaction.editReply({
            content: headerLines.join("\n"),
            embeds: [createCharacterEmbed(result)],
            components: [createClaimActionRow(result.character.id)],
        });

        return {
            claimCharacterId: result.character.id,
            message,
        };
    },
};
