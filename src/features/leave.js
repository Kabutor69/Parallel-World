const { Events, EmbedBuilder } = require("discord.js");
const getChannelId = require("../utils/getChannelId");

const LEAVE_GIF_URL =
  "https://i.pinimg.com/originals/f8/b5/36/f8b5364616f7058561eda22e2d2c031f.gif";

module.exports = (client) => {
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const LEAVE_CHANNEL_ID = await getChannelId(member.guild.id, "leave");
      const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);

      if (!channel) {
        console.log(`Leave channel with ID ${LEAVE_CHANNEL_ID} not found.`);
        return;
      }

      const avatarURL = member.user.displayAvatarURL({
        dynamic: true,
        size: 256,
      });

      const joinedAt = member.joinedAt;
      let durationText = "Unknown";

      if (joinedAt) {
        const duration = Date.now() - joinedAt.getTime();
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        if (days > 0) {
          durationText = `${days} day${days > 1 ? "s" : ""}`;
        } else if (hours > 0) {
          durationText = `${hours} hour${hours > 1 ? "s" : ""}`;
        } else {
          durationText = "Less than an hour";
        }
      }

      const leaveEmbed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle(`👋 ${member.user.username} has left the server`)
        .setDescription(
          `**${member.user.tag}** has left **${member.guild.name}**.\n\n` +
            `We wish them well on their journey! 💙\n\n` +
            `*"Goodbyes are not forever, are not the end; it simply means I'll miss you until we meet again."*`
        )
        .addFields(
          { name: "Time in Server", value: durationText, inline: true },
          {
            name: "Total Members Now",
            value: `${member.guild.memberCount}`,
            inline: true,
          }
        )
        .setThumbnail(avatarURL)
        .setImage(LEAVE_GIF_URL)
        .setFooter({
          text: `User ID: ${member.user.id}`,
        })
        .setTimestamp();

      await channel.send({ embeds: [leaveEmbed] });
    } catch (error) {
      console.error(
        `Could not send leave message to server channel for ${member.user.tag}:`,
        error
      );
    }
  });
};
