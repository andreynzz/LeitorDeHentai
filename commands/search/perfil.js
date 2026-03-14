const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { buildCharacterId, countOwnersForCharacter } = require("../../modules/Harem");
const {
    createCharacterProfileEmbed,
    findCharacterByName,
    updateCharacterMarketEntry,
} = require("../../modules/Market");
const { searchCharacters } = require("../../modules/Search");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("perfil")
        .setDescription("exibe os dados de um personagem")
        .setDescriptionLocalizations({
            "pt-BR": "exibe os dados de um personagem",
            "en-US": "shows a character profile",
        })
        .addStringOption((option) => option
            .setName("nome")
            .setDescription("nome do personagem")
            .setDescriptionLocalizations({
                "pt-BR": "nome do personagem",
                "en-US": "character name",
            })
            .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString("nome", true);
        let character = await findCharacterByName(query);

        if (!character) {
            const results = await searchCharacters(query);
            const first = results[0];
            if (first) {
                await updateCharacterMarketEntry({
                    id: first.works[0] ? buildCharacterId(first.name, first.works[0].id) : query,
                    name: first.name,
                    sourceUrl: first.works[0]?.url,
                    works: first.works.map((work) => ({
                        id: work.id,
                        title: work.title,
                        url: work.url,
                        imageCount: 0,
                    })),
                });
                character = await findCharacterByName(first.name);
            }
        }

        if (!character) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setTitle("Personagem nao encontrado")
                        .setDescription(`Nao encontrei perfil para **${query}**.`)
                        .setTimestamp(),
                ],
            });
            return;
        }

        const ownerCount = await countOwnersForCharacter(character.id);
        await interaction.reply({
            embeds: [createCharacterProfileEmbed(character, ownerCount)],
        });
    },
};
