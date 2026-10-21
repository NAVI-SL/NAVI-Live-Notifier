import { ActivityType, Client, GatewayIntentBits } from 'discord.js';

export const BOT_PRESENCE = {
  status: 'online' as const,
  activities: [{ name: 'livestreams', type: ActivityType.Watching }],
};

/** Construct locally without logging in, subscribing or sending messages. */
export function createBot() {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
    allowedMentions: { parse: [] },
    presence: BOT_PRESENCE,
  });
}
