const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const { keyv } = require("./Database");

const DOUJIN_COLLECTION_PREFIX = "doujin_collection:";
const MAX_DOUJIN_RESULTS = 10;

function getCollectionKey(userId) {
    return `${DOUJIN_COLLECTION_PREFIX}${userId}`;
}

function normalizeDoujinId(value) {
    return String(value ?? "").trim();
}

function buildDoujinEntry(doujin) {
    return {
        id: normalizeDoujinId(doujin.id),
        title: doujin.titles?.english || doujin.titles?.pretty || doujin.titles?.japanese || `Doujin #${doujin.id}`,
        url: doujin.url,
        imageUrl: doujin.cover?.url ?? null,
        favorites: doujin.favorites ?? 0,
        artists: doujin.tags?.artists?.map((value) => value.name).filter(Boolean) ?? [],
        characters: doujin.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [],
        collectedAt: new Date().toISOString(),
    };
}

function normalizeDoujinEntry(entry) {
    const id = normalizeDoujinId(entry?.id);
    if (!id) {
        return null;
    }

    return {
        ...entry,
        id,
        artists: Array.isArray(entry.artists) ? entry.artists : [],
        characters: Array.isArray(entry.characters) ? entry.characters : [],
    };
}

function sanitizeCollection(collection) {
    const sourceDoujins = Array.isArray(collection?.doujins) ? collection.doujins : [];
    const seen = new Set();
    const doujins = [];
    let changed = false;

    for (const entry of sourceDoujins) {
        const normalized = normalizeDoujinEntry(entry);
        if (!normalized) {
            changed = true;
            continue;
        }

        if (seen.has(normalized.id)) {
            changed = true;
            continue;
        }

        seen.add(normalized.id);
        doujins.push(normalized);
    }

    return {
        collection: { doujins },
        changed,
    };
}

async function saveDoujinCollection(userId, collection) {
    await keyv.set(getCollectionKey(userId), collection);
}

async function getDoujinCollection(userId) {
    const stored = (await keyv.get(getCollectionKey(userId))) ?? { doujins: [] };
    const { collection, changed } = sanitizeCollection(stored);
    if (changed) {
        await saveDoujinCollection(userId, collection);
    }

    return collection;
}

async function addDoujinToCollection(userId, doujin) {
    const collection = await getDoujinCollection(userId);
    const existingDoujin = collection.doujins.find((entry) => entry.id === doujin.id);
    if (existingDoujin) {
        return { added: false, collection, doujin: existingDoujin };
    }

    collection.doujins.push(doujin);
    await saveDoujinCollection(userId, collection);
    return { added: true, collection, doujin };
}

async function getOwnersForDoujinIds(doujinIds) {
    const wanted = new Set(doujinIds.map((doujinId) => normalizeDoujinId(doujinId)));
    const ownersByDoujinId = Object.fromEntries([...wanted].map((doujinId) => [doujinId, []]));
    const iterator = keyv.iterator();

    for await (const [key, value] of iterator) {
        if (!key.startsWith(DOUJIN_COLLECTION_PREFIX)) {
            continue;
        }

        const userId = key.slice(DOUJIN_COLLECTION_PREFIX.length);
        const rawCollection = value?.doujins ? value : typeof value === "string" ? JSON.parse(value) : null;
        const { collection } = sanitizeCollection(rawCollection);
        for (const doujin of collection.doujins) {
            if (wanted.has(doujin.id)) {
                ownersByDoujinId[doujin.id].push(userId);
            }
        }
    }

    return ownersByDoujinId;
}

async function isDoujinClaimed(doujinId) {
    const normalizedId = normalizeDoujinId(doujinId);
    const owners = await getOwnersForDoujinIds([normalizedId]);
    return (owners[normalizedId]?.length ?? 0) > 0;
}

function createDoujinCollectionEmbed(user, collection) {
    const visibleDoujins = collection.doujins.slice(0, MAX_DOUJIN_RESULTS);
    const description = visibleDoujins.length > 0
        ? visibleDoujins.map((doujin, index) => {
            const artistText = doujin.artists.length > 0 ? ` • ${doujin.artists.join(", ")}` : "";
            return `**${index + 1}.** ${doujin.title}\n\`#${doujin.id}\`${artistText}`;
        }).join("\n\n")
        : "Essa colecao de doujins ainda esta vazia.";

    const embed = new EmbedBuilder()
        .setColor(Colors.DarkRed)
        .setAuthor({ name: `${user.username} - Harem de Doujins` })
        .setTitle(`${collection.doujins.length} doujin(s)`)
        .setDescription(description)
        .setFooter({ text: "Use /random para capturar um doujin" })
        .setTimestamp();

    if (collection.doujins[0]?.imageUrl) {
        embed.setThumbnail(collection.doujins[0].imageUrl);
    }

    if (collection.doujins.length > visibleDoujins.length) {
        embed.addFields({
            name: "Continuacao",
            value: `... e mais ${collection.doujins.length - visibleDoujins.length} doujin(s).`,
            inline: false,
        });
    }

    return embed;
}

function createDoujinCollectionCarouselEmbed(user, collection, index = 0) {
    const doujin = collection.doujins[index];
    if (!doujin) {
        return new EmbedBuilder()
            .setColor(Colors.DarkGrey)
            .setAuthor({ name: `${user.username} - Harem de Doujins` })
            .setTitle("Colecao vazia")
            .setDescription("Use /random para capturar o primeiro doujin.")
            .setTimestamp();
    }

    return new EmbedBuilder()
        .setColor(Colors.DarkRed)
        .setAuthor({ name: `${user.username} - Harem de Doujins` })
        .setTitle(doujin.title)
        .setURL(doujin.url)
        .setDescription(doujin.characters.length > 0 ? `Personagens: ${doujin.characters.slice(0, 5).join(" • ")}` : "Sem personagens listados.")
        .addFields(
            { name: "ID", value: `\`#${doujin.id}\``, inline: true },
            { name: "Likes", value: `${doujin.favorites}`, inline: true },
            { name: "Posicao", value: `${index + 1}/${collection.doujins.length}`, inline: true },
            { name: "Artistas", value: doujin.artists.join(", ") || "Desconhecido", inline: false },
        )
        .setImage(doujin.imageUrl)
        .setFooter({ text: "Colecao de doujins" })
        .setTimestamp();
}

function createDoujinCollectionActionRow(index, total) {
    const hasDoujins = total > 0;
    const previousIndex = total > 0 ? (index - 1 + total) % total : 0;
    const nextIndex = total > 0 ? (index + 1) % total : 0;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`harem_carousel:prev:${previousIndex}`)
            .setLabel("Anterior")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasDoujins),
        new ButtonBuilder()
            .setCustomId(`harem_carousel:next:${nextIndex}`)
            .setLabel("Proximo")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasDoujins),
    );
}

module.exports = {
    addDoujinToCollection,
    buildDoujinEntry,
    createDoujinCollectionActionRow,
    createDoujinCollectionCarouselEmbed,
    createDoujinCollectionEmbed,
    getDoujinCollection,
    getOwnersForDoujinIds,
    isDoujinClaimed,
};
