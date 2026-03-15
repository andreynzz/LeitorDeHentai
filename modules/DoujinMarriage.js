const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");
const { createHourlyWindow } = require("../lib/brasilia-time");

const DOUJIN_MARRIAGE_PREFIX = "doujin_marriage:";
const DOUJIN_MARRIAGE_WINDOW_HOURS = 3;

function getDoujinMarriageKey(userId) {
    return `${DOUJIN_MARRIAGE_PREFIX}${userId}`;
}

function getCurrentDoujinMarriageWindow(date = new Date()) {
    const window = createHourlyWindow(DOUJIN_MARRIAGE_WINDOW_HOURS, date);
    return {
        slotKey: window.slotKey,
        nextSlotAt: window.resetAt,
    };
}

function checkDoujinMarriageAvailability(state, date = new Date()) {
    const window = getCurrentDoujinMarriageWindow(date);

    if (state?.slotKey === window.slotKey) {
        return {
            allowed: false,
            state,
            nextSlotAt: window.nextSlotAt,
        };
    }

    return {
        allowed: true,
        state,
        nextSlotAt: window.nextSlotAt,
        slotKey: window.slotKey,
    };
}

function createDoujinMarriageRecord(doujin, date = new Date()) {
    const window = getCurrentDoujinMarriageWindow(date);
    return {
        slotKey: window.slotKey,
        doujinId: String(doujin.id),
        doujinTitle: doujin.title,
        claimedAt: date.toISOString(),
        nextSlotAt: window.nextSlotAt,
    };
}

async function getDoujinMarriageState(userId) {
    return (await keyv.get(getDoujinMarriageKey(userId))) ?? null;
}

async function canUserClaimDoujin(userId) {
    const state = await getDoujinMarriageState(userId);
    return checkDoujinMarriageAvailability(state);
}

async function registerDoujinMarriage(userId, doujin) {
    const state = createDoujinMarriageRecord(doujin);
    await keyv.set(getDoujinMarriageKey(userId), state);
    return state;
}

function createDoujinMarriageCooldownEmbed(user, nextSlotAt) {
    return new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: `${user.username} - Captura de Doujin` })
        .setTitle("Seu horario de captura acabou")
        .setDescription("Voce ja capturou um doujin nesta janela global de 3 horas do horario de Brasilia.")
        .addFields({
            name: "Proxima captura disponivel",
            value: `<t:${Math.floor(nextSlotAt / 1000)}:F>\n<t:${Math.floor(nextSlotAt / 1000)}:R>`,
            inline: false,
        })
        .setTimestamp();
}

module.exports = {
    canUserClaimDoujin,
    checkDoujinMarriageAvailability,
    createDoujinMarriageCooldownEmbed,
    createDoujinMarriageRecord,
    getCurrentDoujinMarriageWindow,
    getDoujinMarriageState,
    registerDoujinMarriage,
};
