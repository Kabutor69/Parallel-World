const ChannelConfig = require("../models/channelConfig");

async function getChannelId(guildId, feature) {
  try {
    const config = await ChannelConfig.findOne({ guildId });
    if (!config) return null;
    return config[feature] || null;
  } catch (error) {
    console.error(`Error fetching channel config for ${feature}:`, error);
    return null;
  }
}

module.exports = getChannelId;

