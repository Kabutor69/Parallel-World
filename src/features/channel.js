const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const ChannelConfig = require("../models/channelConfig");

module.exports = (client) => {
  const pendingSelections = new Map();

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "channel") return;

    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: "❌ You must be an **Administrator** or have **Manage Server** permission to use this command.",
          ephemeral: true,
        });
      }

      const currentConfig = await ChannelConfig.findOne({ guildId: interaction.guild.id });
      const sessionId = `${interaction.user.id}-${Date.now()}`;

      pendingSelections.set(sessionId, {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        log: currentConfig?.log || null,
        birthday: currentConfig?.birthday || null,
        invite: currentConfig?.invite || null,
        leave: currentConfig?.leave || null,
        welcome: currentConfig?.welcome || null,
      });

      const logSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`log_${sessionId}`)
        .setPlaceholder("📋 Feature 1: Log")
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(0)
        .setMaxValues(1);

      const birthdaySelect = new ChannelSelectMenuBuilder()
        .setCustomId(`birthday_${sessionId}`)
        .setPlaceholder("🎂 Feature 2: Birthday")
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(0)
        .setMaxValues(1);

      const inviteSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`invite_${sessionId}`)
        .setPlaceholder("📨 Feature 3: Invite Tracker")
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(0)
        .setMaxValues(1);

      const leaveSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`leave_${sessionId}`)
        .setPlaceholder("👋 Feature 4: Leave")
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(0)
        .setMaxValues(1);

      const welcomeSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`welcome_${sessionId}`)
        .setPlaceholder("🎉 Feature 5: Welcome")
        .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
        .setMinValues(0)
        .setMaxValues(1);

      const selections = pendingSelections.get(sessionId);

      let description = "**Select channels for following features:**\n\n";
      description += `📋 **Feature 1: Log**\n${selections.log ? `└ <#${selections.log}>` : "└ *Not selected*"}\n\n`;
      description += `🎂 **Feature 2: Birthday**\n${selections.birthday ? `└ <#${selections.birthday}>` : "└ *Not selected*"}\n\n`;
      description += `📨 **Feature 3: Invite Tracker**\n${selections.invite ? `└ <#${selections.invite}>` : "└ *Not selected*"}\n\n`;
      description += `👋 **Feature 4: Leave**\n${selections.leave ? `└ <#${selections.leave}>` : "└ *Not selected*"}\n\n`;
      description += `🎉 **Feature 5: Welcome**\n${selections.welcome ? `└ <#${selections.welcome}>` : "└ *Not selected*"}\n\n`;
      description += "*Continue like this till all features are mentioned*";

      const embed = new EmbedBuilder()
        .setTitle("Select channels for following features")
        .setDescription(description)
        .setColor("#5865F2")
        .setFooter({ text: "Use the dropdowns below to select channels" });

      const rows = [
        new ActionRowBuilder().addComponents(logSelect),
        new ActionRowBuilder().addComponents(birthdaySelect),
        new ActionRowBuilder().addComponents(inviteSelect),
        new ActionRowBuilder().addComponents(leaveSelect),
        new ActionRowBuilder().addComponents(welcomeSelect),
      ];

      await interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true,
      });

      const msg = await interaction.fetchReply();

      const collector = msg.createMessageComponentCollector({
        time: 5 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: "❌ This menu isn't for you.", ephemeral: true });
          }

          const selections = pendingSelections.get(sessionId);
          if (!selections) {
            return i.reply({ content: "❌ Session expired. Please run /channel again.", ephemeral: true });
          }

          if (i.isChannelSelectMenu()) {
            const [feature, sid] = i.customId.split("_");
            if (sid !== sessionId) return;

            selections[feature] = i.values.length > 0 ? i.values[0] : null;
            pendingSelections.set(sessionId, selections);

            let updateDesc = "**Select channels for following features:**\n\n";
            updateDesc += `📋 **Feature 1: Log**\n${selections.log ? `└ <#${selections.log}>` : "└ *Not selected*"}\n\n`;
            updateDesc += `🎂 **Feature 2: Birthday**\n${selections.birthday ? `└ <#${selections.birthday}>` : "└ *Not selected*"}\n\n`;
            updateDesc += `📨 **Feature 3: Invite Tracker**\n${selections.invite ? `└ <#${selections.invite}>` : "└ *Not selected*"}\n\n`;
            updateDesc += `👋 **Feature 4: Leave**\n${selections.leave ? `└ <#${selections.leave}>` : "└ *Not selected*"}\n\n`;
            updateDesc += `🎉 **Feature 5: Welcome**\n${selections.welcome ? `└ <#${selections.welcome}>` : "└ *Not selected*"}\n\n`;
            updateDesc += "*Continue like this till all features are mentioned*";

            const updatedEmbed = new EmbedBuilder()
              .setTitle("Select channels for following features")
              .setDescription(updateDesc)
              .setColor("#5865F2")
              .setFooter({ text: "Click 'Confirm' to save or 'Cancel' to discard" });

            const doneButton = new ButtonBuilder()
              .setCustomId(`confirm_${sessionId}`)
              .setLabel("Confirm")
              .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
              .setCustomId(`cancel_${sessionId}`)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger);

            const buttonRow = new ActionRowBuilder().addComponents(doneButton, cancelButton);

            const updatedRows = [
              new ActionRowBuilder().addComponents(logSelect),
              new ActionRowBuilder().addComponents(birthdaySelect),
              new ActionRowBuilder().addComponents(inviteSelect),
              new ActionRowBuilder().addComponents(leaveSelect),
              new ActionRowBuilder().addComponents(welcomeSelect),
              buttonRow,
            ];

            await i.update({
              embeds: [updatedEmbed],
              components: updatedRows,
            });
          }

          else if (i.isButton() && i.customId.startsWith("confirm_")) {
            const [_, sid] = i.customId.split("_");
            if (sid !== sessionId) return;

            const selections = pendingSelections.get(sessionId);

            await ChannelConfig.findOneAndUpdate(
              { guildId: interaction.guild.id },
              {
                guildId: interaction.guild.id,
                log: selections.log,
                birthday: selections.birthday,
                invite: selections.invite,
                leave: selections.leave,
                welcome: selections.welcome,
                updatedBy: interaction.user.id,
                updatedAt: new Date(),
              },
              { upsert: true, new: true }
            );

            let resultDesc = "**✅ Configuration saved successfully!**\n\n";
            resultDesc += `📋 **Logs:** ${selections.log ? `<#${selections.log}>` : "*Disabled*"}\n`;
            resultDesc += `🎂 **Birthday:** ${selections.birthday ? `<#${selections.birthday}>` : "*Disabled*"}\n`;
            resultDesc += `📨 **Invite Tracker:** ${selections.invite ? `<#${selections.invite}>` : "*Disabled*"}\n`;
            resultDesc += `👋 **Leave:** ${selections.leave ? `<#${selections.leave}>` : "*Disabled*"}\n`;
            resultDesc += `🎉 **Welcome:** ${selections.welcome ? `<#${selections.welcome}>` : "*Disabled*"}\n\n`;
            resultDesc += "*Features without channels will not work*";

            const successEmbed = new EmbedBuilder()
              .setTitle("✅ Configuration Saved")
              .setDescription(resultDesc)
              .setColor("#57F287")
              .setFooter({ text: `Configured by ${interaction.user.tag}` })
              .setTimestamp();

            await i.update({
              embeds: [successEmbed],
              components: [],
            });

            pendingSelections.delete(sessionId);
            collector.stop();

            console.log(`✅ ${interaction.user.tag} updated channel configuration`);
          }

          else if (i.isButton() && i.customId.startsWith("cancel_")) {
            const cancelEmbed = new EmbedBuilder()
              .setTitle("❌ Configuration Cancelled")
              .setDescription("No changes were made to the channel configuration.")
              .setColor("#ED4245")
              .setTimestamp();

            await i.update({
              embeds: [cancelEmbed],
              components: [],
            });

            pendingSelections.delete(sessionId);
            collector.stop();

            console.log(`❌ ${interaction.user.tag} cancelled channel configuration`);
          }
        } catch (error) {
          console.error("Collector error:", error);
        }
      });

      collector.on("end", () => {
        pendingSelections.delete(sessionId);
      });

    } catch (error) {
      console.error("Channel command error:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (e) {
        console.error("Could not send error:", e);
      }
    }
  });

  async function getConfiguredChannel(guildId, featureType) {
    try {
      const config = await ChannelConfig.findOne({ guildId });
      return config ? config[featureType] : null;
    } catch (error) {
      console.error("Error fetching channel config:", error);
      return null;
    }
  }

  client.getConfiguredChannel = getConfiguredChannel;

  console.log("✅ Channel configuration system initialized!");
};
