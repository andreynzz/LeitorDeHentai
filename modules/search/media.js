const { AttachmentBuilder } = require("discord.js");
const { config } = require("../../lib/config");
const { JIKAN_API_BASE, MAX_NSFW_IMAGES, MAX_SFW_IMAGES } = require("./constants");

function normalizeQuery(value) {
    return value.trim().toLowerCase();
}

function normalizeImageUrl(url) {
    if (!url || typeof url !== "string") {
        return null;
    }

    const normalizedValue = url.replace(/&amp;/g, "&").replace(/&#039;/g, "'").trim();
    if (normalizedValue.startsWith("//")) return `https:${normalizedValue}`;
    if (normalizedValue.startsWith("http://")) return `https://${normalizedValue.slice("http://".length)}`;
    if (normalizedValue.startsWith("/")) return `https://gelbooru.com${normalizedValue}`;
    return normalizedValue;
}

function isEmbeddableImageUrl(url) {
    if (!url) return false;
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
    if (!contentType) return "jpg";
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

            return new AttachmentBuilder(buffer, { name: `${basename}.${extensionFromContentType(contentType)}` });
        } catch (error) {
            console.error("Failed to fetch remote image attachment:", error);
        }
    }

    return null;
}

function buildCharacterTagVariants(characterName) {
    const normalized = characterName.normalize("NFKD").replace(/[^\w\s,-]/g, "").trim().toLowerCase();
    return [...new Set([
        normalized.replace(/\s+/g, "_"),
        normalized.replace(/,\s*/g, "_").replace(/\s+/g, "_"),
        normalized.replace(/,\s*/g, " ").replace(/\s+/g, "_"),
        normalized.replace(/[()]/g, "").replace(/\s+/g, "_"),
    ])].filter(Boolean);
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
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
        return posts.map((post) => ({
            imageUrl: getGelbooruImageCandidates(post)[0] ?? null,
            imageCandidates: getGelbooruImageCandidates(post),
            postUrl: `https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`,
            source: "Gelbooru",
            rating: post.rating ?? null,
        })).filter((post) => post.imageUrl);
    } catch (error) {
        if (!String(error?.message ?? "").includes("401")) {
            console.error("Failed to fetch Gelbooru images:", error);
        }
        return [];
    }
}

async function getNsfwCharacterImageCarousel(characterName) {
    const searchTags = buildCharacterTagVariants(characterName);
    const seenImages = new Set();
    const images = [];

    for (const tag of searchTags) {
        for (const post of await searchGelbooruByTag(tag)) {
            if (seenImages.has(post.imageUrl)) {
                continue;
            }

            seenImages.add(post.imageUrl);
            images.push(post);
        }

        if (images.length >= MAX_NSFW_IMAGES) {
            break;
        }
    }

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
            imageUrls: [...nsfwCarousel.imageUrls.slice(0, MAX_NSFW_IMAGES), ...sfwCarousel.imageUrls.slice(0, MAX_SFW_IMAGES)],
            imageCandidates: [...nsfwCarousel.imageCandidates.slice(0, MAX_NSFW_IMAGES), ...sfwCarousel.imageCandidates.slice(0, MAX_SFW_IMAGES)],
            displayName: nsfwCarousel.displayName ?? sfwCarousel.displayName,
            nsfw: true,
            mixedSources: ["Gelbooru", "Jikan"],
        };
    } catch (error) {
        console.error("Failed to fetch character images:", error);
        return nsfwCarousel;
    }
}

module.exports = {
    buildCharacterTagVariants,
    buildImageAttachment,
    fetchJson,
    getCharacterImageCarousel,
    normalizeQuery,
};
