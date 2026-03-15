const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");
const { createHourlyWindow } = require("../lib/brasilia-time");

const ROLLS_PREFIX = "rolls:";
const MAX_ROLLS = 10;
const ROLL_WINDOW_HOURS = 1;

function getRollsKey(userId) {
    return `${ROLLS_PREFIX}${userId}`;
}

function getCurrentRollWindow(date = new Date()) {
    return createHourlyWindow(ROLL_WINDOW_HOURS, date);
}

function createFreshRollState(date = new Date()) {
    const window = getCurrentRollWindow(date);
    return {
        used: 0,
        slotKey: window.slotKey,
        resetAt: window.resetAt,
    };
}

function normalizeRollState(state, date = new Date()) {
    const window = getCurrentRollWindow(date);
    if (!state || state.slotKey !== window.slotKey || state.resetAt <= date.getTime()) {
        return createFreshRollState(date);
    }

    return state;
}

function applyRollConsumption(state) {
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

    return {
        allowed: true,
        state: nextState,
        remaining: MAX_ROLLS - nextState.used,
    };
}

async function getRollState(userId) {
    const storedState = await keyv.get(getRollsKey(userId));
    const state = normalizeRollState(storedState);
    if (!storedState || storedState.slotKey !== state.slotKey || storedState.resetAt !== state.resetAt || storedState.used !== state.used) {
        await keyv.set(getRollsKey(userId), state);
    }

    return state;
}

async function consumeRoll(userId) {
    const state = await getRollState(userId);
    const result = applyRollConsumption(state);
    if (result.allowed) {
        await keyv.set(getRollsKey(userId), result.state);
    }

    return result;
}

async function resetRolls(userId) {
    const freshState = createFreshRollState();
    await keyv.set(getRollsKey(userId), freshState);
    return {
        ...freshState,
        remaining: MAX_ROLLS,
    };
}

async function resetAllRolls() {
    const iterator = keyv.iterator();
    const freshState = createFreshRollState();
    let resetCount = 0;

    for await (const [key] of iterator) {
        if (!key.startsWith(ROLLS_PREFIX)) {
            continue;
        }

        await keyv.set(key, freshState);
        resetCount += 1;
    }

    return {
        ...freshState,
        remaining: MAX_ROLLS,
        resetCount,
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
    applyRollConsumption,
    consumeRoll,
    createFreshRollState,
    createRollLimitEmbed,
    createRollStatusText,
    getCurrentRollWindow,
    getRollState,
    normalizeRollState,
    resetAllRolls,
    resetRolls,
};
