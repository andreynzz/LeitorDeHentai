const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const ROLLS_PREFIX = "rolls:";
const MAX_ROLLS = 10;
const BRASILIA_OFFSET_HOURS = -3;
const ROLL_WINDOW_HOURS = 1;

function getRollsKey(userId) {
    return `${ROLLS_PREFIX}${userId}`;
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

function getCurrentRollWindow(date = new Date()) {
    const parts = getBrasiliaDateParts(date);
    const slotHour = Math.floor(parts.hour / ROLL_WINDOW_HOURS) * ROLL_WINDOW_HOURS;
    const nextSlotUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        slotHour + ROLL_WINDOW_HOURS - BRASILIA_OFFSET_HOURS,
        0,
        0,
    );

    return {
        slotKey: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}:${String(slotHour).padStart(2, "0")}`,
        resetAt: nextSlotUtc,
    };
}

function getEmptyRollState() {
    const window = getCurrentRollWindow();
    return {
        used: 0,
        slotKey: window.slotKey,
        resetAt: window.resetAt,
    };
}

async function getRollState(userId) {
    const state = (await keyv.get(getRollsKey(userId))) ?? getEmptyRollState();
    const window = getCurrentRollWindow();
    if (state.slotKey !== window.slotKey || state.resetAt <= Date.now()) {
        const freshState = getEmptyRollState();
        await keyv.set(getRollsKey(userId), freshState);
        return freshState;
    }

    return state;
}

async function consumeRoll(userId) {
    const state = await getRollState(userId);
    if (state.used >= MAX_ROLLS) {
        return {
            allowed: false,
            state,
            remaining: 0,
        };
    }

    const nextState = {
        ...state,
        used: state.used + 1,
    };
    await keyv.set(getRollsKey(userId), nextState);

    return {
        allowed: true,
        state: nextState,
        remaining: MAX_ROLLS - nextState.used,
    };
}

async function resetRolls(userId) {
    const freshState = getEmptyRollState();
    await keyv.set(getRollsKey(userId), freshState);
    return {
        ...freshState,
        remaining: MAX_ROLLS,
    };
}

function getResetInMinutes(resetAt) {
    return Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
}

function createRollLimitEmbed(user, state) {
    return new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: `${user.username} - Rolls` })
        .setTitle("Seus rolls acabaram")
        .setDescription(`Voce usou os **${MAX_ROLLS} rolls** disponiveis nesta janela.`)
        .addFields({
            name: "Proximo reset",
            value: `Em aproximadamente **${getResetInMinutes(state.resetAt)} minuto(s)**.\nHorario de Brasilia.`,
            inline: false,
        })
        .setTimestamp();
}

function createRollStatusText(remaining) {
    return `Rolls restantes: **${remaining}/${MAX_ROLLS}**`;
}

module.exports = {
    MAX_ROLLS,
    consumeRoll,
    createRollLimitEmbed,
    createRollStatusText,
    getCurrentRollWindow,
    getRollState,
    resetRolls,
};
