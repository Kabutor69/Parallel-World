const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "deleteall") return;
    if (!interaction.guild) return;

    try {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        return await interaction.reply({
          content: "❌ You don't have permission to manage messages!",
          ephemeral: true,
        });
      }

      if (
        !interaction.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        return await interaction.reply({
          content: "❌ I don't have permission to manage messages!",
          ephemeral: true,
        });
      }

      const duration = interaction.options.getString("duration");

      let durationMs;
      let durationText;

      switch (duration) {
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
        case "2h":
          durationMs = 2 * 60 * 60 * 1000;
          durationText = "2 hours";
          break;
        case "5h":
          durationMs = 5 * 60 * 60 * 1000;
          durationText = "5 hours";
          break;
        case "10h":
          durationMs = 10 * 60 * 60 * 1000;
          durationText = "10 hours";
          break;
        case "24h":
          durationMs = 24 * 60 * 60 * 1000;
          durationText = "24 hours";
          break;
        case "2d":
          durationMs = 2 * 24 * 60 * 60 * 1000;
          durationText = "2 days";
          break;
        case "3d":
          durationMs = 3 * 24 * 60 * 60 * 1000;
          durationText = "3 days";
          break;
        case "4d":
          durationMs = 4 * 24 * 60 * 60 * 1000;
          durationText = "4 days";
          break;
        case "5d":
          durationMs = 5 * 24 * 60 * 60 * 1000;
          durationText = "5 days";
          break;
        case "6d":
          durationMs = 6 * 24 * 60 * 60 * 1000;
          durationText = "6 days";
          break;
        case "7d":
          durationMs = 7 * 24 * 60 * 60 * 1000;
          durationText = "1 week";
          break;
        default:
          return await interaction.reply({
            content: "❌ Invalid duration!",
            ephemeral: true,
          });
      }

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;
      const cutoffTime = Date.now() - durationMs;

      let totalDeleted = 0;
      let fetchMore = true;
      let lastMessageId = null;

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

      await interaction.editReply(
        "🔄 Deleting messages... This may take a while."
      );

      while (fetchMore) {
        try {
          const options = { limit: 100 };
          if (lastMessageId) {
            options.before = lastMessageId;
          }

          const messages = await channel.messages.fetch(options);

          if (messages.size === 0) {
            fetchMore = false;
            break;
          }

          const messagesToDelete = messages.filter((msg) => {
            const messageTime = msg.createdTimestamp;
            return messageTime >= cutoffTime && messageTime >= twoWeeksAgo;
          });

          if (messagesToDelete.size === 0) {
            fetchMore = false;
            break;
          }

          const oldestMessage = messages.last();
          if (oldestMessage.createdTimestamp < cutoffTime) {
            fetchMore = false;
          }

          if (messagesToDelete.size > 1) {
            try {
              await channel.bulkDelete(messagesToDelete, true);
              totalDeleted += messagesToDelete.size;
            } catch (bulkError) {
              for (const [, message] of messagesToDelete) {
                try {
                  await message.delete();
                  totalDeleted++;
                  await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (deleteError) {
                  console.error(
                    `Could not delete message ${message.id}:`,
                    deleteError.message
                  );
                }
              }
            }
          } else if (messagesToDelete.size === 1) {
            try {
              await messagesToDelete.first().delete();
              totalDeleted++;
            } catch (deleteError) {
              console.error(`Could not delete message:`, deleteError.message);
            }
          }

          lastMessageId = messages.last().id;

          if (totalDeleted % 50 === 0 && totalDeleted > 0) {
            await interaction.editReply(
              `🔄 Deleted ${totalDeleted} messages so far...`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Error fetching/deleting messages:", error);
          fetchMore = false;
        }
      }

      const successEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ Messages Deleted Successfully")
        .setDescription(
          `Successfully deleted messages from the last **${durationText}**.`
        )
        .addFields(
          { name: "Channel", value: channel.toString(), inline: true },
          { name: "Messages Deleted", value: `${totalDeleted}`, inline: true },
          { name: "Time Range", value: durationText, inline: true },
          { name: "Deleted by", value: interaction.user.tag, inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [successEmbed] });

      console.log(
        `✅ ${interaction.user.tag} deleted ${totalDeleted} messages from ${channel.name} (${durationText})`
      );
    } catch (error) {
      console.error("DeleteAll command error:", error);

      const errorMessage = error.message || "An unknown error occurred";

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ Failed to delete messages: ${errorMessage}`,
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ Failed to delete messages: ${errorMessage}`,
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};
