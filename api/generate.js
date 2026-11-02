const JSZip = require('jszip');

function getCaseTemplate(cfg) {
  const { botName, owner, btn, thumb, features } = cfg;
  return `// ${botName} - CASE BASE by CiKiZz
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

const ownerNumber = '${owner || '628xxx'}';
const thumbPath = ${thumb==='thumb' ? "'./thumb.jpg'" : "null"};
${features.includes('antilink') ? "const antilink = true;" : ""}
${features.includes('welcome') ? "const welcome = true;" : ""}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state, logger: P({ level: 'silent' }),
    printQRInTerminal: ${cfg.conn==='qr' ? 'true' : 'false'},
    browser: ['${botName}', 'Chrome', '1.0']
  });
  ${cfg.conn==='pairing' ? `
  if(!sock.authState.creds.registered) {
    const phoneNumber = '${cfg.pairingNumber || owner}';
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log('PAIRING CODE:', code);
    }, 3000);
  }` : ''}
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const isCmd = body.startsWith('.');
    const command = isCmd ? body.slice(1).trim().split(' ').shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);

    // CASE HANDLER
    switch(command) {
      case 'menu':
        let menuText = '*${botName} MENU*\\n\\n';
        menuText += '• .ping\\n• .sticker\\n';
        ${features.includes('downloader') ? "menuText += '• .tiktok / .ig / .yt\\n';" : ""}
        ${features.includes('ai') ? "menuText += '• .ai / .gpt\\n';" : ""}
        menuText += '\\nPowered by CiKiZz';
        ${btn==='button' ? `
        await sock.sendMessage(from, {
          text: menuText,
          footer: '${botName}',
          buttons: [{ buttonId: '.ping', buttonText: { displayText: 'PING' }, type: 1 }],
          headerType: 1,
          ${thumb==='thumb' ? "image: fs.existsSync('./thumb.jpg') ? fs.readFileSync('./thumb.jpg') : undefined" : ""}
        });` : `
        ${thumb==='thumb' ? "const thumb = fs.existsSync('./thumb.jpg') ? { image: fs.readFileSync('./thumb.jpg'), caption: menuText } : { text: menuText }; await sock.sendMessage(from, thumb);" : "await sock.sendMessage(from, { text: menuText });" }
        `}
        break;
      case 'ping': await sock.sendMessage(from, { text: 'Pong! ✅' }); break;
      ${features.includes('sticker') ? "case 's': case 'sticker': await sock.sendMessage(from, { sticker: m.message }); break;" : ""}
      ${features.includes('autoreply') ? "default: if(!isCmd && body.toLowerCase().includes('halo')) { await sock.sendMessage(from, { text: 'Halo juga!' }); } break;" : ""}
    }
  });
}
startBot();
`;
}

function getEsmTemplate(cfg) {
  return `// ${cfg.botName} - ESM PLUGIN BASE
// index.js
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plugins = {};

async function loadPlugins() {
  const pluginFolder = path.join(__dirname, 'plugins');
  if(!fs.existsSync(pluginFolder)) return;
  for(const file of fs.readdirSync(pluginFolder)) {
    if(file.endsWith('.js')) {
      const plugin = await import('./plugins/'+file);
      plugins[file.replace('.js','')] = plugin.default;
    }
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state, logger: P({ level: 'silent' }),
    printQRInTerminal: ${cfg.conn==='qr' ? 'true' : 'false'},
    browser: ['${cfg.botName}', 'Chrome', '1.0']
  });
  ${cfg.conn==='pairing' ? `
  if(!sock.authState.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode('${cfg.pairingNumber || cfg.owner}');
      console.log('PAIRING CODE:', code);
    }, 3000);
  }` : ''}
  sock.ev.on('creds.update', saveCreds);
  await loadPlugins();
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return;
    for(const name in plugins) { try { await plugins[name](m, sock); } catch(e){console.log(e)} }
  });
}
startBot();
`;
}

function getTelegramProTemplate(cfg) {
  const { botName, token, btn, thumb, features } = cfg;
  return `// ${botName} TELEGRAM PRO
require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const fs = require('fs');
const bot = new Bot(process.env.BOT_TOKEN || '${token}');

bot.command('start', async (ctx) => {
  const text = '⚡ *${botName}*\\nPowered by CiKiZz PRO MAX';
  ${btn==='button' ? `const keyboard = new InlineKeyboard().text('Menu', 'menu').text('Ping', 'ping');
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });` : `await ctx.reply(text, { parse_mode: 'Markdown' });`}
});

bot.command('menu', async (ctx) => {
  let menu = '*MENU ${botName}*\\n';
  ${features.map(f=>`menu += '• ${f}\\n';`).join('')}
  ${thumb==='thumb' && btn==='button' ? `
  if(fs.existsSync('./thumb.jpg')) {
    await ctx.replyWithPhoto(fs.createReadStream('./thumb.jpg'), { caption: menu, parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('Support', 'support') });
  } else { await ctx.reply(menu, { parse_mode: 'Markdown' }); }` : `await ctx.reply(menu, { parse_mode: 'Markdown' });`}
});

bot.start();
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
    let fileName = 'bot.js';

    if(cfg.type==='telegram') {
      botCode = getTelegramProTemplate(cfg);
      deps = { "grammy": "^1.24.0", "dotenv": "^16.4.5" };
    } else {
      if(cfg.base==='case') {
        botCode = getCaseTemplate(cfg);
        fileName = 'index.js';
        deps = { "@whiskeysockets/baileys": "^6.7.8", "pino": "^8.17.2", "dotenv": "^16.4.5" };
      } else {
        botCode = getEsmTemplate(cfg);
        fileName = 'index.js';
        deps = { "@whiskeysockets/baileys": "^6.7.8", "pino": "^8.17.2", "dotenv": "^16.4.5" };
        // Buat plugin contoh
        zip.folder('plugins').file('menu.js', `export default async (m, sock) => {
  const from = m.key.remoteJid;
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body==='.menu') {
    await sock.sendMessage(from, { text: '*MENU ${cfg.botName}*\\n\\n.ping\\n.sticker'${cfg.btn==='button' ? " + '\\nButton aktif'" : ""} });
  }
  if(body==='.ping') await sock.sendMessage(from, { text: 'Pong!' });
};`);
      }
    }

    zip.file(fileName, botCode);
    zip.file("package.json", JSON.stringify({
      name: safeName.toLowerCase(),
      version: "1.0.0",
      type: cfg.base==='esm' && cfg.type==='whatsapp' ? "module" : "commonjs",
      main: fileName,
      scripts: { start: `node ${fileName}` },
      dependencies: deps
    }, null, 2));

    // Thumbnail jika ada
    if(cfg.thumb==='thumb' && cfg.thumbData) {
      const base64Data = cfg.thumbData.split(',')[1];
      zip.file("thumb.jpg", base64Data, { base64: true });
    }

    const readme = `
${cfg.botName} - PRO MAX
Type: ${cfg.type} | Base: ${cfg.base} | Conn: ${cfg.conn} | Button: ${cfg.btn} | Thumb: ${cfg.thumb}
Features: ${cfg.features?.join(', ')}

INSTALL DI PTERO:
1. Extract ZIP
2. npm install
   -> akan install: ${Object.keys(deps).join(', ')}
3. ${cfg.type==='telegram' ? 'Isi BOT_TOKEN di .env' : cfg.conn==='pairing' ? 'Isi nomor pairing di index.js / siapin nomor WA, code akan muncul di console' : 'QR akan muncul di console, scan pakai WA'}
4. npm start

Jika button aktif: menu akan pakai button
Jika thumbnail aktif: pakai thumb.jpg yang kamu upload
Base ESM: pakai folder plugins/
Base CASE: semua fitur di case.js (switch case)
`;
    zip.file("README.txt", readme);
    zip.file(".env.example", cfg.type==='telegram' ? `BOT_TOKEN=${cfg.token||''}` : "# WA tidak butuh token");
    zip.file(".gitignore", "node_modules\nauth_info\n.env");

    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}.zip`);
    res.send(buf);

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}