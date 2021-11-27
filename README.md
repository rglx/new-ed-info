# new-ed-info

E:D Info Bot, a Discord bot for Elite: Dangerous groups to perform quick lookups of small pieces of data. Mirrors functions on a bot by Bermos that existed waaaay long ago.

# Please read.

Discord's suspicious activities with user data continue to prevent me from mustering the motivation to develop things to enrich their platform with. This project continues under protest of those actions, and as such, could be discontinued at any time.

## Features

- EDSM system information retrieval
- Systems distance finder (With transfer time calculation) (Via EDSM)
- INARA CMDR lookups
- In-universe clock
- Open-sourced and auditable by the end user
- More features coming soon.

## Installation

**If this is too much horsing around for a single Discord bot, I run an instance of the bot myself. [Here's the invite link.](<https://discord.com/oauth2/authorize?client_id=421397320907620362&permissions=2415935520&scope=applications.commands%20bot>)**

1. Install basic system utilities

You need tmux or screen, and bash. That's pretty much it.

2. Install node

https://nodejs.org/en/download/current/

You can also use ```nvm``` (Recommended) to keep your nodejs install contained:

https://github.com/nvm-sh/nvm

*Note: I run the bot under whatever LTS release is current.*

3. Download & Install:

```bash
git clone https://github.com/rglx/new-ed-info.git
npm install
```

Uses the following libraries (and their dependencies):
- [`discord.js`](<https://discord.js.org/>)
- [`config`](<https://www.npmjs.com/package/config>)
- [`mathjs`](<https://www.npmjs.com/package/mathjs>)
- [`request`](<https://www.npmjs.com/package/request>)
- nodejs internal library `fs`
- nodejs internal library `path`

## Configuration

1. Create an application **and a bot presence** for your bot at [Discord's developer applications portal](<https://discordapp.com/developers/applications/me>) then copy in the token (for the bot user specifically) to the bot's configuration in `config/default.json`

2. INARA

INARA's configuration with this bot is a little more complex. You need essentially a separate INARA account to run the bot's queries through, as I have not updated it for the new inara API systems. This will remain undocumented, as it's a real pain to set up properly. You essentially feed the bot the two cookies that INARA sets in your browser once you log in through a separate browser, then copying those into `config/default.json`. These change every time you log in or out of INARA, or are invalidated after certain periods of time, which means you need to be around to keep them updated.

*Sorry artie, i'll get it updated soon*

3. Edit the rest of `config/default.json` to your liking, setting your channel and user IDs, nicknames, current game and everything else properly.

*Note: Getting IDs for things requires you to turn on 'developer mode' in Discord, under the Appearance tab of User Settings. With this enabled, most things (channels, servers, users) will have an extra selection in their right-click menu you can get the IDs from.*

## Operation
1. Start it in a detachable screen/tmux session, using `nodejs ed-info-bot.js` inside your multiplexer of choice.
2. Join it to the servers you want it on (by using the url printed to the bot's console)
5. Configure its permissions for the channel you set in the config.
3. You're good to go!

See the `!help` and `!botmanagement help` commands for usage.

## [To-do](/../../issues?q=label%3Aenhancement)


