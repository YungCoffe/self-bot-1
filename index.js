const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
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
  console.log(`🌐 Servidor web rodando na porta ${PORT}`);
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
  console.log(`🤖 Bot logado com sucesso como: ${client.user.tag}`);
  console.log(`📊 Servidores conectados: ${client.guilds.cache.size}`);
  
  try {
    // Registra os Slash Commands diretamente no teu servidor (instantâneo)
    await registerSlashCommands(client, '1554263081180332124');
  } catch (err) {
    console.error('❌ Erro ao registrar Slash Commands no ready:', err);
  }
  
  // Status do bot (compatível com v14)
  client.user.setActivity('?help | /help', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
  try {
    await onMessage(message);
  } catch (err) {
    console.error('❌ Erro no evento messageCreate:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    await handleSlashCommand(interaction);
  } catch (err) {
    console.error('❌ Erro no evento interactionCreate:', err);
    
    const errorResponse = { content: '❌ Erro interno ao executar o comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorResponse).catch(() => {});
    } else {
      await interaction.reply(errorResponse).catch(() => {});
    }
  }
});

// Tratamento de rejeições não tratadas
process.on('unhandledRejection', (err) => {
  console.error('❌ Rejeição não tratada capturada:', err);
});

// ===== LOGIN SEGURO =====
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ ERRO CRÍTICO: A variável de ambiente DISCORD_TOKEN não está definida no Render!');
} else {
  console.log('🔑 Token detectado nas variáveis de ambiente. Autenticando no Discord...');
  client.login(token).catch(err => {
    console.error('❌ FALHA AO FAZER LOGIN NO DISCORD:', err);
  });
}
