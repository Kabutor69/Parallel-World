const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Parser = require("rss-parser");
const YouTubeChannel = require("../models/youtubechannel");

const parser = new Parser();
const CHECK_INTERVAL = 5 * 60 * 1000; 

module.exports = (client) => {
  const checkedVideos = new Set();

  const checkYouTubeChannels = async () => {
    try {
      const channels = await YouTubeChannel.find({});

      for (const ytChannel of channels) {
        try {
          const guild = client.guilds.cache.get(ytChannel.guildId);
          if (!guild) continue;

          const discordChannel = guild.channels.cache.get(ytChannel.discordChannelId);
          if (!discordChannel) continue;

          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannel.youtubeChannelId}`;
          const feed = await parser.parseURL(rssUrl);

          if (!feed.items || feed.items.length === 0) continue;

          const latestVideo = feed.items[0];
          const videoId = latestVideo.id.split(":")[2];
          const videoKey = `${ytChannel.guildId}-${videoId}`;

          if (checkedVideos.has(videoKey)) continue;
          if (ytChannel.lastVideoId === videoId) continue;

          checkedVideos.add(videoKey);

          await YouTubeChannel.findByIdAndUpdate(ytChannel._id, {
            lastVideoId: videoId,
            lastChecked: new Date(),
          });

          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const channelName = feed.title;
          const videoTitle = latestVideo.title;
          const publishedDate = new Date(latestVideo.pubDate);

          const thumbnail = latestVideo.media?.group?.["media:thumbnail"]?.[0]?.["$"]?.url || 
                           `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

          const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(videoTitle)
            .setURL(videoUrl)
            .setDescription(`**${channelName}** just uploaded a new video!`)
            .setThumbnail(feed.image?.url || null)
            .setImage(thumbnail)
            .addFields(
              { name: "Channel", value: channelName, inline: true },
              { name: "Published", value: `<t:${Math.floor(publishedDate.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: "YouTube", iconURL: "https://www.youtube.com/s/desktop/d743f786/img/favicon_96x96.png" })
            .setTimestamp(publishedDate);

          await discordChannel.send({
            content: `🎥 **New video from ${channelName}!**\n${videoUrl}`,
            embeds: [embed],
          });

          console.log(`✅ Posted new video from ${channelName} in ${guild.name}`);
        } catch (error) {
          console.error(`Error checking YouTube channel ${ytChannel.youtubeChannelId}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Error in YouTube check:", error);
    }
  };

  setInterval(checkYouTubeChannels, CHECK_INTERVAL);
  setTimeout(checkYouTubeChannels, 10000);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== "yt") return;
    if (!interaction.guild) return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: "❌ You need Administrator permission to manage YouTube notifications!",
          ephemeral: true,
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "add") {
        const discordChannel = interaction.options.getChannel("channel");
        const youtubeUrl = interaction.options.getString("youtube_channel");

        let youtubeChannelId;
        const channelIdMatch = youtubeUrl.match(/channel\/([a-zA-Z0-9_-]+)/);
        const handleMatch = youtubeUrl.match(/@([a-zA-Z0-9_-]+)/);
        
        if (channelIdMatch) {
          youtubeChannelId = channelIdMatch[1];
        } else if (handleMatch) {
          return await interaction.reply({
            content: "❌ Please use the channel ID format (not @handle). You can find it in the channel's URL or 'About' page.",
            ephemeral: true,
          });
        } else {
          youtubeChannelId = youtubeUrl;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`;
          const feed = await parser.parseURL(rssUrl);

          const channelName = feed.title;
          const latestVideo = feed.items[0];
          const latestVideoId = latestVideo ? latestVideo.id.split(":")[2] : null;

          const existing = await YouTubeChannel.findOne({
            guildId: interaction.guild.id,
            youtubeChannelId: youtubeChannelId,
          });

          if (existing) {
            return await interaction.editReply({
              content: `❌ **${channelName}** is already being tracked in this server!`,
            });
          }

          await YouTubeChannel.create({
            guildId: interaction.guild.id,
            discordChannelId: discordChannel.id,
            youtubeChannelId: youtubeChannelId,
            youtubeChannelName: channelName,
            lastVideoId: latestVideoId,
            lastChecked: new Date(),
          });

          const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("✅ YouTube Channel Added")
            .setDescription(`Now tracking **${channelName}**`)
            .addFields(
              { name: "Discord Channel", value: `${discordChannel}`, inline: true },
              { name: "YouTube Channel", value: channelName, inline: true }
            )
            .setThumbnail(feed.image?.url || null)
            .setFooter({ text: `Added by ${interaction.user.tag}` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          console.log(`✅ Added YouTube channel ${channelName} to ${interaction.guild.name}`);
        } catch (error) {
          await interaction.editReply({
            content: `❌ Failed to add YouTube channel. Make sure the channel ID is correct!\n\nError: ${error.message}`,
          });
        }
      }

      else if (subcommand === "remove") {
        const youtubeChannelName = interaction.options.getString("channel_name");

        const channel = await YouTubeChannel.findOneAndDelete({
          guildId: interaction.guild.id,
          youtubeChannelName: { $regex: new RegExp(youtubeChannelName, "i") },
        });

        if (!channel) {
          return await interaction.reply({
            content: `❌ No YouTube channel found with name matching "${youtubeChannelName}"`,
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("🗑️ YouTube Channel Removed")
          .setDescription(`Stopped tracking **${channel.youtubeChannelName}**`)
          .setFooter({ text: `Removed by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        console.log(`✅ Removed YouTube channel ${channel.youtubeChannelName} from ${interaction.guild.name}`);
      }

      else if (subcommand === "list") {
        const channels = await YouTubeChannel.find({ guildId: interaction.guild.id });

        if (channels.length === 0) {
          return await interaction.reply({
            content: "❌ No YouTube channels are being tracked in this server.",
            ephemeral: true,
          });
        }

        let description = "";
        for (let i = 0; i < channels.length; i++) {
          const ch = channels[i];
          description += `**${i + 1}.** ${ch.youtubeChannelName}\n`;
          description += `└ Posts in: <#${ch.discordChannelId}>\n`;
          description += `└ Channel ID: \`${ch.youtubeChannelId}\`\n\n`;
        }

        const embed = new EmbedBuilder()
          .setColor("#3498db")
          .setTitle("📺 Tracked YouTube Channels")
          .setDescription(description)
          .setFooter({ text: `Total: ${channels.length} channel(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

    } catch (error) {
      console.error("YouTube command error:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (e) {
        console.error("Could not send error:", e);
      }
    }
  });

  console.log("✅ YouTube notification system initialized!");
};
