const mongoose = require("mongoose");

const channelConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  log: { type: String, default: null },
  birthday: { type: String, default: null },
  invite: { type: String, default: null },
  leave: { type: String, default: null },
  welcome: { type: String, default: null },
  rules: { type: String, default: null },
  selfrole: { type: String, default: null },
  general: { type: String, default: null },
  updatedBy: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChannelConfig", channelConfigSchema);
