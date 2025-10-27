const mongoose = require("mongoose");

const birthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  birthday: { type: String, required: true },
  year: { type: Number, default: null },
});

birthdaySchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("Birthday", birthdaySchema);