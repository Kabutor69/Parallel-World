const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const YTChannel = require("../models/YTChannel");
const Parser = require("rss-parser");
const parser = new Parser();
const fetch = require("node-fetch");
module.exports = async (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "yt") return;

    if (
      interaction.user.id !== interaction.guild.ownerId &&
      !interaction.member.permissions.has("Administrator") &&
      !interaction.member.permissions.has("ManageGuild")
    ) {
      return interaction.reply({
        content: "❌ Only server owner, admins, or moderators can set the YouTube updates channel.",
        ephemeral: true,
      });
    }

    const discordChannel = interaction.options.getChannel("channel");
    const ytLink = interaction.options.getString("yt-channel");
    const guildId = interaction.guild.id;

    let existing = await YTChannel.findOne({ guildId });
    if (existing) {
      existing.discordChannelId = discordChannel.id;
      existing.youtubeLink = ytLink;
      await existing.save();
    } else {
      await YTChannel.create({
        guildId,
        discordChannelId: discordChannel.id,
        youtubeLink: ytLink,
      });
    }

    await interaction.reply({
      content: `✅ YouTube updates set!\n📺 **${ytLink}** → will post in ${discordChannel}`,
      ephemeral: true,
    });
  });


  async function getChannelIdFromHandle(url) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const match = html.match(/"channelId":"(UC[^\"]+)"/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async function checkYouTubeUploads() {
    const subs = await YTChannel.find();
    for (const sub of subs) {
      try {
        const channelId = await getChannelIdFromHandle(sub.youtubeLink);
        if (!channelId) continue;

        const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        const latest = feed.items[0];
        if (!latest) continue;

        const videoId = latest.id.split(":").pop();
        if (videoId !== sub.lastVideoId) {
          const discordChannel = await client.channels.fetch(sub.discordChannelId).catch(() => null);
          if (discordChannel) {
            const embed = new EmbedBuilder()
              .setTitle(latest.title)
              .setURL(latest.link)
              .setDescription(`🎬 **${feed.title}** just uploaded a new video!`)
              .setImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
              .setColor("Red")
              .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel("▶ Watch Video")
                .setURL(latest.link)
                .setStyle(ButtonStyle.Link)
            );

            await discordChannel.send({ embeds: [embed], components: [row] });
          }

          sub.lastVideoId = videoId;
          await sub.save();
        }
      } catch {
        continue;
      }
    }
  }

  setInterval(checkYouTubeUploads, 5 * 60 * 1000);
};
