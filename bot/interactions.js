const { Collection, Events } = require("discord.js");
const {
    CLAIM_CHARACTER_PREFIX,
    CLAIM_DURATION_SECONDS,
    createDisabledClaimActionRow,
    createClaimExpiredEmbed,
    createClaimResultEmbed,
    createClaimUnavailableEmbed,
} = require("../modules/Character");
const {
    HAREM_CAROUSEL_PREFIX,
    addCharacterToHarem,
    createHaremCarouselActionRow,
    createHaremCarouselEmbed,
    getHarem,
    isCharacterClaimed,
} = require("../modules/Harem");
const { canUserMarry, createMarriageCooldownEmbed, registerMarriage } = require("../modules/Marriage");
const {
    buildImageAttachment,
    IM_CAROUSEL_PREFIX,
    createCharacterSearchCarouselActionRow,
    createCharacterSearchEmbed,
} = require("../modules/Search");
const {
    createHelperClaimedEmbed,
    createHelperExpiredEmbed,
    HELPER_DROP_DURATION_SECONDS,
    HELPER_REACTION_EMOJI,
    recordHelperCollection,
} = require("../modules/Helper");
const { addCoins } = require("../modules/Market");

function createInteractionManager(client, sessions) {
    function registerCharacterClaim(message, characterId) {
        const expiresAt = Date.now() + (CLAIM_DURATION_SECONDS * 1000);
        const timeout = setTimeout(async () => {
            const currentClaim = sessions.characterClaims.get(message.id);
            if (!currentClaim || currentClaim.expiresAt !== expiresAt || currentClaim.claimedBy) {
                return;
            }

            sessions.characterClaims.delete(message.id);
            try {
                const currentEmbed = message.embeds[0];
                await message.edit({
                    content: null,
                    embeds: currentEmbed ? [createClaimExpiredEmbed(currentEmbed)] : [],
                    components: [createDisabledClaimActionRow(characterId)],
                });
            } catch (error) {
                console.error("Failed to expire character claim:", error);
            }
        }, CLAIM_DURATION_SECONDS * 1000);

        sessions.characterClaims.set(message.id, {
            characterId,
            expiresAt,
            timeout,
            claimedBy: null,
        });
    }

    function registerCommandResult(result) {
        if (result?.claimCharacterId && result?.message) {
            registerCharacterClaim(result.message, result.claimCharacterId);
        }

        if (result?.helperDrop?.message && result?.helperDrop?.reward) {
            registerHelperDrop(result.helperDrop.message, result.helperDrop.reward);
        }

        if (result?.haremCarousel?.message && result?.haremCarousel?.ownerId) {
            sessions.haremCarousels.set(result.haremCarousel.message.id, {
                ownerId: result.haremCarousel.ownerId,
            });
        }

        if (result?.imCarousel?.message && result?.imCarousel?.ownerId) {
            sessions.imCarousels.set(result.imCarousel.message.id, {
                ownerId: result.imCarousel.ownerId,
                query: result.imCarousel.query,
                results: result.imCarousel.results,
                characterImageCarousel: result.imCarousel.characterImageCarousel,
            });
        }
    }

    function registerHelperDrop(message, reward) {
        const expiresAt = Date.now() + (HELPER_DROP_DURATION_SECONDS * 1000);
        const timeout = setTimeout(async () => {
            const currentDrop = sessions.helperDrops.get(message.id);
            if (!currentDrop || currentDrop.expiresAt !== expiresAt || currentDrop.claimedBy) {
                return;
            }

            sessions.helperDrops.delete(message.id);
            try {
                const currentEmbed = message.embeds[0];
                await message.edit({
                    embeds: currentEmbed ? [createHelperExpiredEmbed(currentEmbed)] : [],
                });
            } catch (error) {
                console.error("Failed to expire helper drop:", error);
            }
        }, HELPER_DROP_DURATION_SECONDS * 1000);

        sessions.helperDrops.set(message.id, {
            claimedBy: null,
            expiresAt,
            reward,
            timeout,
        });

        message.react(HELPER_REACTION_EMOJI).catch((error) => {
            console.error("Failed to react to helper drop message:", error);
        });
    }

    async function handleHaremCarouselInteraction(interaction) {
        const session = sessions.haremCarousels.get(interaction.message.id);
        if (!session) {
            await interaction.reply({ content: "Esse carrossel nao esta mais disponivel." });
            return true;
        }

        if (session.ownerId !== interaction.user.id) {
            await interaction.reply({ content: "Apenas quem abriu este harem pode navegar por ele." });
            return true;
        }

        const [, , rawIndex] = interaction.customId.split(":");
        const harem = await getHarem(interaction.user.id);
        const index = Number.parseInt(rawIndex, 10);
        const safeIndex = Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), Math.max(harem.characters.length - 1, 0));

        await interaction.update({
            embeds: [createHaremCarouselEmbed(interaction.user, harem, safeIndex)],
            components: [createHaremCarouselActionRow(safeIndex, harem.characters.length)],
        });
        return true;
    }

    async function handleImCarouselInteraction(interaction) {
        const session = sessions.imCarousels.get(interaction.message.id);
        if (!session) {
            await interaction.reply({ content: "Esse carrossel de pesquisa nao esta mais disponivel." });
            return true;
        }

        if (session.ownerId !== interaction.user.id) {
            await interaction.reply({ content: "Apenas quem abriu esta pesquisa pode navegar nas imagens." });
            return true;
        }

        const [, , rawIndex] = interaction.customId.split(":");
        const totalImages = session.characterImageCarousel?.imageUrls?.length ?? session.results[0]?.works?.length ?? 0;
        const index = Number.parseInt(rawIndex, 10);
        const safeIndex = Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), Math.max(totalImages - 1, 0));
        const imageCandidates = session.characterImageCarousel?.imageCandidates?.[safeIndex]
            ?? session.characterImageCarousel?.imageUrls?.[safeIndex]
            ?? null;
        const imageAttachment = await buildImageAttachment(imageCandidates, `im-image-${safeIndex}`);

        await interaction.update({
            embeds: [createCharacterSearchEmbed(
                session.query,
                session.results,
                safeIndex,
                session.characterImageCarousel,
                imageAttachment?.name ?? null,
            )],
            components: [createCharacterSearchCarouselActionRow(totalImages, safeIndex)],
            files: imageAttachment ? [imageAttachment] : [],
        });
        return true;
    }

    async function lockCharacterClaim(interaction, characterId) {
        const claim = sessions.characterClaims.get(interaction.message.id);
        if (!claim || claim.characterId !== characterId) {
            await interaction.reply({
                embeds: [createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse personagem nao esta mais disponivel para captura.")],
            });
            return null;
        }

        if (claim.expiresAt <= Date.now()) {
            clearTimeout(claim.timeout);
            sessions.characterClaims.delete(interaction.message.id);
            const currentEmbed = interaction.message.embeds[0];
            await interaction.update({
                content: null,
                embeds: currentEmbed ? [createClaimExpiredEmbed(currentEmbed)] : [],
                components: [createDisabledClaimActionRow(characterId)],
            });
            return null;
        }

        if (claim.claimedBy) {
            await interaction.reply({
                embeds: [createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse personagem ja foi capturado por outra pessoa.")],
            });
            return null;
        }

        claim.claimedBy = interaction.user.id;
        clearTimeout(claim.timeout);
        return claim;
    }

    async function handleCharacterClaim(interaction) {
        const characterId = interaction.customId.slice(CLAIM_CHARACTER_PREFIX.length);
        const marriageCheck = await canUserMarry(interaction.user.id);
        if (!marriageCheck.allowed) {
            await interaction.reply({
                embeds: [createMarriageCooldownEmbed(interaction.user, marriageCheck.nextSlotAt)],
            });
            return true;
        }

        if (await isCharacterClaimed(characterId)) {
            await interaction.reply({
                embeds: [createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse personagem ja pertence ao harem de alguem e nao pode ser capturado novamente.")],
            });
            return true;
        }

        const claim = await lockCharacterClaim(interaction, characterId);
        if (!claim) {
            return true;
        }

        const embed = interaction.message.embeds[0];
        const sourceUrl = embed?.url;
        const imageUrl = embed?.image?.url;
        const sourceId = characterId.split(":")[0];
        const sourceTitle = (embed?.fields ?? []).find((field) => field.name === "Doujin")?.value?.replace(/^\[(.*)\]\(.*\)$/, "$1");
        const characterName = embed?.title;

        if (!characterName || !sourceUrl || !imageUrl || !sourceId || !sourceTitle) {
            sessions.characterClaims.delete(interaction.message.id);
            await interaction.update({
                content: null,
                embeds: embed ? [createClaimUnavailableEmbed(embed)] : [],
                components: [createDisabledClaimActionRow(characterId, "Captura indisponivel")],
            });
            return true;
        }

        const result = await addCharacterToHarem(interaction.user.id, {
            id: characterId,
            name: characterName,
            sourceId,
            sourceTitle,
            sourceUrl,
            imageUrl,
            claimedAt: new Date().toISOString(),
        });

        if (result.added) {
            await registerMarriage(interaction.user.id, result.character);
        }

        sessions.characterClaims.delete(interaction.message.id);
        await interaction.update({
            content: null,
            embeds: [createClaimResultEmbed({
                character: result.character,
                user: interaction.user,
                alreadyOwned: !result.added,
            })],
            components: [createDisabledClaimActionRow(characterId, "Personagem capturado")],
        });
        return true;
    }

    async function handleHelperReaction(reaction, user) {
        if (user.bot || reaction.emoji.name !== HELPER_REACTION_EMOJI) {
            return false;
        }

        if (reaction.partial) {
            await reaction.fetch();
        }

        if (reaction.message?.partial) {
            await reaction.message.fetch();
        }

        const helperDrop = sessions.helperDrops.get(reaction.message.id);
        if (!helperDrop) {
            return false;
        }

        if (helperDrop.expiresAt <= Date.now()) {
            clearTimeout(helperDrop.timeout);
            sessions.helperDrops.delete(reaction.message.id);
            const currentEmbed = reaction.message.embeds[0];
            await reaction.message.edit({
                embeds: currentEmbed ? [createHelperExpiredEmbed(currentEmbed)] : [],
            });
            return true;
        }

        if (helperDrop.claimedBy) {
            return true;
        }

        helperDrop.claimedBy = user.id;
        clearTimeout(helperDrop.timeout);

        const balance = await addCoins(user.id, helperDrop.reward);
        await recordHelperCollection(user.id, helperDrop.reward);
        sessions.helperDrops.delete(reaction.message.id);

        await reaction.message.edit({
            embeds: [createHelperClaimedEmbed(reaction.message.embeds[0], {
                user,
                reward: helperDrop.reward,
                balance,
            })],
        });

        return true;
    }

    async function handleButtonInteraction(interaction) {
        if (interaction.customId.startsWith(IM_CAROUSEL_PREFIX)) {
            return handleImCarouselInteraction(interaction);
        }

        if (interaction.customId.startsWith(HAREM_CAROUSEL_PREFIX)) {
            return handleHaremCarouselInteraction(interaction);
        }

        if (interaction.customId.startsWith(CLAIM_CHARACTER_PREFIX)) {
            return handleCharacterClaim(interaction);
        }

        return false;
    }

    async function handleCommandInteraction(interaction) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        const result = await command.execute(interaction);
        registerCommandResult(result);
    }

    function registerClientInteractionHandler() {
        client.on(Events.InteractionCreate, async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await handleButtonInteraction(interaction);
                    return;
                }

                if (interaction.isChatInputCommand()) {
                    await handleCommandInteraction(interaction);
                }
            } catch (error) {
                console.error(error);
            }
        });

        client.on(Events.MessageReactionAdd, async (reaction, user) => {
            try {
                await handleHelperReaction(reaction, user);
            } catch (error) {
                console.error(error);
            }
        });
    }

    return {
        registerClientInteractionHandler,
    };
}

function attachCommands(client, commands) {
    client.commands = new Collection();
    for (const command of commands) {
        client.commands.set(command.data.name, command);
    }
}

module.exports = {
    attachCommands,
    createInteractionManager,
};
