// ===== CONFIGURAÇÕES =====
const FLOOD_DELAY = 500; // Delay entre mensagens (ms) para evitar rate limit

// ===== ESTADO =====
const censoredUsers = new Set();
const mutedUsers = new Set();
const warnedUsers = new Map(); // userId -> quantidade de warns

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
  // Verifica se quem executa tem cargo de mod/admin
  return member?.permissions?.has('ModerateMembers') || 
         member?.permissions?.has('Administrator');
}

// ===== HANDLERS DOS COMANDOS =====
function handleHelp(message) {
  const helpText = [
    '📌 **Comandos Disponíveis:**',
    '',
    '**Moderação:**',
    '• `?mute @usuario [motivo]` — Silencia o usuário no servidor.',
    '• `?unmute @usuario` — Remove o silêncio do usuário.',
    '• `?kick @usuario [motivo]` — Expulsa o usuário do servidor.',
    '• `?ban @usuario [motivo]` — Bane o usuário do servidor.',
    '• `?unban <id>` — Desbane o usuário pelo ID.',
    '• `?warn @usuario [motivo]` — Adverte o usuário.',
    '• `?warns @usuario` — Mostra as advertências do usuário.',
    '',
    '**Utilidades:**',
    '• `?help` — Mostra esta lista de comandos.',
    '• `?flood <quantidade> <texto>` — Envia a mensagem repetidamente.',
    '',
    '**Censura:**',
    '• `?censurar @usuario <mensagem>` — Ativa a censura do usuário citado.',
    '• `?descensurar @usuario` — Desativa a censura do usuário citado.'
  ].join('\n');

  return sendMessage(message.channel, helpText);
}

// --- MODERAÇÃO ---

async function handleMute(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, 'Use: ?mute @usuario [motivo]');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, 'Usuário não encontrado.');
  }

  try {
    await member.timeout(86400000, reason); // 24 horas
    mutedUsers.add(userId);
    return sendMessage(message.channel, `🔇 <@${userId}> foi silenciado. Motivo: ${reason}`);
  } catch (err) {
    return sendMessage(message.channel, 'Erro ao silenciar usuário. Verifique minhas permissões.');
  }
}

async function handleUnmute(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, 'Use: ?unmute @usuario');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, 'Usuário não encontrado.');
  }

  try {
  await member.timeout(null);
  mutedUsers.delete(userId);
  return sendMessage(message.channel, `🔊 <@${userId}> pode falar novamente.`);
} catch (err) {
  return sendMessage(message.channel, 'Erro ao remover silêncio.');
  }

async function handleKick(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, 'Use: ?kick @usuario [motivo]');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, 'Usuário não encontrado.');
  }

  try {
    await member.kick(reason);
    return sendMessage(message.channel, `👢 <@${userId}> foi expulso. Motivo: ${reason}`);
  } catch (err) {
    return sendMessage(message.channel, 'Erro ao expulsar usuário.');
  }
}

async function handleBan(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, 'Use: ?ban @usuario [motivo]');
  }

  const member = getMember(message, userId);
  if (!member) {
    return sendMessage(message.channel, 'Usuário não encontrado.');
  }

  try {
    await member.ban({ reason });
    return sendMessage(message.channel, `🔨 <@${userId}> foi banido. Motivo: ${reason}`);
  } catch (err) {
    return sendMessage(message.channel, 'Erro ao banir usuário.');
  }
}

async function handleUnban(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, 'Use: ?unban <id>');
  }

  try {
    await message.guild.members.unban(userId);
    return sendMessage(message.channel, `✅ Usuário ${userId} foi desbanido.`);
  } catch (err) {
    return sendMessage(message.channel, 'Erro ao desbanir. Verifique se o ID está correto.');
  }
}

async function handleWarn(message, args) {
  if (!hasModPermissions(message.member)) {
    return sendMessage(message.channel, 'Você não tem permissão para usar este comando.');
  }

  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return sendMessage(message.channel, 'Use: ?warn @usuario [motivo]');
  }

  const currentWarns = warnedUsers.get(userId) || 0;
  warnedUsers.set(userId, currentWarns + 1);

  const total = warnedUsers.get(userId);
  let response = `⚠️ <@${userId}> foi advertido. Motivo: ${reason}\nTotal de warns: ${total}`;

  // Auto-mute após 3 warns
  if (total >= 3) {
    const member = getMember(message, userId);
    if (member) {
      await member.timeout(3600000, 'Acumulou 3 advertências'); // 1 hora
      response += '\n🔇 Usuário silenciado automaticamente por 1 hora.';
    }
  }

  return sendMessage(message.channel, response);
}

function handleWarns(message, args) {
  const userId = parseUserId(args[0]);
  if (!userId) {
    return sendMessage(message.channel, 'Use: ?warns @usuario');
  }

  const total = warnedUsers.get(userId) || 0;
  return sendMessage(message.channel, `⚠️ <@${userId}> tem ${total} advertência(s).`);
}

// --- CENSURA ---

function handleCensurar(message, args) {
  const userId = parseUserId(args[0]);
  const replacement = args.slice(1).join(' ');

  if (!userId || !replacement) {
    return sendMessage(message.channel, 'Use: ?censurar @usuario <mensagem>');
  }

  censoredUsers.add(userId);
  return sendMessage(message.channel, `Censura ativada para <@${userId}>.`);
}

function handleDescensurar(message, args) {
  const userId = parseUserId(args[0]);

  if (!userId) {
    return sendMessage(message.channel, 'Use: ?descensurar @usuario');
  }

  if (!censoredUsers.has(userId)) {
    return sendMessage(message.channel, 'Este usuário não está censurado.');
  }

  censoredUsers.delete(userId);
  return sendMessage(message.channel, `Censura desativada para <@${userId}>.`);
}

// --- FLOOD (SEM LIMITE) ---

async function handleFlood(message, args) {
  const amount = parseInt(args[0], 10);
  const text = args.slice(1).join(' ');

  if (isNaN(amount) || amount <= 0 || !text) {
    return sendMessage(message.channel, 'Use: ?flood <quantidade> <texto>');
  }

  for (let i = 0; i < amount; i++) {
    await sendMessage(message.channel, text);
    await new Promise(resolve => setTimeout(resolve, FLOOD_DELAY));
  }
}

// --- DIVERSÃO ---

function handlePing(message) {
  return sendMessage(message.channel, `🏓 Pong! Latência: ${Date.now() - message.createdTimestamp}ms`);
}

function handleSay(message, args) {
  const text = args.join(' ');
  if (!text) {
    return sendMessage(message.channel, 'Use: ?say <mensagem>');
  }
  return sendMessage(message.channel, text);
}

function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  const user = message.client.users.cache.get(userId);
  
  if (!user) {
    return sendMessage(message.channel, 'Usuário não encontrado.');
  }

  return sendMessage(message.channel, user.displayAvatarURL({ size: 256 }));
}

// ===== REGISTRO DOS COMANDOS =====
const commands = {
  // Utilidades
  help: handleHelp,
  ping: handlePing,
  say: handleSay,
  avatar: handleAvatar,
  
  // Moderação
  mute: handleMute,
  unmute: handleUnmute,
  kick: handleKick,
  ban: handleBan,
  unban: handleUnban,
  warn: handleWarn,
  warns: handleWarns,
  
  // Censura
  censurar: handleCensurar,
  descensurar: handleDescensurar,
  
  // Flood
  flood: handleFlood
};

// ===== PROCESSADOR DE MENSAGENS =====
async function onMessage(message) {
  if (message.author.bot) return;

  // Aplicar censura
  if (censoredUsers.has(message.author.id)) {
    try {
      await message.delete();
      // Ou substituir: await message.edit('🚫 mensagem censurada');
    } catch (err) {}
    return;
  }

  // Aplicar mute local (se o timeout do Discord falhar)
  if (mutedUsers.has(message.author.id)) {
    try {
      await message.delete();
    } catch (err) {}
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

module.exports = { commands, onMessage };
