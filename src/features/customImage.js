const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ChannelConfig = require("../models/channelConfig");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "custom-image") return;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "You must be an **Administrator** to use this command.",
        ephemeral: true,
      });
    }

    const type = interaction.options.getString("type"); // "welcome" or "leave"
    const url = interaction.options.getString("url");
    const upload = interaction.options.getAttachment("upload");

    let imageUrl = null;

    if (upload) {
      if (!upload.contentType || !upload.contentType.startsWith("image/")) {
        return interaction.reply({
          content: "The uploaded file is not a valid image.",
          ephemeral: true,
        });
      }
      imageUrl = upload.url;
    } else if (url) {
      try {
        new URL(url);
        imageUrl = url;
      } catch (e) {
        return interaction.reply({
          content: "Provided URL is invalid.",
          ephemeral: true,
        });
      }
    }

    const updateField = type === "welcome" ? "welcomeImage" : "leaveImage";

    await ChannelConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { $set: { [updateField]: imageUrl } },
      { upsert: true, new: true }
    );

    const prettyType = type === "welcome" ? "Welcome Message" : "Leave Message";

    if (imageUrl) {
      const doneEmbed = new EmbedBuilder()
        .setTitle("Custom Image Saved")
        .setDescription(`${prettyType} will now use the custom image provided.`)
        .setImage(imageUrl)
        .setColor("Green");

      await interaction.reply({ embeds: [doneEmbed] });
    } else {
      const resetEmbed = new EmbedBuilder()
        .setTitle("Custom Image Reset")
        .setDescription(`${prettyType} image has been reset to the default fallback.`)
        .setColor("Yellow");

      await interaction.reply({ embeds: [resetEmbed] });
    }
  });
};
