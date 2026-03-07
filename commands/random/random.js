const { GetDoujin, CreateDoujinEmbed } = require("../../modules/Doujin")
const { SlashCommandBuilder } = require("discord.js")

module.exports = {
    data : new SlashCommandBuilder()
            .setName('random')
            .setDescription('busca um doujin aleatorio')
            .addStringOption((option) => option
                            .setName("tag")
                            .setDescription("tag do doujin para pesquisar")
            ),
    async execute(interaction) {
        const tag = interaction.options.getString("tag") ?? "*";

        //Gets a random doujin with the given tag
        const chosen = await GetDoujin(tag);
        if (!chosen) { await interaction.reply("There was an error trying to find a Doujin with this tag"); return; }

        //Creates an embed
        const m_Embed = CreateDoujinEmbed(chosen);

        //And finally send it to the user!
        await interaction.reply({embeds: [m_Embed]});
    }
}