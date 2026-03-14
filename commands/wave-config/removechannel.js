const { SlashCommandBuilder } = require("discord.js");
const { keyv } = require("./../../modules/Database")
const { deleteWaveValue, getWaveValue } = require("./../../modules/Wave");

module.exports = {
    data : new SlashCommandBuilder()
            .setName('removechannel')
            .setNameLocalizations({
                            "pt-BR": "removercanal",
            })
            .setDescription('remove um canal de texto ')
            .setDescriptionLocalizations({
                            "pt-BR": "remove um canal de texto",
                            "en-US": "removes a text channel",
            })
            .addChannelOption((option) => option
                            .setName("channel")
                            .setNameLocalizations({
                                            "pt-BR": "canal",
                            })
                            .setDescription("canal de texto que vai receber os doujins")
                            .setDescriptionLocalizations({
                                            "pt-BR": "canal de texto que vai receber os doujins",
                                            "en-US": "text channel that will receive doujins",
                            })
                            .setRequired(true)
            )
            ,
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");
        if (!channel){ await interaction.reply({content:"Channel doesn't exist or isn't supported", ephemeral:true}); return}
        
        await interaction.deferReply()
        
        if (await getWaveValue(keyv, channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await deleteWaveValue(keyv, channel.id);
            await interaction.editReply({content:`Channel ${channel.name} removed`, ephemeral:true});
        }
    }
}
