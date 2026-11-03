// api/generate.js - FULL FIX (Sintaks Panel.js Diperbaiki)
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  
  try {
    const {
      botName, ownerNumber, ownerName, pairingNumber,
      teleToken, teleUsername, platform, base,
      menuType, btnType, thumbType, thumbData,
      usePanel, panelDomain, panelPtla, panelEgg, panelLoc,
      features
    } = req.body || {};

    if(!botName) return res.status(400).json({ error: 'Isi botName dulu' });

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    
    let list = features && features.length > 0 ? features : [
      'menu','ping','owner','info','runtime','totfitur','speed','say','quote','donasi',
      'welcome','antilink','hidetag','sticker','tiktok','ai',
      'rpg','store','autoreply','broadcast'
    ];

    if (usePanel && !list.includes('panel')) list.push('panel');

    if (thumbType === 'thumb' && thumbData && thumbData.startsWith('data:image')) {
      const base64Data = thumbData.split(',')[1];
      zip.file('thumbnail.jpg', Buffer.from(base64Data, 'base64'));
    }

    const panelConfigString = usePanel ? `panel: {
    domain: "${panelDomain || ''}",
    ptla: "${panelPtla || ''}",
    egg: "${panelEgg || '15'}",
    loc: "${panelLoc || '1'}"
  },` : '';

    // ================= 1. TELEGRAM =================
    if(platform === 'telegram'){
      // (Kode Telegram disingkat karena fokus ke WA/ESM)
      const settingsTele = `module.exports = { botName: "${botName}", ownerName: "${ownerName}", features: ${JSON.stringify(list)} };`;
      zip.file('settings.js', settingsTele);
      zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "commonjs", dependencies: { telegraf: "^4.15.3" } }, null, 2));
      
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 2. CASE =================
    if(base === 'case'){
      const settingsCase = `module.exports = {
  botName: "${botName}", ownerNumber: "${ownerNumber}", ownerName: "${ownerName}",
  pairingNumber: "${pairingNumber}", prefix: ".", features: ${JSON.stringify(list)},
  menuType: "${menuType}", btnType: "${btnType}", thumbType: "${thumbType}", ${panelConfigString}
};
`;
      const indexCase = `const settings = require('./settings.js');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('noxleys-baileys');
const pino = require('pino'); const fs = require('fs'); const axios = require('axios');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();
${usePanel ? `global.panel = settings.panel;` : ''}

const botName = settings.botName; const owner = settings.ownerNumber; const ownerName = settings.ownerName; const pairingNumber = settings.pairingNumber;
const quotes = ['Jangan berhenti ketika lelah, berhentilah ketika selesai.', 'Kesuksesan adalah hasil kerja keras dan doa.', 'Hidup itu seperti sepeda, untuk seimbang harus bergerak.'];

console.log('Starting CASE ' + botName + ' - ' + ownerName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){
    setTimeout(async()=>{ try{ const code = await sock.requestPairingCode(pairingNumber); console.log('Pairing Code ' + botName + ': ' + code); }catch(e){} }, 3000);
  }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected!');
    if(u.connection === 'close'){ const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if(r) setTimeout(()=>startBot(), 3000); }
  });
  
  sock.ev.on('group-participants.update', async (update) => {
    if(!global.db.welcome.includes(update.id)) return;
    if(update.action === 'add'){
      for(const p of update.participants){
        let t = '╭━━━〔 WELCOME 〕━━━✦\\n┃ 👋 Selamat datang +' + p.split('@')[0] + '\\n╰━━━〔 ' + botName + ' 〕━━━';
        await sock.sendMessage(update.id, { text: t, mentions: [p] });
      }
    }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0];
    if(!msg || !msg.message) return;
    
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    if (body) console.log('[PESAN MASUK] Dari: ' + sender + ' | Isi: ' + body);
    if(msg.key.fromMe && !body.startsWith('.')) return;
    
    if(body && global.db.autoreply[body.toLowerCase()]){ await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg }); return; }
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){ if(!msg.key.fromMe){ try{ await sock.sendMessage(remoteJid, { delete: msg.key }); }catch{} } return; }
    if(!body.startsWith('.')) return;
    
    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase(); const text = args.join(' '); const isGroup = remoteJid.endsWith('@g.us');
    
    switch(command){
      case 'menu': case 'help': case 'start': {
        let menuTxt = '';
        if (settings.menuType === 'simple') menuTxt = 'MENU ' + botName + '\\n\\n' + settings.features.map(f => '❒ .' + f).join('\\n') + '\\n\\nOwner: ' + ownerName;
        else if (settings.menuType === 'image') menuTxt = '╭━━━〔 ' + botName + ' 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━\\nOwner: ' + ownerName;
        else menuTxt = '╭━━━〔 ' + botName + ' 〕━━━✦\\n┃ 👤 Owner: ' + ownerName + '\\n┃ 📱 Nomor: ' + owner + '\\n┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━━━━━━━━━━━━';

        if (settings.btnType === 'btn') {
          let btnMsg = { text: menuTxt, footer: 'Powered by CiKiZz', buttons: [ { buttonId: '.menu', buttonText: { displayText: 'Refresh Menu' }, type: 1 } ], headerType: 1 };
          if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) btnMsg.image = fs.readFileSync('./thumbnail.jpg');
          try { await sock.sendMessage(remoteJid, btnMsg, { quoted: msg }); } catch (e) { await sock.sendMessage(remoteJid, { text: menuTxt }, { quoted: msg }); }
        } else {
          if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) await sock.sendMessage(remoteJid, { image: fs.readFileSync('./thumbnail.jpg'), caption: menuTxt }, { quoted: msg });
          else await sock.sendMessage(remoteJid, { text: menuTxt }, { quoted: msg });
        }
        break;
      }
      case 'ping': { await sock.sendMessage(remoteJid, { text: '🏓 Pong!' }, { quoted: msg }); break; }
      case 'owner': { await sock.sendMessage(remoteJid, { text: '👑 Owner: ' + ownerName + '\\n📱 wa.me/' + owner }, { quoted: msg }); break; }
      case 'info': { await sock.sendMessage(remoteJid, { text: '🤖 Info Bot ' + botName + '\\nEngine: Noxleys Baileys' }, { quoted: msg }); break; }
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
      case 'hidetag': { const meta = await sock.groupMetadata(remoteJid); const mentions = meta.participants.map(p=>p.id); await sock.sendMessage(remoteJid, { text: text || '📢 Halo!', mentions }); break; }
      case 's': case 'sticker': { const type = Object.keys(msg.message)[0]; let imgMsg = null; if(type === 'imageMessage') imgMsg = msg; else if(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage){ imgMsg = { message: { imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage }, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } }; } if(!imgMsg) return; try{ const b = await downloadMediaMessage(imgMsg, 'buffer', {}); await sock.sendMessage(remoteJid, { sticker: b }, { quoted: msg }); }catch{} break; }
      case 'tiktok': { if(!args[0]) return; try{ const r = await axios.get('https://tikwm.com/api/?url=' + encodeURIComponent(args[0])); if(r.data?.data?.play) await sock.sendMessage(remoteJid, { video: { url: r.data.data.play } }, { quoted: msg }); }catch{} break; }
      case 'ai': { if(!text) return; await sock.sendMessage(remoteJid, { text: '🤖 Berpikir...' }, { quoted: msg }); try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg=' + encodeURIComponent(text)); await sock.sendMessage(remoteJid, { text: '🤖 ' + r.data.response }, { quoted: msg }); }catch{} break; }
      case 'daily': { if(!global.db.rpg[sender]) global.db.rpg[sender] = { money: 0, lastDaily: 0 }; if(Date.now() - global.db.rpg[sender].lastDaily < 86400000) return sock.sendMessage(remoteJid, { text: '⏳ Cooldown' }, { quoted: msg }); global.db.rpg[sender].money += 1000; global.db.rpg[sender].lastDaily = Date.now(); global.saveDB(); await sock.sendMessage(remoteJid, { text: '✅ +1000 Coin' }, { quoted: msg }); break; }
      case 'addproduk': { if(!text) return; global.db.produk.push({ nama: text }); global.saveDB(); await sock.sendMessage(remoteJid, { text: '✅ Produk ditambah' }, { quoted: msg }); break; }
      case 'store': { let t = '🛒 Store:\\n' + global.db.produk.map((p,i)=> (i+1)+'. '+p.nama).join('\\n'); await sock.sendMessage(remoteJid, { text: t || 'Kosong' }, { quoted: msg }); break; }
      case 'addreply': { const [k, ...v] = text.split('|'); if(!k || v.length===0) return; global.db.autoreply[k.trim().toLowerCase()] = v.join('|').trim(); global.saveDB(); await sock.sendMessage(remoteJid, { text: '✅ Autoreply ditambah' }, { quoted: msg }); break; }
      case 'bc': { if(!text) return; const groups = await sock.groupFetchAllParticipating(); for(const id of Object.keys(groups)){ try{ await sock.sendMessage(id, { text: text }); }catch{} } await sock.sendMessage(remoteJid, { text: '✅ Broadcast terkirim' }, { quoted: msg }); break; }
      ${usePanel && list.includes('panel') ? `
      case 'pannel':
      case '1gb': case '2gb': case '3gb': case '4gb': case '5gb': case '6gb': case '7gb': case '8gb': case '9gb': case '10gb': case 'unli': case 'unlimited':
      case 'createadmin': case 'listpanel': case 'listadmin': case 'delpanel': case 'deladmin': {
        const packages = { '1gb': { ram: "1000", disk: "1000", cpu: "40" }, '2gb': { ram: "2000", disk: "1000", cpu: "60" }, '3gb': { ram: "3000", disk: "2000", cpu: "80" }, '4gb': { ram: "4000", disk: "2000", cpu: "100" }, '5gb': { ram: "5000", disk: "3000", cpu: "120" }, '6gb': { ram: "6000", disk: "3000", cpu: "140" }, '7gb': { ram: "7000", disk: "4000", cpu: "160" }, '8gb': { ram: "8000", disk: "4000", cpu: "180" }, '9gb': { ram: "9000", disk: "5000", cpu: "200" }, '10gb': { ram: "10000", disk: "5000", cpu: "220" }, 'unli': { ram: "0", disk: "0", cpu: "0" }, 'unlimited': { ram: "0", disk: "0", cpu: "0" } };
        const { domain, ptla, egg, loc } = global.panel || {};
        if (!domain || !ptla) return sock.sendMessage(remoteJid, { text: "❌ Panel belum disetting di settings.js" }, { quoted: msg });
        if (command === "pannel") return sock.sendMessage(remoteJid, { text: \`☁️ MENU PANEL\\n\\n1GB - 10GB\\nUNLI\\ncreateadmin\\nlistpanel\\nlistadmin\\ndelpanel <id>\\ndeladmin <id>\` }, { quoted: msg });
        try {
          if (command === "listpanel") { let res = await fetch(domain + "/api/application/servers", { headers: { Authorization: "Bearer " + ptla } }); let data = await res.json(); if (!data.data?.length) return sock.sendMessage(remoteJid, { text: "Tidak ada server" }, { quoted: msg }); let txt = "📦 LIST SERVER\\n\\n"; data.data.forEach(s => { txt += \`ID: \${s.attributes.id}\\nName: \${s.attributes.name}\\nRAM: \${s.attributes.limits.memory == 0 ? "Unlimited" : s.attributes.limits.memory + "MB"}\\n\\n\`; }); return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg }); }
          if (command === "listadmin") { let res = await fetch(domain + "/api/application/users", { headers: { Authorization: "Bearer " + ptla } }); let data = await res.json(); if (!data.data?.length) return sock.sendMessage(remoteJid, { text: "Tidak ada user" }, { quoted: msg }); let txt = "👤 LIST USER PANEL\\n\\n"; data.data.forEach(u => { txt += \`ID: \${u.attributes.id}\\nUsername: \${u.attributes.username}\\nAdmin: \${u.attributes.root_admin ? "Yes" : "No"}\\n\\n\`; }); return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg }); }
          if (command === "delpanel") { if (!text) return sock.sendMessage(remoteJid, { text: "Contoh: .delpanel 3" }, { quoted: msg }); await fetch(domain + "/api/application/servers/" + text, { method: "DELETE", headers: { Authorization: "Bearer " + ptla } }); return sock.sendMessage(remoteJid, { text: "✅ Server berhasil dihapus" }, { quoted: msg }); }
          if (command === "deladmin") { if (!text) return sock.sendMessage(remoteJid, { text: "Contoh: .deladmin 5" }, { quoted: msg }); await fetch(domain + "/api/application/users/" + text, { method: "DELETE", headers: { Authorization: "Bearer " + ptla } }); return sock.sendMessage(remoteJid, { text: "✅ User berhasil dihapus" }, { quoted: msg }); }
          if (!text || text.split(/[, ]/).length < 2) return sock.sendMessage(remoteJid, { text: \`Contoh:\\n.\${command} username,@tag\\n.\${command} username,628xxxx\` }, { quoted: msg });
          let username = text.split(/[, ]/)[0]; let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender; let jid = target.includes("@s.whatsapp.net") ? target : target.split("@")[0] + "@s.whatsapp.net";
          await sock.sendMessage(remoteJid, { text: "✨ Creating server panel..." }, { quoted: msg });
          let userRes = await fetch(domain + "/api/application/users", { method: "POST", headers: { Authorization: "Bearer " + ptla, "Content-Type": "application/json" }, body: JSON.stringify({ email: username + "@panel.com", username, first_name: username, last_name: username, language: "en", password: Math.random().toString(36).slice(-8) }) });
          let userData = await userRes.json(); if (userData.errors) return sock.sendMessage(remoteJid, { text: JSON.stringify(userData.errors[0], null, 2) }, { quoted: msg });
          let pack = packages[command];
          let serverRes = await fetch(domain + "/api/application/servers", { method: "POST", headers: { Authorization: "Bearer " + ptla, "Content-Type": "application/json" }, body: JSON.stringify({ name: \`\${username} Server\`, user: userData.attributes.id, egg: parseInt(egg), docker_image: "ghcr.io/parkervcp/yolks:nodejs_22", startup: "npm start", environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" }, limits: { memory: parseInt(pack.ram), swap: 0, disk: parseInt(pack.disk), io: 500, cpu: parseInt(pack.cpu) }, feature_limits: { databases: 5, backups: 5, allocations: 5 }, deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] } }) });
          let serverData = await serverRes.json(); if (serverData.errors) return sock.sendMessage(remoteJid, { text: JSON.stringify(serverData.errors[0], null, 2) }, { quoted: msg });
          await sock.sendMessage(jid, { text: \`📦 DATA PANEL\\n\\nUsername: \${username}\\nPassword: \${password}\\nLogin: \${domain}\\n\\nRAM: \${pack.ram == 0 ? "Unlimited" : pack.ram + "MB"}\\nCPU: \${pack.cpu == 0 ? "Unlimited" : pack.cpu + "%"}\\nDisk: \${pack.disk == 0 ? "Unlimited" : pack.disk + "MB"}\` });
          return sock.sendMessage(remoteJid, { text: "✅ Server berhasil dibuat & data dikirim ke PC" }, { quoted: msg });
        } catch (err) { return sock.sendMessage(remoteJid, { text: "❌ Terjadi kesalahan saat menghubungi panel" }, { quoted: msg }); }
      }` : ''}
      default: { await sock.sendMessage(remoteJid, { text: '❓ Command tidak ada' }, { quoted: msg }); break; }
    }
  });
}
startBot();
`;

      zip.file('settings.js', settingsCase);
      zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "commonjs", main: "index.js", scripts: { start: "node index.js" }, dependencies: { "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2", "axios": "^1.7.2", "node-fetch": "^3.3.2", "fflate": "^0.8.2" } }, null, 2));
      zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
      zip.file('index.js', indexCase);

      const pf = zip.folder('plugins');
      list.forEach(f => { if(f !== 'panel') pf.file(f+'.js', `module.exports = {};\n`); });

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 3. ESM =================
    const settingsESM = `export default {
  botName: "${botName}", ownerNumber: "${ownerNumber}", ownerName: "${ownerName}",
  pairingNumber: "${pairingNumber}", prefix: ".", features: ${JSON.stringify(list)},
  menuType: "${menuType}", btnType: "${btnType}", thumbType: "${thumbType}", ${panelConfigString}
};
`;
    const indexESM = `import settings from './settings.js';
import {makeWASocket, useMultiFileAuthState, DisconnectReason } from 'noxleys-baileys';
import pino from 'pino'; import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';

const botName = settings.botName;
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();
global.panel = settings.panel || {};

console.log('Starting ESM ' + botName + ' - ' + settings.ownerName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ logger: pino({ level: "silent" }), auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){ setTimeout(async()=>{ try{ const code = await sock.requestPairingCode(settings.pairingNumber); console.log('Pairing Code ' + botName + ': ' + code); }catch(e){} }, 3000); }
  
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const plugins = [];
  if(fs.existsSync(pluginsDir)){
    const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
    for(const file of files){ const mod = await import(pathToFileURL(path.join(pluginsDir, file)).href); if(mod.default) plugins.push(mod.default); }
  }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(botName + ' Connected!');
    if(u.connection === 'close'){ const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if(r) setTimeout(()=>startBot(), 3000); }
  });
  sock.ev.on('group-participants.update', async (update) => { for(const p of plugins){ if(p.onParticipantsUpdate) await p.onParticipantsUpdate(sock, update); } });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0]; if(!msg || !msg.message) return;
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    if (body) console.log('[PESAN MASUK] Dari: ' + sender + ' | Isi: ' + body);
    if (msg.key.fromMe && !body.startsWith('.')) return;
    
    if(body && global.db.autoreply[body.toLowerCase()]){ await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg }); return; }
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){ if(!msg.key.fromMe){ try{ await sock.sendMessage(remoteJid, { delete: msg.key }); }catch{} } return; }
    if(!body.startsWith('.')) return;
    
    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase(); const text = args.join(' ');
    
    for(const p of plugins){ if(p.command && p.command.includes(command)){ try{ await p.handler(sock, msg, { remoteJid, sender, command, args, text, settings, isGroup: remoteJid.endsWith('@g.us') }); }catch(e){ console.error(e); } } }
  });
}
startBot();
`;

    zip.file('settings.js', settingsESM);
    zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "module", main: "index.js", scripts: { start: "node index.js" }, dependencies: { "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2", "axios": "^1.7.2", "node-fetch": "^3.3.2", "sharp": "^0.34.5", "jimp": "^0.22.12", "yt-search": "^2.13.1", "fflate": "^0.8.2" } }, null, 2));
    zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }, null, 2));
    zip.file('index.js', indexESM);

    const pf = zip.folder('plugins');

    if (list.includes('menu')) pf.file('menu.js', `import settings from '../settings.js'; import fs from 'fs'; export default { command: ['menu','help','start'], handler: async (sock, msg, o) => { let menuTxt = settings.menuType === 'simple' ? 'MENU ' + settings.botName + '\\n\\n' + settings.features.map(f => '❒ .' + f).join('\\n') : '╭━━━〔 ' + settings.botName + ' 〕━━━✦\\n┃ 👤 Owner: ' + settings.ownerName + '\\n┣━━━〔 ' + settings.features.length + ' FITUR 〕━━━\\n' + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + '\\n╰━━━━━━━━━━━━━━'; if (settings.btnType === 'btn') { let btnMsg = { text: menuTxt, footer: 'Powered by CiKiZz', buttons: [ { buttonId: '.menu', buttonText: { displayText: 'Refresh Menu' }, type: 1 } ], headerType: 1 }; if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) btnMsg.image = fs.readFileSync('./thumbnail.jpg'); try { await sock.sendMessage(o.remoteJid, btnMsg, { quoted: msg }); } catch (e) { await sock.sendMessage(o.remoteJid, { text: menuTxt }, { quoted: msg }); } } else { if (settings.thumbType === 'thumb' && fs.existsSync('./thumbnail.jpg')) await sock.sendMessage(o.remoteJid, { image: fs.readFileSync('./thumbnail.jpg'), caption: menuTxt }, { quoted: msg }); else await sock.sendMessage(o.remoteJid, { text: menuTxt }, { quoted: msg }); } } };`);
    if (list.includes('ping')) pf.file('ping.js', `export default { command: ['ping'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🏓 Pong!' }, { quoted: msg }); } };`);
    if (list.includes('owner')) pf.file('owner.js', `import settings from '../settings.js'; export default { command: ['owner'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '👑 Owner: ' + settings.ownerName + '\\n📱 wa.me/' + settings.ownerNumber }, { quoted: msg }); } };`);
    if (list.includes('info')) pf.file('info.js', `import settings from '../settings.js'; export default { command: ['info'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🤖 ' + settings.botName + '\\nEngine: Noxleys Baileys' }, { quoted: msg }); } };`);
    if (list.includes('runtime')) pf.file('runtime.js', `export default { command: ['runtime'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '⏱️ Uptime: ' + Math.floor((Date.now()-global.startTime)/1000) + 's' }, { quoted: msg }); } };`);
    if (list.includes('totfitur')) pf.file('totfitur.js', `import settings from '../settings.js'; export default { command: ['totfitur'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🧩 ' + settings.features.length }, { quoted: msg }); } };`);
    if (list.includes('speed')) pf.file('speed.js', `export default { command: ['speed'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '⚡ Speed OK' }, { quoted: msg }); } };`);
    if (list.includes('donasi')) pf.file('donasi.js', `export default { command: ['donasi'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '☕ Donasi Dana: 08xxx' }, { quoted: msg }); } };`);
    if (list.includes('say')) pf.file('say.js', `export default { command: ['say'], handler: async (sock, msg, o) => { if(o.text) await sock.sendMessage(o.remoteJid, { text: o.text }, { quoted: msg }); } };`);
    if (list.includes('quote')) pf.file('quote.js', `export default { command: ['quote'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '💭 "Teruslah berjuang."' }, { quoted: msg }); } };`);
    if (list.includes('welcome')) pf.file('welcome.js', `import settings from '../settings.js'; export default { command: ['welcome'], handler: async (sock, msg, o) => { if(o.text === 'on'){ if(!global.db.welcome.includes(o.remoteJid)) global.db.welcome.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Welcome ON' }, { quoted: msg }); } else if(o.text === 'off'){ global.db.welcome = global.db.welcome.filter(v=>v!==o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '❌ Welcome OFF' }, { quoted: msg }); } else { await sock.sendMessage(o.remoteJid, { text: 'Format: .welcome on / off' }, { quoted: msg }); } }, onParticipantsUpdate: async (sock, update) => { if(!global.db.welcome.includes(update.id)) return; if(update.action === 'add'){ for(const p of update.participants){ let t = '╭━━━〔 WELCOME 〕━━━✦\\n┃ 👋 Selamat datang +' + p.split('@')[0] + '\\n╰━━━〔 ' + settings.botName + ' 〕━━━'; await sock.sendMessage(update.id, { text: t, mentions: [p] }); } } } };`);
    if (list.includes('antilink')) pf.file('antilink.js', `export default { command: ['antilink'], handler: async (sock, msg, o) => { if(o.text === 'on'){ if(!global.db.antilink.includes(o.remoteJid)) global.db.antilink.push(o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Antilink ON' }, { quoted: msg }); } else if(o.text === 'off'){ global.db.antilink = global.db.antilink.filter(v=>v!==o.remoteJid); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '❌ Antilink OFF' }, { quoted: msg }); } else { await sock.sendMessage(o.remoteJid, { text: 'Format: .antilink on / off' }, { quoted: msg }); } } };`);
    if (list.includes('hidetag')) pf.file('hidetag.js', `export default { command: ['hidetag'], handler: async (sock, msg, o) => { const meta = await sock.groupMetadata(o.remoteJid); const mentions = meta.participants.map(p=>p.id); await sock.sendMessage(o.remoteJid, { text: o.text || '📢 Halo!', mentions }); } };`);
    if (list.includes('sticker')) pf.file('sticker.js', `import { downloadMediaMessage } from 'noxleys-baileys'; export default { command: ['s','sticker'], handler: async (sock, msg, o) => { if(!msg.message.imageMessage) return; try{ const b = await downloadMediaMessage(msg, 'buffer', {}); await sock.sendMessage(o.remoteJid, { sticker: b }, { quoted: msg }); }catch{} } };`);
    if (list.includes('tiktok') || list.includes('downloader')) pf.file('downloader.js', `import axios from 'axios'; export default { command: ['tiktok'], handler: async (sock, msg, o) => { if(!o.args[0]) return; try{ const r = await axios.get('https://tikwm.com/api/?url='+o.args[0]); await sock.sendMessage(o.remoteJid, { video: { url: r.data.data.play } }, { quoted: msg }); }catch{} } };`);
    if (list.includes('ai')) pf.file('ai.js', `import axios from 'axios'; export default { command: ['ai'], handler: async (sock, msg, o) => { if(!o.text) return; try{ const r = await axios.get('https://api.popcat.xyz/chatbot?msg='+encodeURIComponent(o.text)); await sock.sendMessage(o.remoteJid, { text: '🤖 ' + r.data.response }, { quoted: msg }); }catch{} } };`);
    if (list.includes('rpg')) pf.file('rpg.js', `export default { command: ['daily'], handler: async (sock, msg, o) => { if(!global.db.rpg[o.sender]) global.db.rpg[o.sender] = { money: 0, lastDaily: 0 }; if(Date.now()-global.db.rpg[o.sender].lastDaily < 86400000) return; global.db.rpg[o.sender].money += 1000; global.db.rpg[o.sender].lastDaily = Date.now(); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ +1000 Coin' }, { quoted: msg }); } };`);
    if (list.includes('store')) pf.file('store.js', `export default { command: ['store'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: '🛒 Store Kosong' }, { quoted: msg }); } };`);
    if (list.includes('autoreply')) pf.file('autoreply.js', `export default { command: ['addreply'], handler: async (sock, msg, o) => { const [k, ...v] = o.text.split('|'); if(!k || v.length===0) return; global.db.autoreply[k] = v.join('|'); global.saveDB(); await sock.sendMessage(o.remoteJid, { text: '✅ Ditambah' }, { quoted: msg }); } };`);
    if (list.includes('broadcast')) pf.file('broadcast.js', `export default { command: ['bc'], handler: async (sock, msg, o) => { if(!o.text) return; const groups = await sock.groupFetchAllParticipating(); for(const id of Object.keys(groups)){ try{ await sock.sendMessage(id, { text: o.text }); }catch{} } await sock.sendMessage(o.remoteJid, { text: '✅ Broadcast sent' }, { quoted: msg }); } };`);

    // PERBAIKAN FATAL: Formatting panel.js ESM agar tidak error sintaksis
    if (usePanel && list.includes('panel')) {
      pf.file('panel.js', `import fetch from "node-fetch"
import settings from "../settings.js"

const packages = { 
  '1gb': { ram: "1000", disk: "1000", cpu: "40" }, '2gb': { ram: "2000", disk: "1000", cpu: "60" }, 
  '3gb': { ram: "3000", disk: "2000", cpu: "80" }, '4gb': { ram: "4000", disk: "2000", cpu: "100" }, 
  '5gb': { ram: "5000", disk: "3000", cpu: "120" }, '6gb': { ram: "6000", disk: "3000", cpu: "140" }, 
  '7gb': { ram: "7000", disk: "4000", cpu: "160" }, '8gb': { ram: "8000", disk: "4000", cpu: "180" }, 
  '9gb': { ram: "9000", disk: "5000", cpu: "200" }, '10gb': { ram: "10000", disk: "5000", cpu: "220" }, 
  'unli': { ram: "0", disk: "0", cpu: "0" }, 'unlimited': { ram: "0", disk: "0", cpu: "0" } 
}

export default { 
  command: ['pannel','1gb','2gb','3gb','4gb','5gb','6gb','7gb','8gb','9gb','10gb','unli','unlimited','createadmin','listpanel','listadmin','delpanel','deladmin'], 
  handler: async (sock, m, o) => {
    const { domain, ptla, egg, loc } = global.panel || settings.panel || {}
    if (!domain || !ptla) return sock.sendMessage(o.remoteJid, { text: "❌ Panel belum disetting di settings.js" }, { quoted: m })
    
    let cmd = o.command.toLowerCase()
    if (cmd === "pannel") return sock.sendMessage(o.remoteJid, { text: \`☁️ MENU PANEL\\n\\n1GB - 10GB\\nUNLI\\ncreateadmin\\nlistpanel\\nlistadmin\\ndelpanel <id>\\ndeladmin <id>\` }, { quoted: m })
    
    try {
      if (cmd === "listpanel") { 
        let res = await fetch(domain + "/api/application/servers", { headers: { Authorization: "Bearer " + ptla } }); 
        let data = await res.json(); 
        if (!data.data?.length) return sock.sendMessage(o.remoteJid, { text: "Tidak ada server" }, { quoted: m }); 
        let txt = "📦 LIST SERVER\\n\\n"; 
        data.data.forEach(s => { 
          txt += \`ID: \${s.attributes.id}\\nName: \${s.attributes.name}\\nRAM: \${s.attributes.limits.memory == 0 ? "Unlimited" : s.attributes.limits.memory + "MB"}\\n\\n\`; 
        }); 
        return sock.sendMessage(o.remoteJid, { text: txt }, { quoted: m }); 
      }
      if (cmd === "listadmin") { 
        let res = await fetch(domain + "/api/application/users", { headers: { Authorization: "Bearer " + ptla } }); 
        let data = await res.json(); 
        if (!data.data?.length) return sock.sendMessage(o.remoteJid, { text: "Tidak ada user" }, { quoted: m }); 
        let txt = "👤 LIST USER PANEL\\n\\n"; 
        data.data.forEach(u => { 
          txt += \`ID: \${u.attributes.id}\\nUsername: \${u.attributes.username}\\nAdmin: \${u.attributes.root_admin ? "Yes" : "No"}\\n\\n\`; 
        }); 
        return sock.sendMessage(o.remoteJid, { text: txt }, { quoted: m }); 
      }
      if (cmd === "delpanel") { 
        if (!o.text) return sock.sendMessage(o.remoteJid, { text: "Contoh: .delpanel 3" }, { quoted: m }); 
        await fetch(domain + "/api/application/servers/" + o.text, { method: "DELETE", headers: { Authorization: "Bearer " + ptla } }); 
        return sock.sendMessage(o.remoteJid, { text: "✅ Server berhasil dihapus" }, { quoted: m }); 
      }
      if (cmd === "deladmin") { 
        if (!o.text) return sock.sendMessage(o.remoteJid, { text: "Contoh: .deladmin 5" }, { quoted: m }); 
        await fetch(domain + "/api/application/users/" + o.text, { method: "DELETE", headers: { Authorization: "Bearer " + ptla } }); 
        return sock.sendMessage(o.remoteJid, { text: "✅ User berhasil dihapus" }, { quoted: m }); 
      }
      
      if (!o.text || o.text.split(/[, ]/).length < 2) return sock.sendMessage(o.remoteJid, { text: \`Contoh:\\n.\${cmd} username,@tag\\n.\${cmd} username,628xxxx\` }, { quoted: m });
      
      let username = o.text.split(/[, ]/)[0];
      let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || o.sender;
      let jid = target.includes("@s.whatsapp.net") ? target : target.split("@")[0] + "@s.whatsapp.net";
      let email = username + "@panel.com";
      let password = Math.random().toString(36).slice(-8);
      
      await sock.sendMessage(o.remoteJid, { text: "✨ Creating server panel..." }, { quoted: m });
      
      let userRes = await fetch(domain + "/api/application/users", { 
        method: "POST", headers: { Authorization: "Bearer " + ptla, "Content-Type": "application/json" }, 
        body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }) 
      });
      let userData = await userRes.json(); 
      if (userData.errors) return sock.sendMessage(o.remoteJid, { text: JSON.stringify(userData.errors[0], null, 2) }, { quoted: m });
      
      let pack = packages[cmd];
      let serverRes = await fetch(domain + "/api/application/servers", { 
        method: "POST", headers: { Authorization: "Bearer " + ptla, "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          name: \`\${username} Server\`, user: userData.attributes.id, egg: parseInt(egg), docker_image: "ghcr.io/parkervcp/yolks:nodejs_22", 
          startup: "npm start", environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" }, 
          limits: { memory: parseInt(pack.ram), swap: 0, disk: parseInt(pack.disk), io: 500, cpu: parseInt(pack.cpu) }, 
          feature_limits: { databases: 5, backups: 5, allocations: 5 }, 
          deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] } 
        }) 
      });
      let serverData = await serverRes.json(); 
      if (serverData.errors) return sock.sendMessage(o.remoteJid, { text: JSON.stringify(serverData.errors[0], null, 2) }, { quoted: m });
      
      await sock.sendMessage(jid, { text: \`📦 DATA PANEL\\n\\nUsername: \${username}\\nPassword: \${password}\\nLogin: \${domain}\\n\\nRAM: \${pack.ram == 0 ? "Unlimited" : pack.ram + "MB"}\\nCPU: \${pack.cpu == 0 ? "Unlimited" : pack.cpu + "%"}\\nDisk: \${pack.disk == 0 ? "Unlimited" : pack.disk + "MB"}\` });
      return sock.sendMessage(o.remoteJid, { text: "✅ Server berhasil dibuat & data dikirim ke PC" }, { quoted: m });
      
    } catch (err) { 
      return sock.sendMessage(o.remoteJid, { text: "❌ Terjadi kesalahan saat menghubungi panel" }, { quoted: m }); 
    }
  } 
}
`);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
    return res.send(buffer);

  } catch (e) {
    console.error('Generate Error:', e);
    return res.status(500).json({ error: e.message });
  }
}