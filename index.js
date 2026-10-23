const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Servidor web pro Render não desligar o bot
const app = express();
app.get('/', (req, res) => res.send('Bot oficial online!'));
app.listen(process.env.PORT || 3000);

// Configuração do Bot Oficial
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('ready', () => {
  console.log(`🤖 Bot oficial logado como: ${client.user.tag}`);
});

// Resposta de comandos simples
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    message.reply('🏓 Pong! Bot oficial rodando 100% liso e seguro.');
  }
});

client.login(process.env.DISCORD_TOKEN);
