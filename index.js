const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { 
  onMessage, 
  handleSlashCommand, 
  registerSlashCommands 
} = require('./commands');

// ===== SERVIDOR WEB (Render/UptimeRobot) =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot: client.user?.tag || 'iniciando...',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web na porta ${PORT}`);
});

// ===== CLIENTE DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// ===== EVENTOS =====
client.once('ready', async () => {
  console.log(`🤖 Logado como: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  
  // Registra slash commands
  // Para desenvolvimento rápido, use: registerSlashCommands(client, 'ID_DO_SERVIDOR')
  // Para produção (global): registerSlashCommands(client)
  await registerSlashCommands(client);
  
  // Status do bot
  client.user.setActivity('?help | /help', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
  try {
    await onMessage(message);
  } catch (err) {
    console.error('Erro no messageCreate:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    await handleSlashCommand(interaction);
  } catch (err) {
    console.error('Erro no interactionCreate:', err);
    
    // Responde ao usuário se ainda não respondeu
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '❌ Erro interno ao executar comando.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ Erro interno ao executar comando.', ephemeral: true }).catch(() => {});
    }
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ ERRO AO LOGAR NO DISCORD:', err);
});
