// api/generate.js - PISAH 3 JALUR - CASE / ESM / TELEGRAM - FORCE 11 FILE
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  
  try {
    const {
      botName, ownerNumber, ownerName, pairingNumber,
      teleToken, teleUsername, platform, base,
      menuType, btnType
    } = req.body || {};

    if(!botName) return res.status(400).json({ error: 'Isi botName di web dulu' });

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    const list = ['menu','welcome','antilink','sticker','downloader','ai','group','rpg','store','autoreply','broadcast'];

    // ================= 1. TELEGRAM - TELEGRAF =================
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

if(!settings.token){
  console.log('Isi token di settings.js dulu');
  process.exit(1);
}

const bot = new Telegraf(settings.token);
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));

console.log('Starting ' + settings.botName + ' - ' + settings.ownerName + ' - Telegram');

const pluginsDir = path.join(__dirname, 'plugins');
const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
const plugins = files.map(f => require(path.join(pluginsDir, f)));

console.log('Loaded ' + plugins.length + ' plugins - ' + settings.botName);

// Register Commands
plugins.forEach(plugin => {
  if(plugin.command) {
    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
    cmds.forEach(cmd => bot.command(cmd, (ctx) => plugin.handler(bot, ctx)));
  }
});

// Register onMessage (Antilink, Autoreply)
bot.on('message', async (ctx) => {
  for (const plugin of plugins) {
    if (plugin.onMessage) {
      const handled = await plugin.onMessage(bot, ctx);
      if (handled) break;
    }
  }
});

// Register Event Welcome
bot.on('new_chat_members', (ctx) => {
  plugins.forEach(plugin => {
    if(plugin.onNewMember) plugin.onNewMember(bot, ctx);
  });
});

bot.launch().then(()=>console.log(settings.botName + ' Running'));
`;

      zip.file('settings.js', settingsTele);
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", description: botName + " Telegram",
        type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" },
        dependencies: { telegraf: "^4.15.3", "axios": "^1.7.2" }
      }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexTele);

      const pf = zip.folder('plugins');
      // TELE PLUGINS
      pf.file('menu.js', `module.exports = {
  command: ['menu','start','help'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    let t = '🤖 ' + s.botName + '\\n👤 Owner: ' + s.ownerName + '\\n\\n';
    s.features.forEach(f=>{ t += '❒ /' + f + '\\n'; });
    await ctx.reply(t);
  }
};`);
      pf.file('welcome.js', `module.exports = {
  command: ['welcome'],
  handler: async (bot, ctx) => {
    const s = require('../settings.js');
    await ctx.reply('Welcome ON - ' + s.botName);
  },
  onNewMember: async (bot, ctx) => {
    const s = require('../settings.js');
    const member = ctx.message.new_chat_members[0];
    await ctx.reply('Welcome @' + member.username + ' ke ' + s.botName);
  }
};`);
      pf.file('antilink.js', `module.exports = {
  command: ['antilink'],
  handler: async (bot, ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ');
    if(args === 'on'){ if(!global.db.antilink.includes(ctx.chat.id.toString())) global.db.antilink.push(ctx.chat.id.toString()); global.saveDB(); await ctx.reply('Antilink ON'); }
    else if(args === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==ctx.chat.id.toString()); global.saveDB(); await ctx.reply('Antilink OFF'); }
  },
  onMessage: async (bot, ctx) => {
    if(!global.db.antilink.includes(ctx.chat.id.toString())) return false;
    if(/https?:\\/\\//.test(ctx.message.text||'')){ try{ await ctx.deleteMessage(); }catch{} return true; }
    return false;
  }
};`);
      pf.file('sticker.js', `module.exports = {
  command: ['s','sticker','stiker'],
  handler: async (bot, ctx) => {
    await ctx.reply('Kirim foto dengan caption /s (Fitur sticker telegram butuh library tambahan)');
  }
};`);
      pf.file('downloader.js', `const axios = require('axios');
module.exports = {
  command: ['tiktok','tt','ytmp3','ytmp4'],
  handler: async (bot, ctx) => {
    const url = ctx.message.text.split(' ').slice(1)[0];
    if(!url) return ctx.reply('Kirim link');
    try{ const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(url)); const v = r.data?.data?.play; if(v) await ctx.replyWithVideo({ url: v }); }catch{}
  }
};`);
      pf.file('ai.js', `const axios = require('axios');
module.exports = {
  command: ['ai','gpt','openai'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('Tanya apa?');
    try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text)); await ctx.reply(r.data.response); }catch{}
  }
};`);
      pf.file('group.js', `module.exports = {
  command: ['hidetag','tagall'],
  handler: async (bot, ctx) => {
    await ctx.reply('Hidetag/Tagall - khusus grup');
  }
};`);
      pf.file('rpg.js', `module.exports = {
  command: ['daily','balance'],
  handler: async (bot, ctx) => {
    const id = ctx.from.id.toString();
    if(!global.db.rpg[id]) global.db.rpg[id] = { money: 0, lastDaily: 0 };
    if(Date.now() - global.db.rpg[id].lastDaily < 86400000) return ctx.reply('Cooldown');
    global.db.rpg[id].money += 1000; global.db.rpg[id].lastDaily = Date.now(); global.saveDB();
    await ctx.reply('Balance: ' + global.db.rpg[id].money);
  }
};`);
      pf.file('store.js', `module.exports = {
  command: ['addproduk','listproduk'],
  handler: async (bot, ctx) => {
    if(ctx.message.text.includes('addproduk')){ const t = ctx.message.text.split(' ').slice(1).join(' '); global.db.produk.push(t); global.saveDB(); await ctx.reply('Ditambah'); }
    else { const l = (global.db.produk||[]).join('\\n') || 'Kosong'; await ctx.reply(l); }
  }
};`);
      pf.file('autoreply.js', `module.exports = {
  command: ['addreply','listreply'],
  handler: async (bot, ctx) => {
    const parts = ctx.message.text.split(' ').slice(1); const k = parts[0]; const v = parts.slice(1).join(' '); global.db.autoreply[k.toLowerCase()] = v; global.saveDB(); await ctx.reply('Autoreply ' + k);
  },
  onMessage: async (bot, ctx) => {
    const rep = global.db.autoreply[(ctx.message.text||'').toLowerCase()]; if(rep){ await ctx.reply(rep); return true; } return false;
  }
};`);
      pf.file('broadcast.js', `module.exports = {
  command: ['bc','broadcast'],
  handler: async (bot, ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if(!text) return ctx.reply('Contoh: /bc halo');
    await ctx.reply('Broadcast: ' + text);
  }
};`);

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 2. CASE - COMMONJS =================
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

const botName = settings.botName;
const owner = settings.ownerNumber;
const ownerName = settings.ownerName;
const pairingNumber = settings.pairingNumber;

console.log('Starting CASE ' + botName + ' - ' + ownerName + ' - ' + settings.features.length + ' plugins');

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });
  
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){
    setTimeout(async()=>{ 
      try {
        const code = await sock.requestPairingCode(pairingNumber); 
        console.log('Pairing Code ' + botName + ': ' + code); 
      } catch(e) { console.log('Pairing Error:', e.message); }
    }, 3000);
  }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected - Owner: ' + ownerName);
    if(u.connection === 'close'){ 
      const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; 
      if(r) setTimeout(()=>startBot(), 3000); 
    }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0]; if(!msg || msg.key.fromMe) return;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if(!body.startsWith('.')) return;
    
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(' ');
    const remoteJid = msg.key.remoteJid;
    const sender = msg.key.participant || remoteJid;
    
    console.log('[' + botName + '] ' + command + ' from ' + sender);

    switch(command){
      case 'menu': {
        let t = '╭━━━〔 ' + botName + ' 〕━━━\\n';
        t += '┃ Owner: ' + ownerName + ' (' + owner + ')\\n';
        settings.features.forEach(f=>{ t += '┃ ❒ .' + f + '\\n'; });
        t += '╰━━━━';
        await sock.sendMessage(remoteJid, { text: t });
        break;
      }
      case 'welcome': {
        if(text === 'on'){ if(!global.db.welcome.includes(remoteJid)) global.db.welcome.push(remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: 'Welcome ON - ' + botName }); }
        else if(text === 'off'){ global.db.welcome = global.db.welcome.filter(v=>v!==remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: 'Welcome OFF' }); }
        break;
      }
      case 'antilink': {
        if(text === 'on'){ if(!global.db.antilink.includes(remoteJid)) global.db.antilink.push(remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: 'Antilink ON' }); }
        else if(text === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==remoteJid); global.saveDB(); await sock.sendMessage(remoteJid, { text: 'Antilink OFF' }); }
        break;
      }
      case 's':
      case 'sticker':
      case 'stiker': {
        const c = msg.message?.ephemeralMessage ? msg.message.ephemeralMessage.message : msg.message;
        const b = await downloadMediaMessage({ message: c, key: msg.key }, 'buffer', {});
        if(b) await sock.sendMessage(remoteJid, { sticker: b });
        break;
      }
      case 'tiktok':
      case 'tt': {
        const url = args[0]; if(!url) return sock.sendMessage(remoteJid, { text: 'Kirim link' });
        try{ const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(url)); const v = r.data?.data?.play; if(v) await sock.sendMessage(remoteJid, { video: { url: v } }); }catch{}
        break;
      }
      case 'ai':
      case 'gpt': {
        if(!text) return sock.sendMessage(remoteJid, { text: 'Tanya apa?' });
        try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text)); await sock.sendMessage(remoteJid, { text: r.data.response }); }catch{}
        break;
      }
      case 'hidetag': {
        const meta = await sock.groupMetadata(remoteJid); const mentions = meta.participants.map(p=>p.id);
        await sock.sendMessage(remoteJid, { text: text || 'Hidetag - ' + botName, mentions });
        break;
      }
      case 'daily': {
        if(!global.db.rpg[sender]) global.db.rpg[sender] = { money: 0, lastDaily: 0 };
        if(Date.now() - global.db.rpg[sender].lastDaily < 86400000) return sock.sendMessage(remoteJid, { text: 'Cooldown' });
        global.db.rpg[sender].money += 1000; global.db.rpg[sender].lastDaily = Date.now(); global.saveDB();
        await sock.sendMessage(remoteJid, { text: 'Balance: ' + global.db.rpg[sender].money });
        break;
      }
      case 'addproduk': {
        global.db.produk = global.db.produk || []; global.db.produk.push(text); global.saveDB();
        await sock.sendMessage(remoteJid, { text: 'Ditambah: ' + text });
        break;
      }
      case 'listproduk': {
        const l = (global.db.produk||[]).join('\\n') || 'Kosong';
        await sock.sendMessage(remoteJid, { text: l });
        break;
      }
      case 'addreply': {
        const parts = text.split(' '); const k = parts[0]; const v = parts.slice(1).join(' '); global.db.autoreply[k.toLowerCase()] = v; global.saveDB();
        await sock.sendMessage(remoteJid, { text: 'Autoreply ' + k });
        break;
      }
      case 'bc': {
        const groups = await sock.groupFetchAllParticipating();
        for(const id of Object.keys(groups)){ await sock.sendMessage(id, { text: text }); }
        break;
      }
      default: {
        await sock.sendMessage(remoteJid, { text: 'Command .' + command + ' tidak ada - ' + botName });
        break;
      }
    }
  });
}
startBot();
`;

      zip.file('settings.js', settingsCase);
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", description: botName + " CASE - " + ownerName,
        type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" },
        dependencies: { "@whiskeysockets/baileys": "^6.7.8", "pino": "^9.3.2", "axios": "^1.7.2" }
      }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexCase);

      const pf = zip.folder('plugins');
      list.forEach(f=>{
        pf.file(f+'.js', `// File ini tidak dipakai di mode CASE, karena logika sudah ada di index.js\nmodule.exports = {};\n`);
      });

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 3. ESM - ESM PLUGIN =================
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
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const botName = settings.botName;
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));

console.log('Starting ESM ' + botName + ' - ' + settings.ownerName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){
    setTimeout(async()=>{ 
      try {
        const code = await sock.requestPairingCode(settings.pairingNumber); 
        console.log('Pairing Code ' + botName + ': ' + code); 
      } catch(e) {}
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
  console.log('Loaded ' + plugins.length + ' plugins - ' + botName);
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected');
    if(u.connection === 'close'){ const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if(r) setTimeout(()=>startBot(), 3000); }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0]; if(!msg || msg.key.fromMe) return;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if(!body.startsWith('.')) return;
    
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(' ');
    const remoteJid = msg.key.remoteJid;
    
    for(const p of plugins){
      if(p.command && p.command.includes(command)){
        await p.handler(sock, msg, { remoteJid, sender: msg.key.participant || remoteJid, command, args, text, settings });
      }
      if(p.onMessage){
        const handled = await p.onMessage(sock, msg);
        if(handled) break;
      }
    }
  });
  
  sock.ev.on('group-participants.update', async (update) => {
    for (const p of plugins) {
      if (p.onParticipantsUpdate) {
        await p.onParticipantsUpdate(sock, update);
      }
    }
  });
}
startBot();
`;

    zip.file('settings.js', settingsESM);
    zip.file('package.json', JSON.stringify({
      name: safe, version: "1.0.0", description: botName + " ESM - " + ownerName,
      type: "module", main: "index.js",
      scripts: { start: "node index.js" },
      dependencies: { "@whiskeysockets/baileys": "^6.7.8", "pino": "^9.3.2", "axios": "^1.7.2" }
    }, null, 2));
    zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
    zip.file('index.js', indexESM);

    const pf = zip.folder('plugins');
    pf.file('menu.js', `import settings from '../settings.js';
export default {
  command: ['menu'],
  handler: async (sock, msg, o) => {
    let t = '╭━━━〔 ' + settings.botName + ' 〕━━━\\n';
    t += '┃ Owner: ' + settings.ownerName + '\\n';
    settings.features.forEach(f=>{ t += '┃ ❒ .' + f + '\\n'; });
    t += '╰━━━━';
    await sock.sendMessage(o.remoteJid, { text: t });
  }
};`);
    pf.file('welcome.js', `import settings from '../settings.js';
export default {
  command: ['welcome'],
  handler: async (sock, msg, o) => {
    if(o.text === 'on'){ if(!global.db.welcome.includes(o.remoteJid)) global.db.welcome.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: 'Welcome ON - ' + settings.botName }); }
  },
  onParticipantsUpdate: async (sock, update) => {
    if(!global.db.welcome.includes(update.id)) return;
    for(const p of update.participants){ if(update.action === 'add'){ await sock.sendMessage(update.id, { text: 'Welcome @' + p.split('@')[0], mentions: [p] }); } }
  }
};`);
    pf.file('antilink.js', `import settings from '../settings.js';
export default {
  command: ['antilink'],
  handler: async (sock, msg, o) => {
    if(o.text === 'on'){ if(!global.db.antilink.includes(o.remoteJid)) global.db.antilink.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: 'Antilink ON' }); }
    else if(o.text === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: 'Antilink OFF' }); }
  },
  onMessage: async (sock, msg) => {
    const jid = msg.key.remoteJid; if(!global.db.antilink.includes(jid)) return false;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if(/https?:\\/\\//.test(body)){ const sender = msg.key.participant || jid; await sock.sendMessage(jid, { text: 'Link detected', mentions: [sender] }); return true; }
    return false;
  }
};`);
    pf.file('sticker.js', `import settings from '../settings.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
export default {
  command: ['s','sticker','stiker'],
  handler: async (sock, msg, o) => {
    const c = msg.message?.ephemeralMessage ? msg.message.ephemeralMessage.message : msg.message;
    const b = await downloadMediaMessage({ message: c, key: msg.key }, 'buffer', {});
    if(b) await sock.sendMessage(o.remoteJid, { sticker: b });
  }
};`);
    pf.file('downloader.js', `import settings from '../settings.js';
import axios from 'axios';
export default {
  command: ['tiktok','tt'],
  handler: async (sock, msg, o) => {
    const url = o.args[0]; if(!url) return;
    try{ const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(url)); const v = r.data?.data?.play; if(v) await sock.sendMessage(o.remoteJid, { video: { url: v } }); }catch{}
  }
};`);
    pf.file('ai.js', `import settings from '../settings.js';
import axios from 'axios';
export default {
  command: ['ai','gpt'],
  handler: async (sock, msg, o) => {
    if(!o.text) return;
    try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(o.text)); await sock.sendMessage(o.remoteJid, { text: r.data.response }); }catch{}
  }
};`);
    pf.file('group.js', `import settings from '../settings.js';
export default {
  command: ['hidetag','tagall'],
  handler: async (sock, msg, o) => {
    const meta = await sock.groupMetadata(o.remoteJid);
    const mentions = meta.participants.map(p=>p.id);
    await sock.sendMessage(o.remoteJid, { text: o.text || 'Hidetag', mentions });
  }
};`);
    pf.file('rpg.js', `import settings from '../settings.js';
export default {
  command: ['daily','balance'],
  handler: async (sock, msg, o) => {
    if(!global.db.rpg[o.sender]) global.db.rpg[o.sender] = { money: 0, lastDaily: 0 };
    if(Date.now() - global.db.rpg[o.sender].lastDaily < 86400000) return sock.sendMessage(o.remoteJid, { text: 'Cooldown' });
    global.db.rpg[o.sender].money += 1000; global.db.rpg[o.sender].lastDaily = Date.now(); global.saveDB();
    await sock.sendMessage(o.remoteJid, { text: 'Balance: ' + global.db.rpg[o.sender].money });
  }
};`);
    pf.file('store.js', `import settings from '../settings.js';
export default {
  command: ['addproduk','listproduk'],
  handler: async (sock, msg, o) => {
    if(o.command === 'addproduk'){ global.db.produk.push(o.text); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: 'Ditambah' }); }
    else { const l = (global.db.produk||[]).join('\\n') || 'Kosong'; await sock.sendMessage(o.remoteJid, { text: l }); }
  }
};`);
    pf.file('autoreply.js', `import settings from '../settings.js';
export default {
  command: ['addreply'],
  handler: async (sock, msg, o) => {
    const parts = o.text.split(' '); global.db.autoreply[parts[0].toLowerCase()] = parts.slice(1).join(' '); global.saveDB();
    await sock.sendMessage(o.remoteJid, { text: 'Autoreply ' + parts[0] });
  },
  onMessage: async (sock, msg) => {
    const rep = global.db.autoreply[(msg.message?.conversation||'').toLowerCase()]; if(rep){ await sock.sendMessage(msg.key.remoteJid, { text: rep }); return true; } return false;
  }
};`);
    pf.file('broadcast.js', `import settings from '../settings.js';
export default {
  command: ['bc','broadcast'],
  handler: async (sock, msg, o) => {
    const groups = await sock.groupFetchAllParticipating();
    for(const id of Object.keys(groups)){ await sock.sendMessage(id, { text: o.text }); }
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