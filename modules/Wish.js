const { Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const WISH_PREFIX = "wish:";
const MAX_WISHES = 10;

function getWishKey(userId) {
    return `${WISH_PREFIX}${userId}`;
}

function createWishEntry(characterId, characterName = null) {
    return {
        id: characterId,
        name: characterName ?? characterId,
        addedAt: new Date().toISOString(),
    };
}

async function getWishlist(userId) {
    return (await keyv.get(getWishKey(userId))) ?? [];
}

async function saveWishlist(userId, wishlist) {
    await keyv.set(getWishKey(userId), wishlist);
}

async function addWish(userId, characterId, characterName = null) {
    const wishlist = await getWishlist(userId);
    const existing = wishlist.find((entry) => entry.id === characterId);
    if (existing) {
        return { added: false, reason: "duplicate", wishlist, wish: existing };
    }

    if (wishlist.length >= MAX_WISHES) {
        return { added: false, reason: "limit", wishlist };
    }

    const wish = createWishEntry(characterId, characterName);
    wishlist.push(wish);
    await saveWishlist(userId, wishlist);
    return { added: true, wishlist, wish };
}

async function removeWish(userId, characterId) {
    const wishlist = await getWishlist(userId);
    const index = wishlist.findIndex((entry) => entry.id === characterId);
    if (index === -1) {
        return { removed: false, wishlist };
    }

    const [wish] = wishlist.splice(index, 1);
    await saveWishlist(userId, wishlist);
    return { removed: true, wishlist, wish };
}

async function getWishMatches(characterId) {
    const matches = [];
    const iterator = keyv.iterator();

    for await (const [key, value] of iterator) {
        if (!key.startsWith(WISH_PREFIX)) {
            continue;
        }

        let wishlist = [];
        if (Array.isArray(value)) {
            wishlist = value;
        } else if (typeof value === "string") {
            try {
                wishlist = JSON.parse(value);
            } catch {
                wishlist = [];
            }
        }

        const wish = wishlist.find((entry) => entry.id === characterId);
        if (wish) {
            matches.push({
                userId: key.slice(WISH_PREFIX.length),
                wish,
            });
        }
    }

    return matches;
}

function createWishListEmbed(user, wishlist) {
    const description = wishlist.length > 0
        ? wishlist.map((wish, index) => `**${index + 1}.** ${wish.name}\n\`${wish.id}\``).join("\n\n")
        : "Sua wishlist esta vazia.";

    return new EmbedBuilder()
        .setColor(Colors.Blue)
        .setAuthor({ name: `${user.username} - Wishlist` })
        .setTitle(`${wishlist.length}/${MAX_WISHES} desejados`)
        .setDescription(description)
        .setFooter({ text: "Use /wish add para adicionar mais personagens" })
        .setTimestamp();
}

function createWishActionEmbed(user, title, description, color = Colors.Blue) {
    return new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `${user.username} - Wishlist` })
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function createWishAlertContent(characterName, matches) {
    if (matches.length === 0) {
        return null;
    }

    const mentions = matches.map((match) => `<@${match.userId}>`).join(" ");
    return `${mentions}\n${characterName} saiu e esta na sua wish!`;
}

module.exports = {
    MAX_WISHES,
    addWish,
    createWishActionEmbed,
    createWishAlertContent,
    createWishListEmbed,
    getWishMatches,
    getWishlist,
    removeWish,
};
