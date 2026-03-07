const fs = require("node:fs");
const path = require("node:path");
const { GetDoujin, CreateDoujinEmbed } = require("./modules/Doujin.js");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { Keyv } = require("keyv");

// Creates the discord bot client
const client = new Client({intents:[GatewayIntentBits.Guilds]});

// TODO: a shell script that automatically creates the config file 
const { token, database_path } = require("./config.json");

const keyv = new Keyv(database_path);

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
	const channels_to_flood = [
		"1479631381687566418",
	];
	for (let i = 0; i < channels_to_flood.length; i++) {
		const s_channel = readyClient.channels.cache.find(channel => channel.id === channels_to_flood[i]);
		console.log(`Channel ${s_channel.id} is expecting to be flooded!`)
		setInterval(async () => {
			console.log("Hentai wave incoming...");
			const doujin = (await GetDoujin("*"))
			if(!doujin) { console.log("Hentai wave stoped..."); s_channel.send("Couldn't find anything :("); return;}
			
			s_channel.send({embeds: [CreateDoujinEmbed(doujin)]});
		}, 10 * 1000);
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