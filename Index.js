const { Client } = require('discord.js-selfbot-v13');
const { onMessage } = require('./commands');

const client = new Client({ checkUpdate: false });

client.on('ready', () => {
  console.log(`Self-bot ligado com sucesso na conta: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  await onMessage(message);
});

// Puxa o token das variáveis do Render
client.login(process.env.DISCORD_TOKEN);
