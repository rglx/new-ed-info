const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const fs = require("fs")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("restart")
		.setDescription("[bot admin only] restarts the bot."),
	async execute(interaction) {
		if ( interaction.user.id == configuration.adminUserId ){
			let err = "Bot restart requested by " + interaction.user.tag
			writeLog(err,"/" + interaction.commandName)
			interaction.reply({content:"🆗",ephemeral:true})
			.then(()=>interaction.client.destroy())
		} else {
			throw "unauthorized. incident logged."
		}
	},
}
function writeLog( message, prefix, printFunction ) {
	prefix = typeof prefix !== "undefined" ? prefix : "Debug" // prefix with "Debug"
	printFunction = typeof printFunction !== "undefined" ? printFunction : console.log // log everything with console.log by default
	printFunction( "  " + "[" + prefix + "] " + message )
	fs.appendFileSync( "new-ed-info.log", "[" + prefix + "] " + message + "\n" )
}