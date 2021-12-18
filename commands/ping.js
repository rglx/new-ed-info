const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("See if the bot is functioning."),
	async execute(interaction) {
		let currenttime = new Date().toISOString()
		let timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + currenttime.split( /-(.+)/, 2 )[ 1 ]

		await interaction.reply( {
			content: "Embed permissions are required for this bot. If nothing shows up attached below this message, please grant them.",
			ephemeral: true,
			embeds: [ {
				timestamp,
				footer: {
					text: interaction.guild.me.displayName,
					icon_url: configuration.iconUrlPrefix + "avatar.png"
				},
				author: {
					name: "Ping Tester" ,
					icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png"
				},
				title: "Pong!",
				description: "✅ Pong!",
				color: 0x72AB52,
				fields: [
					{
						name: "Hey " + interaction.user.tag + "!",
						value: "It works!",
						inline: true
					}
				],
			} ]
		} )
	},
}