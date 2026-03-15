const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");
const { createHourlyWindow } = require("../lib/brasilia-time");

const DOUJIN_ROLLS_PREFIX = "doujin_rolls:";
const MAX_DOUJIN_ROLLS = 20;
const DOUJIN_ROLL_WINDOW_HOURS = 1;

function getDoujinRollsKey(userId) {
    return `${DOUJIN_ROLLS_PREFIX}${userId}`;
}

function getCurrentDoujinRollWindow(date = new Date()) {
    return createHourlyWindow(DOUJIN_ROLL_WINDOW_HOURS, date);
}

function createFreshDoujinRollState(date = new Date()) {
    const window = getCurrentDoujinRollWindow(date);
    return {
        used: 0,
        slotKey: window.slotKey,
        resetAt: window.resetAt,
    };
}

function normalizeDoujinRollState(state, date = new Date()) {
    const window = getCurrentDoujinRollWindow(date);
    if (!state || state.slotKey !== window.slotKey || state.resetAt <= date.getTime()) {
        return createFreshDoujinRollState(date);
    }

    return state;
}

function applyDoujinRollConsumption(state) {
    if (state.used >= MAX_DOUJIN_ROLLS) {
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
        remaining: MAX_DOUJIN_ROLLS - nextState.used,
    };
}

async function getDoujinRollState(userId) {
    const storedState = await keyv.get(getDoujinRollsKey(userId));
    const state = normalizeDoujinRollState(storedState);
    if (!storedState || storedState.slotKey !== state.slotKey || storedState.resetAt !== state.resetAt || storedState.used !== state.used) {
        await keyv.set(getDoujinRollsKey(userId), state);
    }

    return state;
}

async function consumeDoujinRoll(userId) {
    const state = await getDoujinRollState(userId);
    const result = applyDoujinRollConsumption(state);
    if (result.allowed) {
        await keyv.set(getDoujinRollsKey(userId), result.state);
    }

    return result;
}

function createDoujinRollLimitEmbed(user, state) {
    return new EmbedBuilder()
        .setColor(Colors.Orange)
        .setAuthor({ name: `${user.username} - Doujin Rolls` })
        .setTitle("Seus rolls de doujin acabaram")
        .setDescription(`Voce usou os **${MAX_DOUJIN_ROLLS} rolls de doujin** disponiveis nesta janela.`)
        .addFields({
            name: "Proximo reset",
            value: `Em <t:${Math.floor(state.resetAt / 1000)}:R>.\nHorario de Brasilia.`,
            inline: false,
        })
        .setTimestamp();
}

function createDoujinRollStatusText(remaining) {
    return `Doujin rolls restantes: **${remaining}/${MAX_DOUJIN_ROLLS}**`;
}

module.exports = {
    MAX_DOUJIN_ROLLS,
    applyDoujinRollConsumption,
    consumeDoujinRoll,
    createDoujinRollLimitEmbed,
    createDoujinRollStatusText,
    createFreshDoujinRollState,
    getCurrentDoujinRollWindow,
    getDoujinRollState,
    normalizeDoujinRollState,
};
