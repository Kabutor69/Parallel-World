const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const getChannelId = require("../utils/getChannelId");

module.exports = (client) => {
  async function sendLog(guild, embed) {
    try {
      const LOG_CHANNEL_ID = await getChannelId(guild.id, "log");
      const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
    }
  }

  async function getExecutor(guild, type) {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 1, type });
      const entry = logs.entries.first();
      if (entry) return entry.executor;
    } catch {}
    return null;
  }

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🗑️ Message Deleted")
      .setDescription(`A message was deleted in ${message.channel}`)
      .addFields(
        { name: "Author", value: message.author ? `${message.author.tag} (${message.author.id})` : "Unknown", inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag} (${executor.id})` : "Unknown", inline: true },
        { name: "Channel", value: `${message.channel}`, inline: true },
        { name: "Content", value: message.content || "*No text content*", inline: false }
      )
      .setTimestamp();
    if (message.attachments.size > 0) {
      const attList = [];
      let firstImg = null;
      message.attachments.forEach(a => {
        const t = a.contentType || "unknown";
        const n = a.name || "unknown";
        const s = (a.size / 1024).toFixed(2);
        let e = "📎";
        if (t.startsWith("image/")) { e = "🖼️"; if (!firstImg) firstImg = a.proxyURL; }
        else if (t.startsWith("video/")) e = "🎥";
        else if (t.startsWith("audio/")) e = "🎵";
        attList.push(`${e} **${n}** (${s} KB)\n[URL](${a.url})`);
      });
      embed.addFields({ name: `📎 Attachments (${message.attachments.size})`, value: attList.join("\n\n"), inline: false });
      if (firstImg) embed.setImage(firstImg);
    }
    await sendLog(message.guild, embed);
  });

  client.on(Events.MessageBulkDelete, async (messages) => {
    const firstMessage = messages.first();
    if (!firstMessage?.guild) return;
    const executor = await getExecutor(firstMessage.guild, AuditLogEvent.MessageBulkDelete);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🧹 Bulk Message Delete")
      .setDescription(`${messages.size} messages were deleted in ${firstMessage.channel}`)
      .addFields(
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
        { name: "Channel", value: `${firstMessage.channel}`, inline: true },
        { name: "Count", value: `${messages.size}`, inline: true }
      )
      .setTimestamp();
    await sendLog(firstMessage.guild, embed);
  });

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
      .setColor("#f39c12")
      .setTitle("✏️ Message Edited")
      .setDescription(`A message was edited in ${newMessage.channel}`)
      .addFields(
        { name: "Author", value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: "Channel", value: `${newMessage.channel}`, inline: true },
        { name: "Before", value: oldMessage.content || "*None*", inline: false },
        { name: "After", value: newMessage.content || "*None*", inline: false },
        { name: "Jump to Message", value: `[Click here](${newMessage.url})`, inline: false }
      )
      .setTimestamp();
    await sendLog(newMessage.guild, embed);
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("📥 Member Joined")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Total Members", value: `${member.guild.memberCount}`, inline: true }
      )
      .setTimestamp();
    await sendLog(member.guild, embed);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("📤 Member Left")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: "Joined", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(member.guild, embed);
  });

  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    if (oldM.nickname !== newM.nickname) {
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("✏️ Nickname Changed")
        .setThumbnail(newM.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${newM.user.tag}`, inline: true },
          { name: "Old Nickname", value: oldM.nickname || "*None*", inline: true },
          { name: "New Nickname", value: newM.nickname || "*None*", inline: true }
        )
        .setTimestamp();
      await sendLog(newM.guild, embed);
    }
    const oldRoles = oldM.roles.cache;
    const newRoles = newM.roles.cache;
    const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
    const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));
    if (addedRoles.size > 0) {
      const executor = await getExecutor(newM.guild, AuditLogEvent.MemberRoleUpdate);
      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("➕ Role Added")
        .setThumbnail(newM.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${newM.user.tag}`, inline: true },
          { name: "Role Added", value: addedRoles.map(r => r.toString()).join(", "), inline: true },
          { name: "By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
        )
        .setTimestamp();
      await sendLog(newM.guild, embed);
    }
    if (removedRoles.size > 0) {
      const executor = await getExecutor(newM.guild, AuditLogEvent.MemberRoleUpdate);
      const embed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("➖ Role Removed")
        .setThumbnail(newM.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${newM.user.tag}`, inline: true },
          { name: "Role Removed", value: removedRoles.map(r => r.name).join(", "), inline: true },
          { name: "By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
        )
        .setTimestamp();
      await sendLog(newM.guild, embed);
    }
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    const embed = new EmbedBuilder()
      .setColor("#8b0000")
      .setTitle("🔨 Member Banned")
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: "Banned By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
        { name: "Reason", value: ban.reason || "None", inline: true }
      )
      .setTimestamp();
    await sendLog(ban.guild, embed);
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("🔓 Member Unbanned")
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: "Unbanned By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(ban.guild, embed);
  });

  client.on(Events.VoiceStateUpdate, async (oldS, newS) => {
    const m = newS.member;
    if (!oldS.channel && newS.channel) {
      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("🎤 Joined Voice Channel")
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${m.user.tag}`, inline: true },
          { name: "Channel", value: `${newS.channel}`, inline: true }
        )
        .setTimestamp();
      await sendLog(newS.guild, embed);
    } else if (oldS.channel && !newS.channel) {
      const embed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("🔇 Left Voice Channel")
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${m.user.tag}`, inline: true },
          { name: "Channel", value: `${oldS.channel}`, inline: true }
        )
        .setTimestamp();
      await sendLog(oldS.guild, embed);
    } else if (oldS.channel && newS.channel && oldS.channel.id !== newS.channel.id) {
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🔄 Moved Voice Channel")
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${m.user.tag}`, inline: true },
          { name: "From", value: `${oldS.channel}`, inline: true },
          { name: "To", value: `${newS.channel}`, inline: true }
        )
        .setTimestamp();
      await sendLog(newS.guild, embed);
    }
    if (oldS.serverMute !== newS.serverMute) {
      const embed = new EmbedBuilder()
        .setColor(newS.serverMute ? "#e74c3c" : "#2ecc71")
        .setTitle(newS.serverMute ? "🔇 Server Muted" : "🔊 Server Unmuted")
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${m.user.tag}`, inline: true },
          { name: "Channel", value: `${newS.channel}`, inline: true }
        )
        .setTimestamp();
      await sendLog(newS.guild, embed);
    }
    if (oldS.serverDeaf !== newS.serverDeaf) {
      const embed = new EmbedBuilder()
        .setColor(newS.serverDeaf ? "#e74c3c" : "#2ecc71")
        .setTitle(newS.serverDeaf ? "🔇 Server Deafened" : "🔊 Server Undeafened")
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${m.user.tag}`, inline: true },
          { name: "Channel", value: `${newS.channel}`, inline: true }
        )
        .setTimestamp();
      await sendLog(newS.guild, embed);
    }
  });

  client.on(Events.ChannelCreate, async (channel) => {
    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate);
    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("📁 Channel Created")
      .addFields(
        { name: "Channel", value: `${channel}`, inline: true },
        { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(channel.guild, embed);
  });

  client.on(Events.ChannelDelete, async (channel) => {
    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🗑️ Channel Deleted")
      .addFields(
        { name: "Channel", value: `${channel.name}`, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(channel.guild, embed);
  });

  client.on(Events.ChannelUpdate, async (oldC, newC) => {
    const executor = await getExecutor(newC.guild, AuditLogEvent.ChannelUpdate);
    const changes = [];
    if (oldC.name !== newC.name) changes.push(`**Name:** ${oldC.name} → ${newC.name}`);
    if (oldC.topic !== newC.topic) changes.push(`**Topic:** ${oldC.topic || "*None*"} → ${newC.topic || "*None*"}`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
      .setColor("#f39c12")
      .setTitle("✏️ Channel Updated")
      .setDescription(changes.join("\n"))
      .addFields(
        { name: "Channel", value: `${newC}`, inline: true },
        { name: "Updated By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(newC.guild, embed);
  });

  client.on(Events.GuildRoleCreate, async (role) => {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate);
    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("🎭 Role Created")
      .addFields(
        { name: "Role", value: `${role}`, inline: true },
        { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(role.guild, embed);
  });

  client.on(Events.GuildRoleDelete, async (role) => {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🗑️ Role Deleted")
      .addFields(
        { name: "Role", value: role.name, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(role.guild, embed);
  });

  client.on(Events.GuildRoleUpdate, async (oldR, newR) => {
    const executor = await getExecutor(newR.guild, AuditLogEvent.RoleUpdate);
    const changes = [];
    if (oldR.name !== newR.name) changes.push(`**Name:** ${oldR.name} → ${newR.name}`);
    if (oldR.hexColor !== newR.hexColor) changes.push(`**Color:** ${oldR.hexColor} → ${newR.hexColor}`);
    if (oldR.permissions.bitfield !== newR.permissions.bitfield) changes.push(`**Permissions changed**`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
      .setColor("#f39c12")
      .setTitle("✏️ Role Updated")
      .setDescription(changes.join("\n"))
      .addFields(
        { name: "Role", value: `${newR}`, inline: true },
        { name: "Updated By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(newR.guild, embed);
  });

  client.on(Events.GuildEmojiCreate, async (emoji) => {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate);
    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("😀 Emoji Created")
      .setThumbnail(emoji.url)
      .addFields(
        { name: "Emoji", value: `${emoji}`, inline: true },
        { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(emoji.guild, embed);
  });

  client.on(Events.GuildEmojiDelete, async (emoji) => {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiDelete);
    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🗑️ Emoji Deleted")
      .setThumbnail(emoji.url)
      .addFields(
        { name: "Emoji", value: `${emoji.name}`, inline: true },
        { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown", inline: true }
      )
      .setTimestamp();
    await sendLog(emoji.guild, embed);
  });

  client.on(Events.GuildUpdate, async (oldG, newG) => {
    const executor = await getExecutor(newG, AuditLogEvent.GuildUpdate);
    const changes = [];
    if (oldG.name !== newG.name) changes.push(`**Name:** ${oldG.name} → ${newG.name}`);
    if (oldG.icon !== newG.icon) changes.push(`**Icon changed**`);
    if (!changes.length) return;
    const embed = new EmbedBuilder()
      .setColor("#f39c12")
      .setTitle("🏠 Server Updated")
      .setDescription(changes.join("\n"))
      .setThumbnail(newG.iconURL())
      .addFields({ name: "Updated By", value: executor ? `${executor.tag}` : "Unknown", inline: true })
      .setTimestamp();
    await sendLog(newG, embed);
  });

  console.log("✅ Logging system initialized!");
};
