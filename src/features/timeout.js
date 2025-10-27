const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "timeout") return;
    if (!interaction.guild) return;

    try {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        return await interaction.reply({
          content: "❌ You don't have permission to timeout members!",
          ephemeral: true,
        });
      }

      if (
        !interaction.guild.members.me.permissions.has(
          PermissionFlagsBits.ModerateMembers
        )
      ) {
        return await interaction.reply({
          content: "❌ I don't have permission to timeout members!",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user");
      const duration = interaction.options.getString("duration");
      const reason =
        interaction.options.getString("reason") || "No reason provided";

      const targetMember = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!targetMember) {
        return await interaction.reply({
          content: "❌ This user is not in the server!",
          ephemeral: true,
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: "❌ You can't timeout yourself!",
          ephemeral: true,
        });
      }

      if (targetUser.id === client.user.id) {
        return await interaction.reply({
          content: "❌ I can't timeout myself!",
          ephemeral: true,
        });
      }

      if (
        targetMember.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return await interaction.reply({
          content: "❌ You can't timeout someone with a higher or equal role!",
          ephemeral: true,
        });
      }

      if (
        targetMember.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
      ) {
        return await interaction.reply({
          content:
            "❌ I can't timeout someone with a higher or equal role than me!",
          ephemeral: true,
        });
      }

      if (targetMember.id === interaction.guild.ownerId) {
        return await interaction.reply({
          content: "❌ I can't timeout the server owner!",
          ephemeral: true,
        });
      }

      if (!targetMember.moderatable) {
        return await interaction.reply({
          content:
            "❌ I cannot timeout this user! They may have higher permissions.",
          ephemeral: true,
        });
      }

      let durationMs;
      let durationText;

      switch (duration) {
        case "5s":
          durationMs = 5 * 1000;
          durationText = "5 seconds";
          break;
        case "10s":
          durationMs = 10 * 1000;
          durationText = "10 seconds";
          break;
        case "15s":
          durationMs = 15 * 1000;
          durationText = "15 seconds";
          break;
        case "20s":
          durationMs = 20 * 1000;
          durationText = "20 seconds";
          break;
        case "30s":
          durationMs = 30 * 1000;
          durationText = "30 seconds";
          break;
        case "60s":
          durationMs = 60 * 1000;
          durationText = "60 seconds";
          break;
        case "5m":
          durationMs = 5 * 60 * 1000;
          durationText = "5 minutes";
          break;
        case "10m":
          durationMs = 10 * 60 * 1000;
          durationText = "10 minutes";
          break;
        case "30m":
          durationMs = 30 * 60 * 1000;
          durationText = "30 minutes";
          break;
        case "1h":
          durationMs = 60 * 60 * 1000;
          durationText = "1 hour";
          break;
        case "6h":
          durationMs = 6 * 60 * 60 * 1000;
          durationText = "6 hours";
          break;
        case "12h":
          durationMs = 12 * 60 * 60 * 1000;
          durationText = "12 hours";
          break;
        case "1d":
          durationMs = 24 * 60 * 60 * 1000;
          durationText = "1 day";
          break;
        case "1w":
          durationMs = 7 * 24 * 60 * 60 * 1000;
          durationText = "1 week";
          break;
        default:
          return await interaction.reply({
            content: "❌ Invalid duration!",
            ephemeral: true,
          });
      }

      await interaction.deferReply();

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("⏰ You have been timed out")
          .setDescription(
            `You have been timed out in **${interaction.guild.name}**`
          )
          .addFields(
            { name: "Duration", value: durationText, inline: true },
            { name: "Reason", value: reason, inline: false },
            { name: "Timed out by", value: interaction.user.tag, inline: true }
          )
          .setFooter({
            text: "You will be able to chat again after the timeout expires",
          })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log(`Could not DM ${targetUser.tag} about their timeout.`);
      }

      await targetMember.timeout(
        durationMs,
        `${reason} | Timed out by: ${interaction.user.tag}`
      );

      const timeoutEnd = new Date(Date.now() + durationMs);
      const timeoutEndUnix = Math.floor(timeoutEnd.getTime() / 1000);

      const successEmbed = new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("✅ User Timed Out Successfully")
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "User",
            value: `${targetUser.tag} (${targetUser.id})`,
            inline: true,
          },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Duration", value: durationText, inline: true },
          {
            name: "Ends",
            value: `<t:${timeoutEndUnix}:R> (<t:${timeoutEndUnix}:F>)`,
            inline: false,
          },
          { name: "Reason", value: reason, inline: false }
        )
        .setFooter({ text: `Timed out by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Timeout command error:", error);

      const errorMessage = error.message || "An unknown error occurred";

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ Failed to timeout user: ${errorMessage}`,
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ Failed to timeout user: ${errorMessage}`,
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};
