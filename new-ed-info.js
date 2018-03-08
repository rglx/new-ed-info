// ED Info Discord Bot
// by CMDR DJ Arghlex

// DEPENDENCIES
console.log('Loading dependencies');
const fs = require('fs'); // Built-in to nodejs
const Discord = require('discord.io'); // Install using npm
const request = require('request'); // Install using npm
const mathjs = require('mathjs'); // Install using npm
const config = require('config'); // Install using npm

console.log('Loading configuration');
const configuration = config.get('configuration');
const fchar = '\uD83C\uDDEB';
const botName = 'New E:D Info';
// FUNCTIONS
console.log('Loading functions');
let wholeMessage;

// Core parts of the bot
function writeLog(message, prefix, writeToFile) {
	if (!prefix) {
		prefix = '[Debug]'; // By default put [Debug] in front of the message
	}
	writeToFile = typeof writeToFile !== 'undefined' ? writeToFile : true;	// Log everything to file by default
	wholeMessage = '[' + prefix + '] ' + message;
	console.log('  ' + wholeMessage);
	if (writeToFile === true) {
		fs.appendFileSync(configuration.logfile, wholeMessage + '\n');
	}
}

function getInaraPage(page, callback) { // Grab a whole page's HTML from INARA, and return it all as a string
	writeLog('Retrieving INARA page: https://inara.cz/' + page, 'HTTP');
	try {
		request.get({
			url: 'https://inara.cz/' + page,
			headers: {
				'user-agent': botName,
				Cookie: `esid=${configuration.inaraCookieEsid}; elitesheet=${configuration.inaraCookieElitesheet}`
			},
			timeout: 30000
		}, (error, response, body) => {
			if (error) {
				callback(null);
				writeLog(`Error retrieving INARA page: ${error}`, 'HTTP');
				throw error;
			}
			if (body === undefined) {
				callback(null);
				writeLog('General error retrieving INARA page!', 'HTTP');
				throw 'General error retrieving INARA page!';
			}
			callback(body);
		});
	} catch (err) {
		writeLog('Failed to retrieve INARA page: ' + err, 'HTTP');
		callback(null);
	}
}

function getEdsmApiResult(page, callback) { // Query EDSM's api for something
	writeLog(`Retrieving EDSM APIv1 results: https://www.edsm.net/api-v1/${page}`, 'HTTP');
	request.get({
		url: 'https://www.edsm.net/api-v1/' + page,
		headers: {
			'user-agent': botName
		},
		timeout: 30000
	}, (error, response, body) => {
		if (error) {
			writeLog(`Error retrieving EDSM APIv1 result: ${error}`, 'HTTP');
			throw error;
		}
		if (body === undefined) {
			callback(null);
			writeLog('Error retrieving EDSM APIv1 result!', 'HTTP');
			throw 'Error retrieving EDSM APIv1 results!';
		}
		callback(JSON.parse(body));
	});
}

// Main functions
function getCmdrInfoFromInara(name, callback) { // Search inara for a CMDR, do some stuff with regexps, and return part of a formatted message
	const searchResultsRegexp = /Commanders found.*?\/cmdr\/(\d+)/i;
	const cmdrDetailsNameRegexp = /<span class="pflheadersmall">CMDR<\/span> (.*?)<\/td>/i;
	// Const cmdrDetailsAvatarRegexp = /<td rowspan="4" class="profileimage"><img src="(.*)"><\/td>/i;
	const cmdrDetailsTableRegexp = /<span class="pflcellname">(.*?)<\/span><br>(.*?)<\/td>/gi;
	const loginToSearchRegexp = /You must be logged in to view search results.../;

	getInaraPage(`search?location=search&searchglobal=${encodeURIComponent(name)}`, searchResults => {
		if (searchResults) {
			const searchResultsMatches = searchResults.match(searchResultsRegexp);
			const loginToSearchMatches = searchResults.match(loginToSearchRegexp);
			if (loginToSearchMatches == null) {
				if (searchResultsMatches == null) {
					callback('.\n:x: No INARA profiles found.');
				} else {
					getInaraPage(`cmdr/${searchResultsMatches[1]}`, cmdrDetails => {
						if (cmdrDetails) {
							writeLog('processing data', 'CMDR-INARA');
							const cmdrDetailsNameMatches = cmdrDetails.match(cmdrDetailsNameRegexp);
							// Let cmdrDetailsAvatarMatches = cmdrDetails.match(cmdrDetailsAvatarRegexp);
							const inaraInfo = {
								CMDR: cmdrDetailsNameMatches[1]
							};
							cmdrDetails.replace(cmdrDetailsTableRegexp, (match, p1, p2) => {
								inaraInfo[p1] = p2;
							});
							let returnedmessage = '.\nINARA Profile found for **`CMDR ' + inaraInfo.CMDR.toUpperCase() + '`:**\n';
							for (const inaraInfoEntry in inaraInfo) {
								if (inaraInfo[inaraInfoEntry] !== '&nbsp;' && inaraInfo[inaraInfoEntry] !== '' && inaraInfo[inaraInfoEntry] !== ' ') {
									returnedmessage += '**' + inaraInfoEntry + '**: ' + inaraInfo[inaraInfoEntry] + '\n';
								}
							}

							writeLog('Done! sending to channel', 'CMDR-INARA');
							callback(returnedmessage);
						} else {
							callback(`.\n:sos: **<@${configuration.adminUserId}>: An error occured: profile page retrieval failed!`);
						}
					});
				}
			} else {
				callback(`.\n:sos: **<@${configuration.adminUserId}>: An error occured: Need login creds to INARA updated! **`);
			}
		} else {
			callback(`.\n:sos: **<@${configuration.adminUserId}>: An error occured: search results page retrieval failed!`);
		}
	});
}

let system1;
let system1coords;
let system2;
let system2coords;

function getDistanceBetweenTwoSystems(input, callback) { // Query EDSM twice to fetch the distance between one system and another
	const returnedEmbedObject = {
		timestamp,
		footer: {
			icon_url: 'https://williamblythe.me/i/52963ab7cbe1ca307e94f935848623b0',
			text: botName
		},
		author: {
			name: 'System Distance Finder',
			icon_url: 'https://williamblythe.me/i/fb9df211775d4b870ee3104d7dabea14'
		},
		title: 'Error!',
		description: ':SOS: An error occured.',
		fields: []
	};
	try {
		system1 = input.split(',', 2)[0].trim();
		system2 = input.split(',', 2)[1].trim();
	} catch (err) {
		returnedEmbedObject.title = 'Incorrect usage. Try `/system <system1>, <system2>` or `/help`';
		callback(returnedEmbedObject);
		return;
	}
	let seconds;
	getEdsmApiResult(`system?showCoordinates=1&systemName=${encodeURIComponent(system1)}`, system1info => {
		writeLog(`Fetched information for ${system1}`, 'EDSM SysDist');
		if (system1info.coords !== undefined) {
			writeLog(`Info for ${system1} looks OK`, 'EDSM SysDist');
			getEdsmApiResult(`system?showCoordinates=1&systemName=${encodeURIComponent(system2)}`, system2info => {
				writeLog('Fetched information for ' + system2, 'EDSM SysDist');
				if (system2info.coords !== undefined) {
					writeLog(`Info for ${system2} looks OK, calculating distance`, 'EDSM SysDist');
					system1coords = [system1info.coords.x, system1info.coords.y, system1info.coords.z];
					system2coords = [system2info.coords.x, system2info.coords.y, system2info.coords.z];
					const distance = mathjs.distance(system1coords, system2coords).toFixed(2);
					seconds = distance * 9.75 + 300;
					const days = Math.floor(seconds / (3600 * 24));
					seconds -= days * 3600 * 24;
					const hrs = Math.floor(seconds / 3600);
					seconds -= hrs * 3600;
					const mnts = Math.floor(seconds / 60);
					seconds -= mnts * 60;
					returnedEmbedObject.title = `Distance between \`${system1}\` and \`${system2}\``;
					returnedEmbedObject.description = `**\`\`\`${distance} Ly\`\`\`**`;
					returnedEmbedObject.description += `\n**Ship transfer time: \`${days}d${hrs}h${mnts}m\`**`;

					writeLog(`Distance between ${system1} and ${system2}: ${distance} Ly`, 'EDSM SysDist');
					callback(returnedEmbedObject);
				} else {
					returnedEmbedObject.description = ':x: Could not locate one of the systems!';
					callback(returnedEmbedObject);
				}
			});
		} else {
			returnedEmbedObject.description = ':x: Could not locate one of the systems!';
			callback(returnedEmbedObject);
		}
	});
}

function getInformationAboutSystem(input, callback) { // Query EDSM for the details about a system
	const returnedEmbedObject = {
		timestamp,
		footer: {
			icon_url: 'https://williamblythe.me/i/52963ab7cbe1ca307e94f935848623b0',
			text: botName
		},
		author: {
			name: 'System Information',
			icon_url: 'https://williamblythe.me/i/fb9df211775d4b870ee3104d7dabea14'
		},
		title: 'Error!',
		description: ':x: No systems found.',
		fields: []
	};
	getEdsmApiResult(`system?showId=1&showCoordinates=1&showPermit=1&showInformation=1&systemName=${encodeURIComponent(input)}`, systeminfo => {
		writeLog(`Got EDSM Info for ${input.toString()}`, 'EDSM SysInfo');
		if (systeminfo.name !== undefined) {
			writeLog(`Info for ${input.toString()} looks OK.`, 'EDSM SysInfo');

			returnedEmbedObject.title = `System Information for __${systeminfo.name}__`;

			returnedEmbedObject.description = `EDSM:  *<https://www.edsm.net/en/system/id/${systeminfo.id}/name/${encodeURIComponent(systeminfo.name)}>*`;
			if (systeminfo.information.eddbId !== undefined) {
				returnedEmbedObject.description += `\nEDDB:  *<https://eddb.io/system/${systeminfo.information.eddbId}>*`;
			}
			returnedEmbedObject.fields[0] = {name: '__Controlled by__', value: '<ERROR - CONTACT EDSM>'};
			if (systeminfo.information.faction !== undefined) {
				returnedEmbedObject.fields[0].value = systeminfo.information.faction;
			}
			if (systeminfo.information.allegiance !== undefined) {
				returnedEmbedObject.fields[0].value += `, a ${systeminfo.information.allegiance}-aligned`;
				if (systeminfo.information.government !== undefined) {
					returnedEmbedObject.fields[0].value += ` ${systeminfo.information.government} faction.`;
				} else { // No govt available, just say 'a X-aligned faction'
					returnedEmbedObject.fields[0].value += ' faction.';
				}
			}
			if (systeminfo.information.factionState !== undefined) {
				returnedEmbedObject.fields.push({name: '__State__', value: systeminfo.information.factionState});
			}
			if (systeminfo.information.population !== undefined) {
				returnedEmbedObject.fields.push({name: '__Population__', value: systeminfo.information.population});
			}
			if (systeminfo.information.security !== undefined) {
				returnedEmbedObject.fields.push({name: '__Security__', value: systeminfo.information.security});
			}
			if (systeminfo.information.economy !== undefined) {
				returnedEmbedObject.fields.push({name: '__Economy__', value: systeminfo.information.economy});
			}
		}
		callback(returnedEmbedObject);
	});
}

function getCurrentGameTime(input, callback) { // Calculate current game time
	callback({
		footer: {
			icon_url: 'https://williamblythe.me/i/52963ab7cbe1ca307e94f935848623b0',
			text: botName
		},
		author: {
			name: 'Current In-Game Time',
			icon_url: 'https://williamblythe.me/i/9acd978f3fd335374afddcd1ebcb1fd8'
		},
		title: `\n**\`\`\`${timestamp.replace(/T/, ' ').replace(/\..+/, '')}\`\`\`**`,
		fields: []
	});
}

// DISCORD BOT INTERFACES
console.log('Starting Discord interface');
const bot = new Discord.Client({
	token: configuration.authToken,
	autorun: true
});

bot.once('ready', () => {
	bot.sendMessage({
		to: configuration.channelId,
		message: `:ok: ${botName} back online! Type \`${configuration.commandPrefix}help\` for a list of commands.`
	});
});

bot.on('ready', () => {
	writeLog(`User ID: ${bot.id}, Bot User: ${bot.username}`, 'Discord');
	writeLog('Add to your server using this link: ', 'Discord');
	writeLog(` https://discordapp.com/oauth2/authorize?client_id=${bot.id}&scope=bot&permissions=104160256 `, 'Discord');
	writeLog('*** Bot ready! ***', 'Discord');

	bot.setPresence({game: {name: configuration.currentGame}});

	bot.editNickname({serverID: configuration.serverId, userId: bot.id, nick: configuration.nickname});
});
let currenttime;
let timestamp;
let serverId;
let channel;
let server;
let messageId;
let command;
let argument;
bot.on('message', (user, userId, channelId, message, event) => {
	currenttime = new Date().toISOString();
	timestamp = `${parseInt(currenttime.split(/-(.+)/, 2)[0]) + 1286}-${currenttime.split(/-(.+)/, 2)[1]}`;
	serverId = bot.channels[channelId].guild_id;
	channel = `#${bot.channels[channelId].name}`;
	server = bot.servers[serverId].name;
	messageId = event.d.id;
	// WriteLog(JSON.stringify(event, null, 4))
	command = message.split(' ', 1).join(' ').toLowerCase();
	argument = message.split(' ').slice(1).join(' ');
	writeLog(`<${user}> ${message}/${messageId}`, 'Channel - ' + server + '/' + channel, false); // Don't log channels to file

	if (command === `${configuration.commandPrefix}ping`) { // Send a message to the channel as a ping-testing thing.
		bot.sendMessage({
			to: channelId,
			message: `:heavy_check_mark: <@${userId}>: Pong!`
		});
	} else if (command === `${configuration.commandPrefix}help`) { // Help page
		const returnedEmbedObject = {
			timestamp,
			footer: {
				icon_url: 'https://willb.info/i/52963ab7cbe1ca307e94f935848623b0',
				text: botName
			},
			author: {
				name: 'Help',
				icon_url: 'https://willb.info/i/f67c5f149780f7644da35a6121d93096'
			},
			title: 'Help Page',
			description: 'What did you want here?',
			fields: []
		};
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'help', value: 'This output'});
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'ping', value: 'Returns pong'});
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'time', value: 'Returns current ingame date and time.'});
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'whois <cmdr>', value: 'Searches INARA for <cmdr>\n    Support INARA! <https://inara.cz/>'});
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'dist[ance] <system1>, <system2>', value: 'Queries EDSM for the distance between two systems.'});
		returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'sys[tem] <system>', value: 'Queries EDSM for specific details about a system.\n    Support EDSM! <https://www.edsm.net/en/donation>'});
		if (userId.toString() === configuration.adminUserId) {
			returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'setCurrentGame <string>', value: 'Sets \'Playing\' message to <string>'});
			returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'setNickname <string>', value: 'Sets server nickname to <string>'});
			returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'setCmdPrefix <string>', value: 'Sets prefix character(s) to <string> (resets to default after restart)'});
			returnedEmbedObject.fields.push({name: configuration.commandPrefix + 'restart', value: ' Restarts the bot.'});
		}
		bot.sendMessage({
			to: channelId,
			embed: returnedEmbedObject
		});
		writeLog('Sent help page', 'Discord');
	} else if (command === `${configuration.commandPrefix}whois` || command === `${configuration.commandPrefix}kos`) { // KOS/INARA Searcher system
		try {
			console.time(`whoislookup-getInaraInfo-${messageId}`);
			getCmdrInfoFromInara(argument, embeddedObject => {
				writeLog(`Execution of getCmdrInfoFromInara() took ${console.timeEnd('whoislookup-getInaraInfo-' + messageId)} ms`, 'Timing');
				bot.sendMessage({
					to: channelId,
					message: embeddedObject
				});
			});
		} catch (err) {
			bot.sendMessage({
				to: channelId,
				message: `:sos: <@${configuration.adminUserId}>! An error occurred:\nwhoisCmdr(): getCmdrInfoFromInara(): \`${err}\``
			});
		}
	} else if (command === `${configuration.commandPrefix}dist` || command === `${configuration.commandPrefix}distance`) { // Edsm two systems distance fetcher
		try {
			getDistanceBetweenTwoSystems(argument, embeddedObject => {
				bot.sendMessage({
					to: channelId,
					embed: embeddedObject
				});
			});
		} catch (err) {
			bot.sendMessage({
				to: channelId,
				message: `:sos: <@${configuration.adminUserId}>! An error occured:\ngetDistanceBetweenTwoSystems(): \`${err}\``
			});
		}
	} else if (command === `${configuration.commandPrefix}system` || command === `${configuration.commandPrefix}sys`) { // Edsm system info
		try {
			bot.simulateTyping(channelId);
			getInformationAboutSystem(argument, embeddedObject => {
				bot.sendMessage({
					to: channelId,
					embed: embeddedObject
				});
			});
		} catch (err) {
			bot.sendMessage({
				to: channelId,
				message: `:sos: <@${configuration.adminUserId}>! An error occured:\ngetInformationAboutSystem(): \`${err}\``
			});
		}
	} else if (command === `${configuration.commandPrefix}time`) { // Game-time fetcher
		try {
			getCurrentGameTime(argument, embeddedObject => {
				bot.sendMessage({
					to: channelId,
					embed: embeddedObject
				});
			});
		} catch (err) { // You never know.
			bot.sendMessage({
				to: channelId,
				message: `:sos: <@${configuration.adminUserId}>! An error occured:\ngetCurrentGameTime(): \`${err}\``
			});
		}
	} else if (command === configuration.commandPrefix + 'restart') { // Public
		writeLog('Restart command given by admin', 'Administrative');
		bot.sendMessage({to: channelId, message: ':wave:'}, () => {
			writeLog('Restarting!', 'Shutdown');
			process.exit(0);
		});
	}

	if (message === 'F' || message === 'f' || message === fchar) { // Pay respects
		writeLog('Paying Respects', 'F');
		bot.addReaction({channelID: channelId, messageID: event.d.id, reaction: fchar}, returned => {
			if (returned !== null) {
				writeLog(`Unable to pay respects. F. Reason: ${returned}`, 'F');
			}
		});
	}

	if (userId.toString() === configuration.adminUserId) { // Admin commands, usable everywhere but only by admin
		if (command === `${configuration.commandPrefix}setcurrentgame`) {
			try {
				bot.setPresence({
					game: {
						name: argument.toString()
					}
				});
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:ok: **Current game set to:** \`${argument.toString()}\``
				});
				writeLog(`Currently Playing Game set to: ${argument.toString()}`, 'Discord');
			} catch (err) {
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:sos: **An error occurred!**\n discordSetGame(): \`${err}\``
				});
				writeLog(err, 'Error');
			}
		} else if (command === `${configuration.commandPrefix}setcmdprefix`) {
			try {
				configuration.commandPrefix = argument.toString();
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:ok: **Command prefix set to:** \`${configuration.commandPrefix}\`\nThis will reset to default if bot restarts.`
				});
				bot.setPresence({
					game: {
						name: configuration.currentGame
					}
				});
				writeLog(`Command prefix changed to: ${configuration.commandPrefix}`, 'Discord');
			} catch (err) {
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:sos: **An error occured!**\n discordSetCmdPrefix(): \`${err}\``
				});
				writeLog(err, 'Error');
			}
		} else if (command === `${configuration.commandPrefix}setnickname`) {
			try {
				bot.editNickname({
					serverID: serverId,
					userID: bot.id,
					nick: argument.toString()
				});
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:ok: **Bot's nickname on this server (${server}) set to:** \`${argument.toString()}\``
				});
				writeLog(`Nickname on ${server} changed to: ${argument.toString()}`, 'Discord');
			} catch (err) {
				bot.sendMessage({
					to: channelId,
					message: `<@${configuration.adminUserId}>:\n:sos: **An error occured!**\n discordSetNickname(): \`${err}\``
				});
				writeLog(err, 'Error');
			}
		}
	}

	if (serverId === configuration.serverId) { // Automatic messages
		let prefixMessageWith;
		for (const replaceCommand in configuration.replaceCommands) {
			if (!configuration.replaceCommands.hasOwnProperty(replaceCommand)) {
				return;
			}
			if (command === configuration.commandPrefix + replaceCommand.toLowerCase()) {
				if (argument === '') {
					prefixMessageWith = `<@${userId}>`;
				} else {
					prefixMessageWith = argument;
				}
				bot.sendMessage({
					to: channelId,
					message: `:gear::speech_left: ${prefixMessageWith}\n${configuration.replaceCommands[replaceCommand]}`
				});
			}
		}
	}
});
bot.on('disconnect', (errMessage, code) => { // Just hard-exit on disconnection
	writeLog(`Disconnected from server! Code: ${code}, Reason: ${errMessage}`, 'Error');
	bot.connect();
});