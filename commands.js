const { sendTicketPanel, getHelpEmbed, getHelpButtons } = require('./ticket.js');
const { EmbedBuilder } = require('discord.js');

function parseUserId(arg) {
  const match = arg?.match(/^<@!?(\d+)>$/) || arg?.match(/^(\d+)$/);
  return match ? match[1] : null;
}

function hasModPermissions(member) {
  return member?.permissions?.has('ModerateMembers') || member?.permissions?.has('Administrator');
}

// 📌 Comando de Ajuda Paginado
async function handleHelp(message) {
  await message.channel.send({
    embeds: [getHelpEmbed(1)],
    components: [getHelpButtons(1)]
  });
}

// 🎫 Sistema de Ticket
async function handleTicketCommand(message) {
  if (!hasModPermissions(message.member)) return message.channel.send('❌ Sem permissão.');
  await sendTicketPanel(message.channel);
  try { await message.delete(); } catch(e){}
}

// 🎽 Gerenciamento de Cargos (?setcargo)
async function handleSetCargo(message, args) {
  if (!hasModPermissions(message.member)) return message.channel.send('❌ Sem permissão.');
  const userId = parseUserId(args[0]);
  const roleMention = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

  if (!userId || !roleMention) return message.channel.send('❌ Use: `?setcargo @usuario @cargo`');
  const member = message.guild.members.cache.get(userId);
  if (!member) return message.channel.send('❌ Membro não encontrado.');

  try {
    if (member.roles.cache.has(roleMention.id)) {
      await member.roles.remove(roleMention);
      return message.channel.send(`✅ Cargo <@&${roleMention.id}> **removido** de <@${userId}>.`);
    } else {
      await member.roles.add(roleMention);
      return message.channel.send(`✅ Cargo <@&${roleMention.id}> **adicionado** a <@${userId}>.`);
    }
  } catch (err) {
    return message.channel.send('❌ Erro ao gerenciar cargo.');
  }
}

async function handlePing(message) {
  return message.channel.send(`🏓 Pong! Latência: ${Date.now() - message.createdTimestamp}ms`);
}

async function handleSay(message, args) {
  const text = args.join(' ');
  if (!text) return message.channel.send('❌ Use: `?say <texto>`');
  try { await message.delete(); } catch(e){}
  return message.channel.send(text);
}

// 👋 Boas-vindas com Nick
async function handleGuildMemberAdd(member) {
  const channel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.name.includes('geral') || c.name.includes('bem-vindo'));
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('👋 Novo Membro no Servidor!')
    .setDescription(`Seja muito bem-vindo(a), <@${member.id}>!\nSeu nick atual é: **${member.user.tag}**\nAproveite sua estadia!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

const commands = {
  help: handleHelp,
  ping: handlePing,
  say: handleSay,
  ticket: handleTicketCommand,
  setcargo: handleSetCargo
};

async function onMessage(message) {
  if (message.author.bot || !message.guild) return;
  const content = message.content.trim();
  if (!content.startsWith('?')) return;

  const [rawCommand, ...args] = content.slice(1).split(/\s+/);
  const handler = commands[rawCommand.toLowerCase()];
  if (handler) await handler(message, args);
}

module.exports = {
  commands,
  onMessage,
  handleGuildMemberAdd
};
