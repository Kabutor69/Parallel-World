const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("🌐 Keep-alive web server running"));

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const mongoose = require("mongoose");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildModeration,
  ],
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error(err));

const level = require("./features/level");
level(client);
require("./features/ban")(client);
require("./features/kick")(client);
require("./features/unban")(client);
require("./features/timeout")(client);
require("./features/deleteall")(client);
require("./features/birthday")(client);
require("./features/invtracker")(client);
require("./features/selfrole")(client);
require("./features/log")(client);
require("./features/channel")(client);

const welcome = require("./features/welcome");
welcome(client);

const leave = require("./features/leave");
leave(client);

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const commands = [
    {
      name: "rank",
      description: "Check your or another user's level and XP",
      options: [
        {
          name: "user",
          description: "User to check",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "leaderboard",
      description: "Show top 10 ranked users",
    },
    {
      name: "ban",
      description: "Ban a member from the server",
      options: [
        {
          name: "user",
          description: "The user to ban",
          type: 6,
          required: true,
        },
        {
          name: "reason",
          description: "Reason for the ban",
          type: 3,
          required: false,
        },
        {
          name: "delete_days",
          description: "Number of days of messages to delete (0-7)",
          type: 4,
          required: false,
          choices: [
            { name: "Don't delete any", value: 0 },
            { name: "1 day", value: 1 },
            { name: "3 days", value: 3 },
            { name: "7 days", value: 7 },
          ],
        },
      ],
    },
    {
      name: "kick",
      description: "Kick a member from the server",
      options: [
        {
          name: "user",
          description: "The user to kick",
          type: 6,
          required: true,
        },
        {
          name: "reason",
          description: "Reason for the kick",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "unban",
      description: "Unban a user from the server",
      options: [
        {
          name: "user_id",
          description: "The user ID to unban",
          type: 3,
          required: true,
        },
        {
          name: "reason",
          description: "Reason for the unban",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "timeout",
      description: "Timeout a member (mute them temporarily)",
      options: [
        {
          name: "user",
          description: "The user to timeout",
          type: 6,
          required: true,
        },
        {
          name: "duration",
          description: "How long to timeout",
          type: 3,
          required: true,
          choices: [
            { name: "5 seconds", value: "5s" },
            { name: "10 seconds", value: "10s" },
            { name: "15 seconds", value: "15s" },
            { name: "20 seconds", value: "20s" },
            { name: "30 seconds", value: "30s" },
            { name: "60 seconds", value: "60s" },
            { name: "5 minutes", value: "5m" },
            { name: "10 minutes", value: "10m" },
            { name: "30 minutes", value: "30m" },
            { name: "1 hour", value: "1h" },
            { name: "6 hours", value: "6h" },
            { name: "12 hours", value: "12h" },
            { name: "1 day", value: "1d" },
            { name: "1 week", value: "1w" },
          ],
        },
        {
          name: "reason",
          description: "Reason for the timeout",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "deleteall",
      description:
        "Delete all messages in the channel from a specific time range",
      options: [
        {
          name: "duration",
          description: "Delete messages from the last...",
          type: 3,
          required: true,
          choices: [
            { name: "10 minutes", value: "10m" },
            { name: "30 minutes", value: "30m" },
            { name: "1 hour", value: "1h" },
            { name: "2 hours", value: "2h" },
            { name: "5 hours", value: "5h" },
            { name: "10 hours", value: "10h" },
            { name: "24 hours (1 day)", value: "24h" },
            { name: "2 days", value: "2d" },
            { name: "3 days", value: "3d" },
            { name: "4 days", value: "4d" },
            { name: "5 days", value: "5d" },
            { name: "6 days", value: "6d" },
            { name: "7 days (1 week)", value: "7d" },
          ],
        },
      ],
    },
    {
      name: "birthday-set",
      description: "Set your birthday or someone else's (Admin only)",
      options: [
        {
          name: "month",
          description: "Birth month (1-12)",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 12,
        },
        {
          name: "day",
          description: "Birth day (1-31)",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          name: "year",
          description: "Birth year (optional, for age display)",
          type: 4,
          required: false,
          min_value: 1900,
          max_value: new Date().getFullYear(),
        },
        {
          name: "user",
          description: "User to set birthday for (Admin only)",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "birthday-edit",
      description: "Edit your birthday or someone else's (Admin only)",
      options: [
        {
          name: "month",
          description: "New birth month (1-12)",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 12,
        },
        {
          name: "day",
          description: "New birth day (1-31)",
          type: 4,
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          name: "year",
          description: "New birth year (optional)",
          type: 4,
          required: false,
          min_value: 1900,
          max_value: new Date().getFullYear(),
        },
        {
          name: "user",
          description: "User to edit birthday for (Admin only)",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "birthday-delete",
      description: "Delete your birthday or someone else's (Admin only)",
      options: [
        {
          name: "user",
          description: "User to delete birthday for (Admin only)",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "selfrole",
      description: "Create a self-role message with reactions (Admin only)",
      options: [
        {
          name: "channel",
          description: "Channel to send the self-role message",
          type: 7,
          required: true,
        },
        {
          name: "role1",
          description: "First role name",
          type: 3,
          required: true,
        },
        {
          name: "emoji1",
          description: "Emoji for first role (e.g., 🎮 or :custom:)",
          type: 3,
          required: true,
        },
        {
          name: "title",
          description: "Title of the self-role embed",
          type: 3,
          required: false,
        },
        {
          name: "description",
          description: "Description of the self-role embed",
          type: 3,
          required: false,
        },
        {
          name: "role2",
          description: "Second role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji2",
          description: "Emoji for second role",
          type: 3,
          required: false,
        },
        {
          name: "role3",
          description: "Third role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji3",
          description: "Emoji for third role",
          type: 3,
          required: false,
        },
        {
          name: "role4",
          description: "Fourth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji4",
          description: "Emoji for fourth role",
          type: 3,
          required: false,
        },
        {
          name: "role5",
          description: "Fifth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji5",
          description: "Emoji for fifth role",
          type: 3,
          required: false,
        },
        {
          name: "role6",
          description: "Sixth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji6",
          description: "Emoji for sixth role",
          type: 3,
          required: false,
        },
        {
          name: "role7",
          description: "Seventh role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji7",
          description: "Emoji for seventh role",
          type: 3,
          required: false,
        },
        {
          name: "role8",
          description: "Eighth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji8",
          description: "Emoji for eighth role",
          type: 3,
          required: false,
        },
        {
          name: "role9",
          description: "Ninth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji9",
          description: "Emoji for ninth role",
          type: 3,
          required: false,
        },
        {
          name: "role10",
          description: "Tenth role name",
          type: 3,
          required: false,
        },
        {
          name: "emoji10",
          description: "Emoji for tenth role",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "channel",
      description: "Set channels for different bot features (Admin only)",
    },
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ Slash commands registered!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
});

client.login(process.env.TOKEN);
