const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { 
  allSlashCommands, 
  handleInteraction, 
  handleMessage, 
  handleGuildMemberAdd, 
  handleGuildMemberRemove, 
  handleGuildMemberUpdate 
} = require('./ticket.js');

// Servidor Express obrigatório para o Render manter o bot online
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Zapher Bot está online!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web rodando na porta ${PORT}`);
});

// Configuração do Bot do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}!`);
  try {
    await client.application.commands.set(allSlashCommands);
    console.log('✅ Comandos Slash registrados globalmente!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos slash:', error);
  }
});

client.on('messageCreate', handleMessage);
client.on('interactionCreate', handleInteraction);
client.on('guildMemberAdd', handleGuildMemberAdd);
client.on('guildMemberRemove', handleGuildMemberRemove);
client.on('guildMemberUpdate', handleGuildMemberUpdate);

// Faz o login usando a variável de ambiente configurada no Render
client.login(process.env.DISCORD_TOKEN);
