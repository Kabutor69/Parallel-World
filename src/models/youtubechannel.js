const mongoose = require("mongoose");

const youtubeChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  discordChannelId: { type: String, required: true },
  youtubeChannelId: { type: String, required: true },
  youtubeChannelName: { type: String, required: true },
  lastVideoId: { type: String, default: null },
  lastChecked: { type: Date, default: Date.now },
});

youtubeChannelSchema.index({ guildId: 1, youtubeChannelId: 1 }, { unique: true });

module.exports = mongoose.model("YouTubeChannel", youtubeChannelSchema);
