const fs = require("fs")
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const configuration = require("./config.json")

const commands = []
const gcommands = []

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))

for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	if (configuration.guildOnlyCommandFiles.indexOf(file) === -1) {
		commands.push(command.data.toJSON())
		console.log(`Indexed ${file} as a global command.`)
	} else {
		gcommands.push(command.data.toJSON())
		console.log(`Indexed ${file} as a debug-guild-only command.`)
	}
}

const rest = new REST({ version: "9" }).setToken(configuration.authToken)

rest.put(Routes.applicationGuildCommands(configuration.clientId, configuration.guildId), { body: gcommands })
	.then(() => console.log("Successfully registered guild-only commands."))
	.catch(console.error)

rest.put(Routes.applicationCommands(configuration.clientId), { body: commands })
	.then(() => console.log("Successfully registered global commands. expect them to start working in an hour (or whenever Discord's API starts working."))
	.catch(console.error)
