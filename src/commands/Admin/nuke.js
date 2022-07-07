"use strict";

const { Permissions } = require("discord.js")
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports.cooldown = {
    length: 1000, /* in ms */
    users: new Set()
};

module.exports.run = async (interaction) => {
  const channel = interaction.options.getChannel("channel")
  if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
    if (channel) {
      await channel.clone()
      await channel.delete()
    }
    else {
      let channel = interaction.channel
      await channel.clone()
      await channel.delete()

    }
  } else {
    interaction.reply({content: `you need the **MANAGE_CHANNELS** permission to run this command`})
  }
}

module.exports.data = new SlashCommandBuilder()
    .setName("purgechannel")
    .setDescription("purge a channel").addChannelOption(option => option.setName('channel').setDescription("channel to purge, defaults to current if none is provided"))