const { SlashCommandBuilder } = require("discord.js");
const { keyv } = require("./../../modules/Database")
const { getWaveValue, setWaveValue } = require("./../../modules/Wave");

module.exports = {
    data : new SlashCommandBuilder()
            .setName('changechannel')
            .setNameLocalizations({
                            "pt-BR": "alterarcanal",
            })
            .setDescription('muda as propriedades de um canal ')
            .setDescriptionLocalizations({
                            "pt-BR": "muda as propriedades de um canal",
                            "en-US": "changes a channel settings",
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
        const time = Math.max(interaction.options.getInteger("time") ?? 10, 10);
        const tag = interaction.options.getString("tag") ?? "*";


        await interaction.deferReply()
        
        if (await getWaveValue(keyv, channel.id) === undefined) {
            await interaction.editReply({content:`Channel ${channel.name} wasn't added`, ephemeral:true});
            
        }else{
            await setWaveValue(keyv, channel.id, JSON.stringify({time: time, tag: tag}));
            await interaction.editReply({content:`Channel ${channel.name} changed`, ephemeral:true});
        }
    }
}
