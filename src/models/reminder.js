const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  message: { type: String, required: true },
  imageUrl: { type: String, required: false },
  remindDate: { type: Date, required: true },
  isSent: { type: Boolean, default: false },
});

module.exports = mongoose.model("Reminder", reminderSchema);
