const { SlashCommandBuilder } = require("@discordjs/builders")
const configuration = require("../config.json")
const fs = require("fs")

module.exports = {
	data: new SlashCommandBuilder()
		.setName("botmanagement")
		.setDescription("[bot admin only] restarts the bot."),
	async execute(interaction) {
		throw "still working on this!"
	},
}