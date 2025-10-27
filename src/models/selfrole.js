const mongoose = require("mongoose");

const selfRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  roles: [
    {
      roleId: { type: String, required: true },
      emoji: { type: String, required: true },
      emojiName: { type: String, required: true },
      emojiId: { type: String, default: null },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SelfRole", selfRoleSchema);