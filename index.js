const fs = require("node:fs");
const path = require("node:path");
const { GetDoujin, CreateDoujinEmbed } = require("./modules/Doujin.js");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { Keyv, KeyvHooks } = require("keyv");
const { default: KeyvSqlite } = require("@keyv/sqlite");

// Creates the discord bot client
const client = new Client({intents:[GatewayIntentBits.Guilds]});

// TODO: a shell script that automatically creates the config file 
const { token, database_path } = require("./config.json");


export const keyv = new Keyv(new KeyvSqlite(`sqlite://${database_path}`));
keyv.on('error', (err) => console.error('Keyv connection error:', err));

var Intervals = [];

function AddChannelToIntervals(data) {
	console.log(data)

	console.log(`Channel ${data.key} ready!`);
	// Gets the cooldown for the timeout and the tag for the search
	const data_obj = JSON.parse(data.value)
	const cooldown = data_obj.time ?? 10;
	const tag = data_obj.tag ?? "*";

	// Add channel to intervals cooldown
	Intervals[data.key] = 
		setInterval(async () => {
			// Check if channel exists 
			const s_channel = client.channels.cache.find(channel => channel.id === data.key);
			if (!s_channel) {return}
			console.log(`Channel ${s_channel.id} is expecting to be flooded!`);
			
			// Get the doujin
			const doujin = (await GetDoujin(tag));
			if(!doujin) { console.log("Hentai wave stoped..."); s_channel.send("Couldn't find anything :("); return;}
			
			// Sending the doujin embed to the channel
			s_channel.send({embeds: [CreateDoujinEmbed(doujin)]});
		}, cooldown * 1000);
}

keyv.hooks.addHandler(KeyvHooks.POST_SET, (data) => {
	if (Intervals[data.key]) { 
		clearInterval(Intervals[data.key]);
		Intervals[data.key] = null
	}

	console.log("Adding to the list...")
	AddChannelToIntervals(data)
});

keyv.hooks.addHandler(KeyvHooks.POST_DELETE, () => {
	if (Intervals[data.key]) { 
		console.log("Deleting from the list...")
		clearInterval(Intervals[data.key]);
		Intervals[data.key] = null;
	}
});

// When bot starts...
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
	
	console.log("Preparing hentai wave...");
	
	const iti = keyv.iterator()
	for await (const [key, value] of iti){
		AddChannelToIntervals({key:key, value:value});
	}
	console.log("Hentai wave ready...");
})

// When interactions are created, add interaction handlers
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return; 
	
	const command = interaction.client.commands.get(interaction.commandName);
	
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
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