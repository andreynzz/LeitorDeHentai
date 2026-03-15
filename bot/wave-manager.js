const { GetDoujin, CreateDoujinEmbed } = require("../modules/Doujin");
const { KeyvHooks } = require("keyv");
const { getChannelIdFromWaveKey, isWaveEntry } = require("../modules/Wave");
const { createWaveChallengeEmbed } = require("../modules/WaveChallenges");

function createWaveManager(client, keyv, sessions) {
    function clearWaveInterval(channelId) {
        const interval = sessions.waveIntervals[channelId];
        if (interval) {
            clearInterval(interval);
            sessions.waveIntervals[channelId] = null;
        }
    }

    function addChannelToIntervals(data) {
        const payload = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        const channelId = getChannelIdFromWaveKey(data.key);

        clearWaveInterval(channelId);
        sessions.waveIntervals[channelId] = setInterval(async () => {
            const channel = client.channels.cache.find((entry) => entry.id === channelId);
            if (!channel) {
                console.log(`Channel ${channelId} doesn't exist!`);
                return;
            }

            console.log(`Channel ${channel.id} is expecting to be flooded!`);
            const doujin = await GetDoujin(payload.tag);
            if (!doujin) {
                console.log("Hentai wave stoped...");
                channel.send("Couldn't find anything :(");
                return;
            }

            channel.send({ embeds: [createWaveChallengeEmbed(doujin, payload), CreateDoujinEmbed(doujin)] });
        }, payload.time * 1000);

        console.log(`Channel ${channelId} ready!`);
    }

    async function initializeWaveChannels() {
        console.log("Preparing hentai wave...");
        const iterator = keyv.iterator();
        for await (const [key, value] of iterator) {
            if (isWaveEntry(key, value)) {
                addChannelToIntervals({ key, value });
            }
        }
        console.log("Hentai wave ready...");
    }

    function registerWaveHooks() {
        keyv.hooks.addHandler(KeyvHooks.POST_SET, (data) => {
            if (!isWaveEntry(data.key, data.value)) {
                return;
            }

            console.log("Adding to the list...");
            addChannelToIntervals({
                key: data.key.replace("keyv:", ""),
                value: data.value,
            });
        });

        keyv.hooks.addHandler(KeyvHooks.POST_DELETE, (data) => {
            clearWaveInterval(getChannelIdFromWaveKey(data.key.replace("keyv:", "")));
        });
    }

    return {
        initializeWaveChannels,
        registerWaveHooks,
    };
}

module.exports = {
    createWaveManager,
};
