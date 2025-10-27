const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const Birthday = require("../models/birthday");
const getChannelId = require("../utils/getChannelId");

const CHECK_INTERVAL = 60 * 60 * 1000;

module.exports = (client) => {
  const checkBirthdays = async () => {
    try {
      const now = new Date();
      const today = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

      const birthdays = await Birthday.find({ birthday: today });

      for (const bday of birthdays) {
        try {
          const guild = client.guilds.cache.get(bday.guildId);
          if (!guild) continue;
          const BIRTHDAY_CHANNEL_ID = await getChannelId(guild.id, "birthday");
          const channel = guild.channels.cache.get(BIRTHDAY_CHANNEL_ID);
          if (!channel) continue;

          const user = await client.users.fetch(bday.userId).catch(() => null);
          if (!user) continue;

          const member = await guild.members
            .fetch(bday.userId)
            .catch(() => null);
          if (!member) continue;

          let ageText = "";
          if (bday.year) {
            const age = now.getFullYear() - bday.year;
            ageText = ` They're turning **${age}** today!`;
          }

          const birthdayEmbed = new EmbedBuilder()
            .setColor("#ff69b4")
            .setTitle(`🎉 Happy Birthday ${user.username}! 🎂`)
            .setDescription(
              `Everyone wish a happy birthday to ${member}!${ageText}\n\n` +
                `🎈 *May your day be filled with joy, laughter, and wonderful memories!* 🎈`
            )
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setImage(
              "https://media.tenor.com/MvPvyKfXVCwAAAAC/lucky-star-anime.gif"
            )
            .setFooter({ text: `🎊 Birthday: ${bday.birthday}` })
            .setTimestamp();

          await channel.send({
            content: `@everyone 🎉`,
            embeds: [birthdayEmbed],
          });

          try {
            const dmEmbed = new EmbedBuilder()
              .setColor("#ff69b4")
              .setTitle(`🎂 Happy Birthday! 🎉`)
              .setDescription(
                `Happy Birthday, ${user.username}! 🥳\n\n` +
                  `The entire **${guild.name}** community wishes you an amazing day filled with happiness and joy!\n\n` +
                  `Thank you for being part of our community. Have a fantastic birthday! 🎈🎊`
              )
              .setThumbnail(guild.iconURL())
              .setImage(
                "https://media.tenor.com/MvPvyKfXVCwAAAAC/lucky-star-anime.gif"
              )
              .setFooter({ text: `From ${guild.name} with love ❤️` })
              .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
          } catch (dmError) {
            console.log(`Could not DM birthday message to ${user.tag}`);
          }

          console.log(`✅ Wished ${user.tag} happy birthday in ${guild.name}`);
        } catch (error) {
          console.error(`Error wishing birthday:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking birthdays:", error);
    }
  };

  setInterval(checkBirthdays, CHECK_INTERVAL);
  setTimeout(checkBirthdays, 5000);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (!interaction.guild) return;

    const { commandName } = interaction;

    try {
      if (commandName === "birthday-set") {
        const targetUser =
          interaction.options.getUser("user") || interaction.user;
        const month = interaction.options.getInteger("month");
        const day = interaction.options.getInteger("day");
        const year = interaction.options.getInteger("year");

        const isAdmin = interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        );
        if (targetUser.id !== interaction.user.id && !isAdmin) {
          return await interaction.reply({
            content:
              "❌ You can only set your own birthday, or you need Administrator permission!",
            ephemeral: true,
          });
        }

        if (month < 1 || month > 12) {
          return await interaction.reply({
            content: "❌ Invalid month! Must be between 1-12.",
            ephemeral: true,
          });
        }

        const daysInMonth = new Date(year || 2000, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
          return await interaction.reply({
            content: `❌ Invalid day! Month ${month} has ${daysInMonth} days.`,
            ephemeral: true,
          });
        }

        if (year && (year < 1900 || year > new Date().getFullYear())) {
          return await interaction.reply({
            content: "❌ Invalid year! Must be between 1900 and current year.",
            ephemeral: true,
          });
        }

        const birthdayStr = `${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;

        await Birthday.findOneAndUpdate(
          { userId: targetUser.id, guildId: interaction.guild.id },
          {
            userId: targetUser.id,
            guildId: interaction.guild.id,
            birthday: birthdayStr,
            year: year || null,
          },
          { upsert: true, new: true }
        );

        const dateText = year ? `${month}/${day}/${year}` : `${month}/${day}`;

        const embed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("🎂 Birthday Set!")
          .setDescription(`Birthday has been set for ${targetUser}`)
          .addFields(
            { name: "User", value: targetUser.tag, inline: true },
            { name: "Birthday", value: dateText, inline: true }
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setFooter({ text: `Set by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (commandName === "birthday-edit") {
        const targetUser =
          interaction.options.getUser("user") || interaction.user;
        const month = interaction.options.getInteger("month");
        const day = interaction.options.getInteger("day");
        const year = interaction.options.getInteger("year");

        const isAdmin = interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        );
        if (targetUser.id !== interaction.user.id && !isAdmin) {
          return await interaction.reply({
            content:
              "❌ You can only edit your own birthday, or you need Administrator permission!",
            ephemeral: true,
          });
        }

        const existing = await Birthday.findOne({
          userId: targetUser.id,
          guildId: interaction.guild.id,
        });

        if (!existing) {
          return await interaction.reply({
            content:
              "❌ No birthday set for this user! Use `/birthday-set` first.",
            ephemeral: true,
          });
        }

        if (month < 1 || month > 12) {
          return await interaction.reply({
            content: "❌ Invalid month! Must be between 1-12.",
            ephemeral: true,
          });
        }

        const daysInMonth = new Date(year || 2000, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
          return await interaction.reply({
            content: `❌ Invalid day! Month ${month} has ${daysInMonth} days.`,
            ephemeral: true,
          });
        }

        if (year && (year < 1900 || year > new Date().getFullYear())) {
          return await interaction.reply({
            content: "❌ Invalid year! Must be between 1900 and current year.",
            ephemeral: true,
          });
        }

        const birthdayStr = `${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;

        await Birthday.findOneAndUpdate(
          { userId: targetUser.id, guildId: interaction.guild.id },
          {
            birthday: birthdayStr,
            year: year || null,
          }
        );

        const dateText = year ? `${month}/${day}/${year}` : `${month}/${day}`;

        const embed = new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("✏️ Birthday Updated!")
          .setDescription(`Birthday has been updated for ${targetUser}`)
          .addFields(
            { name: "User", value: targetUser.tag, inline: true },
            { name: "New Birthday", value: dateText, inline: true }
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setFooter({ text: `Updated by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (commandName === "birthday-delete") {
        const targetUser =
          interaction.options.getUser("user") || interaction.user;

        const isAdmin = interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        );
        if (targetUser.id !== interaction.user.id && !isAdmin) {
          return await interaction.reply({
            content:
              "❌ You can only delete your own birthday, or you need Administrator permission!",
            ephemeral: true,
          });
        }

        const result = await Birthday.findOneAndDelete({
          userId: targetUser.id,
          guildId: interaction.guild.id,
        });

        if (!result) {
          return await interaction.reply({
            content: "❌ No birthday found for this user!",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("🗑️ Birthday Deleted")
          .setDescription(`Birthday has been removed for ${targetUser}`)
          .addFields({ name: "User", value: targetUser.tag, inline: true })
          .setThumbnail(targetUser.displayAvatarURL())
          .setFooter({ text: `Deleted by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error("Birthday command error:", error);

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (replyErr) {
        console.error("Could not send error message:", replyErr);
      }
    }
  });
};
