const { Colors, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { getMarriageState, getCurrentMarriageWindow } = require("../../modules/Marriage");
const { MAX_ROLLS, getCurrentRollWindow, getRollState } = require("../../modules/Rolls");

function formatMarriageStatus(state, currentWindow) {
    if (state?.slotKey === currentWindow.slotKey) {
        return {
            label: "Indisponivel",
            value: `Voce ja casou nesta janela.\nLibera em <t:${Math.floor(currentWindow.nextSlotAt / 1000)}:R>.`,
        };
    }

    return {
        label: "Disponivel",
        value: `Voce pode casar agora.\nA janela atual termina em <t:${Math.floor(currentWindow.nextSlotAt / 1000)}:R>.`,
    };
}

function formatRollStatus(state) {
    const remaining = MAX_ROLLS - state.used;
    const currentWindow = getCurrentRollWindow();
    if (remaining <= 0) {
        return `Voce esta com **0/${MAX_ROLLS}** rolls.\nReset em <t:${Math.floor(state.resetAt / 1000)}:R>.`;
    }

    return `Voce esta com **${remaining}/${MAX_ROLLS}** rolls.\nA janela atual termina em <t:${Math.floor(currentWindow.resetAt / 1000)}:R>.`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tu")
        .setDescription("mostra em quanto tempo seus rolls e casamento liberam")
        .setDescriptionLocalizations({
            "pt-BR": "mostra em quanto tempo seus rolls e casamento liberam",
            "en-US": "shows when your rolls and marriage become available",
        }),
    async execute(interaction) {
        const [marriageState, rollState] = await Promise.all([
            getMarriageState(interaction.user.id),
            getRollState(interaction.user.id),
        ]);
        const currentWindow = getCurrentMarriageWindow();
        const marriageStatus = formatMarriageStatus(marriageState, currentWindow);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Blurple)
                    .setAuthor({ name: `${interaction.user.username} - Timer` })
                    .setTitle("Seu status")
                    .addFields(
                        {
                            name: `Casamento: ${marriageStatus.label}`,
                            value: marriageStatus.value,
                            inline: false,
                        },
                        {
                            name: "Rolls",
                            value: formatRollStatus(rollState),
                            inline: false,
                        },
                    )
                    .setFooter({ text: "Casamento e rolls seguem o horario de Brasilia" })
                    .setTimestamp(),
            ],
        });
    },
};
