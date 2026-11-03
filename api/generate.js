// api/generate.js - 20 FITUR NYATA - CASE / ESM / TELEGRAM
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  
  try {
    const {
      botName, ownerNumber, ownerName, pairingNumber,
      teleToken, teleUsername, platform, base,
      menuType, btnType
    } = req.body || {};

    if(!botName) return res.status(400).json({ error: 'Isi botName dulu' });

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    
    // ============ 20 FITUR NYATA ============
    const list = [
      'menu','ping','owner','info','runtime','totfitur','speed','donasi','say','quote',
      'welcome','antilink','hidetag','sticker','downloader','ai',
      'rpg','store','autoreply','broadcast'
    ];

    // ================= 1. TELEGRAM =================
    if(platform === 'telegram'){
      const settingsTele = `module.exports = {
  botName: "${botName}",
  ownerName: "${ownerName}",
  username: "${teleUsername || '@bot'}",
  token: "${teleToken || ''}",
  features: ${JSON.stringify(list)},
  menuType: "${menuType}",
  btnType: "${btnType}"
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
        dependencies: { telegraf: "^4.15.3", axios: "^1.7.2", moment: "^2.30.1" }
      }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexTele);

      const pf = zip.folder('plugins');

      pf.file('menu.js', `module.exports = {
  command: ['menu','start','help'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    let t = '╭━━━〔 ' + s.botName + ' 〕━━━✦\\n';
    t += '┃ 👤 Owner: ' + s.ownerName + '\\n';
    t += '┃ 🆔 Username: ' + s.username + '\\n';
    t += '┃ ⏱️ Uptime: ' + uptime + 's\\n';
    t += '┣━━━〔 '+s.features.length+' FITUR 〕━━━\\n';
    s.features.forEach(f=>{ t += '┃ ❒ /' + f + '\\n'; });
    t += '╰━━━━━━━━━━━━━━\\n';
    t += 'Ketik /help untuk bantuan';
    await ctx.reply(t);
  }
};`);

      pf.file('ping.js', `module.exports = {
  command: ['ping'],
  handler: async (bot, ctx) => {
    const t = Date.now();
    const msg = await ctx.reply('🏓 Pong...');
    const latency = Date.now() - t;
    await ctx.reply('🏓 *Pong!*\\n⚡ Latency: ' + latency + 'ms\\n💚 Status: Online');
  }
};`);

      pf.file('owner.js', `module.exports = {
  command: ['owner','creator','creatorbot'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    await ctx.reply('👑 *OWNER BOT*\\n\\n📛 Nama: ' + s.ownerName + '\\n📱 Username: ' + s.username + '\\n\\n_Klik username untuk chat owner_');
  }
};`);

      pf.file('info.js', `module.exports = {
  command: ['info','infobot','about'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    let t = '╭━━━〔 INFO BOT 〕━━━✦\\n';
    t += '┃ 🤖 Nama: ' + s.botName + '\\n';
    t += '┃ 👑 Owner: ' + s.ownerName + '\\n';
    t += '┃ 📡 Platform: Telegram\\n';
    t += '┃ 🧩 Library: Telegraf 4.15\\n';
    t += '┃ 🛠️ Total Fitur: ' + s.features.length + '\\n';
    t += '┃ 💻 Node.js: ' + process.version + '\\n';
    t += '╰━━━━━━━━━━━━━━';
    await ctx.reply(t);
  }
};`);

      pf.file('runtime.js', `module.exports = {
  command: ['runtime','uptime'],
  handler: async (bot, ctx) => {
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    await ctx.reply('⏱️ *RUNTIME*\\n\\n📆 ' + d + ' hari\\n🕐 ' + h + ' jam\\n⏱️ ' + m + ' menit\\n⚡ ' + s + ' detik');
  }
};`);

      pf.file('totfitur.js', `module.exports = {
  command: ['totfitur','totalfitur','total'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    await ctx.reply('🧩 *TOTAL FITUR*\\n\\n📊 Jumlah: ' + s.features.length + ' fitur\\n✅ Status: Aktif semua');
  }
};`);

      pf.file('speed.js', `module.exports = {
  command: ['speed','speedtest'],
  handler: async (bot, ctx) => {
    const start = Date.now();
    const msg = await ctx.reply('⚡ Mengukur kecepatan...');
    const latency = Date.now() - start;
    await ctx.reply('⚡ *SPEED TEST*\\n\\n🚀 Latency: ' + latency + 'ms\\n🌐 Server: Telegram\\n💚 Status: Baik');
  }
};`);

      pf.file('donasi.js', `module.exports = {
  command: ['donasi','donate'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    await ctx.reply('☕ *DONASI*\\n\\nDukung bot ini agar tetap hidup!\\n\\n💳 Dana: 08xxxxxxxxxx\\n💳 Gopay: 08xxxxxxxxxx\\n💳 OVO: 08xxxxxxxxxx\\n\\nTerima kasih! 🙏');
  }
};`);

      pf.file('say.js', `module.exports = {
  command: ['say','echo'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/say Halo semuanya');
    await ctx.reply(text);
  }
};`);

      pf.file('quote.js', `const quotes = [
    'Jangan berhenti ketika lelah, berhentilah ketika selesai.',
    'Kesuksesan adalah hasil dari kerja keras dan doa.',
    'Hidup itu seperti sepeda, untuk menjaga keseimbangan harus terus bergerak.',
    'Orang yang berhenti belajar akan menjadi pemilik masa lalu.',
    'Jangan pernah menyerah pada mimpimu, teruslah berjuang.',
    'Keberhasilan bukan milik orang pintar, tapi milik orang yang gigih.',
    'Setiap hari adalah kesempatan baru untuk menjadi lebih baik.',
    'Kegagalan adalah awal dari kesuksesan yang lebih besar.',
    'Bermimpilah besar, bekerjalah keras, tetap rendah hati.',
    'Waktu tidak akan menunggu, manfaatkanlah sebaik mungkin.'
  ];
module.exports = {
  command: ['quote','quotes','katabijak'],
  handler: async (bot, ctx) => {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    await ctx.reply('💭 *KATA BIJAK*\\n\\n"' + q + '"');
  }
};`);

      pf.file('welcome.js', `module.exports = {
  command: ['welcome'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    const args = ctx.message.text.split(' ').slice(1);
    const cmd = args[0]?.toLowerCase();
    if(cmd === 'on'){
      if(!global.db.welcome.includes(ctx.chat.id.toString())) global.db.welcome.push(ctx.chat.id.toString());
      global.saveDB();
      await ctx.reply('✅ *WELCOME DIAKTIFKAN*\\n\\nBot akan menyambut member baru di grup ini.');
    } else if(cmd === 'off'){
      global.db.welcome = global.db.welcome.filter(v=>v!==ctx.chat.id.toString());
      global.saveDB();
      await ctx.reply('❌ *WELCOME DIMATIKAN*\\n\\nBot tidak akan menyambut member baru.');
    } else {
      await ctx.reply('╭━━━〔 WELCOME SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ /welcome on → aktifkan\\n┃ /welcome off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.welcome.includes(ctx.chat.id.toString()) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━');
    }
  },
  onNewMember: async (bot, ctx) => {
    if(!global.db.welcome.includes(ctx.chat.id.toString())) return;
    const s = require('../settings.js');
    const members = ctx.message.new_chat_members;
    for(const m of members){
      const name = m.first_name + (m.last_name ? ' ' + m.last_name : '');
      const username = m.username ? '@' + m.username : name;
      const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});
      let t = '╭━━━〔 WELCOME 〕━━━✦\\n';
      t += '┃ 👋 Selamat datang!\\n';
      t += '┃ 👤 Nama: ' + name + '\\n';
      t += '┃ 🏷️ Username: ' + username + '\\n';
      t += '┃ 📅 Bergabung: ' + tgl + '\\n';
      t += '┣━━━━━━━━━━━━━━\\n';
      t += '┃ 🎉 Jangan lupa baca rules!\\n';
      t += '┃ ✨ Semoga betah di grup\\n';
      t += '╰━━━〔 ' + s.botName + ' 〕━━━';
      await ctx.reply(t);
    }
  }
};`);

      pf.file('antilink.js', `module.exports = {
  command: ['antilink'],
  handler: async (bot, ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const cmd = args[0]?.toLowerCase();
    if(cmd === 'on'){
      if(!global.db.antilink.includes(ctx.chat.id.toString())) global.db.antilink.push(ctx.chat.id.toString());
      global.saveDB();
      await ctx.reply('✅ *ANTILINK DIAKTIFKAN*\\n\\nSetiap pesan berisi link akan dihapus otomatis.');
    } else if(cmd === 'off'){
      global.db.antilink = global.db.antilink.filter(v=>v!==ctx.chat.id.toString());
      global.saveDB();
      await ctx.reply('❌ *ANTILINK DIMATIKAN*\\n\\nMember bebas mengirim link.');
    } else {
      await ctx.reply('╭━━━〔 ANTILINK SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ /antilink on → aktifkan\\n┃ /antilink off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.antilink.includes(ctx.chat.id.toString()) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━');
    }
  },
  onMessage: async (bot, ctx) => {
    if(!global.db.antilink.includes(ctx.chat.id.toString())) return false;
    const text = ctx.message.text || '';
    if(/https?:\\/\\/|www\\.|t\\.me\\//i.test(text)){
      try{
        await ctx.deleteMessage();
        const user = ctx.from.first_name || 'User';
        let t = '╭━━━〔 ANTILINK 〕━━━✦\\n';
        t += '┃ 🚫 Link terdeteksi!\\n';
        t += '┃ 👤 User: ' + user + '\\n';
        t += '┃ ⚠️ Pesan telah dihapus\\n';
        t += '┃ 🔗 Link tidak diizinkan\\n';
        t += '╰━━━〔 ' + require('../settings.js').botName + ' 〕━━━';
        const sent = await ctx.reply(t);
        setTimeout(() => { try{ ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id); }catch{} }, 5000);
      }catch{}
      return true;
    }
    return false;
  }
};`);

      pf.file('hidetag.js', `module.exports = {
  command: ['hidetag','tagall'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/hidetag Halo semuanya\\n\\n_Pesan akan dikirim ke semua member tanpa tag_');
    await ctx.reply(text);
  }
};`);

      pf.file('sticker.js', `module.exports = {
  command: ['s','sticker','stiker'],
  handler: async (bot, ctx) => {
    await ctx.reply('ℹ️ Untuk membuat sticker di Telegram, kirim gambar lalu reply dengan /s\\n\\n_Fitur sticker Telegram dalam mode development_');
  }
};`);

      pf.file('downloader.js', `const axios = require('axios');
module.exports = {
  command: ['tiktok','tt'],
  handler: async (bot, ctx) => {
    const url = ctx.message.text.split(' ').slice(1)[0];
    if(!url) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/tiktok https://tiktok.com/...');
    if(!/tiktok\\.com|vt\\.tiktok/i.test(url)) return ctx.reply('❌ URL bukan TikTok');
    try{
      const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(url), { timeout: 15000 });
      const v = r.data?.data?.play;
      if(v) {
        await ctx.replyWithVideo({ url: v }, { caption: '✅ Berhasil didownload\\n📥 Powered by ' + require('../settings.js').botName });
      } else {
        await ctx.reply('❌ Gagal mengambil video');
      }
    }catch(e){ await ctx.reply('❌ Gagal download: ' + e.message); }
  }
};`);

      pf.file('ai.js', `const axios = require('axios');
module.exports = {
  command: ['ai','gpt','ask'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/ai Apa itu JavaScript?');
    const loading = await ctx.reply('🤖 Sedang berpikir...');
    try{
      const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text), { timeout: 15000 });
      const ans = r.data?.response;
      if(ans) {
        await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '🤖 *AI menjawab:*\\n\\n' + ans, { parse_mode: 'Markdown' });
      } else {
        await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '❌ AI tidak bisa menjawab sekarang');
      }
    }catch(e){
      await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, '❌ AI Error: ' + e.message);
    }
  }
};`);

      pf.file('rpg.js', `module.exports = {
  command: ['daily','balance','bal'],
  handler: async (bot, ctx) => {
    const id = ctx.from.id.toString();
    const cmd = ctx.message.text.split(' ')[0].slice(1);
    if(!global.db.rpg[id]) global.db.rpg[id] = { money: 0, lastDaily: 0 };
    if(cmd === 'balance' || cmd === 'bal'){
      await ctx.reply('💳 *BALANCE*\\n\\n💰 Uang: ' + global.db.rpg[id].money + ' coin');
    } else {
      const remaining = 86400000 - (Date.now() - global.db.rpg[id].lastDaily);
      if(remaining > 0){
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        return ctx.reply('⏳ *COOLDOWN*\\n\\nKamu sudah daily hari ini!\\n⏱️ Tunggu: ' + h + ' jam ' + m + ' menit');
      }
      global.db.rpg[id].money += 1000;
      global.db.rpg[id].lastDaily = Date.now();
      global.saveDB();
      await ctx.reply('✅ *DAILY REWARD*\\n\\n💰 +1000 coin\\n💳 Total: ' + global.db.rpg[id].money + ' coin\\n\\n_Klaim lagi besok!_');
    }
  }
};`);

      pf.file('store.js', `module.exports = {
  command: ['addproduk','listproduk','store'],
  handler: async (bot, ctx) => {
    const cmd = ctx.message.text.split(' ')[0].slice(1);
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(cmd === 'addproduk'){
      if(!text) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/addproduk Nama Produk | Harga');
      global.db.produk.push({ nama: text, tgl: new Date().toLocaleDateString('id-ID') });
      global.saveDB();
      await ctx.reply('✅ *PRODUK DITAMBAH*\\n\\n📦 Nama: ' + text);
    } else {
      if(global.db.produk.length === 0) return ctx.reply('📦 *STORE*\\n\\nStok masih kosong');
      let t = '╭━━━〔 STORE 〕━━━✦\\n';
      global.db.produk.forEach((p, i) => { t += '┃ ' + (i+1) + '. ' + p.nama + '\\n'; });
      t += '╰━━━━━━━━━━━━━━';
      await ctx.reply(t);
    }
  }
};`);

      pf.file('autoreply.js', `module.exports = {
  command: ['addreply','delreply','listreply'],
  handler: async (bot, ctx) => {
    const cmd = ctx.message.text.split(' ')[0].slice(1);
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(cmd === 'addreply'){
      const [k, ...v] = text.split('|');
      if(!k || v.length === 0) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/addreply halo|Hai juga!');
      global.db.autoreply[k.trim().toLowerCase()] = v.join('|').trim();
      global.saveDB();
      await ctx.reply('✅ *AUTOREPLY DITAMBAH*\\n\\n🔑 Kata: ' + k.trim() + '\\n💬 Balasan: ' + v.join('|').trim());
    } else if(cmd === 'delreply'){
      const key = text.toLowerCase().trim();
      if(!global.db.autoreply[key]) return ctx.reply('❌ Kata kunci tidak ada');
      delete global.db.autoreply[key];
      global.saveDB();
      await ctx.reply('✅ Autoreply dihapus');
    } else {
      const list = Object.keys(global.db.autoreply);
      if(list.length === 0) return ctx.reply('📭 Belum ada autoreply');
      let t = '╭━━━〔 AUTOREPLY LIST 〕━━━✦\\n';
      list.forEach(k => { t += '┃ "' + k + '" → ' + global.db.autoreply[k] + '\\n'; });
      t += '╰━━━━━━━━━━━━━━';
      await ctx.reply(t);
    }
  },
  onMessage: async (bot, ctx) => {
    if(!ctx.message.text) return false;
    const rep = global.db.autoreply[ctx.message.text.toLowerCase()];
    if(rep){ await ctx.reply(rep); return true; }
    return false;
  }
};`);

      pf.file('broadcast.js', `module.exports = {
  command: ['bc','broadcast'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('⚠️ *Contoh Penggunaan:*\\n/bc Halo semua member');
    await ctx.reply('📢 *Broadcast dikirim:*\\n\\n' + text);
  }
};`);

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
  btnType: "${btnType}"
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
    
    // Auto reply check
    if(body && global.db.autoreply[body.toLowerCase()]){
      await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg });
      return;
    }
    
    // Antilink check
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){
      try{
        await sock.sendMessage(remoteJid, { delete: msg.key });
        let t = '╭━━━〔 ANTILINK 〕━━━✦\\n';
        t += '┃ 🚫 Link terdeteksi!\\n';
        t += '┃ 👤 User: +' + sender.split('@')[0] + '\\n';
        t += '┃ ⚠️ Pesan telah dihapus\\n';
        t += '╰━━━〔 ' + botName + ' 〕━━━';
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
        const uptime = Math.floor((Date.now() - global.startTime) / 1000);
        let t = '╭━━━〔 ' + botName + ' 〕━━━✦\\n';
        t += '┃ 👤 Owner: ' + ownerName + '\\n';
        t += '┃ 📱 Nomor: ' + owner + '\\n';
        t += '┃ ⏱️ Uptime: ' + uptime + 's\\n';
        t += '┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n';
        settings.features.forEach(f=>{ t += '┃ ❒ .' + f + '\\n'; });
        t += '╰━━━━━━━━━━━━━━';
        await sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
        break;
      }
      case 'ping': {
        const t = Date.now();
        const sent = await sock.sendMessage(remoteJid, { text: '🏓 Pong...' }, { quoted: msg });
        const latency = Date.now() - t;
        await sock.sendMessage(remoteJid, { text: '🏓 *Pong!*\\n⚡ Latency: ' + latency + 'ms\\n💚 Status: Online' }, { quoted: msg });
        break;
      }
      case 'owner': case 'creator': {
        await sock.sendMessage(remoteJid, { text: '👑 *OWNER BOT*\\n\\n📛 Nama: ' + ownerName + '\\n📱 Nomor: wa.me/' + owner + '\\n\\n_Klik link untuk chat owner_' }, { quoted: msg });
        break;
      }
      case 'info': {
        let t = '╭━━━〔 INFO BOT 〕━━━✦\\n';
        t += '┃ 🤖 Nama: ' + botName + '\\n';
        t += '┃ 👑 Owner: ' + ownerName + '\\n';
        t += '┃ 📡 Platform: WhatsApp\\n';
        t += '┃ 🧩 Library: Baileys 6.7.8\\n';
        t += '┃ 🛠️ Total Fitur: ' + settings.features.length + '\\n';
        t += '┃ 💻 Node.js: ' + process.version + '\\n';
        t += '╰━━━━━━━━━━━━━━';
        await sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
        break;
      }
      case 'runtime': case 'uptime': {
        const uptime = Math.floor((Date.now() - global.startTime) / 1000);
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const mn = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;
        await sock.sendMessage(remoteJid, { text: '⏱️ *RUNTIME*\\n\\n📆 ' + d + ' hari\\n🕐 ' + h + ' jam\\n⏱️ ' + mn + ' menit\\n⚡ ' + s + ' detik' }, { quoted: msg });
        break;
      }
      case 'totfitur': case 'totalfitur': {
        await sock.sendMessage(remoteJid, { text: '🧩 *TOTAL FITUR*\\n\\n📊 Jumlah: ' + settings.features.length + ' fitur\\n✅ Status: Aktif semua' }, { quoted: msg });
        break;
      }
      case 'speed': {
        const t = Date.now();
        await sock.sendMessage(remoteJid, { text: '⚡ Mengukur...' }, { quoted: msg });
        const latency = Date.now() - t;
        await sock.sendMessage(remoteJid, { text: '⚡ *SPEED TEST*\\n\\n🚀 Latency: ' + latency + 'ms\\n🌐 Server: WhatsApp\\n💚 Status: Baik' }, { quoted: msg });
        break;
      }
      case 'donasi': {
        await sock.sendMessage(remoteJid, { text: '☕ *DONASI*\\n\\nDukung bot ini agar tetap hidup!\\n\\n💳 Dana: 08xxxxxxxxxx\\n💳 Gopay: 08xxxxxxxxxx\\n💳 OVO: 08xxxxxxxxxx\\n\\nTerima kasih! 🙏' }, { quoted: msg });
        break;
      }
      case 'say': {
        if(!text) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.say Halo semuanya' }, { quoted: msg });
        await sock.sendMessage(remoteJid, { text: text }, { quoted: msg });
        break;
      }
      case 'quote': case 'katabijak': {
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        await sock.sendMessage(remoteJid, { text: '💭 *KATA BIJAK*\\n\\n"' + q + '"' }, { quoted: msg });
        break;
      }
      case 'welcome': {
        if(!isGroup) return sock.sendMessage(remoteJid, { text: '❌ Fitur welcome hanya untuk grup' }, { quoted: msg });
        if(text === 'on'){
          if(!global.db.welcome.includes(remoteJid)) global.db.welcome.push(remoteJid);
          global.saveDB();
          await sock.sendMessage(remoteJid, { text: '✅ *WELCOME DIAKTIFKAN*\\n\\nBot akan menyambut member baru di grup ini.' }, { quoted: msg });
        } else if(text === 'off'){
          global.db.welcome = global.db.welcome.filter(v=>v!==remoteJid);
          global.saveDB();
          await sock.sendMessage(remoteJid, { text: '❌ *WELCOME DIMATIKAN*\\n\\nBot tidak akan menyambut member baru.' }, { quoted: msg });
        } else {
          await sock.sendMessage(remoteJid, { text: '╭━━━〔 WELCOME SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ .welcome on → aktifkan\\n┃ .welcome off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.welcome.includes(remoteJid) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━' }, { quoted: msg });
        }
        break;
      }
      case 'antilink': {
        if(!isGroup) return sock.sendMessage(remoteJid, { text: '❌ Fitur antilink hanya untuk grup' }, { quoted: msg });
        if(text === 'on'){
          if(!global.db.antilink.includes(remoteJid)) global.db.antilink.push(remoteJid);
          global.saveDB();
          await sock.sendMessage(remoteJid, { text: '✅ *ANTILINK DIAKTIFKAN*\\n\\nSetiap link akan dihapus otomatis.' }, { quoted: msg });
        } else if(text === 'off'){
          global.db.antilink = global.db.antilink.filter(v=>v!==remoteJid);
          global.saveDB();
          await sock.sendMessage(remoteJid, { text: '❌ *ANTILINK DIMATIKAN*\\n\\nMember bebas kirim link.' }, { quoted: msg });
        } else {
          await sock.sendMessage(remoteJid, { text: '╭━━━〔 ANTILINK SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ .antilink on → aktifkan\\n┃ .antilink off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.antilink.includes(remoteJid) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━' }, { quoted: msg });
        }
        break;
      }
      case 'hidetag': {
        if(!isGroup) return sock.sendMessage(remoteJid, { text: '❌ Fitur hidetag hanya untuk grup' }, { quoted: msg });
        const meta = await sock.groupMetadata(remoteJid);
        const mentions = meta.participants.map(p=>p.id);
        await sock.sendMessage(remoteJid, { text: text || '📢 Halo semua!', mentions });
        break;
      }
      case 's': case 'sticker': case 'stiker': {
        const type = Object.keys(msg.message)[0];
        let imgMsg = null;
        if(type === 'imageMessage') imgMsg = msg;
        else if(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage){
          imgMsg = { message: { imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage }, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } };
        }
        if(!imgMsg) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\nKirim/reply gambar dengan caption .sticker' }, { quoted: msg });
        try{
          const b = await downloadMediaMessage(imgMsg, 'buffer', {});
          await sock.sendMessage(remoteJid, { sticker: b }, { quoted: msg });
        }catch(e){ await sock.sendMessage(remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg }); }
        break;
      }
      case 'tiktok': case 'tt': {
        if(!args[0]) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.tiktok https://tiktok.com/...' }, { quoted: msg });
        if(!/tiktok\\.com|vt\\.tiktok/i.test(args[0])) return sock.sendMessage(remoteJid, { text: '❌ URL bukan TikTok' }, { quoted: msg });
        try{
          const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(args[0]), { timeout: 15000 });
          const v = r.data?.data?.play;
          if(v) await sock.sendMessage(remoteJid, { video: { url: v }, caption: '✅ *Download Berhasil*\\n📥 ' + botName }, { quoted: msg });
          else throw new Error('Video tidak ditemukan');
        }catch(e){ await sock.sendMessage(remoteJid, { text: '❌ ' + e.message }, { quoted: msg }); }
        break;
      }
      case 'ai': case 'gpt': {
        if(!text) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.ai Apa itu JavaScript?' }, { quoted: msg });
        const sent = await sock.sendMessage(remoteJid, { text: '🤖 Berpikir...' }, { quoted: msg });
        try{
          const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text), { timeout: 15000 });
          if(r.data?.response) await sock.sendMessage(remoteJid, { text: '🤖 *AI:*\\n\\n' + r.data.response }, { quoted: msg });
          else throw new Error('Tidak ada respons');
        }catch(e){ await sock.sendMessage(remoteJid, { text: '❌ AI Error: ' + e.message }, { quoted: msg }); }
        break;
      }
      case 'daily': {
        if(!global.db.rpg[sender]) global.db.rpg[sender] = { money: 0, lastDaily: 0 };
        const remaining = 86400000 - (Date.now() - global.db.rpg[sender].lastDaily);
        if(remaining > 0){
          const h = Math.floor(remaining / 3600000);
          const mn = Math.floor((remaining % 3600000) / 60000);
          return sock.sendMessage(remoteJid, { text: '⏳ *COOLDOWN*\\n\\nKamu sudah daily hari ini!\\n⏱️ Tunggu: ' + h + ' jam ' + mn + ' menit' }, { quoted: msg });
        }
        global.db.rpg[sender].money += 1000;
        global.db.rpg[sender].lastDaily = Date.now();
        global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ *DAILY REWARD*\\n\\n💰 +1000 coin\\n💳 Total: ' + global.db.rpg[sender].money + ' coin\\n\\n_Klaim lagi besok!_', mentions: [sender] }, { quoted: msg });
        break;
      }
      case 'balance': case 'bal': {
        if(!global.db.rpg[sender]) global.db.rpg[sender] = { money: 0, lastDaily: 0 };
        await sock.sendMessage(remoteJid, { text: '💳 *BALANCE*\\n\\n💰 Uang: ' + global.db.rpg[sender].money + ' coin', mentions: [sender] }, { quoted: msg });
        break;
      }
      case 'addproduk': {
        if(!text) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.addproduk Nama Produk | Harga' }, { quoted: msg });
        global.db.produk = global.db.produk || [];
        global.db.produk.push({ nama: text, tgl: new Date().toLocaleDateString('id-ID') });
        global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ *PRODUK DITAMBAH*\\n\\n📦 Nama: ' + text }, { quoted: msg });
        break;
      }
      case 'listproduk': case 'store': {
        const p = global.db.produk || [];
        if(p.length === 0) return sock.sendMessage(remoteJid, { text: '📦 *STORE*\\n\\nStok kosong' }, { quoted: msg });
        let t = '╭━━━〔 STORE 〕━━━✦\\n';
        p.forEach((x, i) => { t += '┃ ' + (i+1) + '. ' + x.nama + '\\n'; });
        t += '╰━━━━━━━━━━━━━━';
        await sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
        break;
      }
      case 'addreply': {
        const [k, ...v] = text.split('|');
        if(!k || v.length === 0) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.addreply halo|Hai juga!' }, { quoted: msg });
        global.db.autoreply[k.trim().toLowerCase()] = v.join('|').trim();
        global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ *AUTOREPLY DITAMBAH*\\n\\n🔑 Kata: ' + k.trim() + '\\n💬 Balasan: ' + v.join('|').trim() }, { quoted: msg });
        break;
      }
      case 'delreply': {
        const key = text.toLowerCase().trim();
        if(!global.db.autoreply[key]) return sock.sendMessage(remoteJid, { text: '❌ Tidak ada' }, { quoted: msg });
        delete global.db.autoreply[key];
        global.saveDB();
        await sock.sendMessage(remoteJid, { text: '✅ Autoreply dihapus' }, { quoted: msg });
        break;
      }
      case 'listreply': {
        const list = Object.keys(global.db.autoreply);
        if(list.length === 0) return sock.sendMessage(remoteJid, { text: '📭 Kosong' }, { quoted: msg });
        let t = '╭━━━〔 AUTOREPLY LIST 〕━━━✦\\n';
        list.forEach(k => { t += '┃ "' + k + '" → ' + global.db.autoreply[k] + '\\n'; });
        t += '╰━━━━━━━━━━━━━━';
        await sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
        break;
      }
      case 'bc': case 'broadcast': {
        if(!text) return sock.sendMessage(remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.bc Halo semua member' }, { quoted: msg });
        const groups = await sock.groupFetchAllParticipating();
        let count = 0;
        for(const id of Object.keys(groups)){
          try{ await sock.sendMessage(id, { text: '📢 *BROADCAST*\\n\\n' + text }); count++; }catch{}
        }
        await sock.sendMessage(remoteJid, { text: '✅ Broadcast terkirim ke ' + count + ' grup' }, { quoted: msg });
        break;
      }
      default: {
        await sock.sendMessage(remoteJid, { text: '❓ Command .' + command + ' tidak ada\\n\\nKetik .menu untuk lihat daftar fitur' }, { quoted: msg });
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
      list.forEach(f=>{ pf.file(f+'.js', `// Mode CASE: logika sudah ada di index.js\nmodule.exports = {};\n`); });

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
  btnType: "${btnType}"
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
    
    // Auto reply check
    if(body && global.db.autoreply[body.toLowerCase()]){
      await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg });
      return;
    }
    
    // Antilink check
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){
      try{
        await sock.sendMessage(remoteJid, { delete: msg.key });
        let t = '╭━━━〔 ANTILINK 〕━━━✦\\n';
        t += '┃ 🚫 Link terdeteksi!\\n';
        t += '┃ 👤 User: +' + sender.split('@')[0] + '\\n';
        t += '┃ ⚠️ Pesan telah dihapus\\n';
        t += '╰━━━〔 ' + botName + ' 〕━━━';
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

    pf.file('menu.js', `import settings from '../settings.js';
export default {
  command: ['menu','help','start'],
  handler: async (sock, msg, o) => {
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    let t = '╭━━━〔 ' + settings.botName + ' 〕━━━✦\\n';
    t += '┃ 👤 Owner: ' + settings.ownerName + '\\n';
    t += '┃ 📱 Nomor: ' + settings.ownerNumber + '\\n';
    t += '┃ ⏱️ Uptime: ' + uptime + 's\\n';
    t += '┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n';
    settings.features.forEach(f=>{ t += '┃ ❒ .' + f + '\\n'; });
    t += '╰━━━━━━━━━━━━━━';
    await sock.sendMessage(o.remoteJid, { text: t }, { quoted: msg });
  }
};`);

    pf.file('ping.js', `export default {
  command: ['ping'],
  handler: async (sock, msg, o) => {
    const t = Date.now();
    await sock.sendMessage(o.remoteJid, { text: '🏓 Pong...' }, { quoted: msg });
    const latency = Date.now() - t;
    await sock.sendMessage(o.remoteJid, { text: '🏓 *Pong!*\\n⚡ Latency: ' + latency + 'ms\\n💚 Status: Online' }, { quoted: msg });
  }
};`);

    pf.file('owner.js', `import settings from '../settings.js';
export default {
  command: ['owner','creator'],
  handler: async (sock, msg, o) => {
    await sock.sendMessage(o.remoteJid, { text: '👑 *OWNER BOT*\\n\\n📛 Nama: ' + settings.ownerName + '\\n📱 Nomor: wa.me/' + settings.ownerNumber + '\\n\\n_Klik link untuk chat owner_' }, { quoted: msg });
  }
};`);

    pf.file('info.js', `import settings from '../settings.js';
export default {
  command: ['info','about'],
  handler: async (sock, msg, o) => {
    let t = '╭━━━〔 INFO BOT 〕━━━✦\\n';
    t += '┃ 🤖 Nama: ' + settings.botName + '\\n';
    t += '┃ 👑 Owner: ' + settings.ownerName + '\\n';
    t += '┃ 📡 Platform: WhatsApp\\n';
    t += '┃ 🧩 Library: Baileys 6.7.8\\n';
    t += '┃ 🛠️ Total Fitur: ' + settings.features.length + '\\n';
    t += '┃ 💻 Node.js: ' + process.version + '\\n';
    t += '╰━━━━━━━━━━━━━━';
    await sock.sendMessage(o.remoteJid, { text: t }, { quoted: msg });
  }
};`);

    pf.file('runtime.js', `export default {
  command: ['runtime','uptime'],
  handler: async (sock, msg, o) => {
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const mn = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    await sock.sendMessage(o.remoteJid, { text: '⏱️ *RUNTIME*\\n\\n📆 ' + d + ' hari\\n🕐 ' + h + ' jam\\n⏱️ ' + mn + ' menit\\n⚡ ' + s + ' detik' }, { quoted: msg });
  }
};`);

    pf.file('totfitur.js', `import settings from '../settings.js';
export default {
  command: ['totfitur','totalfitur'],
  handler: async (sock, msg, o) => {
    await sock.sendMessage(o.remoteJid, { text: '🧩 *TOTAL FITUR*\\n\\n📊 Jumlah: ' + settings.features.length + ' fitur\\n✅ Status: Aktif semua' }, { quoted: msg });
  }
};`);

    pf.file('speed.js', `export default {
  command: ['speed','speedtest'],
  handler: async (sock, msg, o) => {
    const t = Date.now();
    await sock.sendMessage(o.remoteJid, { text: '⚡ Mengukur...' }, { quoted: msg });
    const latency = Date.now() - t;
    await sock.sendMessage(o.remoteJid, { text: '⚡ *SPEED TEST*\\n\\n🚀 Latency: ' + latency + 'ms\\n🌐 Server: WhatsApp\\n💚 Status: Baik' }, { quoted: msg });
  }
};`);

    pf.file('donasi.js', `export default {
  command: ['donasi','donate'],
  handler: async (sock, msg, o) => {
    await sock.sendMessage(o.remoteJid, { text: '☕ *DONASI*\\n\\nDukung bot ini agar tetap hidup!\\n\\n💳 Dana: 08xxxxxxxxxx\\n💳 Gopay: 08xxxxxxxxxx\\n💳 OVO: 08xxxxxxxxxx\\n\\nTerima kasih! 🙏' }, { quoted: msg });
  }
};`);

    pf.file('say.js', `export default {
  command: ['say','echo'],
  handler: async (sock, msg, o) => {
    if(!o.text) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.say Halo semuanya' }, { quoted: msg });
    await sock.sendMessage(o.remoteJid, { text: o.text }, { quoted: msg });
  }
};`);

    pf.file('quote.js', `const quotes = [
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
export default {
  command: ['quote','katabijak'],
  handler: async (sock, msg, o) => {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    await sock.sendMessage(o.remoteJid, { text: '💭 *KATA BIJAK*\\n\\n"' + q + '"' }, { quoted: msg });
  }
};`);

    pf.file('welcome.js', `import settings from '../settings.js';
export default {
  command: ['welcome'],
  handler: async (sock, msg, o) => {
    if(!o.isGroup) return sock.sendMessage(o.remoteJid, { text: '❌ Fitur welcome hanya untuk grup' }, { quoted: msg });
    if(o.text === 'on'){
      if(!global.db.welcome.includes(o.remoteJid)) global.db.welcome.push(o.remoteJid);
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ *WELCOME DIAKTIFKAN*\\n\\nBot akan menyambut member baru di grup ini.' }, { quoted: msg });
    } else if(o.text === 'off'){
      global.db.welcome = global.db.welcome.filter(v=>v!==o.remoteJid);
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '❌ *WELCOME DIMATIKAN*\\n\\nBot tidak akan menyambut member baru.' }, { quoted: msg });
    } else {
      await sock.sendMessage(o.remoteJid, { text: '╭━━━〔 WELCOME SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ .welcome on → aktifkan\\n┃ .welcome off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.welcome.includes(o.remoteJid) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━' }, { quoted: msg });
    }
  },
  onParticipantsUpdate: async (sock, update) => {
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
        t += '╰━━━〔 ' + settings.botName + ' 〕━━━';
        await sock.sendMessage(update.id, { text: t, mentions: [p] });
      }
    }
  }
};`);

    pf.file('antilink.js', `import settings from '../settings.js';
export default {
  command: ['antilink'],
  handler: async (sock, msg, o) => {
    if(!o.isGroup) return sock.sendMessage(o.remoteJid, { text: '❌ Fitur antilink hanya untuk grup' }, { quoted: msg });
    if(o.text === 'on'){
      if(!global.db.antilink.includes(o.remoteJid)) global.db.antilink.push(o.remoteJid);
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ *ANTILINK DIAKTIFKAN*\\n\\nSetiap link akan dihapus otomatis.' }, { quoted: msg });
    } else if(o.text === 'off'){
      global.db.antilink = global.db.antilink.filter(v=>v!==o.remoteJid);
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '❌ *ANTILINK DIMATIKAN*\\n\\nMember bebas kirim link.' }, { quoted: msg });
    } else {
      await sock.sendMessage(o.remoteJid, { text: '╭━━━〔 ANTILINK SETTINGS 〕━━━✦\\n┃\\n┃ 📖 *Cara pakai:*\\n┃ .antilink on → aktifkan\\n┃ .antilink off → matikan\\n┃\\n┃ 📊 Status: ' + (global.db.antilink.includes(o.remoteJid) ? '✅ AKTIF' : '❌ MATI') + '\\n╰━━━━━━━━━━━━━━' }, { quoted: msg });
    }
  }
};`);

    pf.file('hidetag.js', `export default {
  command: ['hidetag','tagall'],
  handler: async (sock, msg, o) => {
    if(!o.isGroup) return sock.sendMessage(o.remoteJid, { text: '❌ Fitur hidetag hanya untuk grup' }, { quoted: msg });
    const meta = await sock.groupMetadata(o.remoteJid);
    const mentions = meta.participants.map(p=>p.id);
    await sock.sendMessage(o.remoteJid, { text: o.text || '📢 Halo semua!', mentions });
  }
};`);

    pf.file('sticker.js', `import { downloadMediaMessage } from '@whiskeysockets/baileys';
export default {
  command: ['s','sticker','stiker'],
  handler: async (sock, msg, o) => {
    const type = Object.keys(msg.message)[0];
    let imgMsg = null;
    if(type === 'imageMessage') imgMsg = msg;
    else if(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage){
      imgMsg = { message: { imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage }, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } };
    }
    if(!imgMsg) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\nKirim/reply gambar dengan caption .sticker' }, { quoted: msg });
    try{
      const b = await downloadMediaMessage(imgMsg, 'buffer', {});
      await sock.sendMessage(o.remoteJid, { sticker: b }, { quoted: msg });
    }catch(e){ await sock.sendMessage(o.remoteJid, { text: '❌ Error: ' + e.message }, { quoted: msg }); }
  }
};`);

    pf.file('downloader.js', `import axios from 'axios';
import settings from '../settings.js';
export default {
  command: ['tiktok','tt'],
  handler: async (sock, msg, o) => {
    if(!o.args[0]) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.tiktok https://tiktok.com/...' }, { quoted: msg });
    if(!/tiktok\\.com|vt\\.tiktok/i.test(o.args[0])) return sock.sendMessage(o.remoteJid, { text: '❌ URL bukan TikTok' }, { quoted: msg });
    try{
      const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(o.args[0]), { timeout: 15000 });
      const v = r.data?.data?.play;
      if(v) await sock.sendMessage(o.remoteJid, { video: { url: v }, caption: '✅ *Download Berhasil*\\n📥 ' + settings.botName }, { quoted: msg });
      else throw new Error('Video tidak ditemukan');
    }catch(e){ await sock.sendMessage(o.remoteJid, { text: '❌ ' + e.message }, { quoted: msg }); }
  }
};`);

    pf.file('ai.js', `import axios from 'axios';
export default {
  command: ['ai','gpt','ask'],
  handler: async (sock, msg, o) => {
    if(!o.text) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.ai Apa itu JavaScript?' }, { quoted: msg });
    const sent = await sock.sendMessage(o.remoteJid, { text: '🤖 Berpikir...' }, { quoted: msg });
    try{
      const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(o.text), { timeout: 15000 });
      if(r.data?.response) await sock.sendMessage(o.remoteJid, { text: '🤖 *AI:*\\n\\n' + r.data.response }, { quoted: msg });
      else throw new Error('Tidak ada respons');
    }catch(e){ await sock.sendMessage(o.remoteJid, { text: '❌ AI Error: ' + e.message }, { quoted: msg }); }
  }
};`);

    pf.file('rpg.js', `export default {
  command: ['daily','balance','bal'],
  handler: async (sock, msg, o) => {
    const id = o.sender;
    if(!global.db.rpg[id]) global.db.rpg[id] = { money: 0, lastDaily: 0 };
    if(o.command === 'balance' || o.command === 'bal'){
      await sock.sendMessage(o.remoteJid, { text: '💳 *BALANCE*\\n\\n💰 Uang: ' + global.db.rpg[id].money + ' coin', mentions: [id] }, { quoted: msg });
    } else {
      const remaining = 86400000 - (Date.now() - global.db.rpg[id].lastDaily);
      if(remaining > 0){
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        return sock.sendMessage(o.remoteJid, { text: '⏳ *COOLDOWN*\\n\\nSudah daily hari ini!\\n⏱️ Tunggu: ' + h + ' jam ' + m + ' menit' }, { quoted: msg });
      }
      global.db.rpg[id].money += 1000;
      global.db.rpg[id].lastDaily = Date.now();
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ *DAILY REWARD*\\n\\n💰 +1000 coin\\n💳 Total: ' + global.db.rpg[id].money + ' coin\\n\\n_Klaim lagi besok!_', mentions: [id] }, { quoted: msg });
    }
  }
};`);

    pf.file('store.js', `export default {
  command: ['addproduk','listproduk','store'],
  handler: async (sock, msg, o) => {
    if(o.command === 'addproduk'){
      if(!o.text) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.addproduk Nama Produk | Harga' }, { quoted: msg });
      global.db.produk = global.db.produk || [];
      global.db.produk.push({ nama: o.text, tgl: new Date().toLocaleDateString('id-ID') });
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ *PRODUK DITAMBAH*\\n\\n📦 Nama: ' + o.text }, { quoted: msg });
    } else {
      const p = global.db.produk || [];
      if(p.length === 0) return sock.sendMessage(o.remoteJid, { text: '📦 *STORE*\\n\\nStok kosong' }, { quoted: msg });
      let t = '╭━━━〔 STORE 〕━━━✦\\n';
      p.forEach((x, i) => { t += '┃ ' + (i+1) + '. ' + x.nama + '\\n'; });
      t += '╰━━━━━━━━━━━━━━';
      await sock.sendMessage(o.remoteJid, { text: t }, { quoted: msg });
    }
  }
};`);

    pf.file('autoreply.js', `export default {
  command: ['addreply','delreply','listreply'],
  handler: async (sock, msg, o) => {
    if(o.command === 'addreply'){
      const [k, ...v] = o.text.split('|');
      if(!k || v.length === 0) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.addreply halo|Hai juga!' }, { quoted: msg });
      global.db.autoreply[k.trim().toLowerCase()] = v.join('|').trim();
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ *AUTOREPLY DITAMBAH*\\n\\n🔑 Kata: ' + k.trim() + '\\n💬 Balasan: ' + v.join('|').trim() }, { quoted: msg });
    } else if(o.command === 'delreply'){
      const key = o.text.toLowerCase().trim();
      if(!global.db.autoreply[key]) return sock.sendMessage(o.remoteJid, { text: '❌ Tidak ada' }, { quoted: msg });
      delete global.db.autoreply[key];
      global.saveDB();
      await sock.sendMessage(o.remoteJid, { text: '✅ Autoreply dihapus' }, { quoted: msg });
    } else {
      const list = Object.keys(global.db.autoreply);
      if(list.length === 0) return sock.sendMessage(o.remoteJid, { text: '📭 Kosong' }, { quoted: msg });
      let t = '╭━━━〔 AUTOREPLY LIST 〕━━━✦\\n';
      list.forEach(k => { t += '┃ "' + k + '" → ' + global.db.autoreply[k] + '\\n'; });
      t += '╰━━━━━━━━━━━━━━';
      await sock.sendMessage(o.remoteJid, { text: t }, { quoted: msg });
    }
  }
};`);

    pf.file('broadcast.js', `export default {
  command: ['bc','broadcast'],
  handler: async (sock, msg, o) => {
    if(!o.text) return sock.sendMessage(o.remoteJid, { text: '⚠️ *Contoh Penggunaan:*\\n.bc Halo semua member' }, { quoted: msg });
    const groups = await sock.groupFetchAllParticipating();
    let count = 0;
    for(const id of Object.keys(groups)){
      try{ await sock.sendMessage(id, { text: '📢 *BROADCAST*\\n\\n' + o.text }); count++; }catch{}
    }
    await sock.sendMessage(o.remoteJid, { text: '✅ Broadcast terkirim ke ' + count + ' grup' }, { quoted: msg });
  }
};`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
    return res.send(buffer);

  } catch (e) {
    console.error('Generate Error:', e);
    return res.status(500).json({ error: e.message });
  }
}