const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const fs = require("fs")
const request = require("request")
const mathjs = require("mathjs")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("distance")
		.setDescription("Check the distance between two systems and show some statistics about traveling between them.")
		.addStringOption(option =>
			option.setName("system1")
				.setDescription("First star system to find the distance between")
				.setRequired(true)
			)
		.addStringOption(option =>
			option.setName("system2")
				.setDescription("Second star system to find the distance between")
				.setRequired(true)
			),
	async execute(interaction) {
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
				name: "System Distance Finder" ,
				icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png"
			},
			color: 0x68BEDD,
			title: "",
			description: "",
			fields: []
		}

		let system1 = interaction.options.get("system1",true).value
		let system2 = interaction.options.get("system2",true).value

		writeLog("Attempting to find distance between " + system1 + " & " + system2, "/" + interaction.commandName)

		let system1info = JSON.parse( await synchronousDownloadPage( {
			url: "https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=" + encodeURIComponent( system1 ),
			headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
			timeout: 5000
		} ) )
		let system2info = JSON.parse( await synchronousDownloadPage( {
			url: "https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=" + encodeURIComponent( system2 ),
			headers: { "User-Agent": "New E:D Info Bot v4.1.0beta1 by rglx" },
			timeout: 5000
		} ) )

		writeLog("API queries complete. decoding...", "/" + interaction.commandName)


		if ( system1info.coords === undefined || system2info.coords === undefined ) {
			let err = "Couldn't retrieve coordinate data for given system(s)"
			writeLog(err,"/" + interaction.commandName)
			throw err
		}

		let system1coords = [ system1info.coords.x, system1info.coords.y, system1info.coords.z ]
		let system2coords = [ system2info.coords.x, system2info.coords.y, system2info.coords.z ]
		let distance = mathjs.distance( system1coords, system2coords ).toFixed( 2 )

		let shipTransferTime = calculateTimerFromSeconds(distance * 9.75 + 300) // every light year adds 9.75 seconds, but we also start with 300 more seconds on top of that
		let shipTotalCost = 10000 // will give us a value roughly resembling percentage of any ship"s given cost

		// from b0redb0y via https://forums.frontier.co.uk/threads/.516256/
		let shipTransferCostPercentage = ((0.00006 * shipTotalCost * distance) + (0.0002 * shipTotalCost)) / 100 // (percentage)

		let carrierJumpCount = Math.ceil(distance/500)
		let carrierTravelTimeInMinutes = 15.5 + 1 + 4 // jump prep (from scheduling, roughly), actual jump (roughly), cooldown
		let carrierTravelTime = calculateTimerFromSeconds(carrierTravelTimeInMinutes * 60 * carrierJumpCount)

		let carrierJumpCountString = "0 jumps"
		let carrierJumpFuelData = calculateSingleJumpFuelCostRange(distance - Math.floor(distance/500))

		if ( carrierJumpCount == 1 ) {
			carrierJumpCountString = "1 jump"
			// fuel use was calculated above so we shouldn"t have to worry about it
		} else if ( carrierJumpCount > 1 ) {
			carrierJumpCountString = carrierJumpCount + " jumps"

			// now calculate how much fuel we"ll use for our 500Ly jump(s) one at a time
			carrierJumpMaxFuelUse = calculateSingleJumpFuelCostRange(500)

			// and then multiply by however many we"ve got and add it directly into our existing numbers
			carrierJumpFuelData[0] += ( carrierJumpMaxFuelUse[0] * Math.floor(distance/500) )
			carrierJumpFuelData[1] += ( carrierJumpMaxFuelUse[1] * Math.floor(distance/500) )

		}

		returnedEmbedObject.title = "Distance between `" + system1info.name + "` and `" + system2info.name + "`"
		returnedEmbedObject.description = "**```" + distance + " Ly```**"

		let shipTransferInfoText  = "**Time**: " + shipTransferTime + "\n"
		shipTransferInfoText += "**Cost**: "+ shipTransferCostPercentage.toFixed(4) +"% of ship value\n"
		shipTransferInfoText += "**Find a Shipyard**: <https://inara.cz/nearest-stations/?pa1%5B14%5D=1>"
		carrierJumpFuelUseString = carrierJumpFuelData[0] + " to " + carrierJumpFuelData[1] + " tons"


		let fleetCarrierInfoText = "**Jumps**: "+ carrierJumpCountString +"\n"
		fleetCarrierInfoText += "**Fuel Used**: "+ carrierJumpFuelUseString +"\n"
		fleetCarrierInfoText += "**Credits Used**: "+ Number(carrierJumpCount * 100000).toLocaleString("en-US") +" cr\n"
		fleetCarrierInfoText += "**Total time**: "+ carrierTravelTime +"\n"


		fleetCarrierInfoText += "**Plot a route**: <https://www.spansh.co.uk/fleet-carrier/results/rglxedinfobot?destinations=%5B%22" +encodeURIComponent(system2info.name)+ "%22%5D&source=" +encodeURIComponent(system1info.name)+ "&used_capacity=7150>"

		returnedEmbedObject.fields.push({
			name: "__Inter Astra Transfer Costs__",
			value: shipTransferInfoText,
			inline: false
		})
		returnedEmbedObject.fields.push({
			name: "__Fleet Carrier Transportation__",
			value: fleetCarrierInfoText,
			inline: false
		})

		writeLog( "Distance between " + system1info.name + " and " + system2info.name + ": " + distance + " Ly", "EDSM SysDist" )

		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )
	},
}


function calculateSingleJumpFuelCostRange ( distance ) {

	const maximumCarrierHold = 25000 // all carriers have this maximum value

	const maximumTritiumDepotHold = 1000 // calculated, but kept outside the cargo hold"s counter
	const basicServicesInstalledHoldUse = 500 + 180 + 250 // refuel, repair & rearm services
	const turnInOfficesInstalledHoldUse = 100 + 250 + 120 // redemption office, smuggling warehouse, and cartographics
	const shipManagementServicesHoldUse = 3000 + 1750 // shipyard & outfitting (with no stock)
	const additionalCargoToCalculate = 0 // for outfitting/shipyard packages, un-depot"d fuel, and raw cargo from the market and the smuggler warehouse

	const currentCarrierHold = basicServicesInstalledHoldUse + shipManagementServicesHoldUse + additionalCargoToCalculate + turnInOfficesInstalledHoldUse

	const baseJumpCost = 5 // every jump, no matter how many light years, will use this much fuel plus
	const baseEfficiency = 8 


	const minimumUsage = Math.ceil( baseJumpCost + ( ( distance / baseEfficiency ) * ( 1 + ((maximumTritiumDepotHold + currentCarrierHold) / maximumCarrierHold ) ) ) )

	const maximumUsage = Math.ceil( baseJumpCost + ( ( distance / baseEfficiency ) * ( 1 + ((maximumTritiumDepotHold + maximumCarrierHold) / maximumCarrierHold ) ) ) )

	return [minimumUsage, maximumUsage]
}

function calculateTimerFromSeconds ( seconds ) {
	const days = Math.floor( seconds / ( 3600 * 24 ) ) // calculate how many whole days we have
	seconds -= days * 3600 * 24 // subtract that from our counter (after converting back to seconds)
	const hrs = Math.floor( seconds / 3600 ) // then calculate how many hours are left
	seconds -= hrs * 3600 // and subtract the same
	const mnts = Math.floor( seconds / 60 ) // then again for minutes
	seconds -= mnts * 60 // and subtract the same
	return days + "d " + hrs + "h " + mnts + "m" // + seconds + "s" // then return all of them
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
