#!/usr/bin/env nodejs

console.log( "loading core libraries..." )
const fs = require("fs")

console.log( "loading discord library..." )
const { Client, Collection, Intents } = require("discord.js")

console.log( "loading configuration..." )
const configuration = require("./config.json")
const package = require("./package.json")

console.log( "defining base functions..." )
function writeLog( message, prefix, printFunction ) {
	prefix = typeof prefix !== "undefined" ? prefix : "Debug" // prefix with "Debug"
	printFunction = typeof printFunction !== "undefined" ? printFunction : console.log // log everything with console.log by default
	printFunction( "  " + "[" + prefix + "] " + message )
	fs.appendFileSync( "new-ed-info.log", "[" + prefix + "] " + message + "\n" )
}


console.log( "instantiating client..." )
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

console.log( "instantiating command files..." )
client.commands = new Collection()
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))
for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	console.log("	attempting to load command: " + file)
	client.commands.set(command.data.name, command)
}

console.log( "hooking discord events..." )

client.once("ready", () => {
	writeLog( "User Id: " + client.user.id + " Bot User: " + client.user.tag, "Discord" )
	writeLog( "Add to your server using this link: ", "Discord" )
	writeLog( " https://discord.com/oauth2/authorize?client_id=" + client.user.id + "&permissions=2415935520&scope=applications.commands%20bot ", "Discord" )
	client.user.setPresence({ activities: [{ name: configuration.currentGame, type: 0 }], status: "online" })

	writeLog( "*** Bot ready! ***", "Discord" )
})

//client.on( "messageCreate", msg => {
//	if ( msg.content == "/restart" && msg.author.id == configuration.adminUserId) { // yeah im just hardcoding this one
//		msg.react("🆗")	.then( ()=>client.destroy() )
//	}
//})

client.on("interactionCreate", async interaction => {
	if (!interaction.isCommand()) { return } // if it"s not a command just bail
	const command = client.commands.get(interaction.commandName) // retrieve corresponding command object
	if (!command) { return } // if it doesn"t exist just bail

	writeLog(interaction.user.tag + " is running command /" + interaction.commandName + " ...", "/" + interaction.commandName)

	try {
		await command.execute(interaction)
	} catch (error) {
		writeLog("an error has occured running /" + interaction.commandName + ": " + error, "/" + interaction.commandName)
		errorEmbed = {
			ephemeral: true, // safely overridden if our deferration isn"t ephemeral
			embeds: [ {
				title: "🆘 An error has occured!",
				description: "Error running /" + interaction.commandName + ":\n```" + error + "```",
				color: 0xDC2E44
			} ]
		}
		if (interaction.deferred) {
			return interaction.editReply(errorEmbed)
		} else if (interaction.replied) {
			let err = "CRITICAL ERROR: Cannot reply to something we've already replied to!"
			writeLog(err,"Commands",console.error)
			throw err
		} else {
			return interaction.reply(errorEmbed)
		}
		
	}
})

//client.once( "ready", () => {
//	debugChannel = client.channels.resolve(configuration.channelId)
//	debugChannel.send({content: "🆗 back online!"})
//} )

console.log( "startup sequence complete. initiating discord connection! stand by!" )
client.login(configuration.authToken)