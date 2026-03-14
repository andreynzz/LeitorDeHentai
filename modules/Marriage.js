const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const MARRIAGE_PREFIX = "marriage:";
const BRASILIA_OFFSET_HOURS = -3;
const MARRIAGE_WINDOW_HOURS = 3;

function getMarriageKey(userId) {
    return `${MARRIAGE_PREFIX}${userId}`;
}

function getBrasiliaDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number.parseInt(part.value, 10)]),
    );

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

function buildSlotKey(parts) {
    const slotHour = Math.floor(parts.hour / MARRIAGE_WINDOW_HOURS) * MARRIAGE_WINDOW_HOURS;
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}:${String(slotHour).padStart(2, "0")}`;
}

function getCurrentMarriageWindow(date = new Date()) {
    const parts = getBrasiliaDateParts(date);
    const slotHour = Math.floor(parts.hour / MARRIAGE_WINDOW_HOURS) * MARRIAGE_WINDOW_HOURS;
    const nextSlotUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        slotHour + MARRIAGE_WINDOW_HOURS - BRASILIA_OFFSET_HOURS,
        0,
        0,
    );

    return {
        slotKey: buildSlotKey(parts),
        nextSlotAt: nextSlotUtc,
    };
}

async function getMarriageState(userId) {
    return (await keyv.get(getMarriageKey(userId))) ?? null;
}

async function canUserMarry(userId) {
    const window = getCurrentMarriageWindow();
    const state = await getMarriageState(userId);

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

async function registerMarriage(userId, character) {
    const window = getCurrentMarriageWindow();
    const state = {
        slotKey: window.slotKey,
        characterId: character.id,
        characterName: character.name,
        claimedAt: new Date().toISOString(),
    };

    await keyv.set(getMarriageKey(userId), state);
    return {
        ...state,
        nextSlotAt: window.nextSlotAt,
    };
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
    createMarriageCooldownEmbed,
    getCurrentMarriageWindow,
    getMarriageState,
    registerMarriage,
};
