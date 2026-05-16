const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Reminder = require("../models/reminder");

module.exports = (client) => {
  const checkReminders = async () => {
    try {
      const now = new Date();
      const dueReminders = await Reminder.find({
        remindDate: { $lte: now },
        isSent: false,
      });

      for (const reminder of dueReminders) {
        try {
          const guild = client.guilds.cache.get(reminder.guildId);
          if (!guild) {
            reminder.isSent = true;
            await reminder.save();
            continue;
          }

          const channel = guild.channels.cache.get(reminder.channelId);
          if (!channel) {
            reminder.isSent = true;
            await reminder.save();
            continue;
          }

          const user = await client.users.fetch(reminder.userId).catch(() => null);

          const reminderEmbed = new EmbedBuilder()
            .setColor("#3498db")
            .setTitle("🔔 Reminder!")
            .setDescription(reminder.message)
            .addFields(
              { name: "Set for", value: `<t:${Math.floor(reminder.remindDate.getTime() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

          const embeds = [reminderEmbed];

          if (reminder.imageUrls && reminder.imageUrls.length > 0) {
            reminderEmbed.setImage(reminder.imageUrls[0]);
            
            // Add additional embeds for more images (Discord displays them together)
            for (let i = 1; i < reminder.imageUrls.length; i++) {
              embeds.push(new EmbedBuilder().setURL(reminderEmbed.data.url || "https://discord.com").setImage(reminder.imageUrls[i]));
            }
          }

          await channel.send({
            content: user ? `Hey ${user}, here is your reminder!` : "Reminder!",
            embeds: embeds,
          });

          reminder.isSent = true;
          await reminder.save();
        } catch (error) {
          console.error(`Error sending reminder ${reminder._id}:`, error);
        }
      }

      await Reminder.deleteMany({ isSent: true });

    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  };

  setInterval(checkReminders, 60000);
  setTimeout(checkReminders, 5000);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (!interaction.guild) return;

    const { commandName, options } = interaction;

    if (commandName === "reminder") {
      const subCommand = options.getSubcommand();

      if (subCommand === "set") {
        const message = options.getString("message");
        const timeInput = options.getString("time");
        const targetChannel = options.getChannel("channel") || interaction.channel;
        
        const imageUrls = [];
        for (let i = 1; i <= 5; i++) {
          const img = options.getAttachment(`image${i === 1 ? "1" : i}`);
          // Fallback for when it was just "image" (though I renamed it in index.js)
          const fallbackImg = i === 1 ? options.getAttachment("image") : null;
          const finalImg = img || fallbackImg;
          if (finalImg) imageUrls.push(finalImg.url);
        }

        let remindDate;

        const relativeMatch = timeInput.match(/^(\d+)([smhd])$/);
        if (relativeMatch) {
          const amount = parseInt(relativeMatch[1]);
          const unit = relativeMatch[2];
          remindDate = new Date();

          if (unit === "s") remindDate.setSeconds(remindDate.getSeconds() + amount);
          else if (unit === "m") remindDate.setMinutes(remindDate.getMinutes() + amount);
          else if (unit === "h") remindDate.setHours(remindDate.getHours() + amount);
          else if (unit === "d") remindDate.setHours(remindDate.getHours() + amount * 24);
        } else {
          // Try to parse as date string
          remindDate = new Date(timeInput);
        }

        if (isNaN(remindDate.getTime())) {
          return interaction.reply({
            content: "❌ Invalid time format! Use relative (e.g., `10m`, `1h`, `1d`) or a date string (e.g., `2026-05-20 12:00`).",
            ephemeral: true,
          });
        }

        if (remindDate <= new Date()) {
          return interaction.reply({
            content: "❌ The reminder time must be in the future!",
            ephemeral: true,
          });
        }

        const newReminder = new Reminder({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          channelId: targetChannel.id,
          message: message,
          imageUrls: imageUrls,
          remindDate: remindDate,
        });

        await newReminder.save();

        const embed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("✅ Reminder Set!")
          .setDescription(`I will remind you in ${targetChannel} about:`)
          .addFields(
            { name: "Message", value: message },
            { name: "Time", value: `<t:${Math.floor(remindDate.getTime() / 1000)}:F> (<t:${Math.floor(remindDate.getTime() / 1000)}:R>)` }
          )
          .setTimestamp();

        const embeds = [embed];
        if (imageUrls.length > 0) {
          embed.setImage(imageUrls[0]);
          for (let i = 1; i < imageUrls.length; i++) {
            embeds.push(new EmbedBuilder().setImage(imageUrls[i]));
          }
        }

        await interaction.reply({ embeds: embeds, ephemeral: true });
      }

      else if (subCommand === "list") {
        const reminders = await Reminder.find({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          isSent: false,
        }).sort({ remindDate: 1 });

        if (reminders.length === 0) {
          return interaction.reply({
            content: "You have no active reminders in this server.",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#3498db")
          .setTitle("📋 Your Reminders")
          .setDescription(reminders.map((r, i) =>
            `**${i + 1}.** ${r.message}${r.imageUrls && r.imageUrls.length > 0 ? ` 🖼️ (${r.imageUrls.length})` : ""}\n📅 <t:${Math.floor(r.remindDate.getTime() / 1000)}:F> in <#${r.channelId}>`
          ).join("\n\n"))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (subCommand === "delete") {
        const reminders = await Reminder.find({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          isSent: false,
        }).sort({ remindDate: 1 });

        if (reminders.length === 0) {
          return interaction.reply({
            content: "You have no active reminders to delete.",
            ephemeral: true,
          });
        }

        const index = options.getInteger("number") - 1;
        if (index < 0 || index >= reminders.length) {
          return interaction.reply({
            content: "❌ Invalid reminder number!",
            ephemeral: true,
          });
        }

        const deleted = await Reminder.findByIdAndDelete(reminders[index]._id);

        await interaction.reply({
          content: `✅ Deleted reminder: **${deleted.message}**`,
          ephemeral: true,
        });
      }
    }
  });
};
