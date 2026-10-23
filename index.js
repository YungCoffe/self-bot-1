const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const express = require('express');
const { 
  onMessage, 
  handleSlashCommand, 
  registerSlashCommands 
} = require('./commands');

// ===== SERVIDOR WEB (Render/UptimeRobot) =====
const app = express();
const PORT = process.env.PORT || 10000;

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

// ===== CLIENTE DISCORD (OTIMIZADO PARA RENDER) =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  rest: {
    timeout: 60000,
  },
  ws: {
    properties: {
      $browser: 'Discord iOS'
    }
  }
});

// Captura erros do WebSocket
client.on('error', (err) => {
  console.error('❌ Erro no WebSocket do Discord:', err);
});

// ===== EVENTOS =====
client.once('ready', async () => {
  console.log(`🤖 Bot logado com sucesso como: ${client.user.tag}`);
  console.log(`📊 Servidores conectados: ${client.guilds.cache.size}`);
  
  // Registra em segundo plano para não travar o boot
  registerSlashCommands(client, '1554263081180332124').catch(err => {
    console.error('❌ Erro ao registrar Slash Commands:', err);
  });
  
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

process.on('unhandledRejection', (err) => {
  console.error('❌ Rejeição não tratada capturada:', err);
});

// ===== LOGIN COM DIAGNÓSTICO =====
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ ERRO CRÍTICO: DISCORD_TOKEN não definido nas variáveis de ambiente!');
} else {
  console.log('🔑 Token detectado. A tentar conectar ao Gateway...');

  const loginTimeout = setTimeout(() => {
    console.error('⚠️ TIMEOUT: O Discord demorou mais de 20s para responder. Verifique se o IP do Render foi limitado.');
  }, 20000);

  client.login(token)
    .then(() => {
      clearTimeout(loginTimeout);
      console.log('✅ LOGIN REALIZADO COM SUCESSO!');
    })
    .catch(err => {
      clearTimeout(loginTimeout);
      console.error('❌ ERRO FATAL NO LOGIN DO DISCORD:', err);
    });
}
