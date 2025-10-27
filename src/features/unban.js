const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "unban") return;
    if (!interaction.guild) return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
          content: "❌ You don't have permission to unban members!",
          ephemeral: true,
        });
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
          content: "❌ I don't have permission to unban members!",
          ephemeral: true,
        });
      }

      const userId = interaction.options.getString("user_id");
      const reason = interaction.options.getString("reason") || "No reason provided";

      if (!/^\d{17,19}$/.test(userId)) {
        return await interaction.reply({
          content: "❌ Invalid user ID! Please provide a valid Discord user ID (17-19 digits).",
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      let bannedUser;
      try {
        const bans = await interaction.guild.bans.fetch();
        bannedUser = bans.get(userId);
        
        if (!bannedUser) {
          return await interaction.editReply({
            content: "❌ This user is not banned!",
          });
        }
      } catch (error) {
        return await interaction.editReply({
          content: "❌ Could not fetch ban list. Make sure the user ID is correct.",
        });
      }

      await interaction.guild.members.unban(userId, `${reason} | Unbanned by: ${interaction.user.tag}`);

      let userTag = `Unknown User (${userId})`;
      let userAvatar = null;
      try {
        const user = await client.users.fetch(userId);
        userTag = user.tag;
        userAvatar = user.displayAvatarURL();
      } catch (error) {
      }

      const successEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ User Unbanned Successfully")
        .addFields(
          { name: "User", value: `${userTag}\nID: ${userId}`, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setFooter({ text: `Unbanned by ${interaction.user.tag}` })
        .setTimestamp();

      if (userAvatar) {
        successEmbed.setThumbnail(userAvatar);
      }

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error("Unban command error:", error);
      
      const errorMessage = error.message || "An unknown error occurred";
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: `❌ Failed to unban user: ${errorMessage}`, 
            ephemeral: true 
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ Failed to unban user: ${errorMessage}` 
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};
