const { SlashCommandBuilder } = require("discord.js")

module.exports = {
    data : new SlashCommandBuilder()
            .setName('random')
            .setDescription('busca um doujin aleatorio')
            .addChannelOption((option) => option
                            .setName("channel")
                            .setDescription("channel to get flooded")
                            .setRequired(true)
            )
            ,
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