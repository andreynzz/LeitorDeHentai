const { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getHarem, removeCharacterFromHarem } = require("../../modules/Harem");
const { incrementWeeklyDivorces } = require("../../modules/Market");

function createFailureEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: "Admin - Divorcio" })
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admindivorce")
        .setDescription("forca divorcios no harem de um usuario")
        .setDescriptionLocalizations({
            "pt-BR": "forca divorcios no harem de um usuario",
            "en-US": "forces divorces in a user's harem",
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((option) => option
            .setName("usuario")
            .setDescription("usuario dono do harem")
            .setDescriptionLocalizations({
                "pt-BR": "usuario dono do harem",
                "en-US": "harem owner",
            })
            .setRequired(true))
        .addStringOption((option) => option
            .setName("acao")
            .setDescription("aplica divorcio em um personagem ou no harem inteiro")
            .setDescriptionLocalizations({
                "pt-BR": "aplica divorcio em um personagem ou no harem inteiro",
                "en-US": "applies divorce to one character or the whole harem",
            })
            .addChoices(
                { name: "um", value: "single" },
                { name: "todos", value: "all" },
            )
            .setRequired(true))
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
            .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("usuario", true);
        const action = interaction.options.getString("acao", true);
        const characterId = interaction.options.getString("character_id");

        if (action === "single" && !characterId) {
            await interaction.reply({
                embeds: [createFailureEmbed("Personagem obrigatorio", "Informe o `character_id` para forcar um divorcio individual.")],
            });
            return;
        }

        if (action === "single") {
            const result = await removeCharacterFromHarem(targetUser.id, characterId);
            if (!result.removed) {
                await interaction.reply({
                    embeds: [createFailureEmbed("Personagem nao encontrado", "Nao encontrei esse personagem no harem informado.")],
                });
                return;
            }

            const marketCharacter = await incrementWeeklyDivorces(characterId);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.DarkOrange)
                        .setAuthor({ name: "Admin - Divorcio" })
                        .setTitle("Divorcio forcado")
                        .setDescription(`**${result.character.name}** foi removido do harem de ${targetUser}.`)
                        .addFields({
                            name: "Divorcios semanais",
                            value: `${marketCharacter?.divorciosSemanais ?? 0}`,
                            inline: true,
                        })
                        .setTimestamp(),
                ],
            });
            return;
        }

        const harem = await getHarem(targetUser.id);
        if (!harem.characters.length) {
            await interaction.reply({
                embeds: [createFailureEmbed("Harem vazio", `${targetUser} nao possui personagens para divorciar.`)],
            });
            return;
        }

        const characters = [...harem.characters];
        const removedNames = [];
        for (const character of characters) {
            const result = await removeCharacterFromHarem(targetUser.id, character.id);
            if (!result.removed) {
                continue;
            }

            removedNames.push(result.character.name);
            await incrementWeeklyDivorces(character.id);
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.DarkOrange)
                    .setAuthor({ name: "Admin - Divorcio" })
                    .setTitle("Harem divorciado")
                    .setDescription(`Removi **${removedNames.length}** personagem(ns) do harem de ${targetUser}.`)
                    .addFields({
                        name: "Personagens removidos",
                        value: removedNames.slice(0, 15).map((name, index) => `${index + 1}. ${name}`).join("\n"),
                        inline: false,
                    })
                    .setTimestamp(),
            ],
        });
    },
};
