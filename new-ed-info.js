// E:D Info Discord Bot
// by CMDR DJ Arghlex & willyb321

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
const fchar = '\uD83C\uDDEB';
const botName = 'New E:D Info'
const botAuthor = 'DJ Arghlex#1729 & willyb321#2816';
const botVersion = '3.2'

// FUNCTIONS
console.log( 'Loading functions' );
let wholeMessage;
// Core parts of the bot
function writeLog( message, prefix, writeToFile ) {
	if ( !prefix ) {
		prefix = '[Debug]'; // By default put [Debug] in front of the message
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
	currenttime = new Date()
		.toISOString();
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
				, 'url': 'https://github.com/ArghArgh200/new-ed-info'
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
			, description: '**' + botName + ' v' + botVersion + ' by ' + botAuthor + '** - Direct complaints to `/dev/null`\n    Source available on GitHub: <https://github.com/ArghArgh200/new-ed-info>\n    Support development by making FDev play nice with devs like us.\n    Add this bot to your server: <https://discordapp.com/oauth2/authorize?client_id=' + bot.id + '&scope=bot&permissions=104321088>'
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
				name: '__**Administrative Commands**__'
				, value: 'Only usable by <@' + configuration.adminUserId + '>'
			} );
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'setCurrentGame <string>'
				, value: 'Sets \'Playing\' message to <string>'
				, inline: true
			} );
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'setNickname <string>'
				, value: 'Sets server nickname to <string>'
				, inline: true
			} );
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'setCmdPrefix <string>'
				, value: 'Sets prefix character(s) to <string>'
				, inline: true
			} );
			returnedEmbedObject.fields.push( {
				name: configuration.commandPrefix + 'restart'
				, value: 'Restarts the bot.'
				, inline: true
			} );
		}
		bot.sendMessage( {
			to: channelId
			, embed: returnedEmbedObject
		} );
		writeLog( 'Sent help page', 'Discord' );
	} else if ( command === configuration.commandPrefix + 'whois' ) { // KOS/INARA Searcher system
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
	} else if ( command == configuration.commandPrefix + 'restart' ) { // public
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
		if ( command == configuration.commandPrefix + 'setcurrentgame' ) {
			try {
				bot.setPresence( {
					'game': {
						'name': argument.toString()
					}
				} )
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:ok: **Current game set to:** `' + argument.toString() + '`'
				} )
				writeLog( 'Currently Playing Game set to: ' + argument.toString(), 'Discord' )
			} catch ( err ) {
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n discordSetGame(): `' + err + '`'
				} )
				writeLog( err, 'Error' )
			}
		} else if ( command == configuration.commandPrefix + 'setcmdprefix' ) {
			try {
				configuration.commandPrefix = argument.toString()
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:ok: **Command prefix set to:** `' + configuration.commandPrefix + '`\nThis will reset to default if bot restarts.'
				} )
				bot.setPresence( {
					'game': {
						'name': configuration.currentGame
					}
				} );
				writeLog( 'Command prefix changed to: ' + configuration.commandPrefix, 'Discord' )
			} catch ( err ) {
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n discordSetCmdPrefix(): `' + err + '`'
				} )
				writeLog( err, 'Error' )
			}
		} else if ( command == configuration.commandPrefix + 'setnickname' ) {
			try {
				bot.editNickname( {
					serverID: serverId
					, userID: bot.id
					, nick: argument.toString()
				} )
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:ok: **Bot\'s nickname on this server (' + server + ') set to:** `' + argument.toString() + '`'
				} )
				writeLog( 'Nickname on ' + server + ' changed to: ' + argument.toString(), 'Discord' )
			} catch ( err ) {
				bot.sendMessage( {
					to: channelId
					, message: '<@' + configuration.adminUserId + '>:\n:sos: **An error occured!**\n discordSetNickname(): `' + err + '`'
				} )
				writeLog( err, 'Error' )
			}
		}
	}
	if ( serverId === configuration.serverId ) { // Automatic messages
		let prefixMessageWith;
		for ( const replaceCommand in configuration.replaceCommands ) {
			if ( !configuration.replaceCommands.hasOwnProperty( replaceCommand ) ) {
				return;
			}
			if ( command === configuration.commandPrefix + replaceCommand.toLowerCase() ) {
				if ( argument === '' ) {
					prefixMessageWith = '<@' + userId + '>';
				} else {
					prefixMessageWith = argument;
				}
				bot.sendMessage( {
					to: channelId 
					, message: ':gear::speech_left: ' + prefixMessageWith + '\n' + configuration.replaceCommands[ replaceCommand ]
				} );
			}
		}
	}
} );

bot.on( 'disconnect', function( errMessage, code ) { // disconnect handling, reconnects unless shut down by restart
	writeLog( 'Disconnected from Discord! Code: ' + code + ', Reason: ' + errMessage, 'Error' )
	bot.connect()
} );

bot.once( 'ready', () => {
	bot.sendMessage( {
		to: configuration.channelId
		, message: ':ok: Back online! Type `' + configuration.commandPrefix + 'help` for a list of commands.'
	} );
} );