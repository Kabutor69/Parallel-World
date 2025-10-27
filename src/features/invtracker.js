const { Client } = require("discord.js");
const getChannelId = require("../utils/getChannelId");

module.exports = (client) => {

  const invites = new Map();

  client.on("ready", async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const guildInvites = await guild.invites.fetch();
        invites.set(
          guild.id,
          new Map(guildInvites.map((invite) => [invite.code, invite.uses]))
        );
      } catch (err) {
        console.log(
          `❌ Could not fetch invites for ${guild.name}:`,
          err.message
        );
      }
    }
    console.log("✅ Invite tracker initialized!");
  });

  client.on("guildMemberAdd", async (member) => {
    try {
      const INVITE_LOG_CHANNEL_ID = await getChannelId(member.guild.id, "invite");
      const cachedInvites = invites.get(member.guild.id);
      const newInvites = await member.guild.invites.fetch();

      const usedInvite = newInvites.find(
        (inv) => cachedInvites && inv.uses > (cachedInvites.get(inv.code) || 0)
      );

      invites.set(
        member.guild.id,
        new Map(newInvites.map((invite) => [invite.code, invite.uses]))
      );

      const logChannel = member.guild.channels.cache.get(INVITE_LOG_CHANNEL_ID);
      if (!logChannel) {
        console.log("⚠️ Invite log channel not found!");
        return;
      }

      if (usedInvite) {
        await logChannel.send(
          `👋 **${member.user.tag}** joined using invite from **${usedInvite.inviter.tag}** (Uses: ${usedInvite.uses})`
        );
      } else {
        await logChannel.send(
          `👋 **${member.user.tag}** joined, but I couldn't find who invited them.`
        );
      }
    } catch (err) {
      console.error("❌ Error in invite tracker:", err);
    }
  });

  client.on("inviteCreate", (invite) => {
    const guildInvites = invites.get(invite.guild.id) || new Map();
    guildInvites.set(invite.code, invite.uses);
    invites.set(invite.guild.id, guildInvites);
  });

  client.on("inviteDelete", (invite) => {
    const guildInvites = invites.get(invite.guild.id);
    if (!guildInvites) return;
    guildInvites.delete(invite.code);
    invites.set(invite.guild.id, guildInvites);
  });
};
