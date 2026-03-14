const { REST, Routes } = require('discord.js');
const path = require('node:path');
const { config } = require('./lib/config');
const { loadCommandJson } = require('./lib/command-loader');

const foldersPath = path.join(__dirname, 'commands');
const commands = loadCommandJson(foldersPath);

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		
		const data = await rest.put(Routes.applicationGuildCommands(config.client_id, config.guild_id), { body: commands });

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
