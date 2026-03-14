const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const {
    createCharacterEmbed,
    createClaimActionRow,
    getRandomCharacter,
} = require("../../modules/Character");
const { registerCharacterFromDrop } = require("../../modules/Market");
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

        const result = await getRandomCharacter(tag);
        if (!result) {
            await interaction.editReply("Não encontrei personagens com essa tag.");
            return;
        }

        await registerCharacterFromDrop(result);

        const wishMatches = await getWishMatches(result.character.id);
        const headerLines = [];
        const wishAlert = createWishAlertContent(result.character.name, wishMatches);
        if (wishAlert) {
            headerLines.push(wishAlert);
        }
        headerLines.push(createRollStatusText(rollResult.remaining));

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
