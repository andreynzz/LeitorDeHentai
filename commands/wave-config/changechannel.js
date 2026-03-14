const { SlashCommandBuilder } = require("discord.js");
const { keyv } = require("./../../modules/Database")

module.exports = {
    data : new SlashCommandBuilder()
            .setName('changechannel')
            .setDescription('muda as propriedades de um canal ')
            .addChannelOption((option) => option
                            .setName("channel")
                            .setDescription("canal de texto que vai receber os doujins")
                            .setRequired(true)
            )
            .addStringOption((option) => option
                            .setName("tag")
                            .setDescription("tag do doujin para pesquisar")
            )
            .addIntegerOption((option) => option
                            .setName("time")
                            .setDescription("tempo, em segundos, entre o envio de cada doujin (min: 10 segundos)")
            )
            ,
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");
        if (!channel){ await interaction.reply({content:"Channel doesn't exist or isn't supported",ephemeral:true}); return}
        const time = Math.max(interaction.options.getInteger("time") ?? 10, 10);
        const tag = interaction.options.getString("tag") ?? "*";


        await interaction.deferReply()
        
        if (await keyv.get(channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await keyv.set(channel.id, JSON.stringify({time: time, tag: tag}));
            await interaction.editReply({content:`Channel ${channel.name} changed`, ephemeral:true});
        }
    }
}