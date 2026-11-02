const JSZip = require('jszip');

function getCaseTemplate(cfg) {
  const { botName, owner, btn, thumb, features, pairingNumber, conn } = cfg;
  const cleanNumber = (pairingNumber || owner || '').replace(/[^0-9]/g, '');
  return `// ${botName} - CASE BASE FIX V4 by CiKiZz
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: ${conn==='qr' ? 'true' : 'false'},
    browser: ['${botName}', 'Chrome', '1.0'],
    markOnlineOnConnect: true
  });

  if (${conn==='pairing' ? 'true' : 'false'} && !sock.authState.creds.registered) {
    const phoneNumber = '${cleanNumber}';
    console.log('[CiKiZz] Pairing mode aktif: '+phoneNumber+' - Menunggu 8 detik...');
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log(\`\n==============================\nPAIRING CODE: \${code}\nMasukkan di WA > Perangkat Tertaut > Tautkan dengan nomor\nExpired 60 detik!\n==============================\`);
      } catch(e) { console.error('[PAIRING GAGAL]', e.message); }
    }, 8000);
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open') console.log('[CiKiZz] ${botName} Connected ✅');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const command = body.startsWith('.') ? body.slice(1).trim().split(' ').shift().toLowerCase() : '';
    
    switch(command) {
      case 'menu':
        let menuText = '*${botName} MENU*\\n\\n• .ping\\n• .sticker\\n';
        ${features.includes('downloader') ? "menuText += '• .tiktok / .ig / .yt\\n';" : ""}
        ${features.includes('ai') ? "menuText += '• .ai\\n';" : ""}
        menuText += '\\nPowered by CiKiZz';
        ${thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')) await sock.sendMessage(from, { image: fs.readFileSync('./thumb.jpg'), caption: menuText }); else await sock.sendMessage(from, { text: menuText });" : "await sock.sendMessage(from, { text: menuText });"}
        break;
      case 'ping': await sock.sendMessage(from, { text: 'Pong! ✅ ${botName} aktif' }); break;
    }
    ${features.includes('autoreply') ? "if(body.toLowerCase().includes('halo')) await sock.sendMessage(from, { text: 'Halo juga!' });" : ""}
  });
}
startBot();
`;
}

function getEsmTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  return `// ${cfg.botName} - ESM PLUGIN FIX V4
import makeWASocket, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: ${cfg.conn==='qr' ? 'true' : 'false'},
    browser: ['${cfg.botName}', 'Chrome', '1.0']
  });
  if (${cfg.conn==='pairing' ? 'true' : 'false'} && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode('${cleanNumber}');
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\\nPAIRING CODE: '+code+'\\n');
      } catch(e){ console.error(e.message); }
    }, 8000);
  }
  sock.ev.on('creds.update', saveCreds);
  const plugins = {};
  const pFolder = path.join(__dirname, 'plugins');
  if(fs.existsSync(pFolder)) {
    for(const f of fs.readdirSync(pFolder)) {
      if(f.endsWith('.js')) {
        const mod = await import('./plugins/'+f);
        plugins[f] = mod.default;
      }
    }
  }
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return;
    for(const k in plugins) { try { await plugins[k](m, sock); } catch(e){} }
  });
}
startBot();
`;
}

function getTelegramProTemplate(cfg) {
  return `require('dotenv').config();
const { Bot } = require('grammy');
const bot = new Bot(process.env.BOT_TOKEN || '${cfg.token}');
bot.command('start', (ctx) => ctx.reply('⚡ ${cfg.botName} Aktif! /menu'));
bot.command('menu', (ctx) => ctx.reply('Menu: ${cfg.features?.join(', ')}'));
bot.start();
console.log('${cfg.botName} RUNNING');
`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try {
    const cfg = req.body;
    if(!cfg.botName) return res.status(400).json({error:'botName wajib'});
    const zip = new JSZip();
    const safeName = cfg.botName.replace(/[^a-zA-Z0-9-_]/g,'-');
    let botCode = '';
    let deps = {};
    let fileName = 'index.js';

    if(cfg.type==='telegram') {
      botCode = getTelegramProTemplate(cfg);
      deps = { "grammy": "^1.24.0", "dotenv": "^16.4.5" };
    } else {
      deps = { "@whiskeysockets/baileys": "^6.7.18", "pino": "^9.3.2", "dotenv": "^16.4.5" };
      if(cfg.base==='case') botCode = getCaseTemplate(cfg);
      else {
        botCode = getEsmTemplate(cfg);
        zip.folder('plugins').file('menu.js', `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body==='.menu') await sock.sendMessage(m.key.remoteJid, { text: '*MENU ${cfg.botName}*' });
};`);
      }
    }

    zip.file(fileName, botCode);
    zip.file("package.json", JSON.stringify({
      name: safeName.toLowerCase(),
      version: "1.0.0",
      type: cfg.base==='esm' && cfg.type==='whatsapp' ? "module" : "commonjs",
      main: fileName,
      scripts: { start: "node "+fileName },
      dependencies: deps
    }, null, 2));

    if(cfg.thumb==='thumb' && cfg.thumbData) {
      zip.file("thumb.jpg", cfg.thumbData.split(',')[1], { base64: true });
    }

    const readme = `${cfg.botName} - FIX V4\nType:${cfg.type} Base:${cfg.base} Conn:${cfg.conn}\n\nINSTALL:\n1. Extract\n2. Hapus auth_info jika pairing gagal sebelumnya\n3. npm install\n4. npm start\n5. Pairing tunggu 8 detik, masukkan kode dalam 60 detik`;
    zip.file("README.txt", readme);
    zip.file(".env.example", cfg.type==='telegram' ? "BOT_TOKEN="+cfg.token : "# WA");
    zip.file(".gitignore", "node_modules\nauth_info\n.env");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename='+safeName+'.zip');
    res.send(buf);
  } catch(e) { res.status(500).json({ error: e.message }); }
}