const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const SelfRole = require("../models/selfrole");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "selfrole") return;
    if (!interaction.guild) return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: "❌ You need Administrator permission to create self-roles!",
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await interaction.reply({
          content: "❌ I need Manage Roles permission to create self-roles!",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel("channel");
      const title = interaction.options.getString("title") || "Self Roles";
      const description = interaction.options.getString("description") || "React to get your roles!";

      const roleOptions = [];
      for (let i = 1; i <= 25; i++) {
        const roleName = interaction.options.getString(`role${i}`);
        const emoji = interaction.options.getString(`emoji${i}`);
        
        if (!roleName || !emoji) break;
        
        roleOptions.push({ roleName, emoji });
      }

      if (roleOptions.length === 0) {
        return await interaction.editReply({
          content: "❌ You must provide at least one role and emoji!",
        });
      }

      const roleData = [];
      for (const option of roleOptions) {
        let role = interaction.guild.roles.cache.find(r => r.name === option.roleName);
        
        if (!role) {
          try {
            role = await interaction.guild.roles.create({
              name: option.roleName,
              color: "Random",
              reason: `Self-role created by ${interaction.user.tag}`,
            });
          } catch (error) {
            return await interaction.editReply({
              content: `❌ Failed to create role "${option.roleName}": ${error.message}`,
            });
          }
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return await interaction.editReply({
            content: `❌ I cannot manage the role "${role.name}" because it's higher than my highest role!`,
          });
        }

        let emojiId = null;
        let emojiName = option.emoji;
        
        const customEmojiMatch = option.emoji.match(/<a?:(\w+):(\d+)>/);
        if (customEmojiMatch) {
          emojiName = customEmojiMatch[1];
          emojiId = customEmojiMatch[2];
        }

        roleData.push({
          roleId: role.id,
          roleName: role.name,
          emoji: option.emoji,
          emojiName: emojiName,
          emojiId: emojiId,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#7289da")
        .setTitle(title)
        .setDescription(description + "\n\n**Available Roles:**")
        .setFooter({ text: "React to get or remove roles" })
        .setTimestamp();

      for (const data of roleData) {
        embed.addFields({
          name: `${data.emoji} ${data.roleName}`,
          value: `React with ${data.emoji} to get this role`,
          inline: false,
        });
      }

      const message = await channel.send({ embeds: [embed] });

      for (const data of roleData) {
        try {
          if (data.emojiId) {
            await message.react(data.emojiId);
          } else {
            await message.react(data.emoji);
          }
        } catch (error) {
          console.error(`Failed to add reaction ${data.emoji}:`, error.message);
          return await interaction.editReply({
            content: `❌ Failed to add reaction ${data.emoji}. Make sure it's a valid emoji!`,
          });
        }
      }

      const selfRoleDoc = new SelfRole({
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: message.id,
        roles: roleData.map(d => ({
          roleId: d.roleId,
          emoji: d.emoji,
          emojiName: d.emojiName,
          emojiId: d.emojiId,
        })),
      });

      await selfRoleDoc.save();

      await interaction.editReply({
        content: `✅ Self-role message created successfully in ${channel}!\n\nRoles added: ${roleData.map(d => d.roleName).join(", ")}`,
      });

    } catch (error) {
      console.error("Selfrole command error:", error);
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: `❌ An error occurred: ${error.message}`, 
            ephemeral: true 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ An error occurred: ${error.message}` 
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Error fetching reaction:", error);
        return;
      }
    }

    try {
      const selfRole = await SelfRole.findOne({
        guildId: reaction.message.guild.id,
        messageId: reaction.message.id,
      });

      if (!selfRole) return;

      const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
      const roleConfig = selfRole.roles.find(r => {
        if (r.emojiId) {
          return r.emojiId === emojiIdentifier;
        }
        return r.emojiName === emojiIdentifier;
      });

      if (!roleConfig) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(roleConfig.roleId);

      if (!role) {
        console.error(`Role ${roleConfig.roleId} not found`);
        return;
      }

      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        console.log(`✅ Added role ${role.name} to ${user.tag}`);

        try {
          await user.send(`✅ You have been given the **${role.name}** role in **${reaction.message.guild.name}**!`);
        } catch (error) {
        }
      }

    } catch (error) {
      console.error("Error handling reaction add:", error);
    }
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Error fetching reaction:", error);
        return;
      }
    }

    try {
      const selfRole = await SelfRole.findOne({
        guildId: reaction.message.guild.id,
        messageId: reaction.message.id,
      });

      if (!selfRole) return;

      const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
      const roleConfig = selfRole.roles.find(r => {
        if (r.emojiId) {
          return r.emojiId === emojiIdentifier;
        }
        return r.emojiName === emojiIdentifier;
      });

      if (!roleConfig) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(roleConfig.roleId);

      if (!role) {
        console.error(`Role ${roleConfig.roleId} not found`);
        return;
      }

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        console.log(`✅ Removed role ${role.name} from ${user.tag}`);

        try {
          await user.send(`❌ The **${role.name}** role has been removed from you in **${reaction.message.guild.name}**.`);
        } catch (error) {
        }
      }

    } catch (error) {
      console.error("Error handling reaction remove:", error);
    }
  });
};
