const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");
const { createHourlyWindow } = require("../lib/brasilia-time");

const MARRIAGE_PREFIX = "marriage:";
const MARRIAGE_WINDOW_HOURS = 3;

function getMarriageKey(userId) {
    return `${MARRIAGE_PREFIX}${userId}`;
}

function getCurrentMarriageWindow(date = new Date()) {
    const window = createHourlyWindow(MARRIAGE_WINDOW_HOURS, date);
    return {
        slotKey: window.slotKey,
        nextSlotAt: window.resetAt,
    };
}

function checkMarriageAvailability(state, date = new Date()) {
    const window = getCurrentMarriageWindow(date);

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

function createMarriageRecord(character, date = new Date()) {
    const window = getCurrentMarriageWindow(date);
    return {
        slotKey: window.slotKey,
        characterId: character.id,
        characterName: character.name,
        claimedAt: date.toISOString(),
        nextSlotAt: window.nextSlotAt,
    };
}

async function getMarriageState(userId) {
    return (await keyv.get(getMarriageKey(userId))) ?? null;
}

async function canUserMarry(userId) {
    const state = await getMarriageState(userId);
    return checkMarriageAvailability(state);
}

async function registerMarriage(userId, character) {
    const state = createMarriageRecord(character);
    await keyv.set(getMarriageKey(userId), state);
    return state;
}

function createMarriageCooldownEmbed(user, nextSlotAt) {
    return new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: `${user.username} - Casamento` })
        .setTitle("Seu horario de casamento acabou")
        .setDescription("Voce ja casou nesta janela global de 3 horas do horario de Brasilia.")
        .addFields({
            name: "Proximo casamento disponivel",
            value: `<t:${Math.floor(nextSlotAt / 1000)}:F>\n<t:${Math.floor(nextSlotAt / 1000)}:R>`,
            inline: false,
        })
        .setTimestamp();
}

module.exports = {
    canUserMarry,
    checkMarriageAvailability,
    createMarriageRecord,
    createMarriageCooldownEmbed,
    getCurrentMarriageWindow,
    getMarriageState,
    registerMarriage,
};
