const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "ban") return;
    if (!interaction.guild) return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
          content: "❌ You don't have permission to ban members!",
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
          content: "❌ I don't have permission to ban members!",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const deleteDays = interaction.options.getInteger("delete_days") || 0;

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: "❌ You can't ban yourself!",
          ephemeral: true,
        });
      }

      if (targetUser.id === client.user.id) {
        return await interaction.reply({
          content: "❌ I can't ban myself!",
          ephemeral: true,
        });
      }

      if (targetMember) {
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
          return await interaction.reply({
            content: "❌ You can't ban someone with a higher or equal role!",
            ephemeral: true,
          });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
          return await interaction.reply({
            content: "❌ I can't ban someone with a higher or equal role than me!",
            ephemeral: true,
          });
        }

        if (targetMember.id === interaction.guild.ownerId) {
          return await interaction.reply({
            content: "❌ I can't ban the server owner!",
            ephemeral: true,
          });
        }
      }

      await interaction.deferReply();

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("🔨 You have been banned")
          .setDescription(`You have been banned from **${interaction.guild.name}**`)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Banned by", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log(`Could not DM ${targetUser.tag} about their ban.`);
      }

      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | Banned by: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60, // Convert days to seconds
      });

      const successEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ User Banned Successfully")
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "User", value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Messages Deleted", value: `${deleteDays} day(s)`, inline: true }
        )
        .setFooter({ text: `Banned by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error("Ban command error:", error);
      
      const errorMessage = error.message || "An unknown error occurred";
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: `❌ Failed to ban user: ${errorMessage}`, 
            ephemeral: true 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ Failed to ban user: ${errorMessage}` 
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};