const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const fs = require("fs")
const request = require("request")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("whois-inara")
		.setDescription("Look up a commander on INARA.")
		.addStringOption(option =>
			option.setName("cmdr")
				.setDescription("Name of a commander on inara.cz")
				.setRequired(true)
			),
	async execute(interaction) {
		throw "still working on this one. give me a bit."
		await interaction.deferReply()

		let currenttime = new Date().toISOString()
		let timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + currenttime.split( /-(.+)/, 2 )[ 1 ]

		let returnedEmbedObject = {
			timestamp,
			footer: {
				text: interaction.guild.me.displayName,
				icon_url: configuration.iconUrlPrefix + "ed-info.png"
			},
			author: {
				name: "INARA Lookup" ,
				icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png"
			},
			color: 0xF9943B,
			title: "",
			description: "",
			fields: []
		}
		let input = interaction.options.get("cmdr",true).value

		

		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )
	},
}

function synchronousDownloadPage(requestData) {
	writeLog("Retrieving remote HTTP page from " + requestData.url, "HTTP")

	return new Promise((resolve, reject) => {

		request.get( requestData, (error, response, body) => {
			if (error) reject(error)
			if (response.statusCode != 200) {
				reject("Invalid status code <" + response.statusCode + ">")
			}
			resolve(body)
		})
	})
}

function writeLog( message, prefix, printFunction ) {
	prefix = typeof prefix !== "undefined" ? prefix : "Debug" // prefix with "Debug"
	printFunction = typeof printFunction !== "undefined" ? printFunction : console.log // log everything with console.log by default
	printFunction( "  " + "[" + prefix + "] " + message )
	fs.appendFileSync( "new-ed-info.log", "[" + prefix + "] " + message + "\n" )
}
