const { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { buildCharacterId } = require("../../modules/Harem");
const {
    createAdminRankEmbed,
    findCharacterByName,
    setCharacterManualRankAdjustment,
    updateCharacterMarketEntry,
} = require("../../modules/Market");
const { searchCharacters } = require("../../modules/Search");

async function resolveCharacter(query) {
    let character = await findCharacterByName(query);

    if (character) {
        return character;
    }

    const results = await searchCharacters(query);
    const first = results[0];
    if (!first) {
        return null;
    }

    await updateCharacterMarketEntry({
        id: buildCharacterId(first.name),
        name: first.name,
        sourceUrl: first.works[0]?.url,
        works: first.works.map((work) => ({
            id: work.id,
            title: work.title,
            url: work.url,
            imageCount: 0,
        })),
    });

    return findCharacterByName(first.name);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adminrank")
        .setDescription("ajusta manualmente o rank de mercado de um personagem")
        .setDescriptionLocalizations({
            "pt-BR": "ajusta manualmente o rank de mercado de um personagem",
            "en-US": "manually adjusts a character market rank",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) => option
            .setName("nome")
            .setDescription("nome do personagem")
            .setDescriptionLocalizations({
                "pt-BR": "nome do personagem",
                "en-US": "character name",
            })
            .setRequired(true))
        .addIntegerOption((option) => option
            .setName("ajuste")
            .setDescription("pontos manuais adicionados ou removidos do rank")
            .setDescriptionLocalizations({
                "pt-BR": "pontos manuais adicionados ou removidos do rank",
                "en-US": "manual points added or removed from rank",
            })
            .setMinValue(-100)
            .setMaxValue(100)
            .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString("nome", true);
        const adjustment = interaction.options.getInteger("ajuste", true);
        const character = await resolveCharacter(query);

        if (!character) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setTitle("Personagem nao encontrado")
                        .setDescription(`Nao encontrei dados para **${query}**.`)
                        .setTimestamp(),
                ],
            });
            return;
        }

        const updated = await setCharacterManualRankAdjustment(character.id, adjustment, interaction.user);

        await interaction.reply({
            embeds: [createAdminRankEmbed(updated, `Ajuste manual definido para ${adjustment >= 0 ? "+" : ""}${adjustment}`)],
        });
    },
};
