const { SlashCommandBuilder } = require("discord.js");
const { Keyv, KeyvHooks } = require("keyv");
const { database_path } = require("./../../config.json");
const { default: KeyvSqlite } = require("@keyv/sqlite");

const keyv = new Keyv(new KeyvSqlite(`sqlite://${database_path}`));
module.exports = {
    data : new SlashCommandBuilder()
            .setName('addchannel')
            .setDescription('adiciona um canal ')
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
            await keyv.set(channel.id, JSON.stringify({time}));
            await interaction.editReply({content:`Channel ${channel.name} added`, ephemeral:true});
        }else{
            await interaction.editReply({content:`Channel ${channel.name} was already added`, ephemeral:true});
        }
    }
}