const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } = require("discord.js");
const nhentai = require("nhentai");

const api = new nhentai.API();
const MAX_CHARACTER_RESULTS = 10;
const MAX_WORK_RESULTS = 10;
const MAX_SEARCH_PAGES = 3;
const MAX_NSFW_IMAGES = 10;
const MAX_SFW_IMAGES = 10;
const NHENTAI_ICON = "https://nhentai.net/static/favicon-32x32.png";
const IM_CAROUSEL_PREFIX = "im_carousel:";
const JIKAN_API_BASE = "https://api.jikan.moe/v4";
let config = {};

try {
    config = require("./../config.json");
} catch {
    config = {};
}

function normalizeQuery(value) {
    return value.trim().toLowerCase();
}

function normalizeImageUrl(url) {
    if (!url || typeof url !== "string") {
        return null;
    }

    const normalizedValue = url
        .replace(/&amp;/g, "&")
        .replace(/&#039;/g, "'")
        .trim();

    if (normalizedValue.startsWith("//")) {
        return `https:${normalizedValue}`;
    }

    if (normalizedValue.startsWith("http://")) {
        return `https://${normalizedValue.slice("http://".length)}`;
    }

    if (normalizedValue.startsWith("/")) {
        return `https://gelbooru.com${normalizedValue}`;
    }

    return normalizedValue;
}

function isEmbeddableImageUrl(url) {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((extension) => pathname.endsWith(extension));
    } catch {
        return false;
    }
}

function getGelbooruImageCandidates(post) {
    const candidates = [
        normalizeImageUrl(post.sample_url || null),
        normalizeImageUrl(post.file_url || null),
        normalizeImageUrl(post.preview_url || null),
    ].filter(Boolean);

    const embeddableCandidates = candidates.filter((candidate) => isEmbeddableImageUrl(candidate));
    return embeddableCandidates.length > 0 ? embeddableCandidates : candidates;
}

function extensionFromContentType(contentType) {
    if (!contentType) {
        return "jpg";
    }

    if (contentType.includes("png")) return "png";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("webp")) return "webp";
    return "jpg";
}

async function buildImageAttachment(imageInput, basename = "im-image") {
    const candidates = Array.isArray(imageInput) ? imageInput.filter(Boolean) : [imageInput].filter(Boolean);
    if (candidates.length === 0) {
        console.log(`[IM] No image URL available for attachment (${basename}).`);
        return null;
    }

    for (const imageUrl of candidates) {
        try {
            console.log(`[IM] Downloading image attachment from: ${imageUrl}`);
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Image request failed with status ${response.status}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const contentType = response.headers.get("content-type") ?? "";
            console.log(`[IM] Download success: status=${response.status} content-type=${contentType} size=${buffer.length}`);

            if (!contentType.startsWith("image/")) {
                console.log(`[IM] Skipping non-image response for ${imageUrl}`);
                continue;
            }

            const extension = extensionFromContentType(contentType);
            const filename = `${basename}.${extension}`;

            return new AttachmentBuilder(buffer, { name: filename });
        } catch (error) {
            console.error("Failed to fetch remote image attachment:", error);
        }
    }

    return null;
}

function buildCharacterTagVariants(characterName) {
    const normalized = characterName
        .normalize("NFKD")
        .replace(/[^\w\s,-]/g, "")
        .trim()
        .toLowerCase();

    const variants = new Set();
    variants.add(normalized.replace(/\s+/g, "_"));
    variants.add(normalized.replace(/,\s*/g, "_").replace(/\s+/g, "_"));
    variants.add(normalized.replace(/,\s*/g, " ").replace(/\s+/g, "_"));
    variants.add(normalized.replace(/[()]/g, "").replace(/\s+/g, "_"));

    return [...variants].filter(Boolean);
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

function getDoujinTitle(doujin) {
    return doujin.titles.english || doujin.titles.pretty || doujin.titles.japanese || `Obra #${doujin.id}`;
}

function scoreCharacterMatch(name, query) {
    const normalizedName = normalizeQuery(name);
    if (normalizedName === query) {
        return 4;
    }

    if (normalizedName.startsWith(query)) {
        return 3;
    }

    if (normalizedName.includes(query)) {
        return 2;
    }

    const queryParts = query.split(/\s+/).filter(Boolean);
    if (queryParts.every((part) => normalizedName.includes(part))) {
        return 1;
    }

    return 0;
}

async function searchCharacters(query) {
    const normalizedQuery = normalizeQuery(query);
    const firstPage = await api.search(query).catch(console.error);
    if (!firstPage) {
        return [];
    }

    const pagesToRead = Math.min(firstPage.numPages, MAX_SEARCH_PAGES);
    const allDoujins = [...firstPage.doujins];

    for (let page = 2; page <= pagesToRead; page += 1) {
        const nextPage = await api.search(query, { page }).catch(console.error);
        if (!nextPage) {
            continue;
        }

        allDoujins.push(...nextPage.doujins);
    }

    const characterMap = new Map();
    for (const doujin of allDoujins) {
        const characters = doujin?.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [];
        for (const characterName of characters) {
            const score = scoreCharacterMatch(characterName, normalizedQuery);
            if (score === 0) {
                continue;
            }

            const key = normalizeQuery(characterName);
            const entry = characterMap.get(key) ?? {
                name: characterName,
                score,
                works: [],
            };

            entry.score = Math.max(entry.score, score);
            if (!entry.works.find((work) => work.id === doujin.id)) {
                entry.works.push({
                    id: doujin.id,
                    title: getDoujinTitle(doujin),
                    url: doujin.url,
                    imageUrl: doujin.cover.url,
                });
            }

            characterMap.set(key, entry);
        }
    }

    return [...characterMap.values()]
        .sort((a, b) => (b.score - a.score) || (b.works.length - a.works.length) || a.name.localeCompare(b.name))
        .slice(0, MAX_CHARACTER_RESULTS);
}

async function searchWorks(query) {
    const result = await api.search(query).catch(console.error);
    if (!result) {
        return [];
    }

    return result.doujins.slice(0, MAX_WORK_RESULTS).map((doujin) => ({
        id: doujin.id,
        title: getDoujinTitle(doujin),
        url: doujin.url,
        favorites: doujin.favorites,
        characters: doujin?.tags?.characters?.map((value) => value.name).filter(Boolean) ?? [],
        imageUrl: doujin.cover.url,
    }));
}

async function getCharacterImageCarousel(characterName) {
    const nsfwCarousel = await getNsfwCharacterImageCarousel(characterName);
    try {
        const searchResponse = await fetchJson(`${JIKAN_API_BASE}/characters?q=${encodeURIComponent(characterName)}&limit=10`);
        const candidates = Array.isArray(searchResponse?.data) ? searchResponse.data : [];
        if (candidates.length === 0) {
            return nsfwCarousel;
        }

        const normalizedName = normalizeQuery(characterName);
        const bestMatch = candidates.find((candidate) => normalizeQuery(candidate.name) === normalizedName)
            ?? candidates.find((candidate) => normalizeQuery(candidate.name).includes(normalizedName))
            ?? candidates[0];

        if (!bestMatch?.mal_id) {
            return null;
        }

        const picturesResponse = await fetchJson(`${JIKAN_API_BASE}/characters/${bestMatch.mal_id}/pictures`);
        const pictures = Array.isArray(picturesResponse?.data) ? picturesResponse.data : [];
        const imageUrls = [];

        const mainImage = bestMatch.images?.jpg?.image_url ?? bestMatch.images?.webp?.image_url ?? null;
        if (mainImage) {
            imageUrls.push(mainImage);
        }

        for (const picture of pictures) {
            const imageUrl = picture?.jpg?.image_url ?? picture?.webp?.image_url ?? null;
            if (imageUrl && !imageUrls.includes(imageUrl)) {
                imageUrls.push(imageUrl);
            }
        }

        if (imageUrls.length === 0) {
            return nsfwCarousel;
        }

        const sfwCarousel = {
            source: "Jikan",
            profileUrl: bestMatch.url,
            imageUrls: imageUrls.slice(0, MAX_SFW_IMAGES),
            imageCandidates: imageUrls.slice(0, MAX_SFW_IMAGES).map((imageUrl) => [imageUrl]),
            displayName: bestMatch.name,
            nsfw: false,
        };

        if (!nsfwCarousel) {
            return sfwCarousel;
        }

        return {
            source: "Gelbooru + Jikan",
            profileUrl: nsfwCarousel.profileUrl ?? sfwCarousel.profileUrl,
            imageUrls: [
                ...nsfwCarousel.imageUrls.slice(0, MAX_NSFW_IMAGES),
                ...sfwCarousel.imageUrls.slice(0, MAX_SFW_IMAGES),
            ],
            imageCandidates: [
                ...nsfwCarousel.imageCandidates.slice(0, MAX_NSFW_IMAGES),
                ...sfwCarousel.imageCandidates.slice(0, MAX_SFW_IMAGES),
            ],
            displayName: nsfwCarousel.displayName ?? sfwCarousel.displayName,
            nsfw: true,
            mixedSources: ["Gelbooru", "Jikan"],
        };
    } catch (error) {
        console.error("Failed to fetch character images:", error);
        return nsfwCarousel;
    }
}

async function searchGelbooruByTag(tag) {
    try {
        console.log(`[Gelbooru] Searching posts with tag="${tag}"`);
        const url = new URL("https://gelbooru.com/index.php");
        url.searchParams.set("page", "dapi");
        url.searchParams.set("s", "post");
        url.searchParams.set("q", "index");
        url.searchParams.set("json", "1");
        url.searchParams.set("limit", "20");
        url.searchParams.set("pid", "0");
        url.searchParams.set("tags", tag);
        if (config.gelbooru_api_key && config.gelbooru_user_id) {
            url.searchParams.set("api_key", config.gelbooru_api_key);
            url.searchParams.set("user_id", config.gelbooru_user_id);
        }

        const response = await fetchJson(url.toString());
        const posts = Array.isArray(response?.post) ? response.post : Array.isArray(response) ? response : [];
        console.log(`[Gelbooru] Received ${posts.length} posts for tag="${tag}"`);
        if (posts[0]) {
            console.log("[Gelbooru] First post URLs:", {
                id: posts[0].id,
                file_url: posts[0].file_url ?? null,
                sample_url: posts[0].sample_url ?? null,
                preview_url: posts[0].preview_url ?? null,
                rating: posts[0].rating ?? null,
            });
        }
        return posts.map((post) => {
            const imageCandidates = getGelbooruImageCandidates(post);
            if (imageCandidates.length > 0) {
                console.log(`[Gelbooru] Chosen image candidates for post ${post.id}: ${imageCandidates.join(" | ")}`);
            }

            return {
                imageUrl: imageCandidates[0] ?? null,
                imageCandidates,
                postUrl: `https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`,
                source: "Gelbooru",
                rating: post.rating ?? null,
            };
        }).filter((post) => post.imageUrl);
    } catch (error) {
        if (!String(error?.message ?? "").includes("401")) {
            console.error("Failed to fetch Gelbooru images:", error);
        }
        return [];
    }
}

async function getNsfwCharacterImageCarousel(characterName) {
    const searchTags = buildCharacterTagVariants(characterName);
    console.log(`[Gelbooru] Character "${characterName}" tag variants: ${searchTags.join(", ")}`);
    const seenImages = new Set();
    const images = [];

    for (const tag of searchTags) {
        const providers = [
            await searchGelbooruByTag(tag),
        ];

        for (const providerPosts of providers) {
            for (const post of providerPosts) {
                if (seenImages.has(post.imageUrl)) {
                    continue;
                }

                seenImages.add(post.imageUrl);
                images.push(post);
            }
        }

        if (images.length >= MAX_NSFW_IMAGES) {
            break;
        }
    }

    console.log(`[Gelbooru] Total NSFW images collected for "${characterName}": ${images.length}`);
    if (images.length === 0) {
        return null;
    }

    return {
        source: images[0].source,
        profileUrl: images[0].postUrl,
        imageUrls: images.slice(0, MAX_NSFW_IMAGES).map((image) => image.imageUrl),
        imageCandidates: images.slice(0, MAX_NSFW_IMAGES).map((image) => image.imageCandidates ?? [image.imageUrl]),
        imageLinks: images.map((image) => image.postUrl),
        displayName: characterName,
        nsfw: true,
    };
}

async function isLikelyCharacterQuery(query) {
    const results = await searchCharacters(query);
    if (results.length === 0) {
        return false;
    }

    const normalizedQuery = normalizeQuery(query);
    const topResult = results[0];
    const normalizedName = normalizeQuery(topResult.name);
    return normalizedName === normalizedQuery || normalizedName.startsWith(normalizedQuery);
}

function createCharacterSearchEmbed(query, results, currentImageIndex = 0, characterImageCarousel = null, attachmentName = null) {
    if (results.length === 0) {
        return new EmbedBuilder()
            .setColor(Colors.Orange)
            .setAuthor({ name: "Pesquisa de Personagem", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
            .setTitle("Nenhum personagem encontrado")
            .setDescription(`Nao encontrei personagens para **${query}**.`)
            .setFooter({ text: "Tente outro nome ou uma pesquisa mais curta", iconURL: NHENTAI_ICON })
            .setTimestamp();
    }

    const topResult = results[0];
    const topWork = topResult.works[currentImageIndex] ?? topResult.works[0];
    const usingCharacterImages = characterImageCarousel && characterImageCarousel.imageUrls.length > 0;
    const currentImageUrl = usingCharacterImages
        ? characterImageCarousel.imageUrls[currentImageIndex] ?? characterImageCarousel.imageUrls[0]
        : topWork?.imageUrl;
    const embed = new EmbedBuilder()
        .setColor(0xe84aa6)
        .setAuthor({ name: "Resultados IM", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
        .setTitle(`Personagens encontrados para "${query}"`)
        .setDescription(results.map((result, index) => {
            const works = result.works.slice(0, 2).map((work) => `[\`${work.id}\` ${work.title}](${work.url})`).join("\n");
            const extraWorks = result.works.length > 2 ? `\n+${result.works.length - 2} obra(s)` : "";
            return `\`${index + 1}.\` **${result.name}**\n${works || "_sem obra listada_"}${extraWorks}`;
        }).join("\n\n"))
        .addFields({
            name: "Melhor match",
            value: topWork ? `[${topResult.name}](${topWork.url})` : topResult.name,
            inline: false,
        }, {
            name: "Fonte das imagens",
            value: usingCharacterImages
                ? characterImageCarousel.mixedSources
                    ? `${characterImageCarousel.mixedSources.join(" + ")}`
                    : `[${characterImageCarousel.source}](${characterImageCarousel.profileUrl})`
                : "Capas de obras relacionadas",
            inline: false,
        }, {
            name: "Tipo",
            value: usingCharacterImages
                ? (characterImageCarousel.nsfw ? "Imagens NSFW do personagem" : "Imagens gerais do personagem")
                : "Capas das obras encontradas",
            inline: false,
        })
        .setFooter({
            text: usingCharacterImages
                ? `${results.length} resultado(s) • imagem ${Math.min(currentImageIndex + 1, characterImageCarousel.imageUrls.length)}/${characterImageCarousel.imageUrls.length}`
                : topResult.works.length > 0
                    ? `${results.length} resultado(s) • obra ${Math.min(currentImageIndex + 1, topResult.works.length)}/${topResult.works.length}`
                : `${results.length} resultado(s) • estilo IM`,
            iconURL: NHENTAI_ICON,
        })
        .setTimestamp();

    if (attachmentName) {
        embed.setImage(`attachment://${attachmentName}`);
    } else if (currentImageUrl) {
        embed.setImage(currentImageUrl);
    }

    return embed;
}

function createWorkSearchEmbed(query, results) {
    if (results.length === 0) {
        return new EmbedBuilder()
            .setColor(Colors.Orange)
            .setAuthor({ name: "Pesquisa de Obra", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
            .setTitle("Nenhuma obra encontrada")
            .setDescription(`Nao encontrei obras para **${query}**.`)
            .setFooter({ text: "Tente outro titulo ou menos palavras", iconURL: NHENTAI_ICON })
            .setTimestamp();
    }

    const topResult = results[0];
    return new EmbedBuilder()
        .setColor(0x4ab4e8)
        .setAuthor({ name: "Resultados IMA", iconURL: NHENTAI_ICON, url: "https://nhentai.net/" })
        .setTitle(`Obras encontradas para "${query}"`)
        .setDescription(results.map((result, index) => {
            const characterList = result.characters.slice(0, 3).join(", ");
            const extraCharacters = result.characters.length > 3 ? ` +${result.characters.length - 3}` : "";
            return `\`${index + 1}.\` **[${result.title}](${result.url})**\n\`#${result.id}\` • Likes **${result.favorites}**${characterList ? `\n${characterList}${extraCharacters}` : ""}`;
        }).join("\n\n"))
        .setThumbnail(topResult.imageUrl)
        .setFooter({ text: `${results.length} resultado(s) • estilo IMA`, iconURL: NHENTAI_ICON })
        .setTimestamp();
}

module.exports = {
    createCharacterSearchEmbed,
    createCharacterSearchCarouselActionRow(totalImages, currentImageIndex = 0) {
        const previousIndex = totalImages > 0 ? (currentImageIndex - 1 + totalImages) % totalImages : 0;
        const nextIndex = totalImages > 0 ? (currentImageIndex + 1) % totalImages : 0;

        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`${IM_CAROUSEL_PREFIX}prev:${previousIndex}`)
                .setLabel("Anterior")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(totalImages <= 1),
            new ButtonBuilder()
                .setCustomId(`${IM_CAROUSEL_PREFIX}next:${nextIndex}`)
                .setLabel("Proxima obra")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(totalImages <= 1),
        );
    },
    buildImageAttachment,
    createWorkSearchEmbed,
    getCharacterImageCarousel,
    IM_CAROUSEL_PREFIX,
    isLikelyCharacterQuery,
    searchCharacters,
    searchWorks,
};
