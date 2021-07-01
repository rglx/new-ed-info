// E:D Info Discord Bot
// by CMDRs DJ Arghlex & willyb321

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
const botAuthor = 'CMDRs DJ Arghlex and willyb321';
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
	const cmdrDetailsTableCreditStringDeformatting = /<span class="minor crly">(.*?)<\/span>/ // "cr" formatting

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
							, color: 0x0a8bd6
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
									, color: 0x0a8bd6
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
		, color: 0x0a8bd6
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
					const distance = mathjs.distance( system1coords, system2coords )
						.toFixed( 2 );
					seconds = distance * 9.75 + 300;
					const days = Math.floor( seconds / ( 3600 * 24 ) );
					seconds -= days * 3600 * 24;
					const hrs = Math.floor( seconds / 3600 );
					seconds -= hrs * 3600;
					const mnts = Math.floor( seconds / 60 );
					seconds -= mnts * 60;
					returnedEmbedObject.title = 'Distance between `' + system1 + '` and `' + system2 + '`';
					returnedEmbedObject.description = '**```' + distance + ' Ly```**';
					returnedEmbedObject.description += '\n**Ship transfer time: `' + days + 'd ' + hrs + 'h ' + mnts + 'm`**';
					writeLog( 'Distance between ' + system1 + ' and ' + system2 + ': ' + distance + ' Ly', 'EDSM SysDist' );
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
		, color: 0x0a8bd6
		, title: 'Error!'
		, description: ':x: No systems found.'
		, fields: []
	};
	getEdsmApiResult( 'system?showId=1&showCoordinates=1&showPermit=1&showInformation=1&systemName=' + encodeURIComponent( input ), systeminfo => {
		writeLog( 'Got EDSM Info for ' + input.toString(), 'EDSM SysInfo' );
		if ( systeminfo.name !== undefined ) {
			writeLog( 'Info for ' + input.toString() + ' looks OK.', 'EDSM SysInfo' );
			returnedEmbedObject.title = 'System Information for __' + systeminfo.name + '__';
			returnedEmbedObject.description = 'EDSM:  *<https://www.edsm.net/en/system/id/' + systeminfo.id + '/name/' + encodeURIComponent( systeminfo.name ) + '>*';
			if ( systeminfo.information.eddbId !== undefined ) {
				returnedEmbedObject.description += '\nEDDB:  *<https://eddb.io/system/' + systeminfo.information.eddbId + '>*';
			}
			returnedEmbedObject.fields[ 0 ] = {
				name: '__Controlled by__'
				, value: '<ERROR - CONTACT EDSM>'
			};
			if ( systeminfo.information.faction !== undefined ) {
				returnedEmbedObject.fields[ 0 ].value = systeminfo.information.faction;
			}
			if ( systeminfo.information.allegiance !== undefined ) {
				returnedEmbedObject.fields[ 0 ].value += ', a ' + systeminfo.information.allegiance + '-aligned';
				if ( systeminfo.information.government !== undefined ) {
					returnedEmbedObject.fields[ 0 ].value += ' ' + systeminfo.information.government + ' faction.';
				} else { // No govt available, just say 'a X-aligned faction'
					returnedEmbedObject.fields[ 0 ].value += ' faction.';
				}
			}
			if ( systeminfo.information.factionState !== undefined ) {
				returnedEmbedObject.fields.push( {
					name: '__State__'
					, value: systeminfo.information.factionState
					, inline: true
				} );
			}
			if ( systeminfo.information.population !== undefined ) {
				returnedEmbedObject.fields.push( {
					name: '__Population__'
					, value: systeminfo.information.population
					, inline: true
				} );
			}
			if ( systeminfo.information.security !== undefined ) {
				returnedEmbedObject.fields.push( {
					name: '__Security__'
					, value: systeminfo.information.security
					, inline: true
				} );
			}
			if ( systeminfo.information.economy !== undefined ) {
				returnedEmbedObject.fields.push( {
					name: '__Economy__'
					, value: systeminfo.information.economy
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

		if (arguments.length < 2 ) { // make sure we have enough arguments (not counting the main command, there's 'server', the ID, and the subcommand, and the possibility of an argument for nicknames on another)
			throw 'Please specify a server ID and a server-specific command'
		}

		// this one is a mess
		try {
			targetGuild = client.guilds.resolve(arguments[1])
		} catch (error) {
			throw "Couldn't resolve that server's ID. Error: "+ error
		}

		// main logic for commands

		if (arguments[2] == 'setnick') { // set nickname
			newnick = arguments.slice(3).join(' ')

			myUserOnGuild = targetGuild.members.resolveID(client.user.id)
			myUserOnGuild.setNickname(newnick,"Set by bot administrator")
			.then(value => {
					writeLog('Set bot\'s nickname on *' + targetGuild.toString() + '* to `'+ newnick +'`.', 'Management')
					returnedEmbedObject.title = 'Success!'
					returnedEmbedObject.description = 'Set bot\'s nickname on *' + targetGuild.toString() + '* to `'+ newnick +'`.'
					callback(returnedEmbedObject)
					return
				}
			)
			.catch( err => { throw "Couldn't set nickname! Error: " + err }	)


		} else if (arguments[2] == "leave") { // forces bot to leave a server

			guildToLeave = client.guilds.resolveID(arguments[1])
			guildToLeave.leave()

			writeLog('Left server `'+servername+'`', 'Management')
			returnedEmbedObject.title = 'Success!'
			returnedEmbedObject.description = 'Left server ' + guildToLeave.toString()
			callback(returnedEmbedObject)
			return

		}

	} else if (arguments[0] == 'broadcast') {
		throw "needs to be rewritten. sorry."
		/*for (server in client.guilds.fetch()) {
			const returnedEmbedObject = {
				timestamp
				, footer: {
					icon_url: configuration.icons.boticon
					, text: botName
				}
				, title: 'Message from Bot Administrator <@' + configuration.adminUserId + '> ('+ client.users.resolveID(configuration.adminUserId) +')'
				, description: arguments.slice(1).join(' ')
				, fields: []
			};
			bot.sendMessage( {
				to: bot.servers[server]['guild_id']
				, { embed: returnedEmbedObject }
			} );
		}*/


	} else if (arguments[0] == 'listservers') {
		throw "needs to be rewritten. sorry."
		/*returnedEmbedObject.title = 'Server Listing'
		returnedEmbedObject.description = 'Listing of all servers bot is connected to.'
		client.guilds.fetch().then(
			for (guild in client.guilds.cache) {
				client.users.fetch(server.ownerID)

			}
		);
			returnedEmbedObject.fields.push( {
				name: server.toString() + "(" + server.id + ")"
				, value: "Owner: <@" + server.ownerID + "> ("+ .then(tag +")"
				, inline: true
			} );
		writeLog('Sent server list.','Management')
		callback(returnedEmbedObject)
		return*/

	} else if (arguments[0] == 'setgame') { // currentgame
		throw "needs to be rewritten. sorry."
		/*client.presence = arguments.slice(1)
		writeLog( 'Currently Playing Game set to: ' + arguments.slice(1).join(' '), 'Management' )

		writeLog('Overwrote command prefix to `'+arguments.slice(1).join(' ')+'`', 'Management')
		returnedEmbedObject.title = 'Success!'
		returnedEmbedObject.description = 'Set the Now Playing message to `'+ arguments.slice(1).join(' ') +'`. This change will revert when the bot next restarts.'
		callback(returnedEmbedObject)
		return*/


	} else if (arguments[0] == 'setcmdprefix') { // cmd prefix temp override
		throw 'can only be changed in configuration. sorry.'


	} else if (arguments[0] == 'help') { // help sub-page
		const returnedEmbedObject = { // totally overwrites the one set outside the logic above. this is intentional.
			timestamp
			, footer: {
				icon_url: configuration.icons.boticon
				, text: botName
			}
			, author: {
				name: 'Bot Mgmt Help'
				, icon_url: configuration.icons.help
			}
			, title: 'Bot Management Help Sub-Page'
			, description: 'Only usable by bot owner: <@' + configuration.adminUserId + '>'
			, fields: []
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
			, value: 'Temporarily sets the current game the bot is "playing" to <string>'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement listservers'
			, value: 'Lists servers the bot is on & their owners'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverID> leave'
			, value: 'Forces the bot to leave <serverID>'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverID> setnick <nickname>'
			, value: 'Changes the bot\'s nickname on <serverID>'
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
	message = messageObject.toString() // contents of message

	if ( userId === channelId ) { // ignore DMs
		writeLog("Ignoring DM from "+messageObject.author.tag, "Discord", false)
		return
	}

	serverId = messageObject.guild.id // server's ID
	server = messageObject.guild.toString() // server's name
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
	writeLog( '<' + user + '> ' + message, 'Channel - ' + server + '/' + channel, message.startsWith( configuration.commandPrefix ) ) // log everything to stdout, but log command usage to file

	if ( command == configuration.commandPrefix + 'ping' ) { // send a message to the channel as a ping-testing thing.
		messageObject.reply(':heavy_check_mark: <@' + userId + '>: Pong!')
	} else if ( command == configuration.commandPrefix + 'ping-embed' ) { // send a embed to the channel as a ping-testing thing.
		messageObject.reply( 
			{'embed': {
				'title': 'Pong!'
				, 'description': ':heavy_check_mark: Pong!'
				, 'color': 0x0a8bd6
				, 'url': 'https://github.com/rglx/new-ed-info'
				, 'fields': [ {
					'name': 'Hey ' + user + '!'
					, 'value': 'It works!'
					, 'inline': true
				} ]
			}}
		)
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
			, value: 'This output'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'ping'
			, value: 'Returns pong'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'ping-embed'
			, value: 'Returns a fancy pong'
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
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'dist[ance] <system1>, <system2>'
			, value: 'Queries EDSM for the distance between two systems.\n    Support EDSM! <https://www.edsm.net/en/donation>'
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'sys[tem] <system>'
			, value: 'Queries EDSM for specific details about a system.\n    Support EDSM! <https://www.edsm.net/en/donation>'
		} );
		if ( userId.toString() === configuration.adminUserId ) {
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'botmanagement help'
				, value: 'Bot Management Help Sub-Page (Only usable by <@' + configuration.adminUserId + '>)'
				, inline: true
			} );
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'restart'
				, value: 'Restarts the bot. (Only usable by <@' + configuration.adminUserId + '>)'
				, inline: true
			} );
		}
		messageObject.reply( { embed : returnedEmbedObject} );
		writeLog( 'Sent help page', 'Discord' );
	}
	else if ( command === configuration.commandPrefix + 'whois' ) { // INARA Searcher system
		try {
			messageObject.channel.startTyping()
			getCmdrInfoFromInara( commandArgument, embeddedObject => {
				messageObject.reply( {
					embed: embeddedObject
				} ).then (
					messageObject.channel.stopTyping()
				);
			} );
		} catch ( err ) {
			messageObject.reply('<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n whoisCmdr(): getCmdrInfoFromInara(): ' + err)
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'dist' || command === configuration.commandPrefix + 'distance' ) { // edsm two systems distance fetcher
		try {
			messageObject.channel.startTyping()
			getDistanceBetweenTwoSystems( commandArgument, embeddedObject => {
				messageObject.reply( {
					embed: embeddedObject
				} ).then (
					messageObject.channel.stopTyping()
				);
			} );
		} catch ( err ) {
			messageObject.reply('<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n getDistanceBetweenTwoSystems(): ' + err)
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'system' || command === configuration.commandPrefix + 'sys' ) { // edsm system info
		try {
			messageObject.channel.startTyping()
			getInformationAboutSystem( commandArgument, embeddedObject => {
				messageObject.reply( {
					embed: embeddedObject
				} ).then (
					messageObject.channel.stopTyping()
				);
			} );
		} catch ( err ) {
			messageObject.reply('<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n getInformationAboutSystem(): ' + err)
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'time' ) { // Game-time fetcher
		try {
			getCurrentGameTime( commandArgument, embeddedObject => {
				messageObject.reply( {
					embed: embeddedObject
				} );
			} );
		} catch ( err ) { // You never know.
			messageObject.reply('<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n getCurrentGameTime(): ' + err)
			writeLog( err, 'Error' )
		}
	} else if ( command === configuration.commandPrefix + 'restart' ) { // public
		writeLog( 'Restart command given by admin', 'Administrative' )
		messageObject.reply(':wave:')
		messageObject.channel.stopTyping(true) // forcibly stop typing in the issued channel. here in case we're being restarted because the bot got stuck typing.
		.then( process.exit(0) )
	}
	if ( userId.toString() == configuration.adminUserId ) { //admin commands
		if ( command === configuration.commandPrefix + 'botmanagement' ) {
			try {
				botManagement( commandArgument, embeddedObject => {
					messageObject.reply( {
						embed: embeddedObject
					} );
				} );
				writeLog( 'BotAdmin ran botManagement('+commandArgument+') successfully', 'Discord' )
			} catch ( err ) {
				messageObject.reply('<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n discordBotManage(): `' + err + '`')
				writeLog( err, 'Error' )
			}
		}
	}
}



// DISCORD BOT INTERFACES
const client = new Discord.Client();

client.on('ready', () => {
	writeLog( 'User ID: ' + client.user.id + ' Bot User: ' + client.user.tag, 'Discord' );
	writeLog( 'Add to your server using this link: ', 'Discord' );
	writeLog( ' https://discordapp.com/oauth2/authorize?client_id=' + client.user.id + '&scope=bot&permissions=104321088 ', 'Discord' );
	writeLog( '*** Bot ready! ***', 'Discord' );
	client.presence = configuration.currentGame
	//client.guilds.fetch().then(writeLog('Guilds cache retrieved.',"Discord")) // fetch all guilds ahead of time.
});

client.on('message', msg => {
	processMessage(msg)
});

client.once( 'ready', () => {
	debugChannel = client.channels.resolve(configuration.channelId)
	debugChannel.send(':ok: ' + botName + ' `v' + botVersion + '` by '+ botAuthor +' Back online! Type `' + configuration.commandPrefix + 'help` for a list of commands.')
} );

client.login(configuration.authToken);
