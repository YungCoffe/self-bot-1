// ===== CONFIGURAÇÕES =====
const FLOOD_DELAY = 500;
const MAX_FLOOD = 50;
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // 28 dias

// ===== ESTADO =====
const censoredUsers = new Set();
const mutedUsers = new Set();
const warnedUsers = new Map();
const tempBans = new Map();

// ===== UTILITÁRIOS =====
function sendMessage(channel, content) {
  return channel.send(content);
}

function parseUserId(arg) {
  const match = arg?.match(/^<@!?(\d+)>$/) || arg?.match(/^(\d+)$/);
  return match ? match[1] : null;
}

function getMember(message, userId) {
  return message.guild?.members.cache.get(userId) || 
         message.mentions?.members?.first();
}

function hasModPermissions(member) {
  return member?.permissions?.has('ModerateMembers') || 
         member?.permissions?.has('Administrator');
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return amount * multipliers[unit];
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ===== NOTIFICAÇÃO POR DM =====
async function notifyUser(member, punishment, reason, duration = null, guildName = null) {
  try {
    const embed = {
      color: 0xff0000,
      title: `🚨 Você foi ${punishment}`,
      fields: [
        { name: '📋 Motivo', value: reason, inline: false },
        ...(duration ? [{ name: '⏱️ Duração', value: formatTime(duration), inline: true }] : []),
        ...(guildName ? [{ name: '🏰 Servidor', value: guildName, inline: true }] : [])
      ],
      timestamp: new Date()
    };
    
    await member.send({ embeds: [embed] });
    return true;
  } catch (err) {
    return false;
  }
}

// ===== HANDLERS DOS COMANDOS (LEGACY) =====
function handleHelp(message) {
  const helpText = [
    '📌 **Comandos Disponíveis:**',
    '',
    '**Moderação:**',
    '• `?mute @usuario <tempo> [motivo]`',
    '• `?unmute @usuario`',
    '• `?kick @usuario [motivo]`',
    '• `?ban @usuario [motivo]`',
    '• `?tempban @usuario <tempo> [motivo]`',
    '• `?unban <id>`',
    '• `?warn @usuario [motivo]`',
    '• `?warns @usuario`',
    '',
    '**Utilidades:**',
    '• `?help`, `?ping`, `?say`, `?avatar`, `?flood`',
    '',
    '**Censura:**',
    '• `?censurar @usuario`, `?descensurar @usuario`'
  ].join('\n');

  return sendMessage(message.channel, helpText);
}

// --- MODERAÇÃO ---

async function handleMute(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const timeMs = parseTime(args[1]);
  if (!userId || !timeMs) return sendMessage(message.channel, '❌ Use: `?mute @usuario <tempo> [motivo]`');

  const reason = args.slice(2).join(' ') || 'Sem motivo';
  const member = getMember(message, userId);
  if (!member) return sendMessage(message.channel, '❌ Usuário não encontrado.');

  try {
    await member.timeout(timeMs, reason);
    mutedUsers.add(userId);
    await notifyUser(member, 'silenciado', reason, timeMs, message.guild.name);
    return sendMessage(message.channel, `🔇 <@${userId}> silenciado por ${formatTime(timeMs)}.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao silenciar.');
  }
}

async function handleUnmute(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const member = getMember(message, userId);
  if (!member) return sendMessage(message.channel, '❌ Usuário não encontrado.');

  try {
    await member.timeout(null);
    mutedUsers.delete(userId);
    return sendMessage(message.channel, `🔊 <@${userId}> desmutado.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao desmutar.');
  }
}

async function handleKick(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo';
  const member = getMember(message, userId);
  if (!member) return sendMessage(message.channel, '❌ Usuário não encontrado.');

  try {
    await notifyUser(member, 'expulso', reason, null, message.guild.name);
    await member.kick(reason);
    return sendMessage(message.channel, `👢 <@${userId}> expulso.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao expulsar.');
  }
}

async function handleBan(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo';
  const member = getMember(message, userId);
  if (!member) return sendMessage(message.channel, '❌ Usuário não encontrado.');

  try {
    await notifyUser(member, 'banido', reason, null, message.guild.name);
    await member.ban({ reason });
    return sendMessage(message.channel, `🔨 <@${userId}> banido.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao banir.');
  }
}

async function handleTempBan(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const timeMs = parseTime(args[1]);
  if (!userId || !timeMs) return sendMessage(message.channel, '❌ Use: `?tempban @usuario <tempo> [motivo]`');

  const reason = args.slice(2).join(' ') || 'Sem motivo';
  const member = getMember(message, userId);
  if (!member) return sendMessage(message.channel, '❌ Usuário não encontrado.');

  try {
    await notifyUser(member, 'banido temporariamente', reason, timeMs, message.guild.name);
    await member.ban({ reason });
    
    const timeoutId = setTimeout(async () => {
      try {
        await message.guild.members.unban(userId);
        tempBans.delete(userId);
      } catch (e) {}
    }, timeMs);
    
    tempBans.set(userId, timeoutId);
    return sendMessage(message.channel, `🔨 <@${userId}> tempban por ${formatTime(timeMs)}.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro no tempban.');
  }
}

async function handleUnban(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  if (!userId) return sendMessage(message.channel, '❌ Use: `?unban <id>`');

  try {
    await message.guild.members.unban(userId);
    return sendMessage(message.channel, `✅ Usuário ${userId} desbanido.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao desbanir.');
  }
}

async function handleWarn(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo';
  if (!userId) return sendMessage(message.channel, '❌ Use: `?warn @usuario [motivo]`');

  const current = warnedUsers.get(userId) || 0;
  warnedUsers.set(userId, current + 1);

  const member = getMember(message, userId);
  if (current + 1 >= 3 && member) {
    await member.timeout(3600000, '3 warns');
    mutedUsers.add(userId);
  }

  return sendMessage(message.channel, `⚠️ <@${userId}> advertido (${current + 1}/3).`);
}

function handleWarns(message, args) {
  const userId = parseUserId(args[0]);
  if (!userId) return sendMessage(message.channel, '❌ Use: `?warns @usuario`');
  const total = warnedUsers.get(userId) || 0;
  return sendMessage(message.channel, `⚠️ <@${userId}> tem ${total} warn(s).`);
}

function handleCensurar(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  if (!userId) return sendMessage(message.channel, '❌ Use: `?censurar @usuario`');
  censoredUsers.add(userId);
  return sendMessage(message.channel, `🚫 Censurado.`);
}

function handleDescensurar(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  if (!userId) return sendMessage(message.channel, '❌ Use: `?descensurar @usuario`');
  censoredUsers.delete(userId);
  return sendMessage(message.channel, `✅ Descensurado.`);
}

async function handleFlood(message, args) {
  if (!hasModPermissions(message.member)) return sendMessage(message.channel, '❌ Sem permissão.');
  const amount = parseInt(args[0], 10);
  const text = args.slice(1).join(' ');
  if (isNaN(amount) || amount <= 0 || !text || amount > MAX_FLOOD) {
    return sendMessage(message.channel, '❌ Use: `?flood <1-50> <texto>`');
  }
  for (let i = 0; i < amount; i++) {
    await sendMessage(message.channel, text);
    await new Promise(r => setTimeout(r, FLOOD_DELAY));
  }
}

function handlePing(message) {
  return sendMessage(message.channel, `🏓 Pong! ${Date.now() - message.createdTimestamp}ms`);
}

function handleSay(message, args) {
  const text = args.join(' ');
  if (!text) return sendMessage(message.channel, '❌ Use: `?say <texto>`');
  return sendMessage(message.channel, text);
}

function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  const user = message.client.users.cache.get(userId);
  if (!user) return sendMessage(message.channel, '❌ Não encontrado.');
  return sendMessage(message.channel, user.displayAvatarURL({ size: 256 }));
}

// ===== MAPA LEGACY =====
const commands = {
  help: handleHelp,
  ping: handlePing,
  say: handleSay,
  avatar: handleAvatar,
  mute: handleMute,
  unmute: handleUnmute,
  kick: handleKick,
  ban: handleBan,
  tempban: handleTempBan,
  unban: handleUnban,
  warn: handleWarn,
  warns: handleWarns,
  censurar: handleCensurar,
  descensurar: handleDescensurar,
  flood: handleFlood
};

// ===== SLASH COMMANDS =====
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const slashCommands = [
  new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
  new SlashCommandBuilder().setName('say').setDescription('Faz o bot falar').addStringOption(opt => opt.setName('mensagem').setDescription('Mensagem').setRequired(true))
];

async function handleSlashCommand(interaction) {
  const { commandName, options } = interaction;
  await interaction.deferReply();
  
  if (commandName === 'ping') {
    return interaction.editReply(`🏓 Pong! ${Date.now() - interaction.createdTimestamp}ms`);
  }
  if (commandName === 'say') {
    return interaction.editReply(options.getString('mensagem'));
  }
}

async function onMessage(message) {
  if (message.author.bot) return;
  if (censoredUsers.has(message.author.id) || mutedUsers.has(message.author.id)) {
    try { await message.delete(); } catch (e) {}
    return;
  }

  const content = message.content.trim();
  if (!content.startsWith('?')) return;

  const [rawCommand, ...args] = content.slice(1).split(/\s+/);
  const handler = commands[rawCommand.toLowerCase()];
  if (handler) await handler(message, args);
}

async function registerSlashCommands(client, guildId) {
  if (guildId) {
    const guild = client.guilds.cache.get(guildId);
    if (guild) await guild.commands.set(slashCommands);
  }
}

module.exports = { 
  commands, 
  onMessage, 
  slashCommands, 
  handleSlashCommand,
  registerSlashCommands
};
