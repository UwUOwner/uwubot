"use strict";

const { Permissions, CommandInteraction } = require("discord.js");
const { getKeyByValue, msToMinAndSec } = require("../util/util.js");
const { red } = require("colors/safe");

// Database queries
const User = require("../models/Admin/userblacklist");

// Configs
const config = require("../../Controller/owners.json");
const emojis = require("../../Controller/emojis/emojis");

module.exports.data = {
  name: "interactionCreate",
  once: false,
};

/**
 * Handle the clients interactionCreate event.
 * @param {CommandInteraction} interaction The interaction that triggered the event.
 */
module.exports.run = async (interaction) => {
  try {
    /* 
    
    Only handle command interactions.

    Return if the command does not exist or is not loaded / registered - deployed.

    Add a cooldown to the user and return an error 
    */

    if (!interaction.isCommand()) return;
    const command = interaction.commandName.toLowerCase();
    let cmdFile;
    if (interaction.client.commands.has(command))
      cmdFile = interaction.client.commands.get(command);
    else return; /* Return if command doesn't exist. */

    /* Check if command is on cooldown. */
    if (cmdFile.cooldown.users.has(interaction.member.id)) {
      console.log(`mins1: ${msToMinAndSec(cmdFile.cooldown.length)}`)
      let mins = msToMinAndSec(cmdFile.cooldown.length).split(':')[0];
      let secs = msToMinAndSec(cmdFile.cooldown.length).split(':')[1];
      console.log(`mins: ${mins}`)
      let response = "";
      if (mins > 59) {
        let hours = Math.floor(mins / 60);
        mins = mins % 60;
        response = `${emojis.error} | You are on cooldown for ${hours} + ${hours > 1 ? 'hours' : 'hour'} ${mins > 0 ? 'and ' + mins : ''}`;
      }
       else {
         response = `${emojis.error} | You are on cooldown for ${mins} minutes and ${secs} seconds.`;
       }
      await interaction.reply({
        content: response,
        ephemeral: true,
      });
      return;
    }

    /*
	-------------------------------------------------------------------------

    Some database queries, adding security options to the application commands
    
    secure commands being flagged by
        -  non-owners
        
        -  non-owners/blacklisted users

        - cooldown: true on users profile

    -------------------------------------------------------------------------
    */

    // Check if the User is blacklisted, if true, return and error and don't execute the command.
    try {
      let profile = await User.findOne({ userID: interaction.user.id });
    if (profile)
      return interaction.reply({
        content: `${emojis.error} | You are blacklisted from using my Commands.`,
        ephemeral: true,
      });
    } catch(err) {
      return console.log(`problem with: ${err}`)
    }
    

    	/*
	-------------------------------------------------------------------------
	 Custom Owner Permissions 

		Sometimes, we don't want other people execute some commands. (Ex. owner only command etc.)
		That's why we have an option to only allow developers (defined by discord user ID in the configs) to execute these commands


		module.exports.ownerOnly = {
  			ownerOnly: true
		};

	-------------------------------------------------------------------------
    	*/
    if (cmdFile.ownerOnly) {
      if (!config.owner.includes(interaction.user.id))
        return interaction.reply({
          content: `${emojis.error} | You are not the Owner of this Bot.`,
          ephemeral: true,
        });
    }

	/*
	-------------------------------------------------------------------------
	Client (Bot) permissions:

	Some users might invite the bot without any permissions.
	When trying to ban another user, admin permissions are required.

	Here, we have to check if the client has enough permissions to perform that.
	If the bot/client doesn't have the correct permissions, return an error telling the author to fix that.

	-------------------------------------------------------------------------
	*/

    /* Array containing all the missing permissions of the client/user to run the interaction. Ideally those arrays are empty. */
    let missingClientPermissions = [],
      missingUserPermissions = [];

    /* Check if the client is missing any permissions. */
    cmdFile.permissions?.clientPermissions.forEach((flag) => {
      if (!interaction.guild.me.permissions.has(flag))
        missingClientPermissions.push(getKeyByValue(Permissions.FLAGS, flag));
    });

    /* If the client is missing any permissions, don't run the command. */
    if (missingClientPermissions.length != 0) {
      await interaction.reply({
        content: `${
          emojis.error
        } | I am missing the following permissions.\n \`${missingClientPermissions.toString()}\``,
        ephemeral: true,
      });
      return;
    }

    /* Check if the user is missing any permissions. */
    cmdFile.permissions?.userPermissions.forEach((flag) => {
      if (!interaction.member.permissions.has(flag))
        missingUserPermissions.push(getKeyByValue(Permissions.FLAGS, flag));
    });

    	/* 
	-------------------------------------------------------------------------
	Command options:

		Handling options to make command handling cleaner.

		Example:
			- A module that requires a setup, a change (update), reset (deleting saved [] in database), adding additional information.

		Normally, this would be four separate commands. However, with subcommands, this is handled in max. two commands.
		
	-------------------------------------------------------------------------
	*/

		
    /* Handling sub commands */
    // TODO: Add cmd options
    const args = [];

    for (let option of interaction.options.data) {
      if (option.type === "SUB_COMMAND") {
        if (option.name) args.push(option.name);
        option.options?.forEach((x) => {
          if (x.value) args.push(x.value);
        });
      } else if (option.value) args.push(option.value);
    }

	/*
	-------------------------------------------------------------------------
	User/Member Permissions:

	User with no permissions should not be able to execute commands only available by admins or any higher permission role.

	here, we are checking if the user has the required permissions, if not, we are returning an error.

	-------------------------------------------------------------------------
	*/

    /* Only run the command if the user is not missing any permissions. */
    if (missingUserPermissions.length == 0) {
      cmdFile.run(interaction, args).catch((err) => console.error(red(err)));
      /* If user doesn't has Admin perms, add him a cooldown. */
      if (
        !interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)
      ) {
        /* Adding cooldown onto the command */
        cmdFile.cooldown?.users.add(interaction.member.id);
        setTimeout(() => {
          cmdFile.cooldown?.users.delete(interaction.member.id);
        }, cmdFile.cooldown?.length);
      }
    } else
      await interaction.reply({
        content: `${
          emojis.error
        } | You are missing the following permissions.\n \`${missingUserPermissions.toString()}\``, // here is what we were talking about (custom) permissions-
        ephemeral: true,
      });
  } catch (err) {
    console.error(red(err));
  }
};
