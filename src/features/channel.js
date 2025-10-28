const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
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
          content: "❌ You must have **Administrator** or **Manage Server** permission to use this command.",
          ephemeral: true,
        });
      }

      const currentConfig = await ChannelConfig.findOne({ guildId: interaction.guild.id });
      const sessionId = `${interaction.user.id}-${Date.now()}`;
      const timeoutDuration = 5 * 60 * 1000;

      const features = {
        log: currentConfig?.log || null,
        birthday: currentConfig?.birthday || null,
        invite: currentConfig?.invite || null,
        leave: currentConfig?.leave || null,
        welcome: currentConfig?.welcome || null,
      };

      pendingSelections.set(sessionId, {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        ...features,
      });

      const channelTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
      const createSelectMenu = (feature, placeholder) => new ChannelSelectMenuBuilder()
        .setCustomId(`${feature}_${sessionId}`)
        .setPlaceholder(placeholder)
        .setChannelTypes(channelTypes)
        .setMinValues(0)
        .setMaxValues(1);

      const logSelect = createSelectMenu("log", "📋 Feature 1: Log");
      const birthdaySelect = createSelectMenu("birthday", "🎂 Feature 2: Birthday");
      const inviteSelect = createSelectMenu("invite", "📨 Feature 3: Invite Tracker");
      const leaveSelect = createSelectMenu("leave", "👋 Feature 4: Leave");
      const welcomeSelect = createSelectMenu("welcome", "🎉 Feature 5: Welcome");

      const createDescription = (selections) => {
        let description = "**Select channels for the following features:**\n\n";
        description += `📋 **Feature 1: Log**\n${selections.log ? `└ <#${selections.log}>` : "└ *Not selected*"}\n\n`;
        description += `🎂 **Feature 2: Birthday**\n${selections.birthday ? `└ <#${selections.birthday}>` : "└ *Not selected*"}\n\n`;
        description += `📨 **Feature 3: Invite Tracker**\n${selections.invite ? `└ <#${selections.invite}>` : "└ *Not selected*"}\n\n`;
        description += `👋 **Feature 4: Leave**\n${selections.leave ? `└ <#${selections.leave}>` : "└ *Not selected*"}\n\n`;
        description += `🎉 **Feature 5: Welcome**\n${selections.welcome ? `└ <#${selections.welcome}>` : "└ *Not selected*"}`;
        return description;
      };

      const initialDescription = createDescription(features);

      const embed = new EmbedBuilder()
        .setTitle("Select channels for feature configuration")
        .setDescription(initialDescription)
        .setColor("#5865F2")
        .setFooter({ text: `Session expires in ${timeoutDuration / 60000} minutes` });

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
        time: timeoutDuration,
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

            const updateDesc = createDescription(selections);
            const updatedEmbed = new EmbedBuilder()
              .setTitle("Select channels for feature configuration")
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
            const updatedRows = [...rows, buttonRow];

            await i.update({
              embeds: [updatedEmbed],
              components: updatedRows,
            });
          }

          else if (i.isButton()) {
            const [action, sid] = i.customId.split("_");
            if (sid !== sessionId) return;

            if (action === "confirm") {
              const configToSave = pendingSelections.get(sessionId);

              await ChannelConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                {
                  guildId: interaction.guild.id,
                  log: configToSave.log,
                  birthday: configToSave.birthday,
                  invite: configToSave.invite,
                  leave: configToSave.leave,
                  welcome: configToSave.welcome,
                  updatedBy: interaction.user.id,
                  updatedAt: new Date(),
                },
                { upsert: true, new: true }
              );

              let resultDesc = "**✅ Configuration saved successfully!**\n\n";
              resultDesc += `📋 **Logs:** ${configToSave.log ? `<#${configToSave.log}>` : "*Disabled*"}\n`;
              resultDesc += `🎂 **Birthday:** ${configToSave.birthday ? `<#${configToSave.birthday}>` : "*Disabled*"}\n`;
              resultDesc += `📨 **Invite Tracker:** ${configToSave.invite ? `<#${configToSave.invite}>` : "*Disabled*"}\n`;
              resultDesc += `👋 **Leave:** ${configToSave.leave ? `<#${configToSave.leave}>` : "*Disabled*"}\n`;
              resultDesc += `🎉 **Welcome:** ${configToSave.welcome ? `<#${configToSave.welcome}>` : "*Disabled*"}\n\n`;
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

            else if (action === "cancel") {
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
          }
        } catch (error) {
          console.error("Collector error:", error);
          if (!i.replied && !i.deferred) {
            i.reply({ content: "❌ An error occurred during interaction.", ephemeral: true });
          }
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⏳ Configuration Timeout")
            .setDescription("The configuration session timed out. No changes were saved.")
            .setColor("#FEE75C")
            .setTimestamp();

          const currentMessage = await interaction.fetchReply();
          try {
            await currentMessage.edit({
              embeds: [timeoutEmbed],
              components: [],
            });
          } catch (e) {
            console.log("Could not edit message on timeout, likely already handled.");
          }
        }
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
