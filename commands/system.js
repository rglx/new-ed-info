const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const fs = require("fs")
const request = require("request")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("system")
		.setDescription("Look up some information about a system from EDSM.")
		.addStringOption(option =>
			option.setName("system")
				.setDescription("Name of a star system in Elite: Dangerous")
				.setRequired(true)
			),
	async execute(interaction) {
		//throw "still working on this one. give me a bit."
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
				name: "System Information",
				icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png"
			},
			color: 0x16475B,
			title: "",
			description: "",
			fields: []
		}
		let input = interaction.options.get("system",true).value

		writeLog("Retrieving EDSM API result...")

		let edsmSystemInfo = JSON.parse(await synchronousDownloadPage( {
			url: "https://www.edsm.net/api-v1/system?showId=1&showCoordinates=1&showPermit=1&showInformation=1&showPrimaryStar=1&systemName=" + encodeURIComponent( input ),
			headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
			timeout: 5000
		} ) )
		//console.log(edsmSystemInfo)

		if (edsmSystemInfo.name === undefined) {
			let err = "Could not locate this system!"
			writeLog(err,"/" + interaction.commandName,console.error)
			throw err
		}

		// generate our system info panels
		returnedEmbedObject.title = "**System information for `" + edsmSystemInfo.name + "`**"

		
		// update description field with an EDDB link
		returnedEmbedObject.description = "__More information__" + "\n"
		returnedEmbedObject.description += "Inara: <https://inara.cz/starsystem/?search=" + encodeURIComponent(edsmSystemInfo.name) + ">" + "\n"
		returnedEmbedObject.description += "EDSM: <https://www.edsm.net/en/system/id/" + encodeURIComponent(edsmSystemInfo.id) + "/name/" + edsmSystemInfo.name + "/>" + "\n"

		returnedEmbedObject.description += "EDDB: 🔄 *[querying KodeBlox's EDDB API for system id]*" + "\n"
		//returnedEmbedObject.description += "eBGS: 🔄 *[querying KodeBlox's EDDB API for eBGS uuid]*" + "\n"

		let economyInformation = { name: "__🪙 Economy__", value: "", inline: true }// economy1, economy2, systemstate, systemreserves
		let factionInformation = { name: "__👥 Controlled by__", value: "", inline: true } // factionname, allegiance, government
		let permitInformation = { name: "__⚠️ Permit-Locked__", value: "", inline: true } // permittype, permitname
		let travelInformation = { name: "__🗺️ Travel__", value: "", inline: true } // security, entrystar, starclass, scoopable
		let dockablesInformation = { name: "__📥 Dockables__", value: "", inline: false } // population, placeholder for shipyards/stations

		// basic economical information
		if (edsmSystemInfo.information.economy !== undefined) {
			economyInformation.value = edsmSystemInfo.information.economy
			if (edsmSystemInfo.information.secondEconomy !== undefined) {
				economyInformation.value += " & " + edsmSystemInfo.information.secondEconomy
			}
			if (edsmSystemInfo.information.factionState) {
				economyInformation.value += "\nCurrently in " + edsmSystemInfo.information.factionState
			}
			if (edsmSystemInfo.information.reserve) {
				economyInformation.value += "\n" + edsmSystemInfo.information.reserve + " mining reserves"
			}
		}

		// controlling faction information
		if (edsmSystemInfo.information.faction !== undefined) {
			factionInformation.value = edsmSystemInfo.information.faction
			if (edsmSystemInfo.information.allegiance !== undefined ) {
				factionInformation.value += ", a " + edsmSystemInfo.information.allegiance + "-aligned "
			} else {
				factionInformation.value += ", a "
			}
			
			if (edsmSystemInfo.information.government !== undefined ) {
				factionInformation.value += edsmSystemInfo.information.government + " faction"
			} else {
				factionInformation.value += "faction"
			}

		}

		// travel information
		if (edsmSystemInfo.information.security != undefined) {
			// security rating
			travelInformation.value += edsmSystemInfo.information.security + " security rating"
		}
		if (edsmSystemInfo.primaryStar) {
			// primary star type information
			if (edsmSystemInfo.primaryStar.name != undefined) {
				travelInformation.value += "\nPrimary star: " + edsmSystemInfo.primaryStar.name
			} else if (edsmSystemInfo.primaryStar.name != undefined) {
				travelInformation.value += "\nPrimary star unknown"
			}

			// star type
			if (edsmSystemInfo.primaryStar.type != undefined) {
				travelInformation.value += ", a " + edsmSystemInfo.primaryStar.type
			} else {
				travelInformation.value += ", star type unknown"
			}

			if (edsmSystemInfo.primaryStar.isScoopable == true) {
				travelInformation.value += " (scoopable!)"
			} else if (edsmSystemInfo.primaryStar.isScoopable == false) {
				travelInformation.value += " (NOT scoopable!)"
			}

		}

		// system permit information
		if (edsmSystemInfo.requirePermit) {
			permitInformation.value = "Unknown permit needed."
			if (typeof edsmSystemInfo.permitName == "string") {
				value = "Need " + edsmSystemInfo.permitName + " Permit"
			}
		}

		// system population
		if (edsmSystemInfo.information.population > 0) {
			dockablesInformation.value = "System population: " + edsmSystemInfo.information.population.toLocaleString("en-US") + "\n"
		} else {
			dockablesInformation.value = "System is unpopulated." + "\n"
		}

		// since we have to harass garud's API a whole bunch let's just show this for now
		dockablesInformation.value += "🔄 *[querying KodeBlox's EDDB API for station list...]*"


		// okay, now add our constructed embed-fields to the embed object 
		if (economyInformation.value != "") { returnedEmbedObject.fields.push(economyInformation) }
		if (factionInformation.value != "") { returnedEmbedObject.fields.push(factionInformation) }
		if (permitInformation.value != "") { returnedEmbedObject.fields.push(permitInformation) }
		if (travelInformation.value != "") { returnedEmbedObject.fields.push(travelInformation) }
		if (dockablesInformation.value != "") { returnedEmbedObject.fields.push(dockablesInformation) }

		// and send it to discord
		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )



		// now for phase 2. retrieving EDDB information.



		// begin querying eddb
		let eddbSystemInfo = JSON.parse(await synchronousDownloadPage( {
			url: "https://eddbapi.kodeblox.com/api/v4/systems?name=" + encodeURIComponent( edsmSystemInfo.name ),
			headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
			timeout: 5000
		} ) )

		if (!eddbSystemInfo) {
			let err = "Could not contact KodeBlox's EDDB API!"
			writeLog(err,"/" + interaction.commandName,console.error)
			//throw err // we don't wanna do this because it'll clobber our existing embed. let's just update the embed instead of having the bot's command handler pulverise it.

			returnedEmbedObject.description = "__More information__" + "\n"
			returnedEmbedObject.description += "Inara: <https://inara.cz/starsystem/?search=" + edsmSystemInfo.name + ">" + "\n"
			returnedEmbedObject.description += "EDSM: <https://www.edsm.net/en/system/id/" + edsmSystemInfo.id + "/name/" + edsmSystemInfo.name + "/>" + "\n"
			returnedEmbedObject.description += "EDDB: ❌ *[KodeBlox's API unreachable.]*"

			// overwrite some stuff
			if (edsmSystemInfo.information.population > 0) {
				dockablesInformation.value = "System population: " + edsmSystemInfo.information.population.toLocaleString("en-US") + "\n" + "❌ *[KodeBlox's API unreachable.]*"
			} else {
				dockablesInformation.value = "System is unpopulated." + "\n" + "❌ *[KodeBlox's API unreachable.]*"
			}

			// update the embed
			returnedEmbedObject.fields = []
			if (economyInformation.value != "") { returnedEmbedObject.fields.push(economyInformation) }
			if (factionInformation.value != "") { returnedEmbedObject.fields.push(factionInformation) }
			if (permitInformation.value != "") { returnedEmbedObject.fields.push(permitInformation) }
			if (travelInformation.value != "") { returnedEmbedObject.fields.push(travelInformation) }
			if (dockablesInformation.value != "") { returnedEmbedObject.fields.push(dockablesInformation) }

			// send to discord, then exit.
			return await interaction.editReply( {
				embeds: [ returnedEmbedObject ],
				ephemeral: false
			} )
		}

		//console.log(eddbSystemInfo)

		// update description field with an EDDB link
		returnedEmbedObject.description = "__More information__" + "\n"
		returnedEmbedObject.description += "Inara: <https://inara.cz/starsystem/?search=" + edsmSystemInfo.name + ">" + "\n"
		returnedEmbedObject.description += "EDSM: <https://www.edsm.net/en/system/id/" + edsmSystemInfo.id + "/name/" + edsmSystemInfo.name + "/>" + "\n"
		returnedEmbedObject.description += "EDDB: <https://eddb.io/system/" + eddbSystemInfo.docs[0].id + ">" + "\n"
		//returnedEmbedObject.description += "eBGS: <https://elitebgs.app/systems/" + eddbSystemInfo.docs[0]._id + ">" + "\n"

		// ...and re-send to discord
		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )


		// phase 3. station listings.


		returnedEmbedObject.fields = [] // wipe the fields so we can reapply them later with our new information

		let eddbFullStationsList = [{}]
		eddbFullStationsList[1] = JSON.parse(await synchronousDownloadPage( {
			url: "https://eddbapi.kodeblox.com/api/v4/stations?systemname=" + encodeURIComponent( edsmSystemInfo.name ),
			headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
			timeout: 5000
		} ) )
		
		writeLog("Got first page of EDDB station list.","EDDB API")

		if (eddbFullStationsList[1].pages > 1 ) {
			writeLog(eddbFullStationsList[1].pages + " pages' worth of stations present in " + edsmSystemInfo.name + ", retrieving remaining " + ( eddbFullStationsList[1].pages-1 ) + " pages.","EDDB API")
			for (let pageNumber = 2; pageNumber < (eddbFullStationsList[1].pages+1); pageNumber++) {
				writeLog("retrieving station list, page "+ pageNumber,"EDDB API")
				eddbFullStationsList[pageNumber] = JSON.parse(await synchronousDownloadPage( {
					url: "https://eddbapi.kodeblox.com/api/v4/stations?page="+pageNumber+"&systemname=" + encodeURIComponent( edsmSystemInfo.name ),
					headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
					timeout: 5000
				} ) )
			}
		} else {
			writeLog(eddbFullStationsList[1].total + " stations present in " + edsmSystemInfo.name + ", but it all fit on one page.","EDDB API")
		}
		writeLog("Station list retrieval complete.")

		//console.log(eddbFullStationsList)
		let eddbFullStationsListConcatenated = []
		let shipyardsInSystem = 0
		let presentStationTypes = {}

		// start at zero but add 1 in our reference so that we get the last (or first and only) page and count it up.
		for (let downloadedPageNumber = 1; downloadedPageNumber < (eddbFullStationsList[1].pages+1); downloadedPageNumber++) {
			writeLog("iterating through station list, page "+ downloadedPageNumber)
			eddbFullStationsList[downloadedPageNumber].docs.forEach(station => {
				// initialize an array within our object for storage
				if ( typeof presentStationTypes[station.type] != "object" ) {
					presentStationTypes[station.type] = []
				}
				if ( presentStationTypes[station.type].indexOf(station.name) === -1) {
					// not present, add it
					presentStationTypes[station.type].push(station.name)
					//console.log (station.type + " " + station.name)
				}
				if ( presentStationTypes[station.type] === undefined ) {
					presentStationTypes[station.type] = 0
				}
				if (station.type !== "fleet carrier") {
					if ( station.has_outfitting && station.has_shipyard ) {
						shipyardsInSystem += 1
					}
				}
				eddbFullStationsListConcatenated.push(station)
			})
		}


		// re-apply population information
		if (edsmSystemInfo.information.population > 0) {
			dockablesInformation.value = "Population: " + edsmSystemInfo.information.population.toLocaleString("en-US") + "\n"
		} else {
			dockablesInformation.value = "Unpopulated\n"
		}


		if (presentStationTypes != {}) {
			// some stations are present! wow!
			dockablesInformation.value += "Inter-Astra Starports in-system: **`"+shipyardsInSystem+"`**\n"

			dockablesInformation.value += "Types of starports in system:\n"
			dockablesInformation.value += "```"
			for (const [key, value] of Object.entries(presentStationTypes)) {
				dockablesInformation.value += key + "s ("+value.length+"): " + value.join(", ") + "\n"
			}
			dockablesInformation.value += " ```" // needs an extra space in case there aren't any stations.
		}else{
			dockablesInformation.value += "No stations reported by EDDB.\n*Note: Uninhabited systems with fleet carriers aren't tracked.*"
		}
		// re-apply all our embed-fields
		if (economyInformation.value != "") { returnedEmbedObject.fields.push(economyInformation) }
		if (factionInformation.value != "") { returnedEmbedObject.fields.push(factionInformation) }
		if (permitInformation.value != "") { returnedEmbedObject.fields.push(permitInformation) }
		if (travelInformation.value != "") { returnedEmbedObject.fields.push(travelInformation) }
		if (dockablesInformation.value != "") { returnedEmbedObject.fields.push(dockablesInformation) }

		// and send to discord
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
