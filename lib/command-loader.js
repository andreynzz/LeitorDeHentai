const fs = require("node:fs");
const path = require("node:path");

function getCommandFiles(commandsRoot) {
    const commandFolders = fs.readdirSync(commandsRoot);
    return commandFolders.flatMap((folder) => {
        const commandsPath = path.join(commandsRoot, folder);
        return fs.readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"))
            .map((file) => path.join(commandsPath, file));
    });
}

function loadCommandModules(commandsRoot) {
    const commands = [];

    for (const filePath of getCommandFiles(commandsRoot)) {
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            commands.push(command);
            continue;
        }

        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }

    return commands;
}

function loadCommandJson(commandsRoot) {
    return loadCommandModules(commandsRoot).map((command) => command.data.toJSON());
}

module.exports = {
    loadCommandJson,
    loadCommandModules,
};
