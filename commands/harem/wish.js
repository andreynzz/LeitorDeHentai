const { Colors, SlashCommandBuilder } = require("discord.js");
const {
    MAX_WISHES,
    addWish,
    createWishActionEmbed,
    createWishListEmbed,
    getWishlist,
    removeWish,
} = require("../../modules/Wish");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wish")
        .setNameLocalizations({
            "pt-BR": "wish",
        })
        .setDescription("gerencia os personagens desejados")
        .setDescriptionLocalizations({
            "pt-BR": "gerencia os personagens desejados",
            "en-US": "manages your wished characters",
        })
        .addSubcommand((subcommand) => subcommand
            .setName("add")
            .setDescription("adiciona um personagem a sua wishlist")
            .setDescriptionLocalizations({
                "pt-BR": "adiciona um personagem a sua wishlist",
                "en-US": "adds a character to your wishlist",
            })
            .addStringOption((option) => option
                .setName("character_id")
                .setNameLocalizations({
                    "pt-BR": "personagem_id",
                })
                .setDescription("id do personagem exibido no drop ou no harem")
                .setDescriptionLocalizations({
                    "pt-BR": "id do personagem exibido no drop ou no harem",
                    "en-US": "character id shown in the drop or harem",
                })
                .setRequired(true))
            .addStringOption((option) => option
                .setName("character_name")
                .setNameLocalizations({
                    "pt-BR": "nome_personagem",
                })
                .setDescription("nome para aparecer na sua wishlist")
                .setDescriptionLocalizations({
                    "pt-BR": "nome para aparecer na sua wishlist",
                    "en-US": "name to show in your wishlist",
                })))
        .addSubcommand((subcommand) => subcommand
            .setName("remove")
            .setDescription("remove um personagem da sua wishlist")
            .setDescriptionLocalizations({
                "pt-BR": "remove um personagem da sua wishlist",
                "en-US": "removes a character from your wishlist",
            })
            .addStringOption((option) => option
                .setName("character_id")
                .setNameLocalizations({
                    "pt-BR": "personagem_id",
                })
                .setDescription("id do personagem que sera removido")
                .setDescriptionLocalizations({
                    "pt-BR": "id do personagem que sera removido",
                    "en-US": "id of the character to remove",
                })
                .setRequired(true)))
        .addSubcommand((subcommand) => subcommand
            .setName("list")
            .setDescription("mostra a sua wishlist")
            .setDescriptionLocalizations({
                "pt-BR": "mostra a sua wishlist",
                "en-US": "shows your wishlist",
            })),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            const wishlist = await getWishlist(interaction.user.id);
            await interaction.reply({
                embeds: [createWishListEmbed(interaction.user, wishlist)],
            });
            return;
        }

        if (subcommand === "add") {
            const characterId = interaction.options.getString("character_id", true);
            const characterName = interaction.options.getString("character_name") ?? characterId;
            const result = await addWish(interaction.user.id, characterId, characterName);

            if (!result.added) {
                if (result.reason === "limit") {
                    await interaction.reply({
                        embeds: [
                            createWishActionEmbed(
                                interaction.user,
                                "Wishlist lotada",
                                `Sua wishlist ja chegou ao limite de ${MAX_WISHES} personagens.`,
                                Colors.Orange,
                            ),
                        ],
                    });
                    return;
                }

                await interaction.reply({
                    embeds: [
                        createWishActionEmbed(
                            interaction.user,
                            "Ja esta na wishlist",
                            `**${result.wish.name}** ja esta entre os seus desejados.`,
                            Colors.Orange,
                        ),
                    ],
                });
                return;
            }

            await interaction.reply({
                embeds: [
                    createWishActionEmbed(
                        interaction.user,
                        "Personagem desejado",
                        `**${result.wish.name}** foi adicionado a sua wishlist.\nEspacos usados: **${result.wishlist.length}/${MAX_WISHES}**`,
                        Colors.Green,
                    ),
                ],
            });
            return;
        }

        const characterId = interaction.options.getString("character_id", true);
        const result = await removeWish(interaction.user.id, characterId);

        if (!result.removed) {
            await interaction.reply({
                embeds: [
                    createWishActionEmbed(
                        interaction.user,
                        "Nao encontrado",
                        "Esse personagem nao esta na sua wishlist.",
                        Colors.Orange,
                    ),
                ],
            });
            return;
        }

        await interaction.reply({
            embeds: [
                createWishActionEmbed(
                    interaction.user,
                    "Wishlist atualizada",
                    `**${result.wish.name}** foi removido da sua wishlist.`,
                    Colors.Red,
                ),
            ],
        });
    },
};
