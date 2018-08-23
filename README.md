# new-ed-info

E:D Info Bot, a Discord bot for Elite: Dangerous groups.

## Features

- EDSM system information retrieval
- Systems distance finder (With transfer time calculation) (Via EDSM)
- INARA CMDR lookups
- In-universe clock
- Open-sourced and auditable by the end user

## Installation

**If this is too much horsing around for a single Discord bot, I run an instance of the bot myself. [Here's the invite link.](<https://discordapp.com/oauth2/authorize?client_id=421397320907620362&scope=bot&permissions=104321088>)**

1. Install basic system utilities

You need tmux or screen, and bash. That's pretty much it.

1. Install node

https://nodejs.org/en/download/current/

*Note: I run the bot under the latest releases (at time of writing that is v10.9.0) of node, but the LTS release should do just fine.*

1. Install your dependencies:

```npm install Woor/discord.io#gateway_v6 config mathjs request```

Uses the following libraries:
- [Woor's fork of izy521's `discord.io`](<https://github.com/Woor/discord.io/tree/gateway_v6>)
- [`config`](<https://www.npmjs.com/package/config>)
- [`mathjs`](<https://www.npmjs.com/package/mathjs>)
- [`request`](<https://www.npmjs.com/package/request>)
- node's internal library `fs`
- node's internal library `path`

## Configuration

1. Create an application **and a bot user** for your bot at [Discord's developer applications portal](<https://discordapp.com/developers/applications/me>) then copy in the token to the bot's configuration.

1. INARA

INARA's configuration with this bot is a little more complex. You need essentially a separate account to run the bot's queries through, as I have not updated it for the new inara API systems. This will remain undocumented, as it's a real pain to set up properly. You essentially feed the bot the two cookies that INARA sets in your browser once you log in (which i recommend doing with a totally separate browser, or incognito mode, without any passwords for it saved in your browser's password storage) via `config/default.json`. These change every time you "log in", which means almost every single time you open INARA your old tokens will be invalidated, essentially breaking the bot's ability to look at things in INARA's search.

*Sorry artie, i'll get it updated soon*

1. Edit the rest of `config/default.json` to your liking, setting your channel and user IDs, nicknames, current game and everything else properly.

*Note: Getting IDs for things requires you to turn on 'developer mode' in Discord, under the Appearance tab of User Settings. With this enabled, most things (channels, servers, users) will have an extra selection in their right-click menu you can get the IDs from.*

## Operation
1. Start it in a detachable screen/tmux session, using `nodejs ed-info-bot.js` inside your multiplexer of choice.
2. Join it to the servers you want it on (by using the url printed to the bot's console)
5. Configure its permissions for the channel you set in the config.
3. You're good to go!

See the `!help` and `!botmanagement help` commands for actual usage.

## [To-do](<https://github.com/DJArghlex/new-ed-info/issues?q=label%3Aenhancement+>)


