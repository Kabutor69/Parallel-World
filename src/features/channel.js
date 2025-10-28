const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} = require("discord.js");
const ChannelConfig = require("../models/channelConfig");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "channel") return;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ You must be an **Administrator** to use this command.",
        ephemeral: true,
      });
    }

    const features = [
      { label: "🧾 Log", value: "log" },
      { label: "🎉 Welcome", value: "welcome" },
      { label: "👋 Leave", value: "leave" },
      { label: "📨 Invite Tracker", value: "invite" },
      { label: "🎂 Birthday", value: "birthday" },
    ];

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Channel Configuration")
      .setDescription("Select channels for the following features:")
      .setColor("Blue");

    const channelRows = features.map((f) =>
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(`set_${f.value}`)
          .setPlaceholder(`Select channel for ${f.label}`)
          .setMinValues(1)
          .setMaxValues(1)
      )
    );

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_all")
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_all")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [...channelRows, buttonRow],
      ephemeral: true,
    });

    const msg = await interaction.fetchReply();
    const selections = {};

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.ChannelSelect,
      time: 5 * 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "This menu isn't for you.", ephemeral: true });

      const feature = i.customId.replace("set_", "");
      const channelId = i.values[0];
      selections[feature] = channelId;

      await i.reply({
        content: `✅ Set **${feature}** channel to <#${channelId}>`,
        ephemeral: true,
      });
    });

    const buttonCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60_000,
    });

    buttonCollector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id)
        return btn.reply({ content: "This button isn't for you.", ephemeral: true });

      if (btn.customId === "confirm_all") {
        if (Object.keys(selections).length === 0)
          return btn.reply({ content: "⚠️ No channels selected!", ephemeral: true });

        await ChannelConfig.findOneAndUpdate(
          { guildId: interaction.guild.id },
          { $set: selections },
          { upsert: true, new: true }
        );

        const confirmEmbed = new EmbedBuilder()
          .setTitle("✅ Channels Saved Successfully")
          .setDescription(
            Object.entries(selections)
              .map(([feature, id]) => `**${feature}:** <#${id}>`)
              .join("\n")
          )
          .setColor("Green");

        await btn.update({ embeds: [confirmEmbed], components: [] });
      }

      if (btn.customId === "cancel_all") {
        const cancelEmbed = new EmbedBuilder()
          .setTitle("❌ Setup Cancelled")
          .setDescription("No changes were saved.")
          .setColor("Red");

        await btn.update({ embeds: [cancelEmbed], components: [] });
      }
    });
  });
};
