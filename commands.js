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
    '• `?mute @usuario <tempo> [motivo]` — Silencia (ex: 10m, 2h, 1d)',
    '• `?unmute @usuario` — Remove silêncio',
    '• `?kick @usuario [motivo]` — Expulsa',
    '• `?ban @usuario [motivo]` — Bane permanentemente',
    '• `?tempban @usuario <tempo> [motivo]` — Bane temporariamente',
    '• `?unban <id>` — Desbane',
    '• `?warn @usuario [motivo]` — Adverte',
    '• `?warns @usuario` — Lista advertências',
    '',
    '**Utilidades:**',
    '• `?help` — Mostra esta lista',
    '• `?ping` — Mostra a latência',
    '• `?say <texto>` — Faz o bot falar',
    '• `?avatar [@usuario]` — Mostra o avatar',
    '• `?flood <quantidade> <texto>` — Envia mensagens repetidas',
    '',
    '**Censura:**',
    '• `?censurar @usuario` — Ativa censura',
    '• `?descensurar @usuario` — Desativa censura',
    '',
    '💡 **Dica:** Use Slash Commands `/` para uma experiência melhor!'
  ].join('\n');

  return sendMessage(message.channel, helpText);
}

// --- MODERAÇÃO ---

async function handleMute(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  const timeStr = args[1];
  const timeMs = parseTime(timeStr);
  
  if (!userId || !timeMs) {
    return sendMessage(message.channel, '❌ Use: `?mute @usuario <tempo> [motivo]`\nExemplo: `?mute @user 10m Spam`');
  }

  if (timeMs > MAX_TIMEOUT) {
    return sendMessage(message.channel, '❌ Tempo máximo: 28 dias');
  }

  const reason = args.slice(2).join(' ') || 'Sem motivo especificado';
  const member = getMember(message, userId);
  
  if (!member) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  try {
    await member.timeout(timeMs, reason);
    mutedUsers.add(userId);
    
    const notified = await notifyUser(member, 'silenciado', reason, timeMs, message.guild.name);
    
    let response = `🔇 <@${userId}> silenciado por ${formatTime(timeMs)}. Motivo: ${reason}`;
    if (!notified) response += '\n⚠️ Não foi possível enviar DM.';
    
    return sendMessage(message.channel, response);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao silenciar. Verifique minhas permissões.');
  }
}

async function handleUnmute(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?unmute @usuario`');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  try {
    await member.timeout(null);
    mutedUsers.delete(userId);
    await notifyUser(member, 'desmutado', 'Sua punição foi removida.', null, message.guild.name);
    
    return sendMessage(message.channel, `🔊 <@${userId}> pode falar novamente.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao remover silêncio.');
  }
}

async function handleKick(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?kick @usuario [motivo]`');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  try {
    const notified = await notifyUser(member, 'expulso', reason, null, message.guild.name);
    await member.kick(reason);
    
    let response = `👢 <@${userId}> expulso. Motivo: ${reason}`;
    if (!notified) response += '\n⚠️ Não foi possível enviar DM.';
    
    return sendMessage(message.channel, response);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao expulsar.');
  }
}

async function handleBan(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?ban @usuario [motivo]`');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  try {
    const notified = await notifyUser(member, 'banido permanentemente', reason, null, message.guild.name);
    await member.ban({ reason });
    
    let response = `🔨 <@${userId}> banido permanentemente. Motivo: ${reason}`;
    if (!notified) response += '\n⚠️ Não foi possível enviar DM.';
    
    return sendMessage(message.channel, response);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao banir.');
  }
}

async function handleTempBan(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  const timeStr = args[1];
  const timeMs = parseTime(timeStr);

  if (!userId || !timeMs) {
    return sendMessage(message.channel, '❌ Use: `?tempban @usuario <tempo> [motivo]`');
  }

  const reason = args.slice(2).join(' ') || 'Sem motivo especificado';
  const member = getMember(message, userId);

  if (!member) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  try {
    const notified = await notifyUser(member, 'banido temporariamente', reason, timeMs, message.guild.name);
    await member.ban({ reason: `[TempBan ${formatTime(timeMs)}] ${reason}` });
    
    const timeoutId = setTimeout(async () => {
      try {
        await message.guild.members.unban(userId);
        tempBans.delete(userId);
        
        try {
          const user = await message.client.users.fetch(userId);
          await user.send({
            embeds: [{
              color: 0x00ff00,
              title: '✅ Você foi desbanido',
              description: `Seu banimento em **${message.guild.name}** expirou.`,
              timestamp: new Date()
            }]
          });
        } catch (dmErr) {}
        
        const channel = message.guild.systemChannel || message.channel;
        channel.send(`✅ <@${userId}> foi desbanido automaticamente após ${formatTime(timeMs)}.`);
      } catch (err) {
        console.error('Erro ao desbanir:', err);
      }
    }, timeMs);
    
    tempBans.set(userId, timeoutId);
    
    let response = `🔨 <@${userId}> banido por ${formatTime(timeMs)}. Motivo: ${reason}`;
    if (!notified) response += '\n⚠️ Não foi possível enviar DM.';
    
    return sendMessage(message.channel, response);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao banir temporariamente.');
  }
}

async function handleUnban(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?unban <id>`');
  }

  try {
    await message.guild.members.unban(userId);
    
    const timeoutId = tempBans.get(userId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      tempBans.delete(userId);
    }
    
    try {
      const user = await message.client.users.fetch(userId);
      await user.send({
        embeds: [{
          color: 0x00ff00,
          title: '✅ Você foi desbanido',
          description: `Você foi desbanido de **${message.guild.name}**.`,
          timestamp: new Date()
        }]
      });
    } catch (dmErr) {}
    
    return sendMessage(message.channel, `✅ Usuário ${userId} desbanido.`);
  } catch (err) {
    return sendMessage(message.channel, '❌ Erro ao desbanir.');
  }
}

async function handleWarn(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?warn @usuario [motivo]`');
  }

  const currentWarns = warnedUsers.get(userId) || 0;
  warnedUsers.set(userId, currentWarns + 1);

  const total = warnedUsers.get(userId);
  let response = `⚠️ <@${userId}> advertido. Motivo: ${reason}\nTotal: ${total} warn(s)`;

  const member = getMember(message, userId);
  let autoMuted = false;
  
  if (total >= 3 && member) {
    await member.timeout(3600000, 'Acumulou 3 advertências');
    mutedUsers.add(userId);
    autoMuted = true;
    response += '\n🔇 Silenciado automaticamente por 1 hora.';
  }

  if (member) {
    const warnEmbed = {
      color: 0xffff00,
      title: '⚠️ Você recebeu uma advertência',
      fields: [
        { name: '📋 Motivo', value: reason, inline: false },
        { name: '📊 Total de warns', value: `${total}/3`, inline: true },
        ...(autoMuted ? [{ name: '🔇 Consequência', value: 'Silenciado por 1 hora (3 warns)', inline: false }] : []),
        { name: '🏰 Servidor', value: message.guild.name, inline: true }
      ],
      timestamp: new Date()
    };
    
    try {
      await member.send({ embeds: [warnEmbed] });
    } catch (err) {
      response += '\n⚠️ Não foi possível enviar DM.';
    }
  }

  return sendMessage(message.channel, response);
}

function handleWarns(message, args) {
  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?warns @usuario`');
  }

  const total = warnedUsers.get(userId) || 0;
  return sendMessage(message.channel, `⚠️ <@${userId}> tem ${total} advertência(s).`);
}

// --- CENSURA ---

function handleCensurar(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?censurar @usuario`');
  }

  censoredUsers.add(userId);
  
  const member = getMember(message, userId);
  if (member) {
    notifyUser(member, 'censurado', 'Suas mensagens serão automaticamente deletadas.', null, message.guild.name)
      .catch(() => {});
  }
  
  return sendMessage(message.channel, `🚫 Censura ativada para <@${userId}>.`);
}

function handleDescensurar(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, '❌ Use: `?descensurar @usuario`');
  }

  if (!censoredUsers.has(userId)) {
    return sendMessage(message.channel, '❌ Este usuário não está censurado.');
  }

  censoredUsers.delete(userId);
  
  const member = getMember(message, userId);
  if (member) {
    notifyUser(member, 'descensurado', 'Sua censura foi removida.', null, message.guild.name)
      .catch(() => {});
  }
  
  return sendMessage(message.channel, `✅ Censura desativada para <@${userId}>.`);
}

// --- FLOOD ---

async function handleFlood(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, '❌ Você não tem permissão.');
  }

  const amount = parseInt(args[0], 10);
  const text = args.slice(1).join(' ');

  if (isNaN(amount) || amount <= 0 || !text) {
    return sendMessage(message.channel, '❌ Use: `?flood <quantidade> <texto>`');
  }

  if (amount > MAX_FLOOD) {
    return sendMessage(message.channel, `❌ Máximo de ${MAX_FLOOD} mensagens por vez.`);
  }

  for (let i = 0; i < amount; i++) {
    await sendMessage(message.channel, text);
    await new Promise(resolve => setTimeout(resolve, FLOOD_DELAY));
  }
}

// --- DIVERSÃO ---

function handlePing(message) {
  return sendMessage(message.channel, `🏓 Pong! ${Date.now() - message.createdTimestamp}ms`);
}

function handleSay(message, args) {
  const text = args.join(' ');
  if (!text) {
    return sendMessage(message.channel, '❌ Use: `?say <mensagem>`');
  }
  return sendMessage(message.channel, text);
}

function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  const user = message.client.users.cache.get(userId);
  
  if (!user) {
    return sendMessage(message.channel, '❌ Usuário não encontrado.');
  }

  return sendMessage(message.channel, user.displayAvatarURL({ size: 256 }));
}

// ===== MAPA DOS COMANDOS LEGACY =====
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
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const slashCommands = [
  new SlashCommandBuilder().setName('mute').setDescription('Silencia um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(opt => opt.setName('tempo').setDescription('Tempo (ex: 10m, 2h)').setRequired(true)).addStringOption(opt => opt.setName('motivo').setDescription('Motivo')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('unmute').setDescription('Remove silêncio').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('kick').setDescription('Expulsa um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(opt => opt.setName('motivo').setDescription('Motivo')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Bane permanentemente').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(opt => opt.setName('motivo').setDescription('Motivo')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('tempban').setDescription('Bane temporariamente').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(opt => opt.setName('tempo').setDescription('Tempo')).addStringOption(opt => opt.setName('motivo').setDescription('Motivo')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('warn').setDescription('Adverte um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(opt => opt.setName('motivo').setDescription('Motivo')).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warns').setDescription('Mostra advertências').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)),
  new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
  new SlashCommandBuilder().setName('say').setDescription('Faz o bot falar').addStringOption(opt => opt.setName('mensagem').setDescription('Mensagem').setRequired(true)),
  new SlashCommandBuilder().setName('censurar').setDescription('Ativa censura').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('descensurar').setDescription('Remove censura').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
];

// ===== HANDLER DE SLASH COMMANDS =====
async function handleSlashCommand(interaction) {
  const { commandName, options, guild, channel } = interaction;
  await interaction.deferReply();
  
  try {
    switch (commandName) {
      case 'mute': {
        const user = options.getUser('usuario');
        const timeStr = options.getString('tempo');
        const reason = options.getString('motivo') || 'Sem motivo';
        const timeMs = parseTime(timeStr);
        if (!timeMs) return interaction.editReply('❌ Tempo inválido.');
        
        const targetMember = await guild.members.fetch(user.id);
        await targetMember.timeout(timeMs, reason);
        mutedUsers.add(user.id);
        
        const notified = await notifyUser(targetMember, 'silenciado', reason, timeMs, guild.name);
        let resp = `🔇 ${user} silenciado por ${formatTime(timeMs)}.`;
        if (!notified) resp += '\n⚠️ DM fechada.';
        return interaction.editReply(resp);
      }
      case 'unmute': {
        const user = options.getUser('usuario');
        const targetMember = await guild.members.fetch(user.id);
        await targetMember.timeout(null);
        mutedUsers.delete(user.id);
        await notifyUser(targetMember, 'desmutado', 'Punição removida.', null, guild.name);
        return interaction.editReply(`🔊 ${user} desmutado.`);
      }
      case 'kick': {
        const user = options.getUser('usuario');
        const reason = options.getString('motivo') || 'Sem motivo';
        const targetMember = await guild.members.fetch(user.id);
        await notifyUser(targetMember, 'expulso', reason, null, guild.name);
        await targetMember.kick(reason);
        return interaction.editReply(`👢 ${user} expulso.`);
      }
      case 'ban': {
        const user = options.getUser('usuario');
        const reason = options.getString('motivo') || 'Sem motivo';
        const targetMember = await guild.members.fetch(user.id);
        await notifyUser(targetMember, 'banido permanentemente', reason, null, guild.name);
        await targetMember.ban({ reason });
        return interaction.editReply(`🔨 ${user} banido.`);
      }
      case 'tempban': {
        const user = options.getUser('usuario');
        const timeStr = options.getString('tempo');
        const reason = options.getString('motivo') || 'Sem motivo';
        const timeMs = parseTime(timeStr);
        if (!timeMs) return interaction.editReply('❌ Tempo inválido.');
        
        const targetMember = await guild.members.fetch(user.id);
        await notifyUser(targetMember, 'banido temporariamente', reason, timeMs, guild.name);
        await targetMember.ban({ reason: `[TempBan] ${reason}` });
        
        setTimeout(async () => {
          try {
            await guild.members.unban(user.id);
            channel.send(`✅ ${user} desbanido automaticamente.`);
          } catch (e) {}
        }, timeMs);
        
        return interaction.editReply(`🔨 ${user} banido temporariamente.`);
      }
      case 'warn': {
        const user = options.getUser('usuario');
        const reason = options.getString('motivo') || 'Sem motivo';
        const current = warnedUsers.get(user.id) || 0;
        warnedUsers.set(user.id, current + 1);
        
        const targetMember = await guild.members.fetch(user.id);
        if (current + 1 >= 3) {
          await targetMember.timeout(3600000, '3 warns');
          mutedUsers.add(user.id);
        }
        return interaction.editReply(`⚠️ ${user} advertido (${current + 1}/3).`);
      }
      case 'warns': {
        const user = options.getUser('usuario');
        const total = warnedUsers.get(user.id) || 0;
        return interaction.editReply(`⚠️ ${user} tem ${total} advertência(s).`);
      }
      case 'ping': {
        return interaction.editReply(`🏓 Pong! ${Date.now() - interaction.createdTimestamp}ms`);
      }
      case 'say': {
        return interaction.editReply(options.getString('mensagem'));
      }
      case 'censurar': {
        censoredUsers.add(options.getUser('usuario').id);
        return interaction.editReply(`🚫 Censura ativada.`);
      }
      case 'descensurar': {
        censoredUsers.delete(options.getUser('usuario').id);
        return interaction.editReply(`✅ Censura desativada.`);
      }
    }
  } catch (err) {
    console.error(err);
    return interaction.editReply('❌ Erro ao executar comando.');
  }
}

// ===== PROCESSADOR DE MENSAGENS (LEGACY) =====
async function onMessage(message) {
  if (message.author.bot) return;

  if (censoredUsers.has(message.author.id) || mutedUsers.has(message.author.id)) {
    try { await message.delete(); } catch (err) {}
    return;
  }

  const content = message.content.trim();
  if (!content.startsWith('?')) return;

  const [rawCommand, ...args] = content.slice(1).split(/\s+/);
  const commandName = rawCommand.toLowerCase();
  const handler = commands[commandName];

  if (!handler) return;

  try {
    await handler(message, args);
  } catch (err) {
    console.error(`Erro no comando ?${commandName}:`, err);
  }
}

// ===== REGISTRAR SLASH COMMANDS =====
async function registerSlashCommands(client, guildId = null) {
  try {
    if (guildId) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        await guild.commands.set(slashCommands);
        console.log(`✅ Slash commands registrados no servidor ${guildId}`);
      }
    } else {
      await client.application.commands.set(slashCommands);
      console.log('✅ Slash commands registrados globalmente');
    }
  } catch (err) {
    console.error('❌ Erro ao registrar slash commands:', err);
  }
}

module.exports = { 
  commands, 
  onMessage, 
  slashCommands, 
  handleSlashCommand,
  registerSlashCommands
};
