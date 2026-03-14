const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { removeCharacterFromHarem } = require("../../modules/Harem");
const { incrementWeeklyDivorces } = require("../../modules/Market");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("divorce")
        .setDescription("remove um personagem do seu harem")
        .setDescriptionLocalizations({
            "pt-BR": "remove um personagem do seu harem",
            "en-US": "removes a character from your harem",
        })
        .addStringOption((option) => option
            .setName("character_id")
            .setNameLocalizations({
                "pt-BR": "personagem_id",
            })
            .setDescription("id do personagem exibido no /harem")
            .setDescriptionLocalizations({
                "pt-BR": "id do personagem exibido no /harem",
                "en-US": "character id shown in /harem",
            })
            .setRequired(true)),
    async execute(interaction) {
        const characterId = interaction.options.getString("character_id", true);
        const result = await removeCharacterFromHarem(interaction.user.id, characterId);

        if (!result.removed) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Orange)
                        .setTitle("Personagem nao encontrado")
                        .setDescription("Nao encontrei esse personagem no seu harem.")
                        .setTimestamp(),
                ],
            });
            return;
        }

        const marketCharacter = await incrementWeeklyDivorces(characterId);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.DarkOrange)
                    .setTitle("Divorcio realizado")
                    .setDescription(`**${result.character.name}** foi removido do seu harem.`)
                    .addFields({
                        name: "Divorcios semanais",
                        value: `${marketCharacter?.divorciosSemanais ?? 0}`,
                        inline: true,
                    })
                    .setTimestamp(),
            ],
        });
    },
};
