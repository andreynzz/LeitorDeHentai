const { GetDoujin } = require("../../modules/Doujin");
const {
    createDoujinClaimActionRow,
    createRolledDoujinEmbed,
} = require("../../modules/DoujinCollectionClaim");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data : new SlashCommandBuilder()
            .setName('random')
            .setNameLocalizations({
                            "pt-BR": "aleatorio",
            })
            .setDescription('busca um doujin aleatorio')
            .setDescriptionLocalizations({
                            "pt-BR": "busca um doujin aleatorio",
                            "en-US": "fetches a random doujin",
            })
            .addStringOption((option) => option
                            .setName("tag")
                            .setDescription("tag do doujin para pesquisar")
                            .setDescriptionLocalizations({
                                            "pt-BR": "tag do doujin para pesquisar",
                                            "en-US": "doujin tag to search for",
                            })
            ),
    async execute(interaction) {
        const tag = interaction.options.getString("tag") ?? "*";

        const chosen = await GetDoujin(tag);
        if (!chosen) {
            await interaction.reply("There was an error trying to find a Doujin with this tag");
            return;
        }

        const message = await interaction.reply({
            embeds: [createRolledDoujinEmbed(chosen)],
            components: [createDoujinClaimActionRow(chosen.id)],
            fetchReply: true,
        });

        return {
            doujinClaim: {
                message,
                doujin: chosen,
            },
        };
    }
};
