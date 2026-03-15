const path = require("node:path");
const { Client, Events, GatewayIntentBits, Partials } = require("discord.js");
const { config } = require("./lib/config");
const { loadCommandModules } = require("./lib/command-loader");
const { keyv } = require("./modules/Database");
const { getMarketState, processInfamyReset } = require("./modules/Market");
const { getOwnersForCharacterIds } = require("./modules/Harem");
const { createBotSessions } = require("./bot/sessions");
const { attachCommands, createInteractionManager } = require("./bot/interactions");
const { createWaveManager } = require("./bot/wave-manager");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
    ],
});
const sessions = createBotSessions();

keyv.on("error", (error) => console.error("Keyv connection error:", error));

const commandsRoot = path.join(__dirname, "commands");
attachCommands(client, loadCommandModules(commandsRoot));

const interactionManager = createInteractionManager(client, sessions);
const waveManager = createWaveManager(client, keyv, sessions);

async function maybeProcessInfamyReset() {
    try {
        const state = await getMarketState();
        if (state.nextInfamyResetAt > Date.now()) {
            return;
        }

        const result = await processInfamyReset(getOwnersForCharacterIds);
        console.log(`Infamy reset processed. ${result.infamous.length} infamous characters selected.`);
        for (const reward of result.loyaltyRewards) {
            console.log(`Loyalty reward: user ${reward.ownerId} kept ${reward.characterName} and received ${reward.reward} coins.`);
        }
    } catch (error) {
        console.error("Failed to process infamy reset:", error);
    }
}

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
    await waveManager.initializeWaveChannels();
    await maybeProcessInfamyReset();

    if (sessions.infamyResetInterval) {
        clearInterval(sessions.infamyResetInterval);
    }

    sessions.infamyResetInterval = setInterval(maybeProcessInfamyReset, 60 * 60 * 1000);
});

waveManager.registerWaveHooks();
interactionManager.registerClientInteractionHandler();

client.login(config.token);
