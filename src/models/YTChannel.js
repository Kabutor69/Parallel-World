const mongoose = require("mongoose");

const ytChannelSchema = new mongoose.Schema({
  guildId: String,
  discordChannelId: String,
  youtubeLink: String,
  lastVideoId: String,
});

module.exports = mongoose.model("YTChannel", ytChannelSchema);
