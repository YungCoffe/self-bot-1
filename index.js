const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const { 
  onMessage, 
  handleSlashCommand, 
  registerSlashCommands 
} = require('./commands');

// ===== CLIENTE DISCORD (Declarado antes para o Express validar o estado) =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// ===== SERVIDOR WEB (Render/UptimeRobot) =====
const app = express();
const PORT = process.env.PORT || 10000;
const GUILD_ID = process.env.GUILD_ID || '1554263081180332124';

app.get('/', (req, res) => {
  res.json({ 
    status: client.isReady() ? 'online' : 'iniciando', 
    bot: client.user?.tag || 'offline',
    timestamp: new Date().toISOString()
  });
});

// Health check real para o Render reiniciar caso o bot trave
app.get('/health', (req, res) => {
  if (client.isReady()) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Bot offline / conectando');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web rodando na porta ${PORT}`);
});

// ===== EVENTOS DE DIAGNÓSTICO DO GATEWAY =====
client.on('error', (err) => console.error('❌ Erro no WebSocket:', err));
client.on('shardError', e => console.error('[shardError]', e));
client.on('shardDisconnect', (ev, id) => console.warn('[shardDisconnect]', id, ev.code));

client.once('ready', () => {
  console.log(`🤖 Bot logado com sucesso como: ${client.user.tag}`);
  console.log(`📊 Servidores conectados: ${client.guilds.cache.size}`);
  
  // Registra os comandos em background
  registerSlashCommands(client, GUILD_ID).catch(err => {
    console.error('❌ Erro ao registrar Slash Commands:', err);
  });
  
  client.user.setActivity('?help | /help', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
  try {
    await onMessage(message);
  } catch (err) {
    console.error('❌ Erro no messageCreate:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    await handleSlashCommand(interaction);
  } catch (err) {
    console.error('❌ Erro no interactionCreate:', err);
    const errorResponse = { content: '❌ Erro interno.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorResponse).catch(() => {});
    } else {
      await interaction.reply(errorResponse).catch(() => {});
    }
  }
});

// Tratamento de erros globais para evitar processos zumbis
process.on('unhandledRejection', (err) => {
  console.error('❌ Rejeição não tratada:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exceção não capturada:', err);
  process.exit(1);
});

// ===== LOGIN COM RESTART FORÇADO SE TRAVAR =====
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ DISCORD_TOKEN não definido nas variáveis de ambiente!');
  process.exit(1);
} else {
  console.log('🔑 Token detectado. A tentar conectar ao Gateway...');

  let loggedIn = false;

  client.once('ready', () => {
    loggedIn = true;
    console.log('✅ Gateway conectado com sucesso!');
  });

  const loginTimer = setTimeout(() => {
    if (!loggedIn) {
      console.error('❌ TIMEOUT: O WebSocket travou após 20s. A reiniciar o processo...');
      process.exit(1); // Força o Render a reiniciar o container na hora
    }
  }, 20000);

  client.login(token).catch(err => {
    clearTimeout(loginTimer);
    console.error('❌ Erro fatal no login:', err);
    process.exit(1);
  });
}
