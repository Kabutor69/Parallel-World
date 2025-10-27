const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Profile = require("../models/profile");
const Canvas = require("canvas");

function getLevelFromXP(totalXP) {
  let level = 0;
  while (level ** 2 * 100 <= totalXP) level++;
  return level - 1;
}
function getNextLevelXP(level) {
  return level ** 2 * 100;
}

async function createRankCard(user, profile, rank) {
  const width = 900;
  const height = 300;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#1a1a2e");
  bgGradient.addColorStop(0.5, "#16213e");
  bgGradient.addColorStop(1, "#0f3460");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, "#e94560");
  accentGradient.addColorStop(0.5, "#f39c12");
  accentGradient.addColorStop(1, "#e94560");
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 4);

  const avatarX = 40;
  const avatarY = 50;
  const avatarSize = 180;

  ctx.shadowColor = "rgba(233, 69, 96, 0.5)";
  ctx.shadowBlur = 20;
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.clip();

  const avatar = await Canvas.loadImage(
    user.displayAvatarURL({ extension: "png" })
  );
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();
  ctx.shadowBlur = 0;

  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(user.username, 260, 90);
  ctx.shadowBlur = 0;

  const rankBadgeX = 260;
  const rankBadgeY = 105;
  const rankBadgeWidth = 120;
  const rankBadgeHeight = 40;

  const rankGradient = ctx.createLinearGradient(
    rankBadgeX,
    rankBadgeY,
    rankBadgeX + rankBadgeWidth,
    rankBadgeY
  );
  rankGradient.addColorStop(0, "#3498db");
  rankGradient.addColorStop(1, "#2980b9");

  ctx.fillStyle = rankGradient;
  ctx.beginPath();
  ctx.roundRect(rankBadgeX, rankBadgeY, rankBadgeWidth, rankBadgeHeight, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`#${rank}`, rankBadgeX + 20, rankBadgeY + 28);
  ctx.font = "18px Arial";
  ctx.fillText("RANK", rankBadgeX + 60, rankBadgeY + 28);

  const levelBadgeX = 400;
  const levelBadgeY = 105;
  const levelBadgeWidth = 140;

  const levelGradient = ctx.createLinearGradient(
    levelBadgeX,
    levelBadgeY,
    levelBadgeX + levelBadgeWidth,
    levelBadgeY
  );
  levelGradient.addColorStop(0, "#f39c12");
  levelGradient.addColorStop(1, "#e67e22");

  ctx.fillStyle = levelGradient;
  ctx.beginPath();
  ctx.roundRect(levelBadgeX, levelBadgeY, levelBadgeWidth, rankBadgeHeight, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`${profile.level}`, levelBadgeX + 20, levelBadgeY + 28);
  ctx.font = "18px Arial";
  ctx.fillText("LEVEL", levelBadgeX + 65, levelBadgeY + 28);

  const prevXP = profile.level === 0 ? 0 : getNextLevelXP(profile.level);
  const nextXP = getNextLevelXP(profile.level + 1);
  const progress = (profile.xp - prevXP) / (nextXP - prevXP);

  ctx.fillStyle = "#a0a0a0";
  ctx.font = "18px Arial";
  ctx.fillText("EXPERIENCE PROGRESS", 260, 180);

  const barWidth = 600;
  const barHeight = 35;
  const barX = 260;
  const barY = 190;
  const borderRadius = 17;

  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, borderRadius);
  ctx.fill();

  if (progress > 0) {
    const progressGradient = ctx.createLinearGradient(
      barX,
      barY,
      barX + barWidth,
      barY
    );
    progressGradient.addColorStop(0, "#e94560");
    progressGradient.addColorStop(0.5, "#f39c12");
    progressGradient.addColorStop(1, "#2ecc71");

    ctx.fillStyle = progressGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, borderRadius);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 5;
  const xpText = `${profile.xp} / ${nextXP} XP`;
  const textMetrics = ctx.measureText(xpText);
  ctx.fillText(xpText, barX + (barWidth - textMetrics.width) / 2, barY + 24);
  ctx.shadowBlur = 0;

  return canvas.toBuffer();
}

async function createLeaderboardCanvas(client, profiles) {
  const rowHeight = 110;
  const padding = 30;
  const avatarSize = 70;
  const canvasWidth = 900;
  const headerHeight = 80;
  const canvasHeight = rowHeight * profiles.length + padding * 2 + headerHeight;

  const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, "#1a1a2e");
  bgGradient.addColorStop(1, "#16213e");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const headerGradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  headerGradient.addColorStop(0, "#e94560");
  headerGradient.addColorStop(0.5, "#f39c12");
  headerGradient.addColorStop(1, "#e94560");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, canvasWidth, 4);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  ctx.fillText("🏆 LEADERBOARD", padding, 55);
  ctx.shadowBlur = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const y = i * rowHeight + padding + headerHeight;

    const user = await client.users
      .fetch(profile.userId)
      .catch(() => ({ username: "Unknown", displayAvatarURL: () => "" }));
    const avatar = await Canvas.loadImage(
      user.displayAvatarURL({ extension: "png" })
    );

    ctx.fillStyle =
      i % 2 === 0 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)";
    ctx.beginPath();
    ctx.roundRect(padding, y, canvasWidth - padding * 2, rowHeight - 10, 10);
    ctx.fill();

    let rankColor;
    if (i === 0) {
      const goldGradient = ctx.createLinearGradient(
        padding + 10,
        y,
        padding + 60,
        y
      );
      goldGradient.addColorStop(0, "#ffd700");
      goldGradient.addColorStop(1, "#ffed4e");
      rankColor = goldGradient;
    } else if (i === 1) {
      const silverGradient = ctx.createLinearGradient(
        padding + 10,
        y,
        padding + 60,
        y
      );
      silverGradient.addColorStop(0, "#c0c0c0");
      silverGradient.addColorStop(1, "#e8e8e8");
      rankColor = silverGradient;
    } else if (i === 2) {
      const bronzeGradient = ctx.createLinearGradient(
        padding + 10,
        y,
        padding + 60,
        y
      );
      bronzeGradient.addColorStop(0, "#cd7f32");
      bronzeGradient.addColorStop(1, "#e8a872");
      rankColor = bronzeGradient;
    } else {
      rankColor = "#a0a0a0";
    }

    ctx.fillStyle = rankColor;
    ctx.font = "bold 40px Arial";
    ctx.fillText(`#${i + 1}`, padding + 15, y + 60);

    ctx.save();
    ctx.beginPath();
    ctx.arc(padding + 110, y + 45, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = i < 3 ? rankColor : "#555555";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(avatar, padding + 75, y + 10, avatarSize, avatarSize);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial";
    ctx.fillText(user.username, padding + 160, y + 40);

    const levelBadgeWidth = 100;
    const levelBadgeX = padding + 160;
    const levelBadgeY = y + 50;

    ctx.fillStyle = "rgba(243, 156, 18, 0.3)";
    ctx.beginPath();
    ctx.roundRect(levelBadgeX, levelBadgeY, levelBadgeWidth, 30, 8);
    ctx.fill();

    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`Level ${profile.level}`, levelBadgeX + 10, levelBadgeY + 21);

    ctx.fillStyle = "#a0a0a0";
    ctx.font = "20px Arial";
    const xpText = `${profile.xp.toLocaleString()} XP`;
    const xpWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, canvasWidth - padding - xpWidth - 10, y + 55);
  }

  return canvas.toBuffer();
}

module.exports = async function (client) {
  const cooldown = new Set();
  const milestones = [1, 5, 10, 15, 20, 25, 50, 75, 100];

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (cooldown.has(message.author.id)) return;

    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 15000);

    let profile = await Profile.findOne({
      userId: message.author.id,
      guildId: message.guild.id,
    });
    if (!profile)
      profile = new Profile({
        userId: message.author.id,
        guildId: message.guild.id,
      });

    profile.xp += Math.floor(Math.random() * 5) + 1;
    const oldLevel = profile.level;
    profile.level = getLevelFromXP(profile.xp);

    if (profile.level > oldLevel) {
      await profile.save();
      message.channel.send(
        `🎉 Congrats ${message.author}, you reached **Level ${profile.level}!**`
      );

      if (milestones.includes(profile.level)) {
        let role = message.guild.roles.cache.find(
          (r) => r.name === `Level ${profile.level}`
        );
        if (!role) {
          role = await message.guild.roles.create({
            name: `Level ${profile.level}`,
            color: "Random",
            reason: `Auto-created for level ${profile.level}`,
          });
        }

        for (const r of message.member.roles.cache.values()) {
          if (r.name.startsWith("Level ") && r.name !== role.name) {
            await message.member.roles.remove(r).catch(() => {});
          }
        }

        await message.member.roles.add(role);
        message.channel.send(`🌟 You earned the **${role.name}** role!`);
      }
    } else {
      await profile.save();
    }
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Check your or another user's level and XP")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to check").setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("Show top 10 ranked users"),
  ].map((cmd) => cmd.toJSON());

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (!interaction.guild) return;

    try {
      if (interaction.commandName === "rank") {
        await interaction.deferReply();

        const target = interaction.options.getUser("user") || interaction.user;
        let profile = await Profile.findOne({
          userId: target.id,
          guildId: interaction.guild.id,
        });
        if (!profile) {
          profile = new Profile({
            userId: target.id,
            guildId: interaction.guild.id,
          });
          await profile.save();
        }

        const allProfiles = await Profile.find({
          guildId: interaction.guild.id,
        });
        const sorted = allProfiles.sort((a, b) => b.xp - a.xp);
        const rank = sorted.findIndex((p) => p.userId === target.id) + 1;

        const buffer = await createRankCard(target, profile, rank);
        const attachment = new AttachmentBuilder(buffer, {
          name: "rank-card.png",
        });
        await interaction.editReply({ files: [attachment] });
      } else if (interaction.commandName === "leaderboard") {
        await interaction.deferReply();

        const top = await Profile.find({ guildId: interaction.guild.id })
          .sort({ xp: -1 })
          .limit(10);
        if (!top.length) {
          return await interaction.editReply("❌ No data found yet!");
        }

        const buffer = await createLeaderboardCanvas(client, top);
        const attachment = new AttachmentBuilder(buffer, {
          name: "leaderboard.png",
        });

        await interaction.editReply({ files: [attachment] });
      }
    } catch (err) {
      console.error("Interaction error:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred.",
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ content: "❌ An error occurred." });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });

  client.on("guildMemberRemove", async (member) => {
    try {
      await Profile.deleteOne({
        userId: member.id,
        guildId: member.guild.id,
      });
      console.log(
        `Deleted level data for ${member.user.tag} (left ${member.guild.name})`
      );
    } catch (err) {
      console.error("Error deleting user profile on leave:", err);
    }
  });
};
