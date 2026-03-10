const { SlashCommandBuilder } = require("discord.js");
const { Keyv, KeyvHooks } = require("keyv");
const { database_path } = require("./../../config.json");
const { default: KeyvSqlite } = require("@keyv/sqlite");

const keyv = new Keyv(new KeyvSqlite(`sqlite://${database_path}`));

module.exports = {
    data : new SlashCommandBuilder()
            .setName('removechannel')
            .setDescription('muda as propriedades de um canal ')
            .addChannelOption((option) => option
                            .setName("channel")
                            .setDescription("canal de texto que vai receber os doujins")
                            .setRequired(true)
            )
            ,
    async execute(interaction) {
        const channel = await interaction.options.getChannel("channel");
        if (!channel){interaction.reply({content:"Channel doesn't exist or isn't supported", ephemeral:true}); return}
        
        await interaction.deferReply()
        
        if (await keyv.get(channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await keyv.delete(channel.id);
            await interaction.editReply({content:`Channel ${channel.name} changed`, ephemeral:true});
        }
    }
}