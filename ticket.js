
const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const CONFIG_FILE = './welcome_config.json';
const WARNINGS_FILE = './warnings.json';

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      const formatted = {};
      for (const [guildId, val] of Object.entries(data)) {
        if (typeof val === 'string') {
          formatted[guildId] = { verifyRole: val };
        } else {
          formatted[guildId] = val;
        }
      }
      return formatted;
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function getWarnings() {
  try {
    if (fs.existsSync(WARNINGS_FILE)) {
      return JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveWarnings(data) {
  try {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function hasAdminPermission(member, guildConfig) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (guildConfig.adminRoles && guildConfig.adminRoles.some(rId => member.roles.cache.has(rId))) return true;
  if (guildConfig.adminUsers && guildConfig.adminUsers.includes(member.id)) return true;
  return false;
}

async function sendLog(guild, type, embed) {
  try {
    const config = getConfig();
    const guildConfig = config[guild.id];
    if (!guildConfig) return;

    let channelId = null;
    if (type === 'denuncia') channelId = guildConfig.denunciasChannel || guildConfig.logsChannel;
    if (type === 'duvida') channelId = guildConfig.duvidasChannel || guildConfig.logsChannel;
    if (type === 'punicao') channelId = guildConfig.punicoesChannel || guildConfig.logsChannel;
    if (type === 'geral') channelId = guildConfig.logsChannel;

    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (e) {}
}

const allSlashCommands = [
  new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
  new SlashCommandBuilder().setName('say').setDescription('Faz o bot falar').addStringOption(o => o.setName('texto').setDescription('Texto').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('Limpa mensagens').addIntegerOption(o => o.setName('qtd').setDescription('Quantidade').setRequired(true)),
  new SlashCommandBuilder().setName('avatar').setDescription('Mostra o avatar').addUserOption(o => o.setName('usuario').setDescription('Alvo').setRequired(false)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Informações do servidor'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Informações de um usuário').addUserOption(o => o.setName('usuario').setDescription('Alvo').setRequired(false)),
  new SlashCommandBuilder().setName('ban').setDescription('Bane um membro').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(false)),
  new SlashCommandBuilder().setName('kick').setDescription('Expulsa um membro').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(false)),
  new SlashCommandBuilder().setName('mute').setDescription('Silencia um membro').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Avisa um membro').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),
  new SlashCommandBuilder().setName('warnings').setDescription('Mostra os avisos de um membro').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Tranca o canal atual'),
  new SlashCommandBuilder().setName('unlock').setDescription('Destranca o canal atual'),
  new SlashCommandBuilder().setName('ticket').setDescription('Envia o painel de atendimento/denúncia'),
  new SlashCommandBuilder().setName('help').setDescription('Painel de ajuda interativo'),
  new SlashCommandBuilder().setName('setwelcome').setDescription('Define o canal de boas-vindas').addChannelOption(o => o.setName('canal').setDescription('Canal de texto').setRequired(true)),
  new SlashCommandBuilder().setName('setautorole').setDescription('Define o cargo automático para novos membros').addRoleOption(o => o.setName('cargo').setDescription('Cargo de membro').setRequired(true)),
  new SlashCommandBuilder().setName('delautorole').setDescription('Remove o cargo automático de novos membros'),
  new SlashCommandBuilder().setName('setsuggestion').setDescription('Define o canal de sugestões').addChannelOption(o => o.setName('canal').setDescription('Canal de sugestões').setRequired(true)),
  new SlashCommandBuilder().setName('setlogs').setDescription('Define o canal de logs geral').addChannelOption(o => o.setName('canal').setDescription('Canal de logs').setRequired(true)),
  new SlashCommandBuilder().setName('setdenuncias').setDescription('Define o canal de logs de denúncias').addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)),
  new SlashCommandBuilder().setName('setduvidas').setDescription('Define o canal de logs de dúvidas').addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)),
  new SlashCommandBuilder().setName('setpunicoes').setDescription('Define o canal de logs de punições').addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)),
  new SlashCommandBuilder().setName('setverify').setDescription('Envia o painel de verificação por botão').addChannelOption(o => o.setName('canal').setDescription('Canal de verificação').setRequired(true)).addRoleOption(o => o.setName('cargo').setDescription('Cargo liberado ao verificar').setRequired(true)),
  new SlashCommandBuilder().setName('automod').setDescription('Ativa ou desativa o automod de links').addBooleanOption(o => o.setName('status').setDescription('Ligado/Desligado').setRequired(true)),
  new SlashCommandBuilder().setName('sugerir').setDescription('Envia uma sugestão').addStringOption(o => o.setName('ideia').setDescription('Sua ideia').setRequired(true)),
  new SlashCommandBuilder().setName('denuncia').setDescription('Envia uma denúncia anônima para a staff').addStringOption(o => o.setName('mensagem').setDescription('Detalhes da denúncia').setRequired(true)),
  new SlashCommandBuilder().setName('sorteio').setDescription('Cria um sorteio').addStringOption(o => o.setName('premio').setDescription('Prêmio').setRequired(true)).addIntegerOption(o => o.setName('minutos').setDescription('Tempo em minutos').setRequired(true)),
  new SlashCommandBuilder().setName('embed').setDescription('Cria um embed personalizado').addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true)).addStringOption(o => o.setName('descricao').setDescription('Descrição').setRequired(true)),
  new SlashCommandBuilder().setName('setadminrole').setDescription('Adiciona um cargo com permissões administrativas do bot').addRoleOption(o => o.setName('cargo').setDescription('Cargo permitida').setRequired(true)),
  new SlashCommandBuilder().setName('setadminuser').setDescription('Adiciona um usuário com permissões administrativas do bot').addUserOption(o => o.setName('usuario').setDescription('Usuário permitido').setRequired(true)),
  new SlashCommandBuilder().setName('nick').setDescription('Altera o apelido de um membro').addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)).addStringOption(o => o.setName('apelido').setDescription('Novo apelido').setRequired(true)),
  new SlashCommandBuilder().setName('permnick').setDescription('Trava o apelido de um membro permanentemente').addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)).addStringOption(o => o.setName('apelido').setDescription('Apelido fixo').setRequired(true)),
  new SlashCommandBuilder().setName('calado').setDescription('Silencia um membro apagando todas as msgs dele').addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)),
  new SlashCommandBuilder().setName('censura').setDescription('Gerencia palavras censuradas').addStringOption(o => o.setName('acao').setDescription('add ou remove').setRequired(true).addChoices({name: 'Adicionar', value: 'add'}, {name: 'Remover', value: 'remove'}, {name: 'Listar', value: 'list'})).addStringOption(o => o.setName('palavra').setDescription('Palavra').setRequired(false))
];

function getHelpEmbed(page) {
  const embed = new EmbedBuilder().setColor(0x00AE86).setFooter({ text: `Página ${page} de 4 • Zapher Bot` });

  switch (page) {
    case 1:
      embed.setTitle('📖 Central de Ajuda - Moderação & Administração (1/4)')
           .addFields(
             { name: '🛡️ Comandos & Permissões', value: '• `?clear <1-100>`: Limpa mensagens.\n• `?ban @usuario`: Bane um membro.\n• `?kick @usuario`: Expulsa um membro.\n• `?mute @usuario`: Silencia por 10 min.\n• `?warn @usuario <motivo>`: Advertência.\n• `?warnings @usuario`: Consulta avisos.\n• `?lock` / `?unlock`: Tranca/destranca canal.\n• `?setadminrole @cargo`: Define cargo admin do bot.\n• `?setadminuser @usuario`: Define usuário admin do bot.' }
           );
      break;
    case 2:
      embed.setTitle('📖 Central de Ajuda - Configurações & Logs (2/4)')
           .addFields(
             { name: '⚙️ Setups & Canais de Logs', value: '• `?setwelcome #canal`: Boas-vindas.\n• `?setautorole @cargo`: Cargo automático.\n• `?delautorole`: Remove cargo auto.\n• `?setlogs #canal`: Canal de logs geral.\n• `?setdenuncias #canal`: Logs de denúncias.\n• `?setduvidas #canal`: Logs de dúvidas/avaliações.\n• `?setpunicoes #canal`: Logs de punições.\n• `?setverify #canal @cargo`: Verificação.' }
           );
      break;
    case 3:
      embed.setTitle('📖 Central de Ajuda - Nicknames & Interativos (3/4)')
           .addFields(
             { name: '👤 Gestão de Apelidos & Outros', value: '• `?nick @usuario <novo_nick>`: Altera apelido.\n• `?permnick @usuario <apelido>`: Trava apelido.\n• `?calado @usuario`: Modo calado (zoação).\n• `?ticket`: Painel de atendimento.\n• `?sugerir <ideia>`: Sugestão.\n• `?denuncia <msg>`: Denúncia anônima.\n• `?sorteio <prêmio> <min>`: Sorteio.\n• `?embed Título | Descrição`: Embed.' }
           );
      break;
    case 4:
      embed.setTitle('📖 Central de Ajuda - Utilidades (4/4)')
           .addFields(
             { name: '🔧 Comandos Gerais', value: '• `?ping`: Latência do bot.\n• `?say <texto>`: Faz o bot falar.\n• `?avatar [@usuario]`: Foto de perfil.\n• `?serverinfo`: Info do servidor.\n• `?userinfo [@usuario]`: Info do usuário.' }
           );
      break;
  }
  return embed;
}

function getHelpButtons(page) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_prev').setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
    new ButtonBuilder().setCustomId('help_next').setLabel('Próxima ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === 4)
  );
}

async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Central de Atendimento & Denúncias')
    .setDescription('Precisa de ajuda ou deseja realizar uma denúncia sigilosa?\n\nClique no botão abaixo para abrir um canal de atendimento privado.')
    .setFooter({ text: 'Sistema de Segurança e Suporte Zapher' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket_duvida').setLabel('❓ Abrir Dúvida').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('create_ticket_denuncia').setLabel('🚨 Fazer Denúncia').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

const ticketCreators = new Map();
const activeTicketRatings = new Map();

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;

  const config = getConfig();
  const guildConfig = config[message.guild.id] || {};

  // Avaliação pendente (Justificativa) -> Vai para log de duvidas/atendimento
  if (message.channel.type === ChannelType.DM && activeTicketRatings.has(message.author.id)) {
    const ratingData = activeTicketRatings.get(message.author.id);
    activeTicketRatings.delete(message.author.id);

    const guild = message.client.guilds.cache.get(ratingData.guildId);
    if (guild) {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('⭐ Nova Avaliação de Atendimento / Dúvida')
        .addFields(
          { name: '👤 Usuário', value: `<@${message.author.id}>`, inline: true },
          { name: '⭐ Nota', value: `${ratingData.nota} estrela(s)`, inline: true },
          { name: '💬 Justificativa', value: message.content, inline: false }
        )
        .setTimestamp();
      await sendLog(guild, 'duvida', embed);
    }
    return message.reply('✅ Sua avaliação e justificativa foram enviadas para a staff. Obrigado!');
  }

  // Sistema Calado
  if (guildConfig.calados && guildConfig.calados[message.author.id]) {
    const muterId = guildConfig.calados[message.author.id];
    try {
      await message.delete();
      const sent = await message.channel.send(`vc foi silenciado por <@${muterId}>kkkkkk`);
      setTimeout(() => sent.delete().catch(() => {}), 4000);
      return;
    } catch (e) {}
  }

  const contentLower = message.content.toLowerCase();
  if (!hasAdminPermission(message.member, guildConfig)) {
    if (guildConfig.automod && (contentLower.includes('http://') || contentLower.includes('https://') || contentLower.includes('discord.gg/'))) {
      try {
        await message.delete();
        const warnMsg = await message.channel.send(`⚠️ <@${message.author.id}>, links não são permitidos neste chat!`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 4000);
        return;
      } catch (e) {}
    }

    if (guildConfig.censoredWords && guildConfig.censoredWords.some(word => contentLower.includes(word))) {
      try {
        await message.delete();
        const warnMsg = await message.channel.send(`⚠️ <@${message.author.id}>, sua mensagem continha uma palavra censurada.`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 4000);
        return;
      } catch (e) {}
    }
  }

  const content = message.content.trim();
  if (!content.startsWith('?')) return;

  const [rawCommand, ...args] = content.slice(1).split(/\s+/);
  const command = rawCommand.toLowerCase();

  if (command === 'help') {
    await message.channel.send({ embeds: [getHelpEmbed(1)], components: [getHelpButtons(1)] });
  } else if (command === 'ticket') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    await sendTicketPanel(message.channel);
    try { await message.delete(); } catch(e){}
  } else if (command === 'setwelcome') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setwelcome #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].welcomeChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de boas-vindas definido para <#${channel.id}>!`);
  } else if (command === 'setautorole') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const role = message.mentions.roles.first();
    if (!role) return message.channel.send('❌ Use: `?setautorole @cargo`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].autoRole = role.id;
    saveConfig(config);
    return message.channel.send(`✅ Cargo automático definido para <@&${role.id}>!`);
  } else if (command === 'delautorole') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    if (config[message.guild.id]) {
      delete config[message.guild.id].autoRole;
      saveConfig(config);
    }
    return message.channel.send('✅ Cargo automático removido com sucesso!');
  } else if (command === 'setsuggestion') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setsuggestion #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].suggestionChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de sugestões definido para <#${channel.id}>!`);
  } else if (command === 'setlogs') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setlogs #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].logsChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de logs geral definido para <#${channel.id}>!`);
  } else if (command === 'setdenuncias') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setdenuncias #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].denunciasChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de logs de denúncias definido para <#${channel.id}>!`);
  } else if (command === 'setduvidas') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setduvidas #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].duvidasChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de logs de dúvidas definido para <#${channel.id}>!`);
  } else if (command === 'setpunicoes') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.channel.send('❌ Use: `?setpunicoes #canal`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].punicoesChannel = channel.id;
    saveConfig(config);
    return message.channel.send(`✅ Canal de logs de punições definido para <#${channel.id}>!`);
  } else if (command === 'setverify') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const channel = message.mentions.channels.first();
    const role = message.mentions.roles.first();
    if (!channel || !role) return message.channel.send('❌ Use: `?setverify #canal @cargo`');

    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].verifyRole = role.id;
    saveConfig(config);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🛡️ Verificação de Segurança')
      .setDescription('Clique no botão abaixo para se verificar e liberar o acesso ao servidor.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_btn').setLabel('✅ Verificar').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    return message.channel.send(`✅ Painel enviado e cargo <@&${role.id}> salvo com sucesso!`);
  } else if (command === 'setadminrole') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.channel.send('❌ Apenas administradores principais.');
    const role = message.mentions.roles.first();
    if (!role) return message.channel.send('❌ Use: `?setadminrole @cargo`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    if (!config[message.guild.id].adminRoles) config[message.guild.id].adminRoles = [];
    if (!config[message.guild.id].adminRoles.includes(role.id)) {
      config[message.guild.id].adminRoles.push(role.id);
      saveConfig(config);
    }
    return message.channel.send(`✅ Cargo <@&${role.id}> adicionado como administrador do bot!`);
  } else if (command === 'setadminuser') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.channel.send('❌ Apenas administradores principais.');
    const user = message.mentions.users.first();
    if (!user) return message.channel.send('❌ Use: `?setadminuser @usuario`');
    if (!config[message.guild.id]) config[message.guild.id] = {};
    if (!config[message.guild.id].adminUsers) config[message.guild.id].adminUsers = [];
    if (!config[message.guild.id].adminUsers.includes(user.id)) {
      config[message.guild.id].adminUsers.push(user.id);
      saveConfig(config);
    }
    return message.channel.send(`✅ Usuário <@${user.id}> adicionado como administrador do bot!`);
  } else if (command === 'nick') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first();
    const novoNick = args.slice(1).join(' ');
    if (!member || !novoNick) return message.channel.send('❌ Use: `?nick @usuario <novo_apelido>`');
    try {
      await member.setNickname(novoNick);
      return message.channel.send(`✅ Apelido de **${member.user.tag}** alterado para **${novoNick}**.`);
    } catch (e) {
      return message.channel.send('❌ Erro ao alterar apelido.');
    }
  } else if (command === 'permnick') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first();
    const fixoNick = args.slice(1).join(' ');
    if (!member || !fixoNick) return message.channel.send('❌ Use: `?permnick @usuario <apelido_fixo>`');
    
    if (!config[message.guild.id]) config[message.guild.id] = {};
    if (!config[message.guild.id].permNicks) config[message.guild.id].permNicks = {};
    config[message.guild.id].permNicks[member.id] = fixoNick;
    saveConfig(config);

    try {
      await member.setNickname(fixoNick);
      return message.channel.send(`🔒 Apelido de **${member.user.tag}** travado como **${fixoNick}**!`);
    } catch (e) {
      return message.channel.send('❌ Erro ao travar apelido.');
    }
  } else if (command === 'calado') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first();
    if (!member) return message.channel.send('❌ Use: `?calado @usuario`');

    if (!config[message.guild.id]) config[message.guild.id] = {};
    if (!config[message.guild.id].calados) config[message.guild.id].calados = {};

    if (config[message.guild.id].calados[member.id]) {
      delete config[message.guild.id].calados[member.id];
      saveConfig(config);
      return message.channel.send(`🔊 Usuário <@${member.id}> foi tirado do modo calado.`);
    } else {
      config[message.guild.id].calados[member.id] = message.author.id;
      saveConfig(config);
      
      const punEmbed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🔇 Punição: Modo Calado')
        .addFields(
          { name: '👤 Vítima', value: `<@${member.id}>`, inline: true },
          { name: '🛡️ Staff', value: `<@${message.author.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(message.guild, 'punicao', punEmbed);

      return message.channel.send(`🔇 Usuário <@${member.id}> agora está no modo CALADO.`);
    }
  } else if (command === 'censura') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const acao = args[0]?.toLowerCase();
    const palavra = args[1]?.toLowerCase();
    if (!config[message.guild.id]) config[message.guild.id] = {};
    if (!config[message.guild.id].censoredWords) config[message.guild.id].censoredWords = [];

    if (acao === 'add' && palavra) {
      if (!config[message.guild.id].censoredWords.includes(palavra)) {
        config[message.guild.id].censoredWords.push(palavra);
        saveConfig(config);
      }
      return message.channel.send(`✅ Palavra **"${palavra}"** adicionada à censura.`);
    } else if (acao === 'remove' && palavra) {
      config[message.guild.id].censoredWords = config[message.guild.id].censoredWords.filter(w => w !== palavra);
      saveConfig(config);
      return message.channel.send(`✅ Palavra **"${palavra}"** removida da censura.`);
    } else if (acao === 'list') {
      const lista = config[message.guild.id].censoredWords.join(', ') || 'Nenhuma palavra censurada.';
      return message.channel.send(`📋 **Palavras censuradas:** ${lista}`);
    }
    return message.channel.send('❌ Use: `?censura add/remove/list <palavra>`');
  } else if (command === 'automod') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Apenas administradores.');
    const status = args[0]?.toLowerCase() === 'on' || args[0]?.toLowerCase() === 'true';
    if (!config[message.guild.id]) config[message.guild.id] = {};
    config[message.guild.id].automod = status;
    saveConfig(config);
    return message.channel.send(`🛡️ AutoMod de links está agora: **${status ? 'ATIVADO' : 'DESATIVADO'}**`);
  } else if (command === 'sugerir') {
    const sugestao = args.join(' ');
    if (!sugestao) return message.channel.send('❌ Use: `?sugerir <sua ideia>`');
    const suggestionId = guildConfig.suggestionChannel;
    const channel = suggestionId ? message.guild.channels.cache.get(suggestionId) : message.channel;
    
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('💡 Nova Sugestão')
      .setDescription(sugestao)
      .setFooter({ text: `Sugerido por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
    
    const sent = await channel.send({ embeds: [embed] });
    await sent.react('👍');
    await sent.react('👎');
    try { await message.delete(); } catch(e){}
  } else if (command === 'denuncia') {
    const texto = args.join(' ');
    if (!texto) return message.channel.send('❌ Use: `?denuncia <mensagem>`');

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚨 Nova Denúncia Anônima')
      .setDescription(texto)
      .setTimestamp();

    await sendLog(message.guild, 'denuncia', embed);
    try { await message.delete(); } catch(e){}
    return message.author.send('✅ Sua denúncia anônima foi enviada para o canal de denúncias com sucesso.').catch(() => {});
  } else if (command === 'sorteio') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const tempoMin = parseInt(args[args.length - 1]);
    const premio = args.slice(0, -1).join(' ');
    if (!premio || isNaN(tempoMin)) return message.channel.send('❌ Use: `?sorteio <prêmio> <minutos>`');

    const embed = new EmbedBuilder()
      .setColor(0xFF1493)
      .setTitle('🎉 SORTEIO RELÂMPAGO 🎉')
      .setDescription(`Prêmio: **${premio}**\nTermina em: **${tempoMin} minuto(s)**\n\nClique no botão abaixo para participar!`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_giveaway').setLabel('🎉 Participar').setStyle(ButtonStyle.Success)
    );

    const giveawayMsg = await message.channel.send({ embeds: [embed], components: [row] });
    const participants = new Set();

    const collector = giveawayMsg.createMessageComponentCollector({ time: tempoMin * 60 * 1000 });
    collector.on('collect', async i => {
      if (participants.has(i.user.id)) {
        return i.reply({ content: '❌ Você já está participando deste sorteio!', ephemeral: true });
      }
      participants.add(i.user.id);
      await i.reply({ content: '✅ Você está participando do sorteio com sucesso!', ephemeral: true });
    });

    collector.on('end', async () => {
      const usersArray = Array.from(participants);
      if (usersArray.length === 0) {
        return giveawayMsg.edit({ content: '❌ Sorteio encerrado! Ninguém participou.', components: [] });
      }
      const winnerId = usersArray[Math.floor(Math.random() * usersArray.length)];
      await giveawayMsg.edit({ content: `🎉 **SORTEIO ENCERRADO!** O vencedor do prêmio **${premio}** foi: <@${winnerId}>! Parabéns!`, components: [] });
    });
    try { await message.delete(); } catch(e){}
  } else if (command === 'embed') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const parts = args.join(' ').split('|');
    if (parts.length < 2) return message.channel.send('❌ Use: `?embed Título | Descrição`');
    const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(parts[0].trim()).setDescription(parts[1].trim()).setTimestamp();
    await message.channel.send({ embeds: [embed] });
    try { await message.delete(); } catch(e){}
  } else if (command === 'lock') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
      await message.channel.send('🔒 Canal trancado com sucesso.');
    } catch (e) {
      await message.channel.send('❌ Erro ao trancar canal.');
    }
  } else if (command === 'unlock') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    try {
      await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
      await message.channel.send('🔓 Canal destrancado com sucesso.');
    } catch (e) {
      await message.channel.send('❌ Erro ao destrancar canal.');
    }
  } else if (command === 'warn') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const userId = args[0]?.match(/^<@!?(\d+)>$/)?.[1];
    const motivo = args.slice(1).join(' ');
    if (!userId || !motivo) return message.channel.send('❌ Use: `?warn @usuario <motivo>`');

    const warnings = getWarnings();
    if (!warnings[message.guild.id]) warnings[message.guild.id] = {};
    if (!warnings[message.guild.id][userId]) warnings[message.guild.id][userId] = [];
    warnings[message.guild.id][userId].push({ motivo, data: new Date().toLocaleDateString() });
    saveWarnings(warnings);

    const warnEmbed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('⚠️ Punição: Advertência (Warn)')
      .addFields(
        { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
        { name: '🛡️ Staff', value: `<@${message.author.id}>`, inline: true },
        { name: '📝 Motivo', value: motivo, inline: false }
      )
      .setTimestamp();
    await sendLog(message.guild, 'punicao', warnEmbed);

    return message.channel.send(`⚠️ Usuário <@${userId}> advertido com sucesso.`);
  } else if (command === 'warnings') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const userId = args[0]?.match(/^<@!?(\d+)>$/)?.[1];
    if (!userId) return message.channel.send('❌ Use: `?warnings @usuario`');

    const warnings = getWarnings();
    const userWarns = warnings[message.guild.id]?.[userId] || [];
    if (userWarns.length === 0) return message.channel.send('✅ Este usuário não possui advertências.');

    const list = userWarns.map((w, index) => `**${index + 1}.** ${w.motivo} (${w.data})`).join('\n');
    const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`⚠️ Advertências de <@${userId}>`).setDescription(list);
    return message.channel.send({ embeds: [embed] });
  } else if (command === 'ping') {
    await message.channel.send(`🏓 Pong! Latência: ${Date.now() - message.createdTimestamp}ms`);
  } else if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.channel.send('❌ Use: `?say <texto>`');
    try { await message.delete(); } catch(e){}
    await message.channel.send(text);
  } else if (command === 'clear') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const count = parseInt(args[0]);
    if (isNaN(count) || count <= 0 || count > 100) return message.channel.send('❌ Use: `?clear <1-100>`');
    try {
      await message.delete();
      const deleted = await message.channel.bulkDelete(count, true);
      const msg = await message.channel.send(`🧹 ${deleted.size} mensagens limpas.`);
      setTimeout(() => msg.delete().catch(() => {}), 3000);
    } catch (e) {
      await message.channel.send('❌ Erro ao limpar mensagens.');
    }
  } else if (command === 'ban') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send('❌ Mencione quem deseja banir.');
    try {
      await member.ban();
      const banEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔨 Punição: Banimento')
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${message.author.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(message.guild, 'punicao', banEmbed);

      return message.channel.send(`🔨 Usuário **${member.user.tag}** banido com sucesso.`);
    } catch (e) {
      return message.channel.send('❌ Erro ao banir.');
    }
  } else if (command === 'kick') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send('❌ Mencione quem deseja expulsar.');
    try {
      await member.kick();
      const kickEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('👢 Punição: Expulsão (Kick)')
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${message.author.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(message.guild, 'punicao', kickEmbed);

      return message.channel.send(`👢 Usuário **${member.user.tag}** expulso com sucesso.`);
    } catch (e) {
      return message.channel.send('❌ Erro ao expulsar.');
    }
  } else if (command === 'mute') {
    if (!hasAdminPermission(message.member, guildConfig)) return message.channel.send('❌ Sem permissão.');
    const member = message.mentions.members.first();
    if (!member) return message.channel.send('❌ Mencione o membro.');
    try {
      await member.timeout(10 * 60 * 1000, 'Mutado pelo bot');
      const muteEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🔇 Punição: Timeout (Mute)')
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${message.author.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(message.guild, 'punicao', muteEmbed);

      return message.channel.send(`🔇 **${member.user.tag}** mutado por 10 minutos.`);
    } catch (e) {
      return message.channel.send('❌ Erro ao mutar.');
    }
  } else if (command === 'avatar') {
    const user = message.mentions.users.first() || message.author;
    await message.channel.send(user.displayAvatarURL({ size: 256 }));
  } else if (command === 'serverinfo') {
    await message.channel.send(`🏰 Servidor: **${message.guild.name}** | Membros: **${message.guild.memberCount}**`);
  }
}

async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === 'help_prev' || interaction.customId === 'help_next') {
      let footerText = interaction.message.embeds[0].footer.text;
      let currentPage = parseInt(footerText.match(/Página (\d+)/)[1]);
      if (interaction.customId === 'help_prev' && currentPage > 1) currentPage--;
      if (interaction.customId === 'help_next' && currentPage < 4) currentPage++;
      await interaction.update({ embeds: [getHelpEmbed(currentPage)], components: [getHelpButtons(currentPage)] });
      return;
    }

    if (interaction.customId === 'verify_btn') {
      const configData = getConfig();
      const roleId = configData[interaction.guild.id]?.verifyRole;
      
      if (!roleId) {
        return interaction.reply({ content: '❌ Erro: O cargo de verificação ainda não foi salvo. Use `/setverify` novamente.', ephemeral: true });
      }
      
      try {
        await interaction.member.roles.add(roleId);
        return interaction.reply({ content: '✅ Você foi verificado com sucesso!', ephemeral: true });
      } catch (e) {
        return interaction.reply({ content: '❌ Erro ao atribuir cargo.', ephemeral: true });
      }
    }

    if (interaction.customId === 'create_ticket_duvida' || interaction.customId === 'create_ticket_denuncia') {
      const guild = interaction.guild;
      const member = interaction.member;
      const isDenuncia = interaction.customId === 'create_ticket_denuncia';
      const tipo = isDenuncia ? 'denuncia' : 'duvida';
      const nomeCanal = `${tipo}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');

      const existingChannel = guild.channels.cache.find(c => c.name === nomeCanal);
      if (existingChannel) {
        return interaction.reply({ content: `❌ Você já possui um canal aberto em <#${existingChannel.id}>!`, ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const ticketChannel = await guild.channels.create({
          name: nomeCanal,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
          ],
        });

        ticketCreators.set(ticketChannel.id, member.id);

        const controlEmbed = new EmbedBuilder()
          .setColor(isDenuncia ? 0xFF0000 : 0x00AE86)
          .setTitle(isDenuncia ? '🚨 Canal de Denúncia' : '❓ Canal de Dúvida')
          .setDescription(`Olá <@${member.id}>, aguarde um membro da staff assumir.`);

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('claim_ticket').setLabel('🙋‍♂️ Chamar Staff / Aceitar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Fechar Atendimento').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@${member.id}>`, embeds: [controlEmbed], components: [actionRow] });
        await interaction.editReply({ content: `✅ Canal criado: <#${ticketChannel.id}>` });
      } catch (err) {
        await interaction.editReply({ content: '❌ Erro ao criar canal.' });
      }
    }

    if (interaction.customId === 'claim_ticket') {
      const config = getConfig();
      const guildConfig = config[interaction.guild.id] || {};
      if (!hasAdminPermission(interaction.member, guildConfig)) {
        return interaction.reply({ content: '❌ Apenas staff.', ephemeral: true });
      }
      const staff = interaction.member;
      const channel = interaction.channel;
      try {
        await channel.permissionOverwrites.edit(staff.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        const oldEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(oldEmbed).addFields({ name: '🛡️ Atendimento Assumido por', value: `<@${staff.id}>`, inline: false });
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('claim_ticket').setLabel(`Assumido por ${staff.user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Fechar Atendimento').setStyle(ButtonStyle.Danger)
        );
        await interaction.update({ embeds: [updatedEmbed], components: [actionRow] });
        await channel.send(`✅ Atendimento aceito por <@${staff.id}>.`);
      } catch (e) {}
    }

    if (interaction.customId === 'close_ticket') {
      const channel = interaction.channel;
      const creatorId = ticketCreators.get(channel.id);
      await interaction.reply({ content: '🔒 Fechando canal em 5 segundos...' });

      if (creatorId) {
        try {
          const creator = await interaction.client.users.fetch(creatorId);
          const ratingEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('⭐ Avalie seu Atendimento')
            .setDescription('Seu ticket foi encerrado. Clique abaixo para avaliar de 1 a 5 estrelas e envie sua justificativa no chat privado se desejar:');

          const ratingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rate_1').setLabel('⭐ 1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_2').setLabel('⭐ 2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rate_3').setLabel('⭐ 3').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('rate_4').setLabel('⭐ 4').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rate_5').setLabel('⭐ 5').setStyle(ButtonStyle.Success)
          );
          await creator.send({ embeds: [ratingEmbed], components: [ratingRow] });
        } catch (err) {}
        ticketCreators.delete(channel.id);
      }
      setTimeout(() => { channel.delete().catch(() => {}); }, 5000);
      return;
    }

    if (interaction.customId.startsWith('rate_')) {
      const nota = interaction.customId.split('_')[1];
      activeTicketRatings.set(interaction.user.id, { guildId: interaction.guildId || interaction.message.guildId, nota });
      await interaction.update({ content: `✅ Obrigado pela sua avaliação de **${nota} estrela(s)**!\n\n💬 **Deseja enviar uma justificativa?** Digite sua justificativa aqui no chat privado agora mesmo para enviarmos à staff.`, embeds: [], components: [] });
      return;
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  const config = getConfig();
  const guildConfig = config[interaction.guild.id] || {};

  if (commandName === 'ping') {
    await interaction.reply({ content: `🏓 Pong! Latência: ${Date.now() - interaction.createdTimestamp}ms`, ephemeral: true });
  } else if (commandName === 'ticket') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await sendTicketPanel(interaction.channel);
    await interaction.reply({ content: '✅ Painel enviado!', ephemeral: true });
  } else if (commandName === 'help') {
    await interaction.reply({ embeds: [getHelpEmbed(1)], components: [getHelpButtons(1)], ephemeral: true });
  } else if (commandName === 'setwelcome') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].welcomeChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de boas-vindas definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setautorole') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const role = interaction.options.getRole('cargo');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].autoRole = role.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Cargo automático definido para <@&${role.id}>!`, ephemeral: true });
  } else if (commandName === 'delautorole') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    if (config[interaction.guild.id]) {
      delete config[interaction.guild.id].autoRole;
      saveConfig(config);
    }
    await interaction.reply({ content: '✅ Cargo automático removido com sucesso!', ephemeral: true });
  } else if (commandName === 'setsuggestion') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].suggestionChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de sugestões definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setlogs') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].logsChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de logs geral definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setdenuncias') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].denunciasChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de logs de denúncias definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setduvidas') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].duvidasChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de logs de dúvidas definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setpunicoes') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].punicoesChannel = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ Canal de logs de punições definido para <#${channel.id}>!`, ephemeral: true });
  } else if (commandName === 'setverify') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const channel = interaction.options.getChannel('canal');
    const role = interaction.options.getRole('cargo');
    
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].verifyRole = role.id;
    saveConfig(config);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🛡️ Verificação de Segurança')
      .setDescription('Clique no botão abaixo para se verificar e liberar o acesso ao servidor.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_btn').setLabel('✅ Verificar').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Painel enviado e cargo <@&${role.id}> salvo com sucesso!`, ephemeral: true });
  } else if (commandName === 'setadminrole') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Apenas administradores principais.', ephemeral: true });
    const role = interaction.options.getRole('cargo');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    if (!config[interaction.guild.id].adminRoles) config[interaction.guild.id].adminRoles = [];
    if (!config[interaction.guild.id].adminRoles.includes(role.id)) {
      config[interaction.guild.id].adminRoles.push(role.id);
      saveConfig(config);
    }
    await interaction.reply({ content: `✅ Cargo <@&${role.id}> adicionado como administrador do bot!`, ephemeral: true });
  } else if (commandName === 'setadminuser') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Apenas administradores principais.', ephemeral: true });
    const user = interaction.options.getUser('usuario');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    if (!config[interaction.guild.id].adminUsers) config[interaction.guild.id].adminUsers = [];
    if (!config[interaction.guild.id].adminUsers.includes(user.id)) {
      config[interaction.guild.id].adminUsers.push(user.id);
      saveConfig(config);
    }
    await interaction.reply({ content: `✅ Usuário <@${user.id}> adicionado como administrador do bot!`, ephemeral: true });
  } else if (commandName === 'nick') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const member = interaction.options.getMember('usuario');
    const novoNick = interaction.options.getString('apelido');
    try {
      await member.setNickname(novoNick);
      await interaction.reply({ content: `✅ Apelido de **${member.user.tag}** alterado para **${novoNick}**.` });
    } catch (e) {
      await interaction.reply({ content: '❌ Erro ao alterar apelido.', ephemeral: true });
    }
  } else if (commandName === 'permnick') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const member = interaction.options.getMember('usuario');
    const fixoNick = interaction.options.getString('apelido');
    
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    if (!config[interaction.guild.id].permNicks) config[interaction.guild.id].permNicks = {};
    config[interaction.guild.id].permNicks[member.id] = fixoNick;
    saveConfig(config);

    try {
      await member.setNickname(fixoNick);
      await interaction.reply({ content: `🔒 Apelido de **${member.user.tag}** travado como **${fixoNick}**!` });
    } catch (e) {
      await interaction.reply({ content: '❌ Erro ao travar apelido.', ephemeral: true });
    }
  } else if (commandName === 'calado') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const member = interaction.options.getMember('usuario');

    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    if (!config[interaction.guild.id].calados) config[interaction.guild.id].calados = {};

    if (config[interaction.guild.id].calados[member.id]) {
      delete config[interaction.guild.id].calados[member.id];
      saveConfig(config);
      await interaction.reply({ content: `🔊 Usuário <@${member.id}> foi tirado do modo calado.` });
    } else {
      config[interaction.guild.id].calados[member.id] = interaction.user.id;
      saveConfig(config);

      const punEmbed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🔇 Punição: Modo Calado')
        .addFields(
          { name: '👤 Vítima', value: `<@${member.id}>`, inline: true },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(interaction.guild, 'punicao', punEmbed);

      await interaction.reply({ content: `🔇 Usuário <@${member.id}> agora está no modo CALADO.` });
    }
  } else if (commandName === 'censura') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const acao = interaction.options.getString('acao');
    const palavra = interaction.options.getString('palavra')?.toLowerCase();
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    if (!config[interaction.guild.id].censoredWords) config[interaction.guild.id].censoredWords = [];

    if (acao === 'add' && palavra) {
      if (!config[interaction.guild.id].censoredWords.includes(palavra)) {
        config[interaction.guild.id].censoredWords.push(palavra);
        saveConfig(config);
      }
      await interaction.reply({ content: `✅ Palavra **"${palavra}"** adicionada à censura.`, ephemeral: true });
    } else if (acao === 'remove' && palavra) {
      config[interaction.guild.id].censoredWords = config[interaction.guild.id].censoredWords.filter(w => w !== palavra);
      saveConfig(config);
      await interaction.reply({ content: `✅ Palavra **"${palavra}"** removida da censura.`, ephemeral: true });
    } else if (acao === 'list') {
      const lista = config[interaction.guild.id].censoredWords.join(', ') || 'Nenhuma palavra censurada.';
      await interaction.reply({ content: `📋 **Palavras censuradas:** ${lista}`, ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Informe a palavra para adicionar ou remover.', ephemeral: true });
    }
  } else if (commandName === 'automod') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    const status = interaction.options.getBoolean('status');
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].automod = status;
    saveConfig(config);
    await interaction.reply({ content: `🛡️ AutoMod de links está agora: **${status ? 'ATIVADO' : 'DESATIVADO'}**`, ephemeral: true });
  } else if (commandName === 'sugerir') {
    const sugestao = interaction.options.getString('ideia');
    const suggestionId = guildConfig.suggestionChannel;
    const channel = suggestionId ? interaction.guild.channels.cache.get(suggestionId) : interaction.channel;

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('💡 Nova Sugestão')
      .setDescription(sugestao)
      .setFooter({ text: `Sugerido por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    const sent = await channel.send({ embeds: [embed] });
    await sent.react('👍');
    await sent.react('👎');
    await interaction.reply({ content: '✅ Sugestão enviada com sucesso!', ephemeral: true });
  } else if (commandName === 'denuncia') {
    const texto = interaction.options.getString('mensagem');
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚨 Nova Denúncia Anônima')
      .setDescription(texto)
      .setTimestamp();

    await sendLog(interaction.guild, 'denuncia', embed);
    await interaction.reply({ content: '✅ Denúncia enviada com sucesso para o canal de denúncias.', ephemeral: true });
  } else if (commandName === 'sorteio') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const premio = interaction.options.getString('premio');
    const tempoMin = interaction.options.getInteger('minutos');

    const embed = new EmbedBuilder()
      .setColor(0xFF1493)
      .setTitle('🎉 SORTEIO RELÂMPAGO 🎉')
      .setDescription(`Prêmio: **${premio}**\nTermina em: **${tempoMin} minuto(s)**\n\nClique no botão abaixo para participar!`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('join_giveaway').setLabel('🎉 Participar').setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ content: '✅ Sorteio iniciado!', ephemeral: true });
    const giveawayMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
    const participants = new Set();

    const collector = giveawayMsg.createMessageComponentCollector({ time: tempoMin * 60 * 1000 });
    collector.on('collect', async i => {
      if (participants.has(i.user.id)) {
        return i.reply({ content: '❌ Você já está participando deste sorteio!', ephemeral: true });
      }
      participants.add(i.user.id);
      await i.reply({ content: '✅ Você está participando do sorteio com sucesso!', ephemeral: true });
    });

    collector.on('end', async () => {
      const usersArray = Array.from(participants);
      if (usersArray.length === 0) {
        return giveawayMsg.edit({ content: '❌ Sorteio encerrado! Ninguém participou.', components: [] });
      }
      const winnerId = usersArray[Math.floor(Math.random() * usersArray.length)];
      await giveawayMsg.edit({ content: `🎉 **SORTEIO ENCERRADO!** O vencedor do prêmio **${premio}** foi: <@${winnerId}>! Parabéns!`, components: [] });
    });
  } else if (commandName === 'embed') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(titulo).setDescription(descricao).setTimestamp();
    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed enviado!', ephemeral: true });
  } else if (commandName === 'lock') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
    await interaction.reply({ content: '🔒 Canal trancado com sucesso.', ephemeral: true });
  } else if (commandName === 'unlock') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
    await interaction.reply({ content: '🔓 Canal destrancado com sucesso.', ephemeral: true });
  } else if (commandName === 'say') {
    await interaction.reply({ content: interaction.options.getString('texto') });
  } else if (commandName === 'clear') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const count = interaction.options.getInteger('qtd');
    try {
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(count, true);
      await interaction.editReply({ content: `🧹 ${deleted.size} mensagens limpas com sucesso!` });
    } catch (e) {
      await interaction.editReply({ content: '❌ Erro ao limpar mensagens.' });
    }
  } else if (commandName === 'ban') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const user = interaction.options.getUser('usuario');
    const motivo = interaction.options.getString('motivo') || 'Sem motivo';
    try {
      await interaction.guild.members.ban(user, { reason: motivo });
      
      const banEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔨 Punição: Banimento')
        .addFields(
          { name: '👤 Usuário', value: `${user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📝 Motivo', value: motivo, inline: false }
        )
        .setTimestamp();
      await sendLog(interaction.guild, 'punicao', banEmbed);

      await interaction.reply({ content: `🔨 Usuário **${user.tag}** banido com sucesso.` });
    } catch (e) {
      await interaction.reply({ content: '❌ Erro ao banir usuário.', ephemeral: true });
    }
  } else if (commandName === 'kick') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const member = interaction.options.getMember('usuario');
    const motivo = interaction.options.getString('motivo') || 'Sem motivo';
    try {
      await member.kick(motivo);

      const kickEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('👢 Punição: Expulsão (Kick)')
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📝 Motivo', value: motivo, inline: false }
        )
        .setTimestamp();
      await sendLog(interaction.guild, 'punicao', kickEmbed);

      await interaction.reply({ content: `👢 Membro **${member.user.tag}** expulso.` });
    } catch (e) {
      await interaction.reply({ content: '❌ Erro ao expulsar membro.', ephemeral: true });
    }
  } else if (commandName === 'mute') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const member = interaction.options.getMember('usuario');
    try {
      await member.timeout(10 * 60 * 1000, 'Mutado pelo bot');

      const muteEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🔇 Punição: Timeout (Mute)')
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
      await sendLog(interaction.guild, 'punicao', muteEmbed);

      await interaction.reply({ content: `🔇 Membro **${member.user.tag}** mutado por 10 minutos.` });
    } catch (e) {
      await interaction.reply({ content: '❌ Erro ao mutar membro.', ephemeral: true });
    }
  } else if (commandName === 'warn') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const user = interaction.options.getUser('usuario');
    const motivo = interaction.options.getString('motivo');

    const warnings = getWarnings();
    if (!warnings[interaction.guild.id]) warnings[interaction.guild.id] = {};
    if (!warnings[interaction.guild.id][user.id]) warnings[interaction.guild.id][user.id] = [];
    warnings[interaction.guild.id][user.id].push({ motivo, data: new Date().toLocaleDateString() });
    saveWarnings(warnings);

    const warnEmbed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('⚠️ Punição: Advertência (Warn)')
      .addFields(
        { name: '👤 Usuário', value: `<@${user.id}>`, inline: true },
        { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Motivo', value: motivo, inline: false }
      )
      .setTimestamp();
    await sendLog(interaction.guild, 'punicao', warnEmbed);

    await interaction.reply({ content: `⚠️ Usuário <@${user.id}> advertido com sucesso. Motivo: ${motivo}` });
  } else if (commandName === 'warnings') {
    if (!hasAdminPermission(interaction.member, guildConfig)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const user = interaction.options.getUser('usuario');

    const warnings = getWarnings();
    const userWarns = warnings[interaction.guild.id]?.[user.id] || [];
    if (userWarns.length === 0) return interaction.reply({ content: '✅ Este usuário não possui advertências.', ephemeral: true });

    const list = userWarns.map((w, index) => `**${index + 1}.** ${w.motivo} (${w.data})`).join('\n');
    const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`⚠️ Advertências de <@${user.id}>`).setDescription(list);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleGuildMemberUpdate(oldMember, newMember) {
  const config = getConfig();
  const guildConfig = config[newMember.guild.id];
  if (!guildConfig || !guildConfig.permNicks) return;

  const lockedNick = guildConfig.permNicks[newMember.id];
  if (lockedNick && newMember.nickname !== lockedNick) {
    try {
      await newMember.setNickname(lockedNick);
    } catch (e) {}
  }
}

async function handleGuildMemberAdd(member) {
  const config = getConfig();
  const guildConfig = config[member.guild.id];
  if (!guildConfig) return;

  if (guildConfig.permNicks && guildConfig.permNicks[member.id]) {
    try {
      await member.setNickname(guildConfig.permNicks[member.id]);
    } catch (e) {}
  }

  if (guildConfig.autoRole) {
    try {
      const role = member.guild.roles.cache.get(guildConfig.autoRole);
      if (role) await member.roles.add(role);
    } catch (e) {}
  }

  if (guildConfig.welcomeChannel) {
    const channel = member.guild.channels.cache.get(guildConfig.welcomeChannel);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Novo Membro!')
        .setDescription(`Seja bem-vindo(a), <@${member.id}>!\nNick: **${member.user.tag}**`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
  }
}

async function handleGuildMemberRemove(member) {
  const config = getConfig();
  const guildConfig = config[member.guild.id];
  if (!guildConfig || !guildConfig.welcomeChannel) return;

  const channel = member.guild.channels.cache.get(guildConfig.welcomeChannel);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚪 Membro Saiu')
    .setDescription(`**${member.user.tag}** saiu do servidor. Até mais!`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
  await channel.send({ embeds: [embed] });
}

module.exports = { allSlashCommands, handleInteraction, handleMessage, handleGuildMemberAdd, handleGuildMemberRemove, handleGuildMemberUpdate, sendTicketPanel };
