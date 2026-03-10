const fs = require("node:fs");
const path = require("node:path");
const { GetDoujin, CreateDoujinEmbed } = require("./modules/Doujin.js");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { Keyv } = require("keyv");
const { default: KeyvSqlite } = require("@keyv/sqlite");

// Creates the discord bot client
const client = new Client({intents:[GatewayIntentBits.Guilds]});

// TODO: a shell script that automatically creates the config file 
const { token, database_path } = require("./config.json");


const keyv = new Keyv(new KeyvSqlite(`sqlite://${database_path}`));
keyv.on('error', (err) => console.error('Keyv connection error:', err));

var Intervals = [];

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
	
	var channels_to_flood = [];
	console.log("Preparing hentai wave...");
	
	const iti = keyv.iterator()
	for await (const [key, _] of iti){
		console.log(`Channel ${key} ready!`);
		channels_to_flood.push(key);
	}
	console.log("Hentai wave ready...");

	for (let i = 0; i < channels_to_flood.length; i++) {
		async () => {
			const cooldown = (await keyv.get(channels_to_flood[i]));
			Intervals[channels_to_flood[i]] = 
				setInterval(async () => {
					const s_channel = readyClient.channels.cache.find(channel => channel.id === channels_to_flood[i]);
					console.log(`Channel ${s_channel.id} is expecting to be flooded!`)

					const doujin = (await GetDoujin("*"))
					if(!doujin) { console.log("Hentai wave stoped..."); s_channel.send("Couldn't find anything :("); return;}
					
					s_channel.send({embeds: [CreateDoujinEmbed(doujin)]
				});}, cooldown * 1000);
		}
	}
})
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
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

// gets registered commands and sync them to their respective scripts inside the ./commands folder
client.commands = new Collection();
const foldersP = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersP);

// looks for every command inside the ./commands folder
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