const { Client } = require('discord.js-selfbot-v13');
const { onMessage } = require('./commands');
const express = require('express');

// --- Servidor Web para o Render não desligar o bot ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Self-bot está online e ativo!');
});

app.listen(PORT, () => {
  console.log(`Servidor web a correr na porta ${PORT}`);
});

// --- Configuração do Self-Bot ---
const client = new Client({ checkUpdate: false });

client.on('ready', () => {
  console.log(`Self-bot ligado com sucesso na conta: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  await onMessage(message);
});

client.login(process.env.DISCORD_TOKEN);
