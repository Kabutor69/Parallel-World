const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "kick") return;
    if (!interaction.guild) return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return await interaction.reply({
          content: "❌ You don't have permission to kick members!",
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        return await interaction.reply({
          content: "❌ I don't have permission to kick members!",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason provided";

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return await interaction.reply({
          content: "❌ This user is not in the server!",
          ephemeral: true,
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: "❌ You can't kick yourself!",
          ephemeral: true,
        });
      }

      if (targetUser.id === client.user.id) {
        return await interaction.reply({
          content: "❌ I can't kick myself!",
          ephemeral: true,
        });
      }

      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return await interaction.reply({
          content: "❌ You can't kick someone with a higher or equal role!",
          ephemeral: true,
        });
      }

      if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return await interaction.reply({
          content: "❌ I can't kick someone with a higher or equal role than me!",
          ephemeral: true,
        });
      }

      if (targetMember.id === interaction.guild.ownerId) {
        return await interaction.reply({
          content: "❌ I can't kick the server owner!",
          ephemeral: true,
        });
      }

      if (!targetMember.kickable) {
        return await interaction.reply({
          content: "❌ I cannot kick this user! They may have higher permissions.",
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#e67e22")
          .setTitle("👢 You have been kicked")
          .setDescription(`You have been kicked from **${interaction.guild.name}**`)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Kicked by", value: interaction.user.tag, inline: true }
          )
          .setFooter({ text: "You can rejoin with a new invite link" })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log(`Could not DM ${targetUser.tag} about their kick.`);
      }

      await targetMember.kick(`${reason} | Kicked by: ${interaction.user.tag}`);

      const successEmbed = new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("✅ User Kicked Successfully")
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: "User", value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setFooter({ text: `Kicked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error("Kick command error:", error);
      
      const errorMessage = error.message || "An unknown error occurred";
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: `❌ Failed to kick user: ${errorMessage}`, 
            ephemeral: true 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ Failed to kick user: ${errorMessage}` 
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};
