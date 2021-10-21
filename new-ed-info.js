// E:D Info Discord Bot
// by CMDRs rglx & willyb321

// DEPENDENCIES
console.log( 'Loading dependencies' );
const fs = require( 'fs' ); // Built-in to nodejs
const path = require( 'path' ); // Built-in to nodejs
//const Discord = require( 'discord.io' ); // Install using npm
const Discord = require( 'discord.js' ); // Install using npm
const request = require( 'request' ); // Install using npm
const mathjs = require( 'mathjs' ); // Install using npm
const config = require( 'config' ); // Install using npm

console.log( 'Loading configuration' );
const configuration = config.get( 'configuration' );
const botName = 'New E:D Info'
const botAuthor = 'CMDRs rglx and willyb321';
const botVersion = '3.3.1beta1'

// FUNCTIONS
console.log( 'Loading functions' );
let wholeMessage;
// Core parts of the bot
function writeLog( message, prefix, writeToFile ) {
	if ( !prefix ) {
		prefix = 'Debug'; // By default put [Debug] in front of the message
	}
	writeToFile = typeof writeToFile !== 'undefined' ? writeToFile : true; // Log everything to file by default
	wholeMessage = '[' + prefix + '] ' + message;
	console.log( '  ' + wholeMessage );
	if ( writeToFile === true ) {
		fs.appendFileSync( path.basename( __filename ) + '.log', wholeMessage + '\n' );
	}
}

function getInaraPage( page, callback ) { // Grab a whole page's HTML from INARA, and return it all as a string
	writeLog( 'Retrieving INARA page: https://inara.cz/' + page, 'HTTP' );
	try {
		request.get( {
			url: 'https://inara.cz/' + page
			, headers: {
				'User-Agent': botName + ' v' + botVersion + ' by ' + botAuthor
				, Cookie: 'esid=' + configuration.inaraCookieEsid + '; elitesheet=' + configuration.inaraCookieElitesheet
			}
			, timeout: 30000
		}, ( error, response, body ) => {
			if ( error ) {
				callback( null );
				writeLog( 'Error retrieving INARA page: ' + error, 'HTTP' );
				throw error;
			}
			if ( body === undefined ) {
				callback( null );
				writeLog( 'General error retrieving INARA page!', 'HTTP' );
				throw 'General error retrieving INARA page!';
			}
			callback( body );
		} );
	} catch ( err ) {
		writeLog( 'Failed to retrieve INARA page: ' + err, 'HTTP' );
		callback( null );
	}
}

function getEdsmApiResult( page, callback ) { // Query EDSM's api for something
	writeLog( 'Retrieving EDSM APIv1 results: https://www.edsm.net/api-v1/' + page, 'HTTP' );
	request.get( {
		url: 'https://www.edsm.net/api-v1/' + page
		, headers: {
			'User-Agent': botName + ' v' + botVersion + ' by ' + botAuthor
		}
		, timeout: 30000
	}, ( error, response, body ) => {
		if ( error ) {
			writeLog( 'Error retrieving EDSM APIv1 result: ' + error, 'HTTP' );
			throw error;
		}
		if ( body === undefined ) {
			callback( null );
			writeLog( 'Error retrieving EDSM APIv1 result!', 'HTTP' );
			throw 'Error retrieving EDSM APIv1 results!';
		}
		callback( JSON.parse( body ) );
	} );
}
// Main functions
function getCmdrInfoFromInara( name, callback ) { // Search inara for a CMDR, do some stuff with regexps, and return part of a formatted message
	const searchResultsRegexp = /Commanders found.*?\/cmdr\/(\d+)/i; // the first commander page inara's search comes up with
	const cmdrDetailsNameRegexp = /<span class="pflheadersmall">Cmdr<\/span> (.*?)<\/td>/i; // commander name
	const cmdrDetailsAvatarRegexp = /<td rowspan="4" class="profileimage" ><img src="(.*)"><\/td>/i; // profile image
	const cmdrDetailsTableRegexp = /<span class="pflcellname">(.*?)<\/span><br>(.*?)<\/td>/gi; // commander profile table grabber
	const loginToSearchRegexp = /You must be logged in to view search results.../; // "login to search" error message
	const cmdrDetailsTableSquadronLinkRegexp = /<a href="\/squadron\/(\d+)\/" class="nocolor">(.*?)<\/a>/i; // squadron name
	const cmdrDetailsTableCreditStringDeformatting = /<span class="minor">(.*?)<\/span>/ // "cr" formatting

	try {
		getInaraPage( 'search?search=' + encodeURIComponent( name ), searchResults => {
			if ( searchResults ) {
				const searchResultsMatches = searchResults.match( searchResultsRegexp );
				const loginToSearchMatches = searchResults.match( loginToSearchRegexp );
				if ( loginToSearchMatches == null ) {
					if ( searchResultsMatches == null ) {
						callback( {
							timestamp
							, footer: {
								icon_url: configuration.icons.boticon
								, text: botName
							}
							, author: {
								name: 'INARA Profile'
								, icon_url: configuration.icons.inarasearch
							}
							, color: 0xBF2242
							, title: 'No profiles found.'
						} );
					} else {
						getInaraPage( 'cmdr/' + searchResultsMatches[ 1 ], cmdrDetails => {
							if ( cmdrDetails ) {
								writeLog( 'processing data', 'CMDR-INARA' );
								const cmdrDetailsNameMatches = cmdrDetails.match( cmdrDetailsNameRegexp );
								const cmdrDetailsAvatarMatches = cmdrDetails.match( cmdrDetailsAvatarRegexp );
								const inaraInfo = {
									CMDR: cmdrDetailsNameMatches[ 1 ]
								};
								cmdrDetails.replace( cmdrDetailsTableRegexp, ( match, p1, p2 ) => {
									inaraInfo[ p1 ] = p2;
								} );
								writeLog( cmdrDetailsAvatarMatches[ 1 ], 'inara-avatar' )
								const returnedEmbedObject = {
									timestamp
									, footer: {
										icon_url: configuration.icons.boticon
										, text: botName
									}
									, author: {
										name: 'INARA Profile'
										, icon_url: configuration.icons.inarasearch
									}
									, color: 0xAB531C
									, title: 'INARA Profile'
									, description: '**CMDR ' + inaraInfo.CMDR.toUpperCase() + '**'
									, url: 'https://inara.cz/cmdr/' + searchResultsMatches[ 1 ]
									, thumbnail: {
										url: 'https://inara.cz' + cmdrDetailsAvatarMatches[ 1 ]
									}
									, fields: []
								};
								for ( const inaraInfoEntry in inaraInfo ) {
									if ( inaraInfo[ inaraInfoEntry ] !== '&nbsp;' && inaraInfo[ inaraInfoEntry ] !== '' && inaraInfo[ inaraInfoEntry ] !== ' ' && inaraInfo[ inaraInfoEntry ] !== '-' ) { // skip empty entries
										inaraInfo[inaraInfoEntry] = inaraInfo[inaraInfoEntry].replace(cmdrDetailsTableCreditStringDeformatting,'$1') // remove formatting
										inaraInfo[inaraInfoEntry] = inaraInfo[inaraInfoEntry].replace(cmdrDetailsTableSquadronLinkRegexp,'[$2](<$1>)') // remove formatting

										returnedEmbedObject.fields.push( {
											name: inaraInfoEntry
											, value: inaraInfo[ inaraInfoEntry ]
											, inline: true
										} )
									}
								}
								writeLog( 'Done! sending to channel', 'CMDR-INARA' );
								callback( returnedEmbedObject );
							} else {
								throw 'Profile page retrieval failed!'
							}
						} );
					}
				} else {
					throw 'Need new login credentials to INARA! <@' + configuration.adminUserId + '>! Please fix this!'
				}
			} else {
				throw 'Search results page retrieval failed!'
			}
		} );
	} catch ( err ) {
		throw err
	}
}
let system1;
let system1coords;
let system2;
let system2coords;

function getDistanceBetweenTwoSystems( input, callback ) { // Query EDSM (unfortunately) twice to fetch the distance between one system and another
	const returnedEmbedObject = {
		timestamp
		, footer: {
			icon_url: configuration.icons.boticon
			, text: botName
		}
		, author: {
			name: 'System Distance Finder'
			, icon_url: configuration.icons.edsm
		}
		, color: 0x525960
		, title: 'Error!'
		, description: ':SOS: An error occured.'
		, fields: []
	};
	try {
		system1 = input.split( ',', 2 )[ 0 ].trim();
		system2 = input.split( ',', 2 )[ 1 ].trim();
	} catch ( err ) {
		returnedEmbedObject.title = 'Incorrect usage. Try `/dist[ance] <system1>, <system2>` or `/help`';
		callback( returnedEmbedObject );
		return;
	}
	let seconds;
	getEdsmApiResult( 'system?showCoordinates=1&systemName=' + encodeURIComponent( system1 ), system1info => {
		writeLog( 'Fetched information for ' + system1, 'EDSM SysDist' );
		if ( system1info.coords !== undefined ) {
			writeLog( 'Info for ' + system1 + ' looks OK', 'EDSM SysDist' );
			getEdsmApiResult( 'system?showCoordinates=1&systemName=' + encodeURIComponent( system2 ), system2info => {
				writeLog( 'Fetched information for ' + system2, 'EDSM SysDist' );
				if ( system2info.coords !== undefined ) {
					writeLog( 'Info for ' + system2 + ' looks OK, calculating distance', 'EDSM SysDist' );
					system1coords = [ system1info.coords.x, system1info.coords.y, system1info.coords.z ];
					system2coords = [ system2info.coords.x, system2info.coords.y, system2info.coords.z ];
					const distance = mathjs.distance( system1coords, system2coords ).toFixed( 2 );

					shipTransferTime = calculateTimerFromSeconds(distance * 9.75 + 300); // every light year adds 9.75 seconds, but we also start with 300 more seconds on top of that
					shipTotalCost = 10000 // will give us a value roughly resembling percentage of any ship's given cost

					// from b0redb0y via https://forums.frontier.co.uk/threads/.516256/
					shipTransferCostPercentage = ((0.00006 * shipTotalCost * distance) + (0.0002 * shipTotalCost)) / 100 // (percentage)

					carrierJumpCount = Math.ceil(distance/500)
					carrierTravelTimeInMinutes = 15.5 + 1 + 4 // jump prep (from scheduling, roughly), actual jump (roughly), cooldown
					carrierTravelTime = calculateTimerFromSeconds(carrierTravelTimeInMinutes * 60 * carrierJumpCount)

					carrierJumpCountString = "0 jumps"
					carrierJumpFuelData = calculateSingleJumpFuelCostRange(distance - Math.floor(distance/500))

					if ( carrierJumpCount == 1 ) {
						carrierJumpCountString = "1 jump"
						// fuel use was calculated above so we shouldn't have to worry about it
					} else if ( carrierJumpCount > 1 ) {
						carrierJumpCountString = carrierJumpCount + " jumps"

						// now calculate how much fuel we'll use for our 500Ly jump(s) one at a time
						carrierJumpMaxFuelUse = calculateSingleJumpFuelCostRange(500)

						// and then multiply by however many we've got and add it directly into our existing numbers
						carrierJumpFuelData[0] += ( carrierJumpMaxFuelUse[0] * Math.floor(distance/500) )
						carrierJumpFuelData[1] += ( carrierJumpMaxFuelUse[1] * Math.floor(distance/500) )

					}

					returnedEmbedObject.title = 'Distance between `' + system1info.name + '` and `' + system2info.name + '`';
					returnedEmbedObject.description = '**```' + distance + ' Ly```**';

					shipTransferInfoText  = "**Time**: " + shipTransferTime + "\n"
					shipTransferInfoText += "**Cost**: "+ shipTransferCostPercentage.toFixed(4) +"% of ship value\n"
					shipTransferInfoText += "**Find a Shipyard**: <https://inara.cz/nearest-stations/?pa1%5B14%5D=1>"
					carrierJumpFuelUseString = carrierJumpFuelData[0] + " to " + carrierJumpFuelData[1] + " tons"


					fleetCarrierInfoText = "**Jumps**: "+ carrierJumpCountString +"\n"
					fleetCarrierInfoText += "**Fuel Used**: "+ carrierJumpFuelUseString +"\n"
					fleetCarrierInfoText += "**Credits Used**: "+ Number(carrierJumpCount * 100000).toLocaleString('en-US') +" cr\n"
					fleetCarrierInfoText += "**Total time**: "+ carrierTravelTime +"\n"


					fleetCarrierInfoText += "**Plot a route**: <https://www.spansh.co.uk/fleet-carrier/>" //results/?destinations=%5B%22" +system1info.name+ "%22%5D&source=" +system2info.name+ "&used_capacity=7150>"

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

					writeLog( 'Distance between ' + system1info.name + ' and ' + system2info.name + ': ' + distance + ' Ly', 'EDSM SysDist' );
					callback( returnedEmbedObject );
				} else {
					returnedEmbedObject.description = ':x: Could not locate one of the systems!';
					callback( returnedEmbedObject );
				}
			} );
		} else {
			returnedEmbedObject.description = ':x: Could not locate one of the systems!';
			callback( returnedEmbedObject );
		}
	} );
}

function calculateSingleJumpFuelCostRange ( distance ) {

	maximumCarrierHold = 25000 // all carriers have this maximum value

	maximumTritiumDepotHold = 1000 // calculated, but kept outside the cargo hold's counter
	basicServicesInstalledHoldUse = 500 + 180 + 250 // refuel, repair & rearm services
	turnInOfficesInstalledHoldUse = 100 + 250 + 120 // redemption office, smuggling warehouse, and cartographics
	shipManagementServicesHoldUse = 3000 + 1750 // shipyard & outfitting (with no stock)
	additionalCargoToCalculate = 0 // for outfitting/shipyard packages, un-depot'd fuel, and raw cargo from the market and the smuggler warehouse

	currentCarrierHold = basicServicesInstalledHoldUse + shipManagementServicesHoldUse + additionalCargoToCalculate + turnInOfficesInstalledHoldUse

	baseJumpCost = 5 // every jump, no matter how many light years, will use this much fuel plus
	baseEfficiency = 8 


	minimumUsage = Math.ceil( baseJumpCost + ( ( distance / baseEfficiency ) * ( 1 + ((maximumTritiumDepotHold + currentCarrierHold) / maximumCarrierHold ) ) ) )

	maximumUsage = Math.ceil( baseJumpCost + ( ( distance / baseEfficiency ) * ( 1 + ((maximumTritiumDepotHold + maximumCarrierHold) / maximumCarrierHold ) ) ) )

	return [minimumUsage, maximumUsage]
}

function calculateTimerFromSeconds ( seconds ) {
	const days = Math.floor( seconds / ( 3600 * 24 ) ); // calculate how many whole days we have
	seconds -= days * 3600 * 24; // subtract that from our counter (after converting back to seconds)
	const hrs = Math.floor( seconds / 3600 ); // then calculate how many hours are left
	seconds -= hrs * 3600; // and subtract the same
	const mnts = Math.floor( seconds / 60 ); // then again for minutes
	seconds -= mnts * 60; // and subtract the same
	return days + "d " + hrs + "h " + mnts + "m" // + seconds + "s" // then return all of them
}

function getInformationAboutSystem( input, callback ) { // Query EDSM for the details about a system
	const returnedEmbedObject = {
		timestamp
		, footer: {
			icon_url: configuration.icons.boticon
			, text: botName
		}
		, author: {
			name: 'System Information'
			, icon_url: configuration.icons.edsm
		}
		, color: 0x16475B
		, title: 'Error!'
		, description: ':x: No systems found.'
		, fields: []
	};
	getEdsmApiResult( 'system?showId=1&showCoordinates=1&showPermit=1&showInformation=1&systemName=' + encodeURIComponent( input ), systeminfo => {
		writeLog( 'Got EDSM Info for ' + input.toString(), 'EDSM SysInfo' );
		//console.log(systeminfo)
		if ( systeminfo.name !== undefined ) {
			writeLog( 'Info for ' + input.toString() + ' looks OK.', 'EDSM SysInfo' );
			returnedEmbedObject.title = 'System Information for __' + systeminfo.name + '__';
			returnedEmbedObject.description = 'EDSM:  *<https://www.edsm.net/en/system/id/' + systeminfo.id + '/name/' + encodeURIComponent( systeminfo.name ) + '>*';
			if ( systeminfo.information.eddbId !== undefined ) {
				returnedEmbedObject.description += '\nEDDB:  *<https://eddb.io/system/' + systeminfo.information.eddbId + '>*';
			}
			// link to an inara search page with the system name
			returnedEmbedObject.description += "\nInara: <https://inara.cz/starsystem/?search=" + encodeURIComponent( systeminfo.name ) + '>';
			returnedEmbedObject.fields[ 0 ] = {
				name: '__Controlled by__',
				value: 'Nobody, uninhabited',
				inline: false
			};
			if ( systeminfo.information.faction !== undefined && systeminfo.information.faction !== null ) {
				returnedEmbedObject.fields[ 0 ].value = systeminfo.information.faction;
				if ( systeminfo.information.allegiance !== undefined && systeminfo.information.allegiance !== null ) {
					returnedEmbedObject.fields[ 0 ].value += ', a ' + systeminfo.information.allegiance + '-aligned';
					if ( systeminfo.information.government !== undefined && systeminfo.information.government !== null ) {
						returnedEmbedObject.fields[ 0 ].value += ' ' + systeminfo.information.government + ' faction.';
					} else { // No govt available, just say 'a X-aligned faction'
						returnedEmbedObject.fields[ 0 ].value += ' faction.';
					}
				}
				// link to minor faction's page on inara
				returnedEmbedObject.fields[ 0 ].value += "\nInara: <https://inara.cz/minorfaction/?search=" + encodeURIComponent( systeminfo.information.faction ) +">"
			}
			if ( systeminfo.information.factionState !== undefined && systeminfo.information.factionState !== null ) {
				returnedEmbedObject.fields.push( {
					name: '__State__'
					, value: systeminfo.information.factionState
					, inline: true
				} );
			}
			if ( systeminfo.information.population !== undefined && systeminfo.information.population !== null ) {
				returnedEmbedObject.fields.push( {
					name: '__Population__'
					, value: Number(systeminfo.information.population).toLocaleString('en-US')
					, inline: true
				} );
			}
			if ( systeminfo.information.security !== undefined && systeminfo.information.security !== null ) {
				returnedEmbedObject.fields.push( {
					name: '__Security__'
					, value: systeminfo.information.security
					, inline: true
				} );
			}
			if ( systeminfo.information.economy !== undefined && systeminfo.information.economy !== null ) {
				economyString = systeminfo.information.economy
				if ( systeminfo.information.secondEconomy !== undefined && systeminfo.information.secondEconomy !== null ) {
					economyString += " & " + systeminfo.information.secondEconomy
				}
				returnedEmbedObject.fields.push( {
					name: '__Economy__'
					, value: economyString
					, inline: true
				} );
			}
			if ( systeminfo.information.reserve !== undefined && systeminfo.information.reserve !== null ) {
				returnedEmbedObject.fields.push( {
					name: '__Reserves__'
					, value: systeminfo.information.reserve
					, inline: true
				} );
			}
		}
		callback( returnedEmbedObject );
	} );
}

function getCurrentGameTime( input, callback ) { // Calculate current game time
	callback( {
		footer: {
			icon_url: configuration.icons.boticon
			, text: botName
		}
		, author: {
			name: 'Current In-Game Time'
			, icon_url: configuration.icons.gametime
		}
		, color: 0x0a8bd6
		, title: '\n**```' + timestamp.replace( /T/, ' ' )
			.replace( /\..+/, '' ) + '```**'
		, fields: []
	} );
}

function botManagement ( incomingArgument, callback ) { // do server/bot management stuff

	const returnedEmbedObject = {
		footer: {
			icon_url: configuration.icons.boticon
			, text: botName
		}
		, title: 'empty title'
		, description: 'empty description'
		, fields: []
	};
	let arguments = incomingArgument.split(' ')

	if (arguments[0] == 'server') { //server-specific management command

		if (arguments.length < 2 ) { // make sure we have enough arguments (not counting the main command, there's 'server', the Id, and the subcommand, and the possibility of an argument for nicknames on another)
			throw 'Please specify a server Id and a server-specific command'
		}

		// this one is a mess
		try {
			targetGuild = client.guilds.resolve(arguments[1])
		} catch (error) {
			throw "Couldn't resolve that server's Id. Error: "+ error
		}

		// main logic for commands

		if (arguments[2] == 'setnick') { // set nickname
			if (arguments.length < 2) {
				throw "specify a server id"
			}
			newNick = null
			if (arguments.length > 3) { // we've got a new nickname to set
				newNick = arguments.slice(3).join(' ')
			}
			


			myUserOnGuild = targetGuild.members.resolve(client.user.id)
			myUserOnGuild.setNickname(newNick,"Set by bot administrator")
			.then(value => {
					writeLog('Set bot\'s nickname on *' + targetGuild.toString() + '* to `'+ newNick +'`.', 'Management')
					returnedEmbedObject.title = 'Success!'
					returnedEmbedObject.description = 'Set bot\'s nickname on *' + targetGuild.toString() + '* to `'+ newNick +'`.'
					callback(returnedEmbedObject)
				}
			)
			.catch( err => { throw "Couldn't set nickname! Error: " + err }	)


		} else if (arguments[2] == "leave") { // forces bot to leave a server
			guildToLeave = client.guilds.resolve(arguments[1])
			guildToLeave.leave()

			writeLog('Left server `'+servername+'`', 'Management')
			returnedEmbedObject.title = 'Success!'
			returnedEmbedObject.description = 'Left server ' + guildToLeave.toString()
			callback(returnedEmbedObject)

		} else if (arguments[2] == "list" || arguments[2] == "listchannels" ) { 
			guildToScan = client.guilds.resolve(arguments[1])
			let clientchannels = guildToScan.channels.cache
			channelInfo = clientchannels.map(element => { return { id: element.id, name: element.name, guildId: element.guildId, type: element.type } })

			for ( channel in channelInfo ) {
				if ( channelInfo[channel].guildId !== guildToScan.id ) {
					writeLog("Got some garbage data in the channel lister?","Warning")
				} else {
					if ( channelInfo[channel].type == "GUILD_TEXT" ) {
						returnedEmbedObject.fields.push({
							name: channelInfo[channel].name,
							value: channelInfo[channel].id,
							inline: true
						})
					}
				}
			}

			returnedEmbedObject.title = "**" + guildToScan.name + "** *(" + guildToScan.id + ")*"
			returnedEmbedObject.description = "Channel listing (GUILD_TEXT only)"
			callback(returnedEmbedObject)
		}

	} else if (arguments[0] == 'broadcast') {
		let clientguilds = client.guilds.cache
		let clientchannels = client.channels.cache
		let clientusers = client.users.cache

		guildInfo = clientguilds.map(element => { return { id: element.id, ownerId: element.ownerId, systemChannelId: element.systemChannelId } })
		
		// for debugging
		guildInfo = []

		// but leave this one
		guildInfo.push({id: null, ownerId: configuration.adminUserId, systemChannelId: configuration.channelId})
		console.log(guildInfo)


		const returnedEmbedObject = {
			timestamp
			, footer: {
				icon_url: configuration.icons.boticon
				, text: botName
			}
			, title: "Message from Bot Admin"
			, description: "<message text>"
			, fields: [{ name:"Bot Admin:", value: client.users.resolve(configuration.adminUserId).tag, inline: false}]
		};

		for (guild in guildInfo) {
			// pick out our channel
			targetChannel = null
			if ( guildInfo[guild].systemChannelId == null ) {
				// some servers don't have it set
				// so we have to assume that the default channel will get the message.
				if ( guildInfo[guild].id == null ) {
					// we shouldn't ever see this
					// unless someone doesn't set a channel Id for debugs/errors to always be routed to.
					throw "iterating through target channels failed: a server we're on has no server Id?? did you set a channelId in the configuration?"
				} else {
					targetChannel = guildInfo[guild].id
				}
			} else {
				// ok we have a systems channel set in that guild's config
				targetChannel = guildInfo[guild].systemChannelId
			}

			// todo: determine if we have read and send message/embed permissions
			targetChannelObj = client.channels.resolve(targetChannel)


			targetChannelObj.send({embeds: [returnedEmbedObject]})
		}


	} else if (arguments[0] == 'listservers' || arguments[0] == 'servers' || arguments[0] == 'serverlist' || arguments[0] == 'list') {

		let clientguilds = client.guilds.cache
		let clientchannels = client.channels.cache
		let clientusers = client.channels.cache

		guildIdList = clientguilds.map(element => { return element.id } )

		returnedEmbedObject.title = 'Server Listing'
		returnedEmbedObject.description = 'Listing of all servers bot is connected to.'
		
		for (var i = 0; i < guildIdList.length; i++) {
			targetGuild = client.guilds.resolve(guildIdList[i])
			if (targetGuild === null) {
				writeLog("guild with unresolved id detected! must be uncached.","BotManagement/"+arguments[0])
			}
			guildSysChannel = client.channels.resolve(targetGuild.systemChannelId)
			guildOwner = client.users.resolve(targetGuild.ownerId)
			console.log(targetGuild)
			console.log(guildSysChannel)
			console.log(guildOwner)
			guildOwnerTag = "*[" + targetGuild.ownerId +"]*" 
			if ( guildOwner !== null ) {
				guildOwnerTag = "`" + guildOwner.tag + "`" 
			}
			guildSysChannelText = "*[" + targetGuild.systemChannelId +"]*"
			if (guildSysChannel !== null) {
				guildSysChannelText = "`#"+guildSysChannel.name+"` (" + targetGuild.systemChannelId +")"
			}

			returnedEmbedObject.fields.push({
				name: targetGuild.name + " (" +targetGuild.id+ ")",
				value: "Owner: "+ guildOwnerTag + "\nsysChannel: "+guildSysChannelText,
				inline: true
			})
		}

		writeLog('Sent server list.','Management')
		callback(returnedEmbedObject)

	} else if (arguments[0] == 'setgame') { // currentgame
		newActivity = configuration.currentGame
		if (arguments.length > 1) { // if we were given a new string, use it!
			newActivity = arguments.slice(1).join(' ')
		}
		client.user.setPresence({ activities: [{ name: newActivity, type: 0 }], status: 'online' })

		writeLog( 'Currently Playing Game set to: ' + newActivity, 'Management' )
		returnedEmbedObject.title = 'Success!'
		returnedEmbedObject.description = 'Set the Currently Playing Game message to `'+ newActivity +'`. This change will revert when the bot next restarts.'
		callback(returnedEmbedObject)
	} else if (arguments[0] == 'setcmdprefix') { // cmd prefix temp override
		throw 'can only be changed in configuration. sorry.'

	} else if (arguments[0] == 'msg' || arguments[0] == 'send') { // sends a message
		destChannel = client.channels.resolve(arguments[1])
		if ( destChannel != null ) {
			destChannel.send({content:":mega: " + arguments.slice(2).join(" ")})
		} else {
			throw "channel selection invalid"
		}

	} else if (arguments[0] == 'die' || arguments[0] == 'restart') { // restarts the bot (by way of exiting it and starting it again via bash script)
		writeLog( 'Restart command given by admin', 'Administrative' )
		callback({title:':wave:',description:"Restarting...",timestamp,footer:{text:botName,icon:configuration.icons.boticon}})
		client.user.setPresence({ activities: [{ name: "🔄 Restarting...", type: 0 }], status: 'away' })
		setTimeout((client.destroy()),1000)
		

	} else if (arguments[0] == 'help') { // help sub-page
		const returnedEmbedObject = { // totally overwrites the one set outside the logic above. this is intentional.
			timestamp,
			footer: {
				icon_url: configuration.icons.boticon,
				text: botName,
			},
			author: {
				name: 'Bot Mgmt Help',
				icon_url: configuration.icons.help
			},
			title: 'Bot Management Help Sub-Page',
			description: 'Only usable by bot owner: <@' + configuration.adminUserId + '>',
			fields: []
		};
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement help'
			, value: 'This output'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement broadcast <string>'
			, value: 'Sends a message to the default channel of every Discord the bot is on'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement setgame <string>'
			, value: 'Temporarily sets the current game the bot is "playing" to <string> (or resets it if nothing is specified)'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement listservers'
			, value: 'Lists servers the bot is on & their owners'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement send|msg <channelId> <string>'
			, value: 'Sends a message to a channel via the bot.'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement die|restart'
			, value: 'Exits the bot completely.'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverId> leave'
			, value: 'Forces the bot to leave <serverId>'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverId> setnick <string>'
			, value: 'Changes the bot\'s nickname on <serverId> (or resets it if nothing is specified)'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverId> list[channels]'
			, value: 'Lists channels known to the bot on <serverId>'
			, inline: true
		} );
		callback (returnedEmbedObject)
	} else {
		throw 'Please specify a valid sub-command.'
	}

}


let currenttime;
let timestamp;
let serverId;
let channel;
let server;
let messageId;
let command;
let commandArgument;
function processMessage (messageObject) {
	user = messageObject.author.tag // client username
	userId = messageObject.author.id // client userid
	channelId = messageObject.channel.id // channel id of message
	message = messageObject.content // contents of message

	if ( userId === channelId ) { // ignore DMs
		writeLog("Ignoring DM from "+messageObject.author.tag, "Discord", false)
		return
	}

	serverId = messageObject.channel.guild.id // server's Id
	server = messageObject.channel.guild.name // server's name
	channel = '#' + messageObject.channel.name // channel's name

	//create a timestamp to apply to the message embeds
	currenttime = new Date().toISOString();
	timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + currenttime.split( /-(.+)/, 2 )[ 1 ];

	// chop up our messages
	command = message.split( ' ', 1 )
		.join( ' ' )
		.toLowerCase()
	commandArgument = message.split( ' ' )
		.slice( 1 )
		.join( ' ' )
	writeLog( '<' + user + '> ' + message, 'Channel('+channelId+') - ' + server + '/' + channel, message.startsWith( configuration.commandPrefix ) ) // log everything to stdout, but log command usage to file

	if ( command == configuration.commandPrefix + 'ping' ) { // send a embed to the channel as a testing thing.
		messageObject.reply({
			content: 'Embed permissions are required for this bot. If nothing shows up below this message, please enable them.',
			embeds: [ {
				title: 'Pong!',
				description: ':heavy_check_mark: Pong!',
				color: 0x64C764,
				url: 'https://github.com/rglx/new-ed-info',
				fields: [
					{
						name: 'Hey ' + user + '!',
						value: 'It works!',
						inline: true
					}
				],
				footer: {
					icon_url: configuration.icons.boticon,
					text: botName
				},
				author: {
					name: 'Permissions Tester',
					icon_url: configuration.icons.help
				}
			} ]
		})
	} else if ( command === configuration.commandPrefix + 'help' ) { // Help page
		const returnedEmbedObject = {
			timestamp
			, footer: {
				icon_url: configuration.icons.boticon
				, text: botName
			}
			, author: {
				name: 'Help'
				, icon_url: configuration.icons.help
			}
			, title: 'Help Page'
			, description: '**' + botName + ' v' + botVersion + ' by ' + botAuthor + '** - Direct complaints to `/dev/null`\n    Source available on GitHub: <https://github.com/rglx/new-ed-info>\n    Support development by making FDev play nice with devs like us.\n    Add this bot to your server: <https://discordapp.com/oauth2/authorize?client_id=' + client.user.id + '&scope=bot&permissions=104321088>'
			, fields: []
		};
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'help'
			, value: 'This output :)'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'ping'
			, value: 'Tests if the bot works and has permissions to display returned information.'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'time'
			, value: 'Returns current ingame date and time.'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'whois <cmdr>'
			, value: 'Searches INARA for <cmdr>\n    Support INARA! <https://inara.cz/>'
			, inline: false
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'dist[ance] <system1>, <system2>'
			, value: 'Queries EDSM for the distance between two systems.\n    Support EDSM! <https://www.edsm.net/en/donation>'
			, inline: false
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'sys[tem] <system>'
			, value: 'Queries EDSM for specific details about a system.\n    Support EDSM! <https://www.edsm.net/en/donation>'
			, inline: false
		} );
		if ( userId.toString() === configuration.adminUserId ) {
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'botmanagement help'
				, value: 'Bot Management Help Sub-Page (Only usable by ' + client.users.resolve(configuration.adminUserId).tag + ')'
				, inline: true
			} );
		}
		messageObject.reply({embeds: [ returnedEmbedObject ]});
		writeLog( 'Sent help page', 'Discord' );
	}
	else if ( command === configuration.commandPrefix + 'whois' ) { // INARA Searcher system
		try {
			messageObject.channel.sendTyping() // stops after ten seconds
			getCmdrInfoFromInara( commandArgument, embeddedObject => {
				messageObject.reply( { embeds: [ embeddedObject ] } )
			} );
		} catch ( err ) {
			messageObject.reply(':sos: **An error occured!**\nBot administrator `' +client.users.resolve(configuration.adminUserId).tag+ '` has been notified.')
			client.channels.resolve(configuration.channelId).send({content: "<@"+configuration.adminUserId+">", embeds: [{ timestamp, title: ':sos:', description:'**An error occured!**', fields: [{name: "getCmdrInfoFromInara()", value: "`" + err + "`", inline: false }]}]})
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'dist' || command === configuration.commandPrefix + 'distance' ) { // edsm two systems distance fetcher
		try {
			messageObject.channel.sendTyping() // stops after ten seconds
			getDistanceBetweenTwoSystems( commandArgument, embeddedObject => {
				messageObject.reply( { embeds: [ embeddedObject ] } )
			} );
		} catch ( err ) {
			messageObject.reply(':sos: **An error occured!**\nBot administrator `' +client.users.resolve(configuration.adminUserId).tag+ '` has been notified.')
			client.channels.resolve(configuration.channelId).send({content: "<@"+configuration.adminUserId+">", embeds: [{ timestamp, title: ':sos:', description:'**An error occured!**', fields: [{name: "getDistanceBetweenTwoSystems()", value: "`" + err + "`", inline: false }]}]})
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'system' || command === configuration.commandPrefix + 'sys' ) { // edsm system info
		try {
			messageObject.channel.sendTyping() // stops after ten seconds
			getInformationAboutSystem( commandArgument, embeddedObject => {
				messageObject.reply( { embeds: [ embeddedObject ] } )
			} );
		} catch ( err ) {
			messageObject.reply(':sos: **An error occured!**\nBot administrator `' +client.users.resolve(configuration.adminUserId).tag+ '` has been notified.')
			client.channels.resolve(configuration.channelId).send({content: "<@"+configuration.adminUserId+">", embeds: [{ timestamp, title: ':sos:', description:'**An error occured!**', fields: [{name: "getInformationAboutSystem()", value: "`" + err + "`", inline: false }]}]})
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'time' ) { // Game-time fetcher
		try {
			getCurrentGameTime( commandArgument, embeddedObject => {
				messageObject.reply( { embeds: [ embeddedObject ] } )
			} );
		} catch ( err ) {
			messageObject.reply(':sos: **An error occured!**\nBot administrator `' +client.users.resolve(configuration.adminUserId).tag+ '` has been notified.')
			client.channels.resolve(configuration.channelId).send({content: "<@"+configuration.adminUserId+">", embeds: [{ timestamp, title: ':sos:', description:'**An error occured!**', fields: [{name: "getCurrentGameTime()", value: "`" + err + "`", inline: false }]}]})
			writeLog( err, 'Error' )
		}
	}
	if ( userId.toString() == configuration.adminUserId ) { //admin commands
		if ( command === configuration.commandPrefix + 'botmanagement' ) {
			try {
				botManagement( commandArgument, embeddedObject => {
					messageObject.reply( { embeds: [ embeddedObject ] } );
				} );
				writeLog( 'BotAdmin ran botManagement('+commandArgument+') successfully', 'Discord' )
			} catch ( err ) {
				messageObject.reply(':sos: **An error occured!**\nBot administrator `' +client.users.resolve(configuration.adminUserId).tag+ '` has been notified.')
				client.channels.resolve(configuration.channelId).send({content: "<@"+configuration.adminUserId+">", embeds: [{ timestamp, title: ':sos:', description:'**An error occured!**', fields: [{name: "botManagement()", value: "`" + err + "`", inline: false }]}]})
				writeLog( err, 'Error' )
			}
		}
	}
}



// DISCORD BOT INTERFACES
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS] });

client.on( 'ready', () => {
	writeLog( 'User Id: ' + client.user.id + ' Bot User: ' + client.user.tag, 'Discord' );
	writeLog( 'Add to your server using this link: ', 'Discord' );
	writeLog( ' https://discordapp.com/oauth2/authorize?client_id=' + client.user.id + '&scope=bot&permissions=104321088 ', 'Discord' );
	writeLog( '*** Bot ready! ***', 'Discord' );
	client.user.setPresence({ activities: [{ name: configuration.currentGame, type: 0 }], status: 'online' })
});

client.on( 'messageCreate', msg => {
	processMessage(msg)
});

client.once( 'ready', () => {
	debugChannel = client.channels.resolve(configuration.channelId)
	debugChannel.send({content: ':ok: ' + botName + ' `v' + botVersion + '` by '+ botAuthor +' Back online! Type `' + configuration.commandPrefix + 'help` for a list of commands.'})
} );

client.login(configuration.authToken);
