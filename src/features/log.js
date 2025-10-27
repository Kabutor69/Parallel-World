const { EmbedBuilder, Events } = require("discord.js");
const getChannelId = require("../utils/getChannelId");

module.exports = (client) => {
  async function sendLog(guild, embed) {
    try {
      const LOG_CHANNEL_ID = await getChannelId(guild.id, "log");
      const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error sending log:", error);
    }
  }

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🗑️ Message Deleted")
      .setDescription(`A message was deleted in ${message.channel}`)
      .addFields(
        {
          name: "Author",
          value: message.author
            ? `${message.author.tag} (${message.author.id})`
            : "Unknown",
          inline: true,
        },
        { name: "Channel", value: `${message.channel}`, inline: true },
        {
          name: "Content",
          value: message.content || "*No text content*",
          inline: false,
        }
      )
      .setTimestamp();

    await sendLog(message.guild, embed);
  });

  console.log("✅ Logging system initialized!");
};
