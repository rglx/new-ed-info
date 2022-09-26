const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const package = require("../package.json")
const fs = require("fs")
const request = require("request")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("carrier-locations")
		.setDescription("Shows the locations of all carriers associated with this squadron.")
		.addIntegerOption(option =>
			option.setName('inarasquadronid')
				.setDescription('sets ID # of INARA squadron (admins only)')
				.setRequired(false))

	,async execute(interaction) {
		//throw "still working on this!"
		await interaction.deferReply()
		let currenttime = new Date().toISOString()
		let timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + currenttime.split( /-(.+)/, 2 )[ 1 ]

		const squadronGuildAssoc = loadSquadronGuildAssoc()

		const inaraSquadronIdOption = interaction.options.getInteger("inarasquadronid",false)

		if ( inaraSquadronIdOption != undefined ) {
			// someone sent us an ID. let's see if they're allowed to do this.
			if ( interaction.memberPermissions.has("ADMINISTRATOR") || interaction.user.id == configuration.adminUserId ) {
				const inaraId = parseInt(inaraSquadronIdOption)
				if ( inaraId > 0 ) {
					// we've got a number and it's not zero or lower! let's get to work.

					squadronGuildAssoc[interaction.guildId] = inaraId
					saveSquadronGuildAssoc(squadronGuildAssoc)

					err = "success! commands associated with your squadron will now work."
					writeLog(err,"/" + interaction.commandName)
					throw err // this needs to be a 'throw' to stop command execution and bail out.
				} else if ( inaraId < 0 || inaraId == undefined || inaraId == null ) {
					err = "not a valid number. it's the number in the URL from your squadron's main page on INARA."
					writeLog(err,"/" + interaction.commandName)
					throw err
				}
			} else {
				err = "you don't have permission to set this guild's associated INARA ID.\nask a bot/guild administrator to set this."
				writeLog(err,"/" + interaction.commandName)
				throw err
			}
		}
		
		const squadronIdForThisGuild = squadronGuildAssoc[interaction.guildId]

		if (squadronIdForThisGuild == undefined) {
			err = "INARA squadron ID isn't set for this Discord guild. have an administrator (bot or guild) do this."
			writeLog(err,"/" + interaction.commandName)
			throw err			
		}

		let inaraCarriersPageText = await synchronousDownloadPage({
			url: "https://inara.cz/elite/squadron-assets/?param1=" + parseInt( squadronIdForThisGuild ),
			headers: { 
				"User-Agent": package.description + " v" + package.version + " by " + package.author, // be nice and tell artie who we are so he can yell at us for not using the new API
				"Cookie": "esid=" + configuration.inaraCookieEsid + "; elitesheet=" + configuration.inaraCookieElitesheet // oh and also include our auth cookies
			},
			timeout: 5000
		})

		const carrierListing = {}
		const squadronNameRegex = /<title>(.*) - squadron assets \[INARA\]<\/title>/i
		const carrierTableReaderRegex = /<tr><td class="lineright wrap">(?:<a href="(\/elite\/cmdr-fleetcarrier\/\d+\/\d+\/)">)?(.*?) <span class="minor">\((.*?)\)<\/span>(?:<\/a>)?<\/td><td class="lineright wrap"><a href="(\/elite\/starsystem\/\d+\/)">(.*?)<\/a><\/td><td class="wrap"><a href="(\/elite\/cmdr\/\d+\/)">(.*?)<\/a><\/td><\/tr>/ig

		inaraCarriersPageText.replace(carrierTableReaderRegex, (match, carrierPage, carrierName, carrierIdent, carrierLocationId, carrierLocation, carrierOwnerId, carrierOwner) => 
			carrierListing[carrierIdent] = {
				name: carrierName,
				location: carrierLocation,
				locationId: carrierLocationId,
				owner: carrierOwner,
				ownerId: carrierOwnerId,
				carrierPage: carrierPage,
				stationPage: "/elite/station/?search=" + carrierIdent
			}
		)
		const squadronNameMatches = inaraCarriersPageText.match(squadronNameRegex)
		if ( squadronNameMatches != undefined ) {
			squadronName = squadronNameMatches[1]
		} else {
			err = "Error determining squadron name (regexp failure 0x04) - contact rglx!"
			writeLog(err,"/" + interaction.commandName)
			throw err
		}

		let returnedEmbedObject = {
			timestamp,
			footer: {
				text: interaction.guild.me.displayName,
				icon_url: configuration.iconUrlPrefix + "avatar.png"
			},
			author: {
				name: "Carrier Locations Report - Support INARA!" ,
				//icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png",
				url: "https://inara.cz/donate"
			},
			color: 0xF9943B,
			title: "Locations of all visible " + squadronName + " Fleet Carriers",
			description: "Retrieved from [INARA listing](<https://inara.cz/elite/squadron-assets/?param1="+squadronIdForThisGuild+">)",
			fields: []
		}

		for (carrierIdent in carrierListing) {
			//console.log(carrierIdent, carrierListing[carrierIdent])
			let discordEmbedField = {
				name: "__Fleet Carrier *" +carrierListing[carrierIdent].name+ "*  ("+carrierIdent+")__",
				value: "📍 Standing by in [" + carrierListing[carrierIdent].location + "](<https://inara.cz" + carrierListing[carrierIdent].locationId + ">)\n" + "👤 Operator: [CMDR " + carrierListing[carrierIdent].owner + "](<https://inara.cz" + carrierListing[carrierIdent].ownerId + ">)",
				inline: false
			}
			if ( carrierListing[carrierIdent].carrierPage != undefined ) {
				discordEmbedField.value += "\n🔎 *[more info](<https://inara.cz" +carrierListing[carrierIdent].carrierPage+ ">)*  ~  🔎 *[station info](<https://inara.cz" +carrierListing[carrierIdent].stationPage+ ">)*"
			} else {
				discordEmbedField.value += "\n🔎 *[station info](<https://inara.cz" +carrierListing[carrierIdent].stationPage+ ">)*"

			}
			returnedEmbedObject.fields.push(discordEmbedField)
		}


		// ok, send to discord.
		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: true
		} )
	}
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

function loadSquadronGuildAssoc() {
	squadronGuildAssoc = {}
	try {
		let fileContents = fs.readFileSync("./squadronGuildAssoc.json","utf8")
		return JSON.parse(fileContents)
	} catch (error) {
		saveSquadronGuildAssoc({})
		throw "squadron-guild association file is blank. creating a new one, please try again in a moment."
	}
}

function saveSquadronGuildAssoc(squadronGuildAssoc) {
	squadronGuildAssocToWrite = JSON.stringify(squadronGuildAssoc)
	try {
		fs.writeFileSync("./squadronGuildAssoc.json",squadronGuildAssocToWrite,"utf8")
	} catch (error) {
		throw "could not write to squadron-guild association file??"
	}
}