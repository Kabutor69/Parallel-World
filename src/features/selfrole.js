const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
      const description = interaction.options.getString("description") || "Click buttons below to get roles!";

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

      let embedDescription = description + "\n\n";
      for (const data of roleData) {
        embedDescription += `${data.emoji} **${data.roleName}**\n`;
      }
      embedDescription += "\n*React to respected emoji to get role*";

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(embedDescription)
        .setColor("#7289da")
        .setFooter({ text: "Click buttons below to get roles" })
        .setTimestamp();

      const buttons = [];
      for (const data of roleData) {
        const button = new ButtonBuilder()
          .setCustomId(`selfrole_${data.roleId}`)
          .setEmoji(data.emojiId || data.emoji)
          .setStyle(ButtonStyle.Secondary);
        
        buttons.push(button);
      }

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
        rows.push(row);
      }

      const message = await channel.send({ 
        embeds: [embed],
        components: rows
      });

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

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("selfrole_")) return;

    try {
      const roleId = interaction.customId.replace("selfrole_", "");
      
      const selfRole = await SelfRole.findOne({
        guildId: interaction.guild.id,
        messageId: interaction.message.id,
      });

      if (!selfRole) return;

      const roleConfig = selfRole.roles.find(r => r.roleId === roleId);
      if (!roleConfig) return;

      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(roleConfig.roleId);

      if (!role) {
        return await interaction.reply({
          content: "❌ Role not found!",
          ephemeral: true,
        });
      }

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({
          content: `✅ Removed the **${role.name}** role from you!`,
          ephemeral: true,
        });
        console.log(`✅ Removed role ${role.name} from ${interaction.user.tag}`);
      } else {
        await member.roles.add(role);
        await interaction.reply({
          content: `✅ You have been given the **${role.name}** role!`,
          ephemeral: true,
        });
        console.log(`✅ Added role ${role.name} to ${interaction.user.tag}`);
      }

    } catch (error) {
      console.error("Error handling button:", error);
      try {
        if (!interaction.replied) {
          await interaction.reply({
            content: "❌ An error occurred while assigning the role.",
            ephemeral: true,
          });
        }
      } catch (e) {
        console.error("Could not send error:", e);
      }
    }
  });

  console.log("✅ Self-role system (button-based) initialized!");
};
