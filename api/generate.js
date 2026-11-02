const JSZip = require('jszip');

// CASE BASE - FIX PAIRING V3
function getCaseTemplate(cfg) {
  const { botName, owner, btn, thumb, features, pairingNumber, conn } = cfg;
  const cleanNumber = (pairingNumber || owner || '').replace(/[^0-9]/g, '');
  return `// ${botName} - CASE BASE FIX V3 by CiKiZz
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

const ownerNumber = '${owner || cleanNumber}';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
    },
    logger: P({ level: 'silent' }),
    printQRInTerminal: ${conn==='qr' ? 'true' : 'false'},
    browser: ['${botName}', 'Chrome', '1.0'],
    markOnlineOnConnect: true
  });

  // === PAIRING CODE FIX V3 - DELAY 8 DETIK ===
  if (${conn==='pairing' ? 'true' : 'false'} && !sock.authState.creds.registered) {
    const phoneNumber = '${cleanNumber}';
    if(!phoneNumber || phoneNumber.length < 10) {
      console.log('[ERROR] Nomor pairing tidak valid! Contoh: 6281234567890');
    } else {
      console.log('[CiKiZz] Pairing mode aktif, nomor: '+phoneNumber+' - Menunggu 8 detik...');
      setTimeout(async () => {
        try {
          let code = await sock.requestPairingCode(phoneNumber);
          code = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log(\`

PAIRING CODE: \${code}
Cara: Buka WA > Settings > Linked Devices > Link with phone number > Masukkan kode di atas
Kode expired 60 detik! Jika gagal, hapus folder auth_info dan restart
==============================\`);
        } catch(e) {
          console.error('[PAIRING GAGAL]', e.message, '\\nHapus folder auth_info lalu npm start lagi');
        }
      }, 8000);
    }
  }

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[CiKiZz] Connection closed, reconnect:', shouldReconnect);
      if(shouldReconnect) startBot();
    } else if(connection === 'open') {
      console.log('[CiKiZz] ${botName} Connected ✅');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const isCmd = body.startsWith('.');
    const command = isCmd ? body.slice(1).trim().split(' ').shift().toLowerCase() : '';
    
    switch(command) {
      case 'menu':
        let menuText = '*${botName} MENU*\\n\\n• .ping\\n• .sticker\\n';
        ${features.includes('downloader') ? "menuText += '• .tiktok / .ig / .yt\\n';" : ""}
        ${features.includes('ai') ? "menuText += '• .ai / .gpt\\n';" : ""}
        menuText += '\\nPowered by CiKiZz';
        ${btn==='button' ? `
        try {
          await sock.sendMessage(from, {
            text: menuText,
            footer: '${botName}',
            buttons: [{ buttonId: '.ping', buttonText: { displayText: 'PING' }, type: 1 }],
            headerType: 1
          });
        } catch { await sock.sendMessage(from, { text: menuText }); }` : `
        ${thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')){ await sock.sendMessage(from, { image: fs.readFileSync('./thumb.jpg'), caption: menuText }); } else { await sock.sendMessage(from, { text: menuText }); }" : "await sock.sendMessage(from, { text: menuText });" }
        `}
        break;
      case 'ping': await sock.sendMessage(from, { text: 'Pong! ✅ ${botName} aktif' }); break;
      ${features.includes('sticker') ? "case 's': case 'sticker': { const quoted = m.message?.extendedTextMessage ? await sock.downloadMediaMessage(m) : null; await sock.sendMessage(from, { sticker: quoted || m.message }); break; }" : ""}
    }
    ${features.includes('autoreply') ? "if(!isCmd && body.toLowerCase().includes('halo')) await sock.sendMessage(from, { text: 'Halo juga!' });" : ""}
  });
}
startBot();
console.log('[CiKiZz] Starting ${botName}...');
`;
}

// ESM PLUGIN BASE - FIX PAIRING V3
function getEsmTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  return `// ${cfg.botName} - ESM PLUGIN FIX V3
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
    const phoneNumber = '${cleanNumber}';
    console.log('[CiKiZz] Pairing mode: '+phoneNumber+' (8s delay)');
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\\nPAIRING CODE: '+code+'\\n');
      } catch(e){ console.error('Pairing gagal:', e.message); }
    }, 8000);
  }

  sock.ev.on('creds.update', saveCreds);
  const plugins = {};
  const pluginFolder = path.join(__dirname, 'plugins');
  if(fs.existsSync(pluginFolder)) {
    for(const file of fs.readdirSync(pluginFolder)) {
      if(file.endsWith('.js')) {
        const mod = await import('./plugins/'+file);
        plugins[file] = mod.default;
      }
    }
  }
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return;
    for(const k in plugins) { try { await plugins[k](m, sock); } catch(e){ console.log(e) } }
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
    let fileName = cfg.base==='esm' && cfg.type==='whatsapp' ? 'index.js' : 'bot.js';

    if(cfg.type==='telegram') {
      botCode = getTelegramProTemplate(cfg);
      deps = { "grammy": "^1.24.0", "dotenv": "^16.4.5" };
    } else {
      // PAKAI VERSI TERBARU - INI KUNCI FIX PAIRING
      deps = { "@whiskeysockets/baileys": "^6.7.18", "pino": "^9.3.2", "dotenv": "^16.4.5" };
      if(cfg.base==='case') {
        fileName = 'index.js';
        botCode = getCaseTemplate(cfg);
      } else {
        fileName = 'index.js';
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
      const base64Data = cfg.thumbData.split(',')[1];
      zip.file("thumb.jpg", base64Data, { base64: true });
    }

    const readme = `
${cfg.botName} - FIX PAIRING V3
Type: ${cfg.type} | Base: ${cfg.base} | Conn: ${cfg.conn}

CARA INSTALL PTERO - WAJIB URUT:
1. Upload ZIP > Extract
2. Hapus folder auth_info jika ada (penting untuk pairing baru)
3. npm install
4. npm start
5. Jika pilih PAIRING: tunggu 8 detik, kode akan muncul di console
   Contoh: PAIRING CODE: W1AK-2MYZ
   Masukkan dalam 60 detik di WA > Perangkat Tertaut > Tautkan dengan nomor telepon
   Jika gagal: Hapus auth_info > npm start lagi > Masukkan kode baru cepat

Jika pilih QR: QR akan muncul, scan langsung

Baileys versi terbaru: 6.7.18 (fix pairing gagal)
`;

    zip.file("README.txt", readme);
    zip.file("CARA-INSTALL.txt", readme);
    zip.file(".env.example", cfg.type==='telegram' ? "BOT_TOKEN="+cfg.token : "# WA tidak perlu token");
    zip.file(".gitignore", "node_modules\nauth_info\n.env\n");

    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename='+safeName+'.zip');
    res.send(buf);

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}