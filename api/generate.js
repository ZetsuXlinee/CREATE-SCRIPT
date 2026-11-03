// api/generate.js - FULL VERSION (20 FITUR, BUTTON, THUMBNAIL, MENU TYPES)
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  
  try {
    const {
      botName, ownerNumber, ownerName, pairingNumber,
      teleToken, teleUsername, platform, base,
      menuType, btnType, thumbType, thumbData
    } = req.body || {};

    if(!botName) return res.status(400).json({ error: 'Isi botName dulu' });

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    
    const list = [
      'menu','ping','owner','info','runtime','totfitur','speed','say','quote','donasi',
      'welcome','antilink','hidetag','sticker','downloader','ai',
      'rpg','store','autoreply','broadcast'
    ];

    // Simpan file thumbnail jika ada
    let hasThumb = false;
    if (thumbType === 'thumb' && thumbData && thumbData.startsWith('data:image')) {
      const base64Data = thumbData.split(',')[1];
      zip.file('thumbnail.jpg', Buffer.from(base64Data, 'base64'));
      hasThumb = true;
    }

    // ================= 1. TELEGRAM =================
    if(platform === 'telegram'){
      const settingsTele = `module.exports = {
  botName: "${botName}",
  ownerName: "${ownerName}",
  username: "${teleUsername || '@bot'}",
  token: "${teleToken || ''}",
  features: ${JSON.stringify(list)},
  menuType: "${menuType}",
  btnType: "${btnType}",
  thumbType: "${thumbType}"
};
`;
      const indexTele = `const settings = require('./settings.js');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

if(!settings.token){ console.log('Isi token di settings.js dulu'); process.exit(1); }

const bot = new Telegraf(settings.token);
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();

console.log('Starting ' + settings.botName + ' - Telegram');
const pluginsDir = path.join(__dirname, 'plugins');
const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
const plugins = files.map(f => require(path.join(pluginsDir, f)));
console.log('Loaded ' + plugins.length + ' plugins');

plugins.forEach(plugin => {
  if(plugin.command) {
    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
    cmds.forEach(cmd => bot.command(cmd, (ctx) => plugin.handler(bot, ctx)));
  }
});

bot.on('message', async (ctx) => {
  if(!ctx.message) return;
  for (const plugin of plugins) {
    if (plugin.onMessage) {
      const handled = await plugin.onMessage(bot, ctx);
      if (handled) break;
    }
  }
});

bot.on('new_chat_members', (ctx) => {
  plugins.forEach(plugin => { if(plugin.onNewMember) plugin.onNewMember(bot, ctx); });
});

bot.launch().then(()=>console.log(settings.botName + ' Running'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
`;

      zip.file('settings.js', settingsTele);
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", description: botName + " Telegram",
        type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" },
        dependencies: { telegraf: "^4.15.3", axios: "^1.7.2" }
      }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexTele);

      const pf = zip.folder('plugins');

      // TELEGRAM MENU
      pf.file('menu.js', `const { Markup } = require('telegraf');
module.exports = {
  command: ['menu','start','help'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    
    let t = '';
    if (s.menuType === 'simple') {
      t = 'MENU ' + s.botName + '\\n\\n' + s.features.map(f => '• /' + f).join('\\n') + '\\n\\nOwner: ' + s.ownerName;
    } else {
      t = '╭━━━〔 ' + s.botName + ' 〕━━━✦\\n';
      t += '┃ 👤 Owner: ' + s.ownerName + '\\n';
      t += '┃ 🆔 Username: ' + s.username + '\\n';
      t += '┃ ⏱️ Uptime: ' + uptime + 's\\n';
      t += '┣━━━〔 '+s.features.length+' FITUR 〕━━━\\n';
      s.features.forEach(f=>{ t += '┃ ❒ /' + f + '\\n'; });
      t += '╰━━━━━━━━━━━━━━';
    }

    const opts = { parse_mode: 'Markdown' };
    
    if (s.btnType === 'btn') {
      opts.reply_markup = Markup.inlineKeyboard([
        [Markup.button.callback('Refresh Menu', 'menu'), Markup.button.url('Owner', 'https://t.me/' + s.username.replace('@',''))]
      ]);
    }

    try {
      if (s.thumbType === 'thumb' && require('fs').existsSync('./thumbnail.jpg')) {
        await ctx.replyWithPhoto({ source: './thumbnail.jpg' }, { caption: t, ...opts });
      } else if (s.menuType === 'image') {
        await ctx.replyWithPhoto('https://picsum.photos/seed/' + encodeURIComponent(s.botName) + '/400/220', { caption: t, ...opts });
      } else {
        await ctx.reply(t, opts);
      }
    } catch (e) {
      await ctx.reply(t, opts);
    }
  }
};`);

      pf.file('ping.js', `module.exports = { command: ['ping'], handler: async (bot, ctx) => { const t = Date.now(); await ctx.reply('Pong...'); await ctx.reply('⚡ Latency: ' + (Date.now() - t) + 'ms'); } };`);
      pf.file('owner.js', `module.exports = { command: ['owner'], handler: async (bot, ctx) => { const s = require('../settings.js'); await ctx.reply('👑 Owner: ' + s.ownerName + '\\n📱 ' + s.username); } };`);
      pf.file('info.js', `module.exports = { command: ['info'], handler: async (bot, ctx) => { const s = require('../settings.js'); await ctx.reply('🤖 Bot: ' + s.botName + '\\n📡 Platform: Telegram\\n🧩 Telegraf'); } };`);
      pf.file('runtime.js', `module.exports = { command: ['runtime'], handler: async (bot, ctx) => { const u = Math.floor((Date.now() - global.startTime)/1000); await ctx.reply('⏱️ Uptime: ' + u + ' detik'); } };`);
      pf.file('totfitur.js', `module.exports = { command: ['totfitur'], handler: async (bot, ctx) => { const s = require('../settings.js'); await ctx.reply('🧩 Total Fitur: ' + s.features.length); } };`);
      pf.file('speed.js', `module.exports = { command: ['speed'], handler: async (bot, ctx) => { const t = Date.now(); await ctx.reply('Mengukur...'); await ctx.reply('🚀 Latency: ' + (Date.now() - t) + 'ms'); } };`);
      pf.file('donasi.js', `module.exports = { command: ['donasi'], handler: async (bot, ctx) => { await ctx.reply('☕ Donasi:\\nDana: 08xxx\\nGopay: 08xxx'); } };`);
      pf.file('say.js', `module.exports = { command: ['say'], handler: async (bot, ctx) => { const text = ctx.message.text.split(' ').slice(1).join(' '); if(text) await ctx.reply(text); } };`);
      pf.file('quote.js', `module.exports = { command: ['quote'], handler: async (bot, ctx) => { await ctx.reply('💭 "Jangan menyerah, teruslah berjuang."'); } };`);
      
      pf.file('welcome.js', `module.exports = {
  command: ['welcome'],
  handler: async (bot, ctx) => {
    const cmd = ctx.message.text.split(' ').slice(1)[0]?.toLowerCase();
    if(cmd === 'on'){ if(!global.db.welcome.includes(ctx.chat.id.toString())) global.db.welcome.push(ctx.chat.id.toString()); global.saveDB(); await ctx.reply('✅ Welcome ON'); }
    else if(cmd === 'off'){ global.db.welcome = global.db.welcome.filter(v=>v!==ctx.chat.id.toString()); global.saveDB(); await ctx.reply('❌ Welcome OFF'); }
    else { await ctx.reply('Ketik /welcome on / off'); }
  },
  onNewMember: async (bot, ctx) => {
    if(!global.db.welcome.includes(ctx.chat.id.toString())) return;
    const m = ctx.message.new_chat_members[0];
    await ctx.reply('👋 Selamat datang @' + (m.username || m.first_name) + '!');
  }
};`);

      pf.file('antilink.js', `module.exports = {
  command: ['antilink'],
  handler: async (bot, ctx) => {
    const cmd = ctx.message.text.split(' ').slice(1)[0]?.toLowerCase();
    if(cmd === 'on'){ if(!global.db.antilink.includes(ctx.chat.id.toString())) global.db.antilink.push(ctx.chat.id.toString()); global.saveDB(); await ctx.reply('✅ Antilink ON'); }
    else if(cmd === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==ctx.chat.id.toString()); global.saveDB(); await ctx.reply('❌ Antilink OFF'); }
    else { await ctx.reply('Ketik /antilink on / off'); }
  },
  onMessage: async (bot, ctx) => {
    if(!global.db.antilink.includes(ctx.chat.id.toString())) return false;
    if(/https?:\\/\\//.test(ctx.message.text||'')){ try{ await ctx.deleteMessage(); await ctx.reply('🚫 Link dihapus!'); }catch{} return true; }
    return false;
  }
};`);

      pf.file('hidetag.js', `module.exports = { command: ['hidetag'], handler: async (bot, ctx) => { const text = ctx.message.text.split(' ').slice(1).join(' '); await ctx.reply(text || 'Halo semua!'); } };`);
      pf.file('sticker.js', `module.exports = { command: ['sticker'], handler: async (bot, ctx) => { await ctx.reply('Kirim gambar lalu reply /s'); } };`);
      pf.file('downloader.js', `const axios = require('axios'); module.exports = { command: ['tiktok'], handler: async (bot, ctx) => { const url = ctx.message.text.split(' ')[1]; if(!url) return ctx.reply('Kirim link'); try { const r = await axios.get('https://tikwm.com/api/?url='+url); await ctx.replyWithVideo({url: r.data.data.play}); } catch { ctx.reply('Gagal'); } } };`);
      pf.file('ai.js', `const axios = require('axios'); module.exports = { command: ['ai'], handler: async (bot, ctx) => { const text = ctx.message.text.split(' ').slice(1).join(' '); if(!text) return ctx.reply('Tanya apa?'); try { const r = await axios.get('https://api.popcat.xyz/chatbot?msg='+text); await ctx.reply(r.data.response); } catch { ctx.reply('AI Error'); } } };`);
      pf.file('rpg.js', `module.exports = { command: ['daily'], handler: async (bot, ctx) => { const id = ctx.from.id.toString(); if(!global.db.rpg[id]) global.db.rpg[id] = { money: 0, lastDaily: 0 }; if(Date.now() - global.db.rpg[id].lastDaily < 86400000) return ctx.reply('Cooldown'); global.db.rpg[id].money += 1000; global.db.rpg[id].lastDaily = Date.now(); global.saveDB(); await ctx.reply('✅ Dapat 1000 coin'); } };`);
      pf.file('store.js', `module.exports = { command: ['store'], handler: async (bot, ctx) => { await ctx.reply('🛒 Toko Kosong'); } };`);
      pf.file('autoreply.js', `module.exports = { command: ['addreply'], handler: async (bot, ctx) => { const [k, ...v] = ctx.message.text.split(' ').slice(1).join(' ').split('|'); if(!k || v.length===0) return ctx.reply('Format: /addreply k|v'); global.db.autoreply[k] = v.join('|'); global.saveDB(); ctx.reply('Ditambah'); } };`);
      pf.file('broadcast.js', `module.exports = { command: ['bc'], handler: async (bot, ctx) => { await ctx.reply('Broadcast sent'); } };`);

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 2. CASE =================
    if(base === 'case'){
      const settingsCase = `module.exports = {
  botName: "${botName}",
  ownerNumber: "${ownerNumber}",
  ownerName: "${ownerName}",
  pairingNumber: "${pairingNumber}",
  prefix: ".",
  features: ${JSON.stringify(list)},
  menuType: "${menuType}",
  btnType: "${btnType}",
  thumbType: "${thumbType}"
};
`;
      const indexCase = `const settings = require('./settings.js');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const axios = require('axios');

global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();

const botName = settings.botName;
const owner = settings.ownerNumber;
const ownerName = settings.ownerName;
const pairingNumber = settings.pairingNumber;
const quotes = [
  'Jangan berhenti ketika lelah, berhentilah ketika selesai.',
  'Kesuksesan adalah hasil kerja keras dan doa.',
  'Hidup itu seperti sepeda, untuk seimbang harus bergerak.',
  'Orang yang berhenti belajar menjadi pemilik masa lalu.',
  'Jangan menyerah pada mimpimu, teruslah berjuang.',
  'Keberhasilan bukan milik orang pintar, tapi yang gigih.',
  'Setiap hari kesempatan baru untuk lebih baik.',
  'Kegagalan adalah awal kesuksesan yang lebih besar.',
  'Bermimpilah besar, bekerjalah keras, tetap rendah hati.',
  'Waktu tidak menunggu, manfaatkan sebaik mungkin.'
];

console.log('Starting CASE ' + botName + ' - ' + ownerName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){
    setTimeout(async()=>{
      try{
        const code = await sock.requestPairingCode(pairingNumber);
        console.log('Pairing Code ' + botName + ': ' + code);
      }catch(e){ console.log('Pairing Error:', e.message); }
    }, 3000);
  }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected!');
    if(u.connection === 'close'){
      const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(r) setTimeout(()=>startBot(), 3000);
    }
  });
  
  sock.ev.on('group-participants.update', async (update) => {
    if(!global.db.welcome.includes(update.id)) return;
    if(update.action === 'add'){
      for(const p of update.participants){
        const num = p.split('@')[0];
        const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});
        let t = '╭━━━〔 WELCOME 〕━━━✦\\n';
        t += '┃ 👋 Selamat datang!\\n';
        t += '┃ 📱 Nomor: +' + num + '\\n';
        t += '┃ 📅 Bergabung: ' + tgl + '\\n';
        t += '┣━━━━━━━━━━━━━━\\n';
        t += '┃ 🎉 Jangan lupa baca rules!\\n';
        t += '┃ ✨ Semoga betah di grup\\n';
        t += '╰━━━〔 ' + botName + ' 〕━━━';
        await sock.sendMessage(update.id, { text: t, mentions: [p] });
      }
    }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0];
    if(!msg || msg.key.fromMe || !msg.message) return;
    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    if(body && global.db.autoreply[body.toLowerCase()]){
      await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg });
      return;
    }
    
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){
      try{
        await sock.sendMessage(remoteJid, { delete: msg.key });
        let t = '╭━━━〔 ANTILINK 〕━━━✦\\n┃ 🚫 Link terdeteksi!\\n┃ 👤 User: +' + sender.split('@')[0] + '\\n┃ ⚠️ Pesan telah dihapus\\n╰━━━〔 ' + botName + ' 〕━━━';
        const sent = await sock.sendMessage(remoteJid, { text: t, mentions: [sender] });
        setTimeout(async () => { try{ await sock.sendMessage(remoteJid, { delete: sent.key }); }catch{} }, 5000);
      }catch{}
      return;
    }
    
    if(!body.startsWith('.')) return;
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(' ');
    const isGroup = remoteJid.endsWith('@g.us');
    
    switch(command){
      case 'menu': {
        let menuTxt = '';
        if (settings.menuType === 'simple') {
          menuTxt = 'MENU ' + botName + '\\n\\n' + settings.features.map(f => '❒ .' + f).join('\\n') + '\\n\\nOwner: ' + ownerName;
        } else if (settings.menuType === 'image') {
          menuTxt = '╭━━━〔 ' + botName + ' 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━\\nOwner: ' + ownerName;
        } else {
          menuTxt = '╭━━━〔 ' + botName + ' 〕━━━✦\\n┃ 👤 Owner: ' + ownerName + '\\n┃ 📱 Nomor: ' + owner + '\\n┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━━━━━━━━━━━━';
        }

        if (settings.btnType === 'btn') {
          let btnMsg = {
            text: menuTxt,
            footer: 'Powered by CiKiZz',
            buttons: [
              { buttonId: '.menu', buttonText: { displayText: 'Refresh Menu' }, type: 1 },
              { buttonId: '.owner', buttonText: { displayText: 'Owner' }, type: 1 }
            ],
            headerType: 1
          };
          
          if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) {
            btnMsg.image = fs.readFileSync('./thumbnail.jpg');
          } else if (settings.menuType === 'image') {
            btnMsg.image = { url: 'https://picsum.photos/seed/' + encodeURIComponent(botName) + '/400/220' };
          }
          
          try {
            await sock.sendMessage(remoteJid, btnMsg, { quoted: msg });
          } catch (e) {
             await sock.sendMessage(remoteJid, { text: menuTxt }, { quoted: msg });
          }
        } else {
          if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) {
            await sock.sendMessage(remoteJid, { image: fs.readFileSync('./thumbnail.jpg'), caption: menuTxt }, { quoted: msg });
          } else if (settings.menuType === 'image') {
            await sock.sendMessage(remoteJid, { image: { url: 'https://picsum.photos/seed/' + encodeURIComponent(botName) + '/400/220' }, caption: menuTxt }, { quoted: msg });
          } else {
            await sock.sendMessage(remoteJid, { text: menuTxt }, { quoted: msg });
          }
        }
        break;
      }
      case 'ping': { await sock.sendMessage(remoteJid, { text: '🏓 Pong!' }, { quoted: msg }); break; }
      case 'owner': { await sock.sendMessage(remoteJid, { text: '👑 Owner: ' + ownerName + '\\n📱 wa.me/' + owner }, { quoted: msg }); break; }
      case 'info': { await sock.sendMessage(remoteJid, { text: '🤖 Info Bot ' + botName }, { quoted: msg }); break; }
      case 'runtime': { await sock.sendMessage(remoteJid, { text: '⏱️ Uptime: ' + Math.floor((Date.now()-global.startTime)/1000) + 's' }, { quoted: msg }); break; }
      case 'totfitur': { await sock.sendMessage(remoteJid, { text: '🧩 Total: ' + settings.features.length }, { quoted: msg }); break; }
      case 'speed': { await sock.sendMessage(remoteJid, { text: '⚡ Speed OK' }, { quoted: msg }); break; }
      case 'donasi': { await sock.sendMessage(remoteJid, { text: '☕ Donasi Dana: 08xxx' }, { quoted: msg }); break; }
      case 'say': { if(!text) return; await sock.sendMessage(remoteJid, { text: text }, { quoted: msg }); break; }
      case 'quote': { const q = quotes[Math.floor(Math.random() * quotes.length)]; await sock.sendMessage(remoteJid, { text: '💭 "' + q + '"' }, { quoted: msg }); break; }
      case 'welcome': {
        if(text === 'on'){ if(!global.db.welcome.includes(remoteJid)) global.db.welcome.push(remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: '✅ Welcome ON' }, { quoted: msg }); }
        else if(text === 'off'){ global.db.welcome = global.db.welcome.filter(v=>v!==remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: '❌ Welcome OFF' }, { quoted: msg }); }
        else { await sock.sendMessage(remoteJid, { text: 'Format: .welcome on / off' }, { quoted: msg }); }
        break;
      }
      case 'antilink': {
        if(text === 'on'){ if(!global.db.antilink.includes(remoteJid)) global.db.antilink.push(remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: '✅ Antilink ON' }, { quoted: msg }); }
        else if(text === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: '❌ Antilink OFF' }, { quoted: msg }); }
        else { await sock.sendMessage(remoteJid, { text: 'Format: .antilink on / off' }, { quoted: msg }); }
        break;
      }
      case 'hidetag': {
        const meta = await sock.groupMetadata(remoteJid);
        const mentions = meta.participants.map(p=>p.id);
        await sock.sendMessage(remoteJid, { text: text || '📢 Halo!', mentions });
        break;
      }
      case 's': case 'sticker': {
        const type = Object.keys(msg.message)[0];
        let imgMsg = null;
        if(type === 'imageMessage') imgMsg = msg;
        else if(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage){
          imgMsg = { message: { imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage }, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } };
        }
        if(!imgMsg) return;
        try{
          const b = await downloadMediaMessage(imgMsg, 'buffer', {});
          await sock.sendMessage(remoteJid, { sticker: b }, { quoted: msg });
        }catch{}
        break;
      }
      case 'tiktok': {
        if(!args[0]) return;
        try{
          const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(args[0]));
          if(r.data?.data?.play) await sock.sendMessage(remoteJid, { video: { url: r.data.data.play } }, { quoted: msg });
        }catch{}
        break;
      }
      case 'ai': {
        if(!text) return;
        const sent = await sock.sendMessage(remoteJid, { text: '🤖 Berpikir...' }, { quoted: msg });
        try{
          const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text));
          await sock.sendMessage(remoteJid, { text: '🤖 ' + r.data.response }, { quoted: msg });
        }catch{}
        break;
      }
      case 'daily': {
        if(!global.db.rpg[sender]) global.db.rpg[sender] = { money: 0, lastDaily: 0 };
        if(Date.now() - global.db.rpg[sender].lastDaily < 86400000) return sock.sendMessage(remoteJid, { text: '⏳ Cooldown' }, { quoted: msg });
        global.db.rpg[sender].money += 1000; global.db.rpg[sender].lastDaily = Date.now(); global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ +1000 Coin' }, { quoted: msg });
        break;
      }
      case 'addproduk': {
        if(!text) return;
        global.db.produk.push({ nama: text }); global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ Produk ditambah' }, { quoted: msg });
        break;
      }
      case 'store': {
        let t = '🛒 Store:\\n' + global.db.produk.map((p,i)=> (i+1)+'. '+p.nama).join('\\n');
        await sock.sendMessage(remoteJid, { text: t || 'Kosong' }, { quoted: msg });
        break;
      }
      case 'addreply': {
        const [k, ...v] = text.split('|');
        if(!k || v.length===0) return;
        global.db.autoreply[k.trim().toLowerCase()] = v.join('|').trim(); global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ Autoreply ditambah' }, { quoted: msg });
        break;
      }
      case 'bc': {
        if(!text) return;
        const groups = await sock.groupFetchAllParticipating();
        for(const id of Object.keys(groups)){ try{ await sock.sendMessage(id, { text: text }); }catch{} }
        await sock.sendMessage(remoteJid, { text: '✅ Broadcast terkirim' }, { quoted: msg });
        break;
      }
      default: {
        await sock.sendMessage(remoteJid, { text: '❓ Command tidak ada' }, { quoted: msg });
        break;
      }
    }
  });
}
startBot();
`;

      zip.file('settings.js', settingsCase);
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", description: botName + " CASE",
        type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" },
        dependencies: { "@whiskeysockets/baileys": "^6.7.8", pino: "^9.3.2", axios: "^1.7.2" }
      }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexCase);

      const pf = zip.folder('plugins');
      list.forEach(f=>{ pf.file(f+'.js', `// Mode CASE: logika ada di index.js\nmodule.exports = {};\n`); });

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 3. ESM =================
    const settingsESM = `export default {
  botName: "${botName}",
  ownerNumber: "${ownerNumber}",
  ownerName: "${ownerName}",
  pairingNumber: "${pairingNumber}",
  prefix: ".",
  features: ${JSON.stringify(list)},
  menuType: "${menuType}",
  btnType: "${btnType}",
  thumbType: "${thumbType}"
};
`;
    const indexESM = `import settings from './settings.js';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const botName = settings.botName;
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();

console.log('Starting ESM ' + botName + ' - ' + settings.ownerName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){
    setTimeout(async()=>{
      try{
        const code = await sock.requestPairingCode(settings.pairingNumber);
        console.log('Pairing Code ' + botName + ': ' + code);
      }catch(e){ console.log('Pairing Error:', e.message); }
    }, 3000);
  }
  
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const plugins = [];
  if(fs.existsSync(pluginsDir)){
    const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
    for(const file of files){
      const mod = await import(pathToFileURL(path.join(pluginsDir, file)).href);
      if(mod.default) plugins.push(mod.default);
    }
  }
  console.log('Loaded ' + plugins.length + ' plugins');
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected!');
    if(u.connection === 'close'){
      const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(r) setTimeout(()=>startBot(), 3000);
    }
  });
  
  sock.ev.on('group-participants.update', async (update) => {
    for(const p of plugins){
      if(p.onParticipantsUpdate) await p.onParticipantsUpdate(sock, update);
    }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0];
    if(!msg || msg.key.fromMe || !msg.message) return;
    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    if(body && global.db.autoreply[body.toLowerCase()]){
      await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg });
      return;
    }
    
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){
      try{
        await sock.sendMessage(remoteJid, { delete: msg.key });
        let t = '╭━━━〔 ANTILINK 〕━━━✦\\n┃ 🚫 Link terdeteksi!\\n┃ 👤 User: +' + sender.split('@')[0] + '\\n┃ ⚠️ Pesan telah dihapus\\n╰━━━〔 ' + botName + ' 〕━━━';
        const sent = await sock.sendMessage(remoteJid, { text: t, mentions: [sender] });
        setTimeout(async () => { try{ await sock.sendMessage(remoteJid, { delete: sent.key }); }catch{} }, 5000);
      }catch{}
      return;
    }
    
    if(!body.startsWith('.')) return;
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(' ');
    
    for(const p of plugins){
      if(p.command && p.command.includes(command)){
        try{
          await p.handler(sock, msg, { remoteJid, sender, command, args, text, settings, isGroup: remoteJid.endsWith('@g.us') });
        }catch(e){ console.error('Error ' + command + ':', e.message); }
      }
    }
  });
}
startBot();
`;

    zip.file('settings.js', settingsESM);
    zip.file('package.json', JSON.stringify({
      name: safe, version: "1.0.0", description: botName + " ESM",
      type: "module", main: "index.js",
      scripts: { start: "node index.js" },
      dependencies: { "@whiskeysockets/baileys": "^6.7.8", pino: "^9.3.2", axios: "^1.7.2" }
    }, null, 2));
    zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
    zip.file('index.js', indexESM);

    const pf = zip.folder('plugins');

    // ESM MENU DENGAN SUPPORT BUTTON & THUMB
    pf.file('menu.js', `import settings from '../settings.js';
import fs from 'fs';
export default {
  command: ['menu','help','start'],
  handler: async (sock, msg, o) => {
    let menuTxt = '';
    if (settings.menuType === 'simple') {
      menuTxt = 'MENU ' + settings.botName + '\\n\\n' + settings.features.map(f => '❒ .' + f).join('\\n') + '\\n\\nOwner: ' + settings.ownerName;
    } else if (settings.menuType === 'image') {
      menuTxt = '╭━━━〔 ' + settings.botName + ' 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━\\nOwner: ' + settings.ownerName;
    } else {
      menuTxt = '╭━━━〔 ' + settings.botName + ' 〕━━━✦\\n┃ Owner: ' + settings.ownerName + '\\n┃ Nomor: ' + settings.ownerNumber + '\\n┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━━━━━━━━━━━━';
    }

    if (settings.btnType === 'btn') {
      let btnMsg = {
        text: menuTxt,
        footer: 'Powered by CiKiZz',
        buttons: [
          { buttonId: '.menu', buttonText: { displayText: 'Refresh Menu' }, type: 1 },
          { buttonId: '.owner', buttonText: { displayText: 'Owner' }, type: 1 }
        ],
        headerType: 1
      };
      
      if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) {
        btnMsg.image = fs.readFileSync('./thumbnail.jpg');
      } else if (settings.menuType === 'image') {
        btnMsg.image = { url: 'https://picsum.photos/seed/' + encodeURIComponent(settings.botName) + '/400/220' };
      }
      
      try {
        await sock.sendMessage(o.remoteJid, btnMsg, { quoted: msg });
      } catch (e) {
         await sock.sendMessage(o.remoteJid, { text: menuTxt }, { quoted: msg });
      }
    } else {
      if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) {
        await sock.sendMessage(o.remoteJid, { image: fs.readFileSync('./thumbnail.jpg'), caption: menuTxt }, { quoted: msg });
      } else if (settings.menuType === 'image') {
        await sock.sendMessage(o.remoteJid, { image: { url: 'https://picsum.photos/seed/' + encodeURIComponent(settings.botName) + '/400/220' }, caption: menuTxt }, { quoted: msg });
      } else {
        await sock.sendMessage(o.remoteJid, { text: menuTxt }, { quoted: msg });
      }
    }
  }
};`);

    pf.file('ping.js', `export default { command: ['ping'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🏓 Pong!' }, { quoted: msg }); } };`);
    pf.file('owner.js', `import settings from '../settings.js'; export default { command: ['owner'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '👑 Owner: ' + settings.ownerName + '\\n📱 wa.me/' + settings.ownerNumber }, { quoted: msg }); } };`);
    pf.file('info.js', `import settings from '../settings.js'; export default { command: ['info'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🤖 ' + settings.botName }, { quoted: msg }); } };`);
    pf.file('runtime.js', `export default { command: ['runtime'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '⏱️ Uptime: ' + Math.floor((Date.now()-global.startTime)/1000) + 's' }, { quoted: msg }); } };`);
    pf.file('totfitur.js', `import settings from '../settings.js'; export default { command: ['totfitur'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🧩 ' + settings.features.length }, { quoted: msg }); } };`);
    pf.file('speed.js', `export default { command: ['speed'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '⚡ Speed OK' }, { quoted: msg }); } };`);
    pf.file('donasi.js', `export default { command: ['donasi'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '☕ Donasi Dana: 08xxx' }, { quoted: msg }); } };`);
    pf.file('say.js', `export default { command: ['say'], handler: async (sock, msg, o) => { if(o.text) await sock.sendMessage(o.remoteJid, { text: o.text }, { quoted: msg }); } };`);
    pf.file('quote.js', `export default { command: ['quote'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '💭 "Teruslah berjuang."' }, { quoted: msg }); } };`);
    
    pf.file('welcome.js', `import settings from '../settings.js';
export default {
  command: ['welcome'],
  handler: async (sock, msg, o) => {
    if(o.text === 'on'){ if(!global.db.welcome.includes(o.remoteJid)) global.db.welcome.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Welcome ON' }, { quoted: msg }); }
    else if(o.text === 'off'){ global.db.welcome = global.db.welcome.filter(v=>v!==o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '❌ Welcome OFF' }, { quoted: msg }); }
    else { await sock.sendMessage(o.remoteJid, { text: 'Format: .welcome on / off' }, { quoted: msg }); }
  },
  onParticipantsUpdate: async (sock, update) => {
    if(!global.db.welcome.includes(update.id)) return;
    if(update.action === 'add'){
      for(const p of update.participants){
        let t = '╭━━━〔 WELCOME 〕━━━✦\\n┃ 👋 Selamat datang +' + p.split('@')[0] + '\\n╰━━━〔 ' + settings.botName + ' 〕━━━';
        await sock.sendMessage(update.id, { text: t, mentions: [p] });
      }
    }
  }
};`);

    pf.file('antilink.js', `export default {
  command: ['antilink'],
  handler: async (sock, msg, o) => {
    if(o.text === 'on'){ if(!global.db.antilink.includes(o.remoteJid)) global.db.antilink.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Antilink ON' }, { quoted: msg }); }
    else if(o.text === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '❌ Antilink OFF' }, { quoted: msg }); }
    else { await sock.sendMessage(o.remoteJid, { text: 'Format: .antilink on / off' }, { quoted: msg }); }
  }
};`);

    pf.file('hidetag.js', `export default { command: ['hidetag'], handler: async (sock, msg, o) => { const meta = await sock.groupMetadata(o.remoteJid); const mentions = meta.participants.map(p=>p.id); await sock.sendMessage(o.remoteJid, { text: o.text || '📢 Halo!', mentions }); } };`);
    pf.file('sticker.js', `import { downloadMediaMessage } from '@whiskeysockets/baileys'; export default { command: ['s','sticker'], handler: async (sock, msg, o) => { if(!msg.message.imageMessage) return; try{ const b = await downloadMediaMessage(msg, 'buffer', {}); await sock.sendMessage(o.remoteJid, { sticker: b }, { quoted: msg }); }catch{} } };`);
    pf.file('downloader.js', `import axios from 'axios'; export default { command: ['tiktok'], handler: async (sock, msg, o) => { if(!o.args[0]) return; try{ const r = await axios.get('https://tikwm.com/api/?url='+o.args[0]); await sock.sendMessage(o.remoteJid, { video: { url: r.data.data.play } }, { quoted: msg }); }catch{} } };`);
    pf.file('ai.js', `import axios from 'axios'; export default { command: ['ai'], handler: async (sock, msg, o) => { if(!o.text) return; try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg='+encodeURIComponent(o.text)); await sock.sendMessage(o.remoteJid, { text: '🤖 ' + r.data.response }, { quoted: msg }); }catch{} } };`);
    pf.file('rpg.js', `export default { command: ['daily'], handler: async (sock, msg, o) => { if(!global.db.rpg[o.sender]) global.db.rpg[o.sender] = { money: 0, lastDaily: 0 }; if(Date.now()-global.db.rpg[o.sender].lastDaily < 86400000) return; global.db.rpg[o.sender].money += 1000; global.db.rpg[o.sender].lastDaily = Date.now(); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ +1000 Coin' }, { quoted: msg }); } };`);
    pf.file('store.js', `export default { command: ['store'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🛒 Store Kosong' }, { quoted: msg }); } };`);
    pf.file('autoreply.js', `export default { command: ['addreply'], handler: async (sock, msg, o) => { const [k, ...v] = o.text.split('|'); if(!k || v.length===0) return; global.db.autoreply[k] = v.join('|'); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Ditambah' }, { quoted: msg }); } };`);
    pf.file('broadcast.js', `export default { command: ['bc'], handler: async (sock, msg, o) => { if(!o.text) return; const groups = await sock.groupFetchAllParticipating(); for(const id of Object.keys(groups)){ try{ await sock.sendMessage(id, { text: o.text }); }catch{} } await sock.sendMessage(o.remoteJid, { text: '✅ Broadcast sent' }, { quoted: msg }); } };`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
    return res.send(buffer);

  } catch (e) {
    console.error('Generate Error:', e);
    return res.status(500).json({ error: e.message });
  }
}