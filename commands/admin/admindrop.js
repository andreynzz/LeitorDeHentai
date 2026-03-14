const { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
    createCharacterEmbed,
    createClaimActionRow,
    getRandomCharacter,
} = require("../../modules/Character");
const { registerCharacterFromDrop } = require("../../modules/Market");
const { isLikelyCharacterQuery } = require("../../modules/Search");
const { createWishAlertContent, getWishMatches } = require("../../modules/Wish");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admindrop")
        .setDescription("forca um drop de personagem sem gastar rolls")
        .setDescriptionLocalizations({
            "pt-BR": "forca um drop de personagem sem gastar rolls",
            "en-US": "forces a character drop without spending rolls",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) => option
            .setName("tag")
            .setDescription("tag do nhentai para filtrar o drop")
            .setDescriptionLocalizations({
                "pt-BR": "tag do nhentai para filtrar o drop",
                "en-US": "nhentai tag to filter the drop",
            })),
    async execute(interaction) {
        const tag = interaction.options.getString("tag") ?? "*";

        if (tag !== "*" && await isLikelyCharacterQuery(tag)) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle("Tag invalida")
                        .setDescription("Nao use nome de personagem como tag no /admindrop. Use uma tag real do nhentai.")
                        .setTimestamp(),
                ],
            });
            return;
        }

        await interaction.deferReply();
        const result = await getRandomCharacter(tag);
        if (!result) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setTitle("Nenhum personagem encontrado")
                        .setDescription("Nao encontrei personagens para esse filtro.")
                        .setTimestamp(),
                ],
            });
            return;
        }

        await registerCharacterFromDrop(result);
        const wishMatches = await getWishMatches(result.character.id);
        const lines = [];
        const wishAlert = createWishAlertContent(result.character.name, wishMatches);
        if (wishAlert) {
            lines.push(wishAlert);
        }
        lines.push(`Drop administrativo por ${interaction.user}.`);

        const message = await interaction.editReply({
            content: lines.join("\n"),
            embeds: [createCharacterEmbed(result)],
            components: [createClaimActionRow(result.character.id)],
        });

        return {
            claimCharacterId: result.character.id,
            message,
        };
    },
};
