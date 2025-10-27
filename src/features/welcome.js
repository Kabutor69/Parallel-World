const { Events, EmbedBuilder } = require("discord.js");
const getChannelId = require("../utils/getChannelId");

const WELCOME_GIF_URL =
  "https://i.pinimg.com/originals/12/7e/f5/127ef50a9e6bc3cbe762cf6d3ae4987e.gif";

module.exports = (client) => {
  client.on(Events.GuildMemberAdd, async (member) => {
    const avatarURL = member.user.displayAvatarURL({
      dynamic: true,
      size: 256,
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor("#7289DA")
      .setTitle(`🌌 Welcome to Parallel World, ${member.user.username}!`)
      .setDescription(
        `A reality where possibilities diverge! We're thrilled to have you join our unique dimension. Get ready to explore the unknown.\n\n` +
          `**Start your journey here:**\n` +
          `> 📜 **<#1430443181958234113>:** Understand the dimensional physics.\n` +
          `> 🏷️ ** #self-roles :** Customize your parallel identity.\n` +
          `> 💬 **<#1430106589771075707>:** Meet fellow travelers and share your findings.`
      )
      .setThumbnail(avatarURL)
      .setImage(WELCOME_GIF_URL)
      .setFooter({
        text: "Enjoy your stay in this parallel reality!",
        iconURL: member.guild.iconURL(),
      })
      .setTimestamp();

    try {
      const WELCOME_CHANNEL_ID = await getChannelId(member.guild.id, "welcome");
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

      if (channel) {
        await channel.send({
          content: `Please give a warm welcome to ${member}! We're glad you're here!`,
          embeds: [welcomeEmbed],
        });
      } else {
        console.log(`Welcome channel with ID ${WELCOME_CHANNEL_ID} not found.`);
      }
    } catch (error) {
      console.error(
        `Could not send welcome message to server channel for ${member.user.tag}:`,
        error
      );
    }

    try {
      const dmEmbed = new EmbedBuilder(welcomeEmbed)
        .setDescription(
          `Welcome to Parallel World! We've sent this to your DMs so you don't miss it.\n\n` +
            `We look forward to seeing you around. **Enjoy your stay!**`
        )
        .setImage(null)
        .setThumbnail(member.guild.iconURL());

      await member.send({
        content: `Greetings, ${member.user.username}! Here is your personal welcome message.`,
        embeds: [dmEmbed],
      });
    } catch (error) {
      console.error(
        `Could not send welcome DM to ${member.user.tag}. (DMs likely disabled)`,
        error.message
      );
    }
  });
};
