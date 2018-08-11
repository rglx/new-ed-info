// E:D Info Discord Bot
// by CMDRs DJ Arghlex & willyb321

// DEPENDENCIES
console.log( 'Loading dependencies' );
const fs = require( 'fs' ); // Built-in to nodejs
const path = require( 'path' ); // Built-in to nodejs
const Discord = require( 'discord.io' ); // Install using npm
const request = require( 'request' ); // Install using npm
const mathjs = require( 'mathjs' ); // Install using npm
const config = require( 'config' ); // Install using npm

console.log( 'Loading configuration' );
const configuration = config.get( 'configuration' );
const botName = 'New E:D Info'
const botAuthor = 'DJ Arghlex#1729 & willyb321#2816';
const botVersion = '3.3'

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
	const searchResultsRegexp = /Commanders found.*?\/cmdr\/(\d+)/i;
	const cmdrDetailsNameRegexp = /<span class="pflheadersmall">CMDR<\/span> (.*?)<\/td>/i;
	const cmdrDetailsAvatarRegexp = /<td rowspan="4" class="profileimage"><img src="(.*)"><\/td>/i;
	const cmdrDetailsTableRegexp = /<span class="pflcellname">(.*?)<\/span><br>(.*?)<\/td>/gi;
	const loginToSearchRegexp = /You must be logged in to view search results.../;
	try {
		getInaraPage( 'search?location=search&searchglobal=' + encodeURIComponent( name ), searchResults => {
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
									if ( inaraInfo[ inaraInfoEntry ] !== '&nbsp;' && inaraInfo[ inaraInfoEntry ] !== '' && inaraInfo[ inaraInfoEntry ] !== ' ' ) {
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

function botManagement ( argument, callback ) { // do server/bot management stuff

	const returnedEmbedObject = {
		footer: {
			icon_url: configuration.icons.boticon
			, text: botName
		}
		, title: 'empty title'
		, description: 'empty description'
		, fields: []
	};
	let arguments = argument.split(' ')

	if (arguments[0] == 'server') { //server-specific management command

		if (arguments.length < 2 ) { // make sure we have enough arguments (not counting the main command, there's 'server', the ID, and the subcommand, and the possibility of an argument for nicknames on another)
			throw 'Please specify a server ID and a server-specific command'
		}

		// create a list of servers to quickly check against
		let servers = []
		for ( server in bot.servers ) {
			servers.push(bot.servers[server].id)
		}
		if (!servers.includes(arguments[1])) { // and now we check against our self-made list
			throw 'Server ID not found in bot server list.'
		}
		
		servername = bot.servers[ arguments[1] ].name 

		// main logic for commands

		if (arguments[2] == 'setnick') { // set nickname
			newnick = arguments.slice(3).join(' ')
			
			bot.editNickname( {
				serverID: serverId
				, userID: bot.id
				, nick: newnick
			} )

			writeLog('Overwrote command prefix to `'+arguments.slice(1).join(' ')+'`', 'Management')
			returnedEmbedObject.title = 'Success!'
			returnedEmbedObject.description = 'Set bot\'s nickname on *' + bot.servers[ arguments[1] ].name + '* to `'+ newnick +'`.'
			callback(returnedEmbedObject)
			return

		} else if (arguments[2] == "leave") { // forces bot to leave a server
			bot.leaveServer(arguments[1])

			writeLog('Left server `'+servername+'`', 'Management')
			returnedEmbedObject.title = 'Success!'
			returnedEmbedObject.description = 'Left server *servername*'
			callback(returnedEmbedObject)
			return

		} else if (arguments[2] == "getadmininfo") { // gets the information of the server owner
			serverownerid = bot.servers[ arguments[1] ].owner_id
			serverowner = bot.users[serverownerid].username + "#" + bot.users[serverownerid].discriminator

			writeLog('Retrieved server owner information for `'+servername+", info: "+serverowner+", ID: "+serverownerid,"Management")

			returnedEmbedObject.title = 'Owner of server *'+ servername + "*"
			returnedEmbedObject.description = "**"+serverowner+"**, ID: `"+serverownerid+"`"
			callback(returnedEmbedObject)
			return
		}


	} else if (arguments[0] == 'broadcast') {
		for (server in bot.servers) {
			const returnedEmbedObject = {
				timestamp
				, footer: {
					icon_url: configuration.icons.boticon
					, text: botName
				}
				, title: 'Message from Bot Administrator <@' + configuration.adminUserId + '> (DJ Arghlex#1729)'
				, description: arguments.slice(1).join(' ')
				, fields: []
			};
			bot.sendMessage( {
				to: bot.servers[server]['guild_id']
				, embed: returnedEmbedObject
			} );
		}


	} else if (arguments[0] == 'listservers') {
		returnedEmbedObject.title = 'Server Listing'
		returnedEmbedObject.description = 'Listing of all servers bot is connected to.'
		for (server in bot.servers) {
			returnedEmbedObject.fields.push( {
				name: bot.servers[server].name
				, value: bot.servers[server].id
				, inline: true
			} );
		}
		writeLog('Sent server list.','Management')
		callback(returnedEmbedObject)
		return


	} else if (arguments[0] == 'setgame') { // currentgame
		bot.setPresence( {
			'game': {
				'name': arguments.slice(1)
			}
		} )
		writeLog( 'Currently Playing Game set to: ' + arguments.slice(1).join(' '), 'Management' )

		writeLog('Overwrote command prefix to `'+arguments.slice(1).join(' ')+'`', 'Management')
		returnedEmbedObject.title = 'Success!'
		returnedEmbedObject.description = 'Set the Now Playing message to `'+ arguments.slice(1).join(' ') +'`. This change will revert when the bot next restarts.'
		callback(returnedEmbedObject)
		return


	} else if (arguments[0] == 'setcmdprefix') { // cmd prefix temp override
		if (arguments[1] !== undefined && arguments[1].length > 0 ) {

			throw 'author\'s note: okay, well, this is actually broken because of the way the configuration is loaded and subsequently handled. if you really need to change it just change it in the config.'
			//const newprefix = arguments[1].substr(0,1)
			//configuration.commandPrefix = newprefix

			//writeLog('Overwrote command prefix to `'+newprefix+'`', 'Management')
			//returnedEmbedObject.title = 'Success!'
			//returnedEmbedObject.description = 'Globally set the command prefix to `'+ newprefix +'`. This change will revert when the bot next restarts.'
			//callback(returnedEmbedObject)
			//return
		} else {
			throw 'New command prefix was invalid.'
		}


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
			name: configuration.commandPrefix + 'botmanagement setcmdprefix <char>'
			, value: 'Temporarily sets the command prefix to <char>'
			, inline: true
		} );
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement listservers'
			, value: 'Lists servers the bot is on'
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
		returnedEmbedObject.fields.push( {
			name: configuration.commandPrefix + 'botmanagement server <serverID> getadmininfo'
			, value: 'Retrieves information of the owner of <serverID> (username, 4-number character, and userID)'
			, inline: true
		} );
		callback (returnedEmbedObject)
	} else {
		throw 'Please specify a command.'
	}
}

// DISCORD BOT INTERFACES
console.log( 'Starting Discord interface' );
const bot = new Discord.Client( {
	token: configuration.authToken
	, autorun: true
} );
bot.on( 'ready', () => {
	writeLog( 'User ID: ' + bot.id + ' Bot User: ' + bot.username, 'Discord' );
	writeLog( 'Add to your server using this link: ', 'Discord' );
	writeLog( ' https://discordapp.com/oauth2/authorize?client_id=' + bot.id + '&scope=bot&permissions=104321088 ', 'Discord' );
	writeLog( '*** Bot ready! ***', 'Discord' );
	bot.setPresence( {
		game: {
			name: configuration.currentGame
		}
	} );
} );
let currenttime;
let timestamp;
let serverId;
let channel;
let server;
let messageId;
let command;
let argument;
bot.on( 'message', ( user, userId, channelId, message, event ) => {
	if ( bot.channels[ channelId ] == undefined ) {
		writeLog("Ignoring PM from "+user, "Discord", false)
		return
	}
	currenttime = new Date().toISOString();
	timestamp = parseInt( currenttime.split( /-(.+)/, 2 )[ 0 ] ) + 1286 + '-' + currenttime.split( /-(.+)/, 2 )[ 1 ];
	serverId = bot.channels[ channelId ][ 'guild_id' ]
	server = bot.servers[ serverId ].name
	channel = '#' + bot.channels[ channelId ].name
	command = message.split( ' ', 1 )
		.join( ' ' )
		.toLowerCase()
	argument = message.split( ' ' )
		.slice( 1 )
		.join( ' ' )
	writeLog( '<' + user + '> ' + message, 'Channel - ' + server + '/' + channel, message.startsWith( configuration.commandPrefix ) ) // log everything to stdout, but log command usage to file

	if ( command == configuration.commandPrefix + 'ping' ) { // send a message to the channel as a ping-testing thing.
		bot.sendMessage( {
			to: channelId
			, message: ':heavy_check_mark: <@' + userId + '>: Pong!'
		} )
	} else if ( command == configuration.commandPrefix + 'ping-embed' ) { // send a embed to the channel as a ping-testing thing.
		bot.sendMessage( {
			to: channelId
			, 'embed': {
				'title': 'Pong!'
				, 'description': ':heavy_check_mark: Pong!'
				, 'color': 0x0a8bd6
				, 'url': 'https://github.com/DJArghlex/new-ed-info'
				, 'fields': [ {
					'name': 'Hey ' + user + '!'
					, 'value': 'It works!'
					, 'inline': true
				} ]
			}
		}, function( err, resp ) {
			if ( err ) {
				bot.sendMessage( {
					to: channelId
					, message: ':sos: <@' + userId + '>: Embedded pong failed! Reason: `' + err + '` `' + resp + '`'
				} )
			}
		} )
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
			, description: '**' + botName + ' v' + botVersion + ' by ' + botAuthor + '** - Direct complaints to `/dev/null`\n    Source available on GitHub: <https://github.com/DJArghlex/new-ed-info>\n    Support development by making FDev play nice with devs like us.\n    Add this bot to your server: <https://discordapp.com/oauth2/authorize?client_id=' + bot.id + '&scope=bot&permissions=104321088>'
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
		bot.sendMessage( {
			to: channelId
			, embed: returnedEmbedObject
		} );
		writeLog( 'Sent help page', 'Discord' );
	} else if ( command === configuration.commandPrefix + 'whois' ) { // INARA Searcher system
		try {
			getCmdrInfoFromInara( argument, embeddedObject => {
				bot.sendMessage( {
					to: channelId
					, embed: embeddedObject
				} );
			} );
		} catch ( err ) {
			bot.sendMessage( {
				to: channelId
				, message: ':sos: An error occurred:\nwhoisCmdr(): getCmdrInfoFromInara(): ' + err
			} );
		}
	} else if ( command === configuration.commandPrefix + 'dist' || command === configuration.commandPrefix + 'distance' ) { // edsm two systems distance fetcher
		try {
			getDistanceBetweenTwoSystems( argument, embeddedObject => {
				bot.sendMessage( {
					to: channelId
					, embed: embeddedObject
				} );
			} );
		} catch ( err ) {
			bot.sendMessage( {
				to: channelId
				, message: ':sos: <@' + configuration.adminUserId + '>! An error occured:\ngetDistanceBetweenTwoSystems(): ' + err
			} );
		}
	} else if ( command === configuration.commandPrefix + 'system' || command === configuration.commandPrefix + 'sys' ) { // edsm system info
		try {
			bot.simulateTyping( channelId );
			getInformationAboutSystem( argument, embeddedObject => {
				bot.sendMessage( {
					to: channelId
					, embed: embeddedObject
				} );
			} );
		} catch ( err ) {
			bot.sendMessage( {
				to: channelId
				, message: ':sos: <@' + configuration.adminUserId + '>! An error occured:\ngetInformationAboutSystem(): ' + err
			} );
		}
	} else if ( command === configuration.commandPrefix + 'time' ) { // Game-time fetcher
		try {
			getCurrentGameTime( argument, embeddedObject => {
				bot.sendMessage( {
					to: channelId
					, embed: embeddedObject
				} );
			} );
		} catch ( err ) { // You never know.
			bot.sendMessage( {
				to: channelId
				, message: ':sos: <@' + configuration.adminUserId + '>! An error occured:\ngetCurrentGameTime(): ' + err
			} );
		}
	} else if ( command === configuration.commandPrefix + 'restart' ) { // public
		writeLog( 'Restart command given by admin', 'Administrative' )
		bot.sendMessage( {
			to: channelId
			, message: ':wave:'
		}, function( error, response ) {
			writeLog( 'Restarting!', 'Shutdown' )
			process.exit( 0 )
		} )
	}
	if ( userId.toString() == configuration.adminUserId ) { //admin commands
		if ( command === configuration.commandPrefix + 'botmanagement' ) {
			try {
				botManagement( argument, embeddedObject => {
					bot.sendMessage( {
						to: channelId
						, embed: embeddedObject
					} );
				} );
				writeLog( 'BotAdmin ran botManagement('+argument+') successfully', 'Discord' )
			} catch ( err ) {
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n discordBotManage(): `' + err + '`'
				} )
				writeLog( err, 'Error' )
			}
		}
	}
} );

bot.on( 'disconnect', function( errMessage, code ) { // disconnect handling, reconnects unless shut down by restart
	writeLog( 'Disconnected from Discord! Code: ' + code + ', Reason: ' + errMessage, 'Error' )
	setTimeout(bot.connect, 15000) // waits 15 seconds before attempting to reconnect
} );

bot.once( 'ready', () => {
	bot.sendMessage( {
		to: configuration.channelId
		, message: ':ok: ' + botName + ' `v' + botVersion + '` by '+ botAuthor +' Back online! Type `' + configuration.commandPrefix + 'help` for a list of commands.'
	} );
} );
