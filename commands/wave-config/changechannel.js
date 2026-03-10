const { SlashCommandBuilder } = require("discord.js");
const { Keyv, KeyvHooks } = require("keyv");
const { database_path } = require("./../../config.json");

const keyv = new Keyv(`sqlite://${database_path}`);

module.exports = {
    data : new SlashCommandBuilder()
            .setName('changechannel')
            .setDescription('muda as propriedades de um canal ')
            .addChannelOption((option) => option
                            .setName("channel")
                            .setDescription("canal de texto que vai receber os doujins")
                            .setRequired(true)
            )
            .addIntegerOption((option) => option
                            .setName("time")
                            .setDescription("tempo, em segundos, entre o envio de cada doujin (min: 10 segundos)")
            )
            ,
    async execute(interaction) {
        const channel = await interaction.options.getChannel("channel");
        if (!channel){interaction.reply({content:"Channel doesn't exist or isn't supported",ephemeral:true}); return}
        const time = Math.max(interaction.options.getInteger("time") ?? 10, 10);

        await interaction.deferReply()
        
        if (await keyv.get(channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await keyv.set(channel.id, JSON.stringify({time}));
            await interaction.editReply({content:`Channel ${channel.name} changed`, ephemeral:true});
        }
    }
}