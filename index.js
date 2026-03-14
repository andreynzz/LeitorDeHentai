const fs = require("node:fs");
const path = require("node:path");
const { GetDoujin, CreateDoujinEmbed } = require("./modules/Doujin.js");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { KeyvHooks } = require("keyv");
const {
	CLAIM_CHARACTER_PREFIX,
	CLAIM_DURATION_SECONDS,
	createDisabledClaimActionRow,
	createClaimExpiredEmbed,
	createClaimResultEmbed,
	createClaimUnavailableEmbed,
} = require("./modules/Character");
const {
	HAREM_CAROUSEL_PREFIX,
	addCharacterToHarem,
	createHaremCarouselActionRow,
	createHaremCarouselEmbed,
	getHarem,
	getOwnersForCharacterIds,
	isCharacterClaimed,
} = require("./modules/Harem");
const { canUserMarry, createMarriageCooldownEmbed, registerMarriage } = require("./modules/Marriage");
const { getMarketState, processInfamyReset } = require("./modules/Market");
const {
	buildImageAttachment,
	IM_CAROUSEL_PREFIX,
	createCharacterSearchCarouselActionRow,
	createCharacterSearchEmbed,
} = require("./modules/Search");
const { getChannelIdFromWaveKey, isWaveEntry } = require("./modules/Wave");

// Creates the discord bot client
const client = new Client({intents:[GatewayIntentBits.Guilds]});

// TODO: a shell script that automatically creates the config file 
const { token } = require("./config.json");
const { keyv } = require("./modules/Database.js");
const test = require("node:test");

keyv.on('error', (err) => console.error('Keyv connection error:', err));

var Intervals = [];
const ActiveCharacterClaims = new Map();
const ActiveHaremCarousels = new Map();
const ActiveImCarousels = new Map();
let InfamyResetInterval = null;

function registerCharacterClaim(message, characterId) {
	const expiresAt = Date.now() + (CLAIM_DURATION_SECONDS * 1000);
	const timeout = setTimeout(async () => {
		const currentClaim = ActiveCharacterClaims.get(message.id);
		if (!currentClaim || currentClaim.expiresAt !== expiresAt || currentClaim.claimedBy) {
			return;
		}

		ActiveCharacterClaims.delete(message.id);
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

	ActiveCharacterClaims.set(message.id, {
		characterId,
		expiresAt,
		timeout,
		claimedBy: null,
	});
}

function registerHaremCarousel(message, ownerId) {
	ActiveHaremCarousels.set(message.id, { ownerId });
}

function registerImCarousel(message, ownerId, query, results, characterImageCarousel) {
	ActiveImCarousels.set(message.id, { ownerId, query, results, characterImageCarousel });
}

async function handleHaremCarouselInteraction(interaction) {
	const session = ActiveHaremCarousels.get(interaction.message.id);
	if (!session) {
		await interaction.reply({
			content: "Esse carrossel nao esta mais disponivel.",
		});
		return true;
	}

	if (session.ownerId !== interaction.user.id) {
		await interaction.reply({
			content: "Apenas quem abriu este harem pode navegar por ele.",
		});
		return true;
	}

	const [, direction, rawIndex] = interaction.customId.split(":");
	if (!["prev", "next"].includes(direction)) {
		await interaction.reply({
			content: "Acao de carrossel invalida.",
		});
		return true;
	}

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
	const session = ActiveImCarousels.get(interaction.message.id);
	if (!session) {
		await interaction.reply({
			content: "Esse carrossel de pesquisa nao esta mais disponivel.",
		});
		return true;
	}

	if (session.ownerId !== interaction.user.id) {
		await interaction.reply({
			content: "Apenas quem abriu esta pesquisa pode navegar nas imagens.",
		});
		return true;
	}

	const [, direction, rawIndex] = interaction.customId.split(":");
	if (!["prev", "next"].includes(direction)) {
		await interaction.reply({
			content: "Acao de carrossel invalida.",
		});
		return true;
	}

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
	const claim = ActiveCharacterClaims.get(interaction.message.id);
	if (!claim || claim.characterId !== characterId) {
		await interaction.reply({
			embeds: [
				createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription(
					"Esse personagem nao esta mais disponivel para captura.",
				),
			],
		});
		return null;
	}

	if (claim.expiresAt <= Date.now()) {
		clearTimeout(claim.timeout);
		ActiveCharacterClaims.delete(interaction.message.id);
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
			embeds: [
				createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription(
					"Esse personagem ja foi capturado por outra pessoa.",
				),
			],
		});
		return null;
	}

	claim.claimedBy = interaction.user.id;
	clearTimeout(claim.timeout);
	return claim;
}

async function maybeProcessInfamyReset() {
	try {
		const state = await getMarketState();
		if (state.nextInfamyResetAt > Date.now()) {
			return;
		}

		const result = await processInfamyReset(getOwnersForCharacterIds);
		console.log(`Infamy reset processed. ${result.infamous.length} infamous characters selected.`);
		if (result.loyaltyRewards.length > 0) {
			for (const reward of result.loyaltyRewards) {
				console.log(`Loyalty reward: user ${reward.ownerId} kept ${reward.characterName} and received ${reward.reward} coins.`);
			}
		}
	} catch (error) {
		console.error("Failed to process infamy reset:", error);
	}
}

function AddChannelToIntervals(data) {
	// Gets the cooldown for the timeout and the tag for the search
	const data_obj = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
	const cooldown = data_obj.time;
	const tag = data_obj.tag;
	const channelId = getChannelIdFromWaveKey(data.key);

	// Add channel to intervals cooldown
	Intervals[channelId] = 
		setInterval(async () => {
			// Check if channel exists 
			const s_channel = client.channels.cache.find(channel => channel.id === channelId);
			if (!s_channel) {return console.log(`Channel ${channelId} doesn't exist!`)}
			console.log(`Channel ${s_channel.id} is expecting to be flooded!`);
			
			// Get the doujin
			const doujin = (await GetDoujin(tag));
			if(!doujin) { console.log("Hentai wave stoped..."); s_channel.send("Couldn't find anything :("); return;}
			
			// Sending the doujin embed to the channel
			s_channel.send({embeds: [CreateDoujinEmbed(doujin)]});
		}, cooldown * 1000);
	console.log(`Channel ${channelId} ready!`);
}

keyv.hooks.addHandler(KeyvHooks.POST_SET, (data) => {
	if (!isWaveEntry(data.key, data.value)) {
		return;
	}

	const channelId = getChannelIdFromWaveKey(data.key);
	if (Intervals[channelId]) { 
		clearInterval(Intervals[channelId]);
		Intervals[channelId] = null;
	}

	console.log("Adding to the list...")
	AddChannelToIntervals({key:data.key.replace("keyv:", ""), value:data.value})
});

keyv.hooks.addHandler(KeyvHooks.POST_DELETE, (data) => {
	const channelId = getChannelIdFromWaveKey(data.key.replace("keyv:", ""));
	const key = Intervals[channelId];
	if (key) { 
		clearInterval(key);
		Intervals[channelId] = null;
	}
});

// When bot starts...
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
	
	console.log("Preparing hentai wave...");
	
	const iti = keyv.iterator()
	for await (const [key, value] of iti){
		if (!isWaveEntry(key, value)) {
			continue;
		}

		AddChannelToIntervals({key:key, value:value});
	}
	console.log("Hentai wave ready...");

	await maybeProcessInfamyReset();
	if (InfamyResetInterval) {
		clearInterval(InfamyResetInterval);
	}
	InfamyResetInterval = setInterval(maybeProcessInfamyReset, 60 * 60 * 1000);
})

// When interactions are created, add interaction handlers
client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isButton()) {
		if (interaction.customId.startsWith(IM_CAROUSEL_PREFIX)) {
			await handleImCarouselInteraction(interaction);
			return;
		}

		if (interaction.customId.startsWith(HAREM_CAROUSEL_PREFIX)) {
			await handleHaremCarouselInteraction(interaction);
			return;
		}

		if (!interaction.customId.startsWith(CLAIM_CHARACTER_PREFIX)) {
			return;
		}

		const characterId = interaction.customId.slice(CLAIM_CHARACTER_PREFIX.length);
		const marriageCheck = await canUserMarry(interaction.user.id);
		if (!marriageCheck.allowed) {
			await interaction.reply({
				embeds: [createMarriageCooldownEmbed(interaction.user, marriageCheck.nextSlotAt)],
			});
			return;
		}

		if (await isCharacterClaimed(characterId)) {
			await interaction.reply({
				embeds: [
					createClaimUnavailableEmbed(interaction.message.embeds[0]).setDescription(
						"Esse personagem ja pertence ao harem de alguem e nao pode ser capturado novamente.",
					),
				],
			});
			return;
		}

		const claim = await lockCharacterClaim(interaction, characterId);
		if (!claim) {
			return;
		}

		const embed = interaction.message.embeds[0];
		const sourceUrl = embed?.url;
		const imageUrl = embed?.image?.url;
		const sourceId = characterId.split(":")[0];
		const embedFields = embed?.fields ?? [];
		const sourceTitle = embedFields.find((field) => field.name === "Doujin")?.value?.replace(/^\[(.*)\]\(.*\)$/, "$1");
		const characterName = embed?.title;

		if (!characterName || !sourceUrl || !imageUrl || !sourceId || !sourceTitle) {
			ActiveCharacterClaims.delete(interaction.message.id);
			const currentEmbed = interaction.message.embeds[0];
			await interaction.update({
				content: null,
				embeds: currentEmbed ? [createClaimUnavailableEmbed(currentEmbed)] : [],
				components: [createDisabledClaimActionRow(characterId, "Captura indisponivel")],
			});
			return;
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

		ActiveCharacterClaims.delete(interaction.message.id);
		await interaction.update({
			content: null,
			embeds: [createClaimResultEmbed({
				character: result.character,
				user: interaction.user,
				alreadyOwned: !result.added,
			})],
			components: [createDisabledClaimActionRow(characterId, "Personagem capturado")],
		});
		return;
	}

	if (!interaction.isChatInputCommand()) return; 
	
	const command = interaction.client.commands.get(interaction.commandName);
	
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		const result = await command.execute(interaction);
		if (result?.claimCharacterId && result?.message) {
			registerCharacterClaim(result.message, result.claimCharacterId);
		}
		if (result?.haremCarousel?.message && result?.haremCarousel?.ownerId) {
			registerHaremCarousel(result.haremCarousel.message, result.haremCarousel.ownerId);
		}
		if (result?.imCarousel?.message && result?.imCarousel?.ownerId) {
			registerImCarousel(
				result.imCarousel.message,
				result.imCarousel.ownerId,
				result.imCarousel.query,
				result.imCarousel.results,
				result.imCarousel.characterImageCarousel,
			);
		}
	} catch (error) {
		console.error(error);
	}
});

// Gets registered commands and sync them to their respective scripts inside the ./commands folder
client.commands = new Collection();
const foldersP = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersP);

// Looks for every command inside the ./commands folder
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersP, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath)

        if('data' in command && 'execute' in command){
            client.commands.set(command.data.name, command)
        }else{
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.login(token);
