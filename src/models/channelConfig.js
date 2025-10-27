const mongoose = require("mongoose");

const channelConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  birthday: { type: String, default: null },
  invite: { type: String, default: null },
  leave: { type: String, default: null },
  log: { type: String, default: null },
  welcome: { type: String, default: null }
});

module.exports = mongoose.model("ChannelConfig", channelConfigSchema);
