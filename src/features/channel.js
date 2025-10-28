const {
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
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

    const featureMenu = new StringSelectMenuBuilder()
      .setCustomId("featureSelect")
      .setPlaceholder("Select a feature to set its channel")
      .addOptions([
        { label: "🎂 Birthday", value: "birthday" },
        { label: "📨 Invite Tracker", value: "invite" },
        { label: "👋 Leave", value: "leave" },
        { label: "🧾 Log", value: "log" },
        { label: "🎉 Welcome", value: "welcome" },
      ]);

    const featureRow = new ActionRowBuilder().addComponents(featureMenu);

    const embed = new EmbedBuilder()
      .setTitle("📡 Channel Configuration")
      .setDescription("Select a feature to assign a channel for.")
      .setColor("Blue");

    await interaction.reply({
      embeds: [embed],
      components: [featureRow],
      ephemeral: true,
    });

    const msg = await interaction.fetchReply();

    const featureCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    featureCollector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "This menu isn't for you.", ephemeral: true });

      const feature = i.values[0];

      const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`channelSelect_${feature}`)
        .setPlaceholder("Select a channel for this feature")
        .setMinValues(1)
        .setMaxValues(1);

      const channelRow = new ActionRowBuilder().addComponents(channelSelect);

      const step2 = new EmbedBuilder()
        .setTitle(`⚙️ Configure "${feature}" Channel`)
        .setDescription("Select a channel below.")
        .setColor("Green");

      await i.update({ embeds: [step2], components: [channelRow] });

      const channelCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.ChannelSelect,
        time: 60_000,
      });

      channelCollector.on("collect", async (ci) => {
        if (ci.user.id !== interaction.user.id)
          return ci.reply({ content: "This menu isn't for you.", ephemeral: true });

        const channelId = ci.values[0];

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_${feature}_${channelId}`)
            .setLabel("✅ Confirm")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`cancel_${feature}`)
            .setLabel("❌ Cancel")
            .setStyle(ButtonStyle.Danger)
        );

        const confirmEmbed = new EmbedBuilder()
          .setTitle("Confirm Channel Selection")
          .setDescription(
            `Feature: **${feature}**\nSelected channel: <#${channelId}>\n\nClick **Confirm** to save or **Cancel** to discard.`
          )
          .setColor("Yellow");

        await ci.update({
          embeds: [confirmEmbed],
          components: [confirmRow],
        });

        const buttonCollector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60_000,
        });

        buttonCollector.on("collect", async (bi) => {
          if (bi.user.id !== interaction.user.id)
            return bi.reply({ content: "This button isn't for you.", ephemeral: true });

          if (bi.customId.startsWith("confirm_")) {
            const update = { [feature]: channelId };
            await ChannelConfig.findOneAndUpdate(
              { guildId: interaction.guild.id },
              { $set: update },
              { upsert: true, new: true }
            );

            const doneEmbed = new EmbedBuilder()
              .setTitle("✅ Channel Saved")
              .setDescription(`Feature **${feature}** will now use <#${channelId}>.`)
              .setColor("Green");

            await bi.update({ embeds: [doneEmbed], components: [] });
          } else {
            const cancelEmbed = new EmbedBuilder()
              .setTitle("❌ Cancelled")
              .setDescription("No changes were made.")
              .setColor("Red");

            await bi.update({ embeds: [cancelEmbed], components: [] });
          }
        });
      });
    });
  });
};
