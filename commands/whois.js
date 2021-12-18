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
		//throw "still working on this one. give me a bit."
		await interaction.deferReply()

		// big pile of regexps

		const searchResultsPageRegex = /Commanders found.*?\/cmdr\/(\d+)/i 										// finds first linked commander from the search results

		const cmdrProfileNameRegex = /<span class="pflheadersmall">Cmdr<\/span> (.*?)<\/td>/i 					// commander name (as shown on inara)
		const cmdrProfileAvatarRegex = /<td rowspan="4" class="profileimage" >.*?<img src="(.*?)">/i 			// inara avatar
		const cmdrDetailsTableRegex = /<span class="pflcellname">(.*?)<\/span><br>(.*?)<\/td>/gi 				// retrieves a bunch of cells from the table (specifically the title and the contents)

		const loginToSearchRegex = /You must be logged in to view search results/i 								// tells us if we're not logged in to inara when we search

		const cmdrDetailsTableSquadronLinkRegex = /<a href="\/squadron\/(\d+)\/" class="nocolor">(.*?)<\/a>/i 	// extracts the squadron link & name
		const cmdrDetailsTableCreditStringDeformattingRegex = /<span class="minor">(.*?)<\/span>/i 				// removes special html around 'cr' in the credit balances

		const cmdrInfoPanelTableRegex = /<div class="sidesubcontentwidth50">(.*)<\/div><div class="sidesubcontentwidth100">/i 	// side panel that has more info on it

		const cmdrInfoPanelTableContentsRegex = /<div class="itempairlabel" +style=".*?" *>(.*?)<\/div><div class="itempairvalue *" *>(.*?)<\/div>/gi // actual contents of info panel
		const cmdrInfoPanelVerifiedBadge = /<span class="tagpositive">Verified<\/span>/i // shows that this commander name is confirmably this, ingame (we're just gonna replace it with an emoji)
		const cmdrInfoPanelPlatformName = /<span class="platform.*">(.*?)<\/span>/i // converts platform indicators


		const verifiedIndicator = " - ☑️"
		const blankProfileImage = "https://inara.cz/images/blank.png" // if a commander's avatar is this, just don't show one.
		const emptyFieldValues = [""," ","&nbsp;","-"] // these are considered 'empty' and shouldn't be shown in the final embed to Discord

		// now let's get to work

		let currenttime = new Date().toISOString()
		let timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + "-" + currenttime.split( /-(.+)/, 2 )[ 1 ]

		let returnedEmbedObject = {
			timestamp,
			footer: {
				text: interaction.guild.me.displayName,
				icon_url: configuration.iconUrlPrefix + "avatar.png"
			},
			author: {
				name: "INARA Lookup - Support INARA!" ,
				icon_url: configuration.iconUrlPrefix + interaction.commandName + ".png",
				url: "https://inara.cz/donate"
			},
			color: 0xF9943B,
			title: "",
			description: "",
			fields: []
		}
		let cmdr = interaction.options.get("cmdr",true).value

		returnedEmbedObject.title = "***Searching...***"
		returnedEmbedObject.description = "🔄 *[searching INARA for `" + cmdr + "`]*"

		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )

		// okay, now let's go query the search page on inara real quick

		let inaraSearchResultsHtml = await synchronousDownloadPage({
			url: "https://inara.cz/" + "search?search=" + encodeURIComponent( cmdr ),
			headers: { 
				"User-Agent": "New E:D Info Bot v4.1.0 by rglx", // be nice and tell artie who we are so he can yell at us for not using the new API
				"Cookie": "esid=" + configuration.inaraCookieEsid + "; elitesheet=" + configuration.inaraCookieElitesheet // oh and also include our auth cookies
			},
			timeout: 5000
		})

		const searchResultsMatches = inaraSearchResultsHtml.match(searchResultsPageRegex) // look in page for first found commander profile
		const loginToSearchMatches = inaraSearchResultsHtml.match(loginToSearchRegex) // check if we were told to login

		if ( loginToSearchMatches != null ) {
			let err = "INARA login credentials have expired! <@" + configuration.adminUserId + "> will need to fix this."
			writeLog(err,"/" + interaction.commandName)
			throw err
		}

		if ( searchResultsMatches == null ) {
			let err = "No profiles were found! Maybe their INARA profile is under another name?"
			writeLog(err,"/" + interaction.commandName)
			throw err
		}

		// we got a match, but inara profiles are all numbered, so let's see if we've got one.
		let profileId = Number(searchResultsMatches[1])
		if (profileId == null) {
			let err = "Error determining profile ID - (regexp failure? 0x01)\nrglx will need to fix this."
			writeLog(err,"/" + interaction.commandName)
			throw err
		}

		// it's a number. let's update our embed so that the user knows we've got one on the line
		returnedEmbedObject.title = "***Searching...***"
		returnedEmbedObject.description = "🔄 *[profile found! retrieving <https://inara.cz/cmdr/" + profileId + "/> ...]*"

		await interaction.editReply( {
			embeds: [ returnedEmbedObject ],
			ephemeral: false
		} )

		let inaraProfilePageHtml = await synchronousDownloadPage({
			url: "https://inara.cz/" + "cmdr/" + profileId,
			headers: { 
				"User-Agent": "New E:D Info Bot v4.1.0 by rglx", // be nice and tell artie who we are so he can yell at us for not using the new API
				"Cookie": "esid=" + configuration.inaraCookieEsid + "; elitesheet=" + configuration.inaraCookieElitesheet // oh and also include our auth cookies
			},
			timeout: 5000
		})

		// pull the commander info right-side panel out so it can be worked with separately
		const inaraInfoHtml = inaraProfilePageHtml.match(cmdrInfoPanelTableRegex)

		const inaraNameMatches = inaraProfilePageHtml.match(cmdrProfileNameRegex)
		const inaraAvatarMatches = inaraProfilePageHtml.match(cmdrProfileAvatarRegex)

		if ( inaraNameMatches == null ) {
			err = "Error determining profile contents - (regexp failure? 0x02)\nrglx will need to fix this."
			writeLog(err,"/" + interaction.commandName)
			throw err
		}
		if ( inaraAvatarMatches == null ) {
			// all inara profiles have either a custom avatar, or the blank one set above.
			err = "Error determining profile contents - (regexp failure? 0x03)\nrglx will need to fix this."
			writeLog(err,"/" + interaction.commandName)
			throw err
		}
		// construct some basic information off the profile page
		let inaraProfile = {
			"INARA name": "CMDR " + inaraNameMatches[1],
			"Avatar": "https://inara.cz" + inaraAvatarMatches[1]
		}


		// match the top table's contents (while skipping hidden/nonexistent values)
		inaraProfilePageHtml.replace( cmdrDetailsTableRegex, ( match, p1, p2 ) => {
			if (emptyFieldValues.indexOf(p2) > -1) {
				//console.log("Details table: skipping field "+ p1)
			} else {
				inaraProfile[ p1 ] = p2;
			}
		} );

		// match the right-side panel (while skipping hidden/nonexistent values)
		inaraInfoHtml[1].replace( cmdrInfoPanelTableContentsRegex, ( match, p1, p2 ) => {
			if (emptyFieldValues.indexOf(p2) > -1) {
				//console.log("Details table: skipping field "+ p1)
			} else {
				inaraProfile[ p1 ] = p2;
			}
		} );

		console.log(inaraProfile)

		for ( entry in inaraProfile ) {

			// reformat some things
			if ( entry == "Squadron" ) {
				inaraProfile[entry] = inaraProfile[entry].replace(cmdrDetailsTableSquadronLinkRegex,"[$2](<https://inara.cz/squadron/$1/>)")
			} else if ( entry == "Overall assets" ) {
				inaraProfile[entry] = inaraProfile[entry].replace(cmdrDetailsTableCreditStringDeformattingRegex,"$1")
			} else if ( entry == "Credit balance" ) {
				inaraProfile[entry] = inaraProfile[entry].replace(cmdrDetailsTableCreditStringDeformattingRegex,"$1")
			} else if ( entry == "In-game name" ) {
				inaraProfile[entry] = inaraProfile[entry].replace(cmdrInfoPanelVerifiedBadge,verifiedIndicator)
			} else if ( entry == "Game platform" ) {
				inaraProfile[entry] = inaraProfile[entry].replace(cmdrInfoPanelPlatformName,"$1")
			}

			console.log(entry,"\t", inaraProfile[entry])
		}

		if ( inaraProfile["Avatar"] != blankProfileImage ) {
			returnedEmbedObject.thumbnail = {url: inaraProfile["Avatar"]}
		}

		returnedEmbedObject.url = "https://inara.cz/" + "cmdr/" + profileId

		if ( inaraProfile["In-game name"] != null ) {
			returnedEmbedObject.title = "**CMDR " + inaraProfile["In-game name"] + "** - view profile"
		} else {
			returnedEmbedObject.title = "**CMDR " + inaraProfile["INARA name"] + " - 🇽** - view profile"
		}

		if ( inaraProfile["Allegiance"] != null ) {
			returnedEmbedObject.description = inaraProfile["Allegiance"] + "-aligned"
		} else {
			returnedEmbedObject.description = "Unaligned"
		}

		if ( inaraProfile["Rank"] != null ) {
			returnedEmbedObject.description += ", " + inaraProfile["Rank"] + "-ranked"
		}

		if ( inaraProfile["Role"] != null ) {
			returnedEmbedObject.description += " " + inaraProfile["Role"].replace("/","&").toLowerCase()
		} else {
			returnedEmbedObject.description += " pilot"
		}

		returnedEmbedObject.description += "\n" // add a newline for alignment

		// now for squadron & powerplay alignments
		if ( inaraProfile["Squadron"] != null ) {
			returnedEmbedObject.description += "👥 Member of **" + inaraProfile["Squadron"] + "**\n"
		}
		if ( inaraProfile["Power"] != null ) {
			returnedEmbedObject.description += "⚡ Pledged to **" + inaraProfile["Power"] + "**\n"
		}

		// ship info
		if ( inaraProfile["Registered ship ID"] != null || inaraProfile["Registered ship name"] != null ) {
			returnedEmbedObject.description += "**🚀 Current ship:** "
			if ( inaraProfile["Registered ship ID"] != null ) {
				returnedEmbedObject.description += inaraProfile["Registered ship ID"] + " "
			}
			if ( inaraProfile["Registered ship name"] != null ) {
				returnedEmbedObject.description += "*" + inaraProfile["Registered ship name"] + "*"
			}
		}


		// now for all the misc data
		playStyleFieldNames = ["Play style","Mode","Attitude","Availability"]
		demographicsFieldNames = ["Timezone","Language","Game platform"]
		financialsFieldNames = ["Credit balance","Overall assets"]

		playStyleEmbedField = {name: "__🎮 Gameplay__", value: ""}
		demographicsEmbedField = {name: "__🌏 Demographical__", value: ""}
		financialsEmbedField = {name: "__💰 Financials__", value: ""}

		for ( entry in inaraProfile ) {
			if ( playStyleFieldNames.indexOf(entry) > -1 ) {
				playStyleEmbedField.value += entry + ": " + inaraProfile[entry] + "\n"
			} else if ( demographicsFieldNames.indexOf(entry) > -1 ) {
				demographicsEmbedField.value += entry + ": " + inaraProfile[entry] + "\n"
			} else if ( financialsFieldNames.indexOf(entry) > -1 ) {
				financialsEmbedField.value += entry + ": " + inaraProfile[entry] + "\n"
			}
		}

		if ( playStyleEmbedField.value != "" ){ returnedEmbedObject.fields.push(playStyleEmbedField) }
		if ( financialsEmbedField.value != "" ){ returnedEmbedObject.fields.push(financialsEmbedField) }
		if ( demographicsEmbedField.value != "" ){ returnedEmbedObject.fields.push(demographicsEmbedField) }

		// ok, send to discord.
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
