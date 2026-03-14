const { SlashCommandBuilder } = require("discord.js");
const { keyv } = require("./../../modules/Database")

module.exports = {
    data : new SlashCommandBuilder()
            .setName('removechannel')
            .setDescription('remove um canal de texto ')
            .addChannelOption((option) => option
                            .setName("channel")
                            .setDescription("canal de texto que vai receber os doujins")
                            .setRequired(true)
            )
            ,
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");
        if (!channel){ await interaction.reply({content:"Channel doesn't exist or isn't supported", ephemeral:true}); return}
        
        await interaction.deferReply()
        
        if (await keyv.get(channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await keyv.delete(channel.id);
            await interaction.editReply({content:`Channel ${channel.name} removed`, ephemeral:true});
        }
    }
}