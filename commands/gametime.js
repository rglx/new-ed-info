const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("gametime")
		.setDescription("Check what time it is in Elite: Dangerous"),
	async execute(interaction) {
		let currenttime = new Date().toISOString()
		let timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + currenttime.split( /-(.+)/, 2 )[ 1 ]

		await interaction.reply( {

			ephemeral: true,
			embeds: [ {
				timestamp,
				footer: {
					text: interaction.guild.me.displayName,
					icon_url: configuration.iconUrlPrefix + "avatar.png"
				},
				author: {
					name: "Current In-Game Time" ,
					icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png"
				},
				title: "\n**```" + timestamp.replace( /T/, " " ).replace( /\..+/, "" ) + "```**",
				description: "",
				color: 0x0a8bd6,
				fields: []
			} ]
		} )
	},
}