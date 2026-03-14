const { SlashCommandBuilder } = require("discord.js");
const { createFavoriteEmbed, setFavoriteCharacter } = require("../../modules/Harem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("favorite")
        .setNameLocalizations({
            "pt-BR": "favoritar",
        })
        .setDescription("marca um personagem do seu harem como favorito")
        .setDescriptionLocalizations({
            "pt-BR": "marca um personagem do seu harem como favorito",
            "en-US": "marks a character from your harem as favorite",
        })
        .addStringOption((option) => option
            .setName("character_id")
            .setNameLocalizations({
                "pt-BR": "personagem_id",
            })
            .setDescription("id exibido no comando /harem")
            .setDescriptionLocalizations({
                "pt-BR": "id exibido no comando /harem",
                "en-US": "id shown in the /harem command",
            })
            .setRequired(true)),
    async execute(interaction) {
        const characterId = interaction.options.getString("character_id", true);
        const result = await setFavoriteCharacter(interaction.user.id, characterId);

        if (!result.updated) {
            await interaction.reply({
                embeds: [createFavoriteEmbed(interaction.user, {
                    id: characterId,
                    name: "Personagem nao encontrado",
                    sourceTitle: "Harem",
                    sourceUrl: "https://discord.com",
                    imageUrl: null,
                }).setColor(0xed4245).setDescription("Nao encontrei esse personagem no seu harem. Use /harem para ver os IDs disponiveis.")],
            });
            return;
        }

        await interaction.reply({
            embeds: [createFavoriteEmbed(interaction.user, result.character)],
        });
    },
};
