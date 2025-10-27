# Parallel World Discord Bot

A comprehensive Discord bot with moderation, leveling, birthdays, self-roles, and logging features.

## Features

- **Moderation Commands**: Ban, kick, timeout, unban
- **Leveling System**: XP tracking with rank cards and leaderboards
- **Birthday System**: Automated birthday announcements
- **Self-Roles**: Reaction-based role assignment
- **Welcome/Leave Messages**: Custom welcome and goodbye messages
- **Invite Tracking**: Track who invited new members
- **Logging**: Comprehensive logging of server events
- **Channel Configuration**: Configure channels for different features

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   TOKEN=your_discord_bot_token
   MONGO_URI=your_mongodb_connection_string
   ```
4. Run the bot: `npm start`

## Requirements

- Node.js (v16 or higher)
- MongoDB database
- Discord Bot Token

## Commands

- `/rank` - Check your or another user's level
- `/leaderboard` - Show top 10 ranked users
- `/ban` - Ban a member from the server
- `/kick` - Kick a member from the server
- `/unban` - Unban a user by ID
- `/timeout` - Timeout a member temporarily
- `/deleteall` - Delete messages in a channel
- `/birthday-set` - Set a birthday
- `/birthday-edit` - Edit a birthday
- `/birthday-delete` - Delete a birthday
- `/selfrole` - Create a self-role message
- `/channel` - Configure feature channels

## Permissions

The bot requires the following permissions:
- Administrator (recommended)
- Or individual permissions: Ban Members, Kick Members, Manage Roles, Manage Messages, View Channels, Send Messages, Manage Events, Moderate Members

## License

ISC

