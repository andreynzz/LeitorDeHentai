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
const {
    addDoujinToCollection,
    buildDoujinEntry,
    createDoujinCollectionActionRow,
    createDoujinCollectionCarouselEmbed,
    getDoujinCollection,
    isDoujinClaimed,
} = require("../modules/DoujinCollection");
const {
    CLAIM_DOUJIN_PREFIX,
    DOUJIN_CLAIM_DURATION_SECONDS,
    createDisabledDoujinClaimActionRow,
    createDoujinClaimExpiredEmbed,
    createDoujinClaimResultEmbed,
    createDoujinClaimUnavailableEmbed,
} = require("../modules/DoujinCollectionClaim");
const {
    canUserClaimDoujin,
    createDoujinMarriageCooldownEmbed,
    registerDoujinMarriage,
} = require("../modules/DoujinMarriage");
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
    recordHelperCollection,
} = require("../modules/Helper");
const { addCoins } = require("../modules/Market");

function createInteractionManager(client, sessions) {
    function registerCharacterClaim(message, character) {
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
                    components: [createDisabledClaimActionRow(character.id, "Tempo expirado")],
                });
            } catch (error) {
                console.error("Failed to expire character claim:", error);
            }
        }, CLAIM_DURATION_SECONDS * 1000);

        sessions.characterClaims.set(message.id, {
            character,
            characterId: character.id,
            expiresAt,
            timeout,
            claimedBy: null,
        });
    }

    function registerDoujinClaim(message, doujin) {
        const expiresAt = Date.now() + (DOUJIN_CLAIM_DURATION_SECONDS * 1000);
        const timeout = setTimeout(async () => {
            const currentClaim = sessions.doujinClaims.get(message.id);
            if (!currentClaim || currentClaim.expiresAt !== expiresAt || currentClaim.claimedBy) {
                return;
            }

            sessions.doujinClaims.delete(message.id);
            try {
                const currentEmbed = message.embeds[0];
                await message.edit({
                    embeds: currentEmbed ? [createDoujinClaimExpiredEmbed(currentEmbed)] : [],
                    components: [createDisabledDoujinClaimActionRow(doujin.id, "Tempo expirado")],
                });
            } catch (error) {
                console.error("Failed to expire doujin claim:", error);
            }
        }, DOUJIN_CLAIM_DURATION_SECONDS * 1000);

        sessions.doujinClaims.set(message.id, {
            doujin,
            doujinId: String(doujin.id),
            expiresAt,
            timeout,
            claimedBy: null,
        });
    }

    function registerCommandResult(result) {
        if (result?.claimCharacter && result?.message) {
            registerCharacterClaim(result.message, result.claimCharacter);
        }

        if (result?.doujinClaim?.message && result?.doujinClaim?.doujin) {
            registerDoujinClaim(result.doujinClaim.message, result.doujinClaim.doujin);
        }

        if (result?.helperDrop?.message && result?.helperDrop?.reward && result?.helperDrop?.variant) {
            registerHelperDrop(result.helperDrop.message, result.helperDrop);
        }

        if (result?.haremCarousel?.message && result?.haremCarousel?.ownerId) {
            sessions.haremCarousels.set(result.haremCarousel.message.id, {
                targetUser: result.haremCarousel.targetUser,
                viewerId: result.haremCarousel.ownerId,
                collectionType: result.haremCarousel.collectionType ?? "characters",
            });
        }

        if (result?.imCarousel?.message && result?.imCarousel?.ownerId) {
            sessions.imCarousels.set(result.imCarousel.message.id, {
                ownerId: result.imCarousel.ownerId,
                query: result.imCarousel.query,
                results: result.imCarousel.results,
                marketCharacter: result.imCarousel.marketCharacter,
                characterImageCarousel: result.imCarousel.characterImageCarousel,
                ownerIds: result.imCarousel.ownerIds,
            });
        }
    }

    function registerHelperDrop(message, helperDrop) {
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
            reward: helperDrop.reward,
            timeout,
            variant: helperDrop.variant,
        });

        message.react(helperDrop.variant.emoji).catch((error) => {
            console.error("Failed to react to helper drop message:", error);
        });
    }

    async function handleHaremCarouselInteraction(interaction) {
        const session = sessions.haremCarousels.get(interaction.message.id);
        if (!session) {
            await interaction.reply({ content: "Esse carrossel nao esta mais disponivel." });
            return true;
        }

        if (session.viewerId !== interaction.user.id) {
            await interaction.reply({ content: "Apenas quem abriu este harem pode navegar por ele." });
            return true;
        }

        const [, , rawIndex] = interaction.customId.split(":");
        const index = Number.parseInt(rawIndex, 10);
        if (session.collectionType === "doujins") {
            const collection = await getDoujinCollection(session.targetUser.id);
            const safeIndex = Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), Math.max(collection.doujins.length - 1, 0));

            await interaction.update({
                embeds: [createDoujinCollectionCarouselEmbed(session.targetUser, collection, safeIndex)],
                components: [createDoujinCollectionActionRow(safeIndex, collection.doujins.length)],
            });
            return true;
        }

        const harem = await getHarem(session.targetUser.id);
        const safeIndex = Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), Math.max(harem.characters.length - 1, 0));
        await interaction.update({
            embeds: [createHaremCarouselEmbed(session.targetUser, harem, safeIndex)],
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
                session.marketCharacter,
                session.characterImageCarousel,
                imageAttachment?.name ?? null,
                session.ownerIds,
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
                components: [createDisabledClaimActionRow(characterId, "Tempo expirado")],
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
        const claimedCharacter = claim.character;

        if (!claimedCharacter?.name || !claimedCharacter?.sourceUrl || !claimedCharacter?.imageUrl || !claimedCharacter?.sourceId || !claimedCharacter?.sourceTitle) {
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
            name: claimedCharacter.name,
            sourceId: claimedCharacter.sourceId,
            sourceTitle: claimedCharacter.sourceTitle,
            sourceUrl: claimedCharacter.sourceUrl,
            imageUrl: claimedCharacter.imageUrl,
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

    async function lockDoujinClaim(interaction, doujinId) {
        const claim = sessions.doujinClaims.get(interaction.message.id);
        if (!claim || claim.doujinId !== doujinId) {
            await interaction.reply({
                embeds: [createDoujinClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse doujin nao esta mais disponivel para captura.")],
            });
            return null;
        }

        if (claim.expiresAt <= Date.now()) {
            clearTimeout(claim.timeout);
            sessions.doujinClaims.delete(interaction.message.id);
            const currentEmbed = interaction.message.embeds[0];
            await interaction.update({
                embeds: currentEmbed ? [createDoujinClaimExpiredEmbed(currentEmbed)] : [],
                components: [createDisabledDoujinClaimActionRow(doujinId, "Tempo expirado")],
            });
            return null;
        }

        if (claim.claimedBy) {
            await interaction.reply({
                embeds: [createDoujinClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse doujin ja foi capturado por outra pessoa.")],
            });
            return null;
        }

        claim.claimedBy = interaction.user.id;
        clearTimeout(claim.timeout);
        return claim;
    }

    async function handleDoujinClaim(interaction) {
        const doujinId = interaction.customId.slice(CLAIM_DOUJIN_PREFIX.length);
        const doujinMarriageCheck = await canUserClaimDoujin(interaction.user.id);
        if (!doujinMarriageCheck.allowed) {
            await interaction.reply({
                embeds: [createDoujinMarriageCooldownEmbed(interaction.user, doujinMarriageCheck.nextSlotAt)],
            });
            return true;
        }

        if (await isDoujinClaimed(doujinId)) {
            await interaction.reply({
                embeds: [createDoujinClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription("Esse doujin ja pertence a colecao de alguem e nao pode ser capturado novamente.")],
            });
            return true;
        }

        const claim = await lockDoujinClaim(interaction, doujinId);
        if (!claim) {
            return true;
        }

        const result = await addDoujinToCollection(interaction.user.id, buildDoujinEntry(claim.doujin));
        if (result.added) {
            await registerDoujinMarriage(interaction.user.id, result.doujin);
        }
        sessions.doujinClaims.delete(interaction.message.id);

        await interaction.update({
            embeds: [createDoujinClaimResultEmbed({
                doujin: result.doujin,
                user: interaction.user,
                alreadyOwned: !result.added,
            })],
            components: [createDisabledDoujinClaimActionRow(doujinId, "Doujin capturado")],
        });
        return true;
    }

    async function handleHelperReaction(reaction, user) {
        if (user.bot) {
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

        if (reaction.emoji.name !== helperDrop.variant.emoji) {
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
                variant: helperDrop.variant,
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

        if (interaction.customId.startsWith(CLAIM_DOUJIN_PREFIX)) {
            return handleDoujinClaim(interaction);
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
