const HELPER_STATS_PREFIX = "helper_stats:";
const HELPER_DROP_DURATION_SECONDS = 12;
const HELPER_DROP_CHANCE = 0.35;
const HELPER_MIN_REWARD = 15;
const HELPER_MAX_REWARD = 90;
const HELPER_VARIANTS = [
    {
        id: "bronze",
        name: "Fragmento Bronze",
        emoji: "🟤",
        color: 0xcd7f32,
        multiplier: 0.85,
        weight: 0.4,
    },
    {
        id: "sapphire",
        name: "Fragmento Safira",
        emoji: "🔷",
        color: 0x3498db,
        multiplier: 1,
        weight: 0.28,
    },
    {
        id: "amethyst",
        name: "Fragmento Ametista",
        emoji: "🟣",
        color: 0x9b59b6,
        multiplier: 1.25,
        weight: 0.18,
    },
    {
        id: "ruby",
        name: "Fragmento Rubi",
        emoji: "🔴",
        color: 0xe74c3c,
        multiplier: 1.55,
        weight: 0.1,
    },
    {
        id: "gold",
        name: "Fragmento Dourado",
        emoji: "🟡",
        color: 0xf1c40f,
        multiplier: 1.9,
        weight: 0.04,
    },
];

module.exports = {
    HELPER_DROP_CHANCE,
    HELPER_DROP_DURATION_SECONDS,
    HELPER_MAX_REWARD,
    HELPER_MIN_REWARD,
    HELPER_STATS_PREFIX,
    HELPER_VARIANTS,
};
