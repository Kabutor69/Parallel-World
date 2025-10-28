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
      .setCustomId(`channel_log_${sessionId}`)
      .setPlaceholder("Select channel for Logs")
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(0)
      .setMaxValues(1);

    const birthdaySelect = new ChannelSelectMenuBuilder()
      .setCustomId(`channel_birthday_${sessionId}`)
      .setPlaceholder("Select channel for Birthday Wishes")
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(0)
      .setMaxValues(1);

    const inviteSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`channel_invite_${sessionId}`)
      .setPlaceholder("Select channel for Invite Tracking")
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(0)
      .setMaxValues(1);

    const leaveSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`channel_leave_${sessionId}`)
      .setPlaceholder("Select channel for Leave Messages")
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(0)
      .setMaxValues(1);

    const welcomeSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`channel_welcome_${sessionId}`)
      .setPlaceholder("Select channel for Welcome Messages")
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(0)
      .setMaxValues(1);

    const rows = [
      new ActionRowBuilder().addComponents(logSelect),
      new ActionRowBuilder().addComponents(birthdaySelect),
      new ActionRowBuilder().addComponents(inviteSelect),
      new ActionRowBuilder().addComponents(leaveSelect),
      new ActionRowBuilder().addComponents(welcomeSelect),
    ];

   
    let description = "**Select channels for the following features:**\n\n";
    description += `📋 **Logs:** ${currentConfig?.log ? `<#${currentConfig.log}>` : "*Not configured*"}\n`;
    description += `🎂 **Birthday Wishes:** ${currentConfig?.birthday ? `<#${currentConfig.birthday}>` : "*Not configured*"}\n`;
    description += `📨 **Invite Tracking:** ${currentConfig?.invite ? `<#${currentConfig.invite}>` : "*Not configured*"}\n`;
    description += `👋 **Leave Messages:** ${currentConfig?.leave ? `<#${currentConfig.leave}>` : "*Not configured*"}\n`;
    description += `🎉 **Welcome Messages:** ${currentConfig?.welcome ? `<#${currentConfig.welcome}>` : "*Not configured*"}\n\n`;
    description += "*You can leave any feature blank if you don't want to configure it.*";

    const embed = new EmbedBuilder()
      .setTitle("📡 Channel Configuration")
      .setDescription(description)
      .setColor("#3498db")
      .setFooter({ text: "Select channels from the dropdowns below, then click Confirm or Cancel" });

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
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ This menu isn't for you.", ephemeral: true });
      }

      const selections = pendingSelections.get(sessionId);
      if (!selections) {
        return i.reply({ content: "❌ Session expired. Please run /channel again.", ephemeral: true });
      }

     
      if (i.isChannelSelectMenu()) {
        const [_, feature, sid] = i.customId.split("_");
        
        if (sid !== sessionId) return;

        
        selections[feature] = i.values.length > 0 ? i.values[0] : null;
        pendingSelections.set(sessionId, selections);

      
        let updateDesc = "**Current selections:**\n\n";
        updateDesc += `📋 **Logs:** ${selections.log ? `<#${selections.log}>` : "*Not selected*"}\n`;
        updateDesc += `🎂 **Birthday Wishes:** ${selections.birthday ? `<#${selections.birthday}>` : "*Not selected*"}\n`;
        updateDesc += `📨 **Invite Tracking:** ${selections.invite ? `<#${selections.invite}>` : "*Not selected*"}\n`;
        updateDesc += `👋 **Leave Messages:** ${selections.leave ? `<#${selections.leave}>` : "*Not selected*"}\n`;
        updateDesc += `🎉 **Welcome Messages:** ${selections.welcome ? `<#${selections.welcome}>` : "*Not selected*"}\n\n`;
        updateDesc += "**Click Confirm to save or Cancel to discard changes.**";

        const updatedEmbed = new EmbedBuilder()
          .setTitle("📡 Channel Configuration")
          .setDescription(updateDesc)
          .setColor("#f39c12")
          .setFooter({ text: "Click Confirm or Cancel below" });

       
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_${sessionId}`)
            .setLabel("✅ Confirm")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`cancel_${sessionId}`)
            .setLabel("❌ Cancel")
            .setStyle(ButtonStyle.Danger)
        );

    
        await i.update({
          embeds: [updatedEmbed],
          components: [buttonRow],
        });
      }

   
      else if (i.isButton()) {
        const [action, sid] = i.customId.split("_");
        
        if (sid !== sessionId) return;

        const selections = pendingSelections.get(sessionId);

        if (action === "confirm") {
      
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
          resultDesc += `🎂 **Birthday Wishes:** ${selections.birthday ? `<#${selections.birthday}>` : "*Disabled*"}\n`;
          resultDesc += `📨 **Invite Tracking:** ${selections.invite ? `<#${selections.invite}>` : "*Disabled*"}\n`;
          resultDesc += `👋 **Leave Messages:** ${selections.leave ? `<#${selections.leave}>` : "*Disabled*"}\n`;
          resultDesc += `🎉 **Welcome Messages:** ${selections.welcome ? `<#${selections.welcome}>` : "*Disabled*"}\n\n`;
          resultDesc += "*Features without channels will not work.*";

          const successEmbed = new EmbedBuilder()
            .setTitle("✅ Configuration Saved")
            .setDescription(resultDesc)
            .setColor("#2ecc71")
            .setFooter({ text: `Configured by ${interaction.user.tag}` })
            .setTimestamp();

          await i.update({
            embeds: [successEmbed],
            components: [],
          });

          pendingSelections.delete(sessionId);
          collector.stop();

          console.log(`✅ ${interaction.user.tag} updated channel configuration for ${interaction.guild.name}`);

        } else if (action === "cancel") {
          const cancelEmbed = new EmbedBuilder()
            .setTitle("❌ Configuration Cancelled")
            .setDescription("No changes were made to the channel configuration.")
            .setColor("#95a5a6")
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
    });

    collector.on("end", () => {
      pendingSelections.delete(sessionId);
    });
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
