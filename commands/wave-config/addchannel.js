const { SlashCommandBuilder } = require("discord.js");
const { keyv } = require("./../../modules/Database")
const { getWaveValue, setWaveValue } = require("./../../modules/Wave");

module.exports = {
    data : new SlashCommandBuilder()
            .setName('addchannel')
            .setNameLocalizations({
                            "pt-BR": "adicionarcanal",
            })
            .setDescription('adiciona um canal ')
            .setDescriptionLocalizations({
                            "pt-BR": "adiciona um canal",
                            "en-US": "adds a channel",
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
            .addStringOption((option) => option
                            .setName("tag")
                            .setDescription("tag do doujin para pesquisar")
                            .setDescriptionLocalizations({
                                            "pt-BR": "tag do doujin para pesquisar",
                                            "en-US": "doujin tag to search for",
                            })
            )
            .addIntegerOption((option) => option
                            .setName("time")
                            .setNameLocalizations({
                                            "pt-BR": "tempo",
                            })
                            .setDescription("tempo, em segundos, entre o envio de cada doujin (min: 10 segundos)")
                            .setDescriptionLocalizations({
                                            "pt-BR": "tempo, em segundos, entre o envio de cada doujin (min: 10 segundos)",
                                            "en-US": "time in seconds between each doujin sent (min: 10 seconds)",
                            })
            )
            ,
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");
        if (!channel){ await interaction.reply({content:"Channel doesn't exist or isn't supported",ephemeral:true}); return}
        if (!channel.nsfw) { await interaction.reply({content:"Channel isn't nsfw",ephemeral:true}); return}
        const time = Math.max(interaction.options.getInteger("time") ?? 10, 10);
        const tag = interaction.options.getString("tag") ?? "*";


        await interaction.deferReply()
        
        if (await getWaveValue(keyv, channel.id) === undefined) {
            await setWaveValue(keyv, channel.id, JSON.stringify({time: time, tag: tag}));
            await interaction.editReply({content:`Channel ${channel.name} added`, ephemeral:true});
        }else{
            await interaction.editReply({content:`Channel ${channel.name} was already added`, ephemeral:true});
        }
    }
}
