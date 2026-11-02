const JSZip = require('jszip');

const PLUGIN_TEMPLATES = {
welcome: () => `export default async (m, sock) => {
  // Welcome handled via group-participants.update in main file
  // This plugin for extra welcome customization
  const body = m.message?.conversation || '';
  if(body === '.welcome on') await sock.sendMessage(m.key.remoteJid, { text: '✅ Welcome ON' });
  if(body === '.welcome off') await sock.sendMessage(m.key.remoteJid, { text: '❌ Welcome OFF' });
};`,
antilink: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.includes('chat.whatsapp.com')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⚠️ Antilink terdeteksi! Hapus link atau akan di-kick' });
    // await sock.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], 'remove');
  }
};`,
sticker: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(!body.startsWith('.s') && !body.startsWith('.sticker')) return;
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaType = quoted ? Object.keys(quoted)[0] : Object.keys(m.message)[0];
    if(mediaType.includes('image') || mediaType.includes('video')) {
      const buffer = await sock.downloadMediaMessage(m);
      await sock.sendMessage(m.key.remoteJid, { sticker: buffer });
    }
  } catch(e){ await sock.sendMessage(m.key.remoteJid, { text: '❌ Gagal bikin sticker' }) }
};`,
downloader: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.startsWith('.tiktok') || body.startsWith('.tt')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⏳ Tiktok Downloader... (Tambahkan scraper API lu disini)' });
  }
  if(body.startsWith('.ig') || body.startsWith('.instagram')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⏳ IG Downloader...' });
  }
  if(body.startsWith('.yt') || body.startsWith('.youtube')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⏳ YT Downloader...' });
  }
};`,
ai: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.startsWith('.ai ') || body.startsWith('.gpt ') || body.startsWith('.openai ')) {
    const prompt = body.slice(4);
    await sock.sendMessage(m.key.remoteJid, { text: '🤖 AI Thinking...\\n\\nPrompt: '+prompt+'\\n\\n(Integrasikan OpenAI API key lu disini)' });
  }
};`,
group: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.hidetag') {
    const meta = await sock.groupMetadata(m.key.remoteJid);
    const mentions = meta.participants.map(p => p.id);
    await sock.sendMessage(m.key.remoteJid, { text: '👥 Hidetag by bot', mentions });
  }
  if(body.startsWith('.kick @')) {
    await sock.sendMessage(m.key.remoteJid, { text: 'Kick fitur aktif' });
  }
  if(body === '.open') await sock.groupSettingUpdate(m.key.remoteJid, 'not_announcement');
  if(body === '.close') await sock.groupSettingUpdate(m.key.remoteJid, 'announcement');
};`,
rpg: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.daily') await sock.sendMessage(m.key.remoteJid, { text: '💰 Daily! +1000 coin\\nBalance: 1000' });
  if(body === '.inv' || body === '.inventory') await sock.sendMessage(m.key.remoteJid, { text: '🎒 Inventory:\\n- Coin: 1000\\n- Sword: 0' });
  if(body === '.adventure') await sock.sendMessage(m.key.remoteJid, { text: '🗺️ Adventure dimulai! Dapat 500 XP' });
};`,
store: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.addproduk')) await sock.sendMessage(m.key.remoteJid, { text: '✅ Produk ditambahkan\\nFormat: .addproduk nama|harga|deskripsi' });
  if(body === '.listproduk' || body === '.shop') await sock.sendMessage(m.key.remoteJid, { text: '🛒 STORE\\nBelum ada produk. Ketik .addproduk' });
};`,
autoreply: () => `export default async (m, sock) => {
  const body = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase();
  if(body === 'halo' || body === 'hai' || body === 'hello') await sock.sendMessage(m.key.remoteJid, { text: 'Halo juga! 👋 Ketik .menu' });
  if(body === 'bot') await sock.sendMessage(m.key.remoteJid, { text: 'Ya? Aku online kok 🤖' });
  if(body === 'p') await sock.sendMessage(m.key.remoteJid, { text: 'Apa? Ketik .menu dong' });
};`,
broadcast: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.bc ') || body.startsWith('.broadcast ')) {
    const text = body.slice(body.indexOf(' ')+1);
    await sock.sendMessage(m.key.remoteJid, { text: '📢 Broadcast berhasil dikirim:\\n\\n'+text });
  }
};`
};

function getMenuPlugin(cfg) {
  const botName = cfg.botName || 'Bot';
  const features = cfg.features || [];
  const style = cfg.menuStyle || 'premium';
  const thumb = cfg.thumb || 'nothumb';
  const list = features.map(f => `│ ◦ .${f}`).join('\\n');
  const simpleList = features.map(f => `• .${f}`).join('\\n');

  if(style === 'simple') {
    return `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const text = \`MENU ${botName}
${features.join(', ')}

${simpleList}

Powered by CiKiZz V6.2\`;
  await sock.sendMessage(m.key.remoteJid, { text });
};`;
  }

  if(style === 'button') {
    return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const caption = \`✨ *${botName} MENU PREMIUM*

┏━━━ Features
${list}
┗━━━━━━━━━━━━━━
Powered by CiKiZz\`;

  const buttons = [
    { buttonId: '.ping', buttonText: { displayText: '📶 PING BOT' }, type: 1 },
    { buttonId: '.sticker', buttonText: { displayText: '🎨 STICKER' }, type: 1 },
    { buttonId: '.ai halo', buttonText: { displayText: '🤖 AI CHAT' }, type: 1 }
  ];

  try {
    // METODE 1: Image + Buttons (paling ampuh, anti gagal)
    const img = ${thumb==='thumb' ? "fs.existsSync('./thumb.jpg') ? fs.readFileSync('./thumb.jpg') : { url: 'https://i.ibb.co/6yQp0Y0/cikizz-thumb.jpg' }" : "{ url: 'https://i.ibb.co/6yQp0Y0/cikizz-thumb.jpg' }"};
    await sock.sendMessage(m.key.remoteJid, {
      image: img,
      caption: caption,
      footer: '${botName} • Tap button di bawah',
      buttons: buttons,
      headerType: 4
    });
  } catch(e1) {
    try {
      // METODE 2: Text + Buttons (fallback)
      await sock.sendMessage(m.key.remoteJid, {
        text: caption,
        footer: '${botName} - Button Menu',
        buttons: buttons,
        headerType: 1
      });
    } catch(e2) {
      // METODE 3: Text biasa (kalo WA blokir button)
      await sock.sendMessage(m.key.remoteJid, { text: caption + '\\n\\n📍 Tombol: .ping | .sticker | .ai' });
    }
  }
};`;
  }

  if(style === 'image') {
    return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const caption = \`╭─「 *${botName}* 」
│ Base: ${cfg.base} | ${cfg.conn}
│ Owner: ${cfg.owner || '628xxx'}
│
${list}
│
╰─ Powered by CiKiZz V6.2\`;
  try {
    if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')) {
      await sock.sendMessage(m.key.remoteJid, { image: fs.readFileSync('./thumb.jpg'), caption });
    } else {
      await sock.sendMessage(m.key.remoteJid, { text: caption });
    }
  } catch { await sock.sendMessage(m.key.remoteJid, { text: caption }); }
};`;
  }

  // PREMIUM BOX - Default
  return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const text = \`
╭━━━〔 *${botName}* 〕━━━
┃ Owner: ${cfg.owner || '628xxx'}
┃ Base: ${cfg.base} | ${cfg.conn}
┃ Status: Online ✅
┣━━━━━━━━━━━━━━━━━━━━━━
${list}
┣━━━━━━━━━━━━━━━━━━━━━━
┃ Ketik .ping untuk cek bot
╰━━━━━━━━━━━━━━━━━━━━━━
Powered by CiKiZz V6.2\`;
  try {
    ${thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')) { await sock.sendMessage(m.key.remoteJid, { image: fs.readFileSync('./thumb.jpg'), caption: text }); return; }" : ""}
    await sock.sendMessage(m.key.remoteJid, { text });
  } catch { await sock.sendMessage(m.key.remoteJid, { text }); }
};`;
}

function getCaseTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  const extraCases = cfg.features.map(f => {
    if(f==='sticker') return "case 's': case 'sticker': { const buf = m.message?.imageMessage ? await sock.downloadMediaMessage(m) : null; if(buf) await sock.sendMessage(from, { sticker: buf }); break; }";
    if(f==='ai') return "case 'ai': case 'gpt': await sock.sendMessage(from, { text: 'AI: '+q+' (tambahkan OpenAI API)' }); break;";
    if(f==='downloader') return "case 'tiktok': case 'tt': case 'ig': case 'yt': await sock.sendMessage(from, { text: 'Downloader aktif: '+command }); break;";
    return `case '${f}': await sock.sendMessage(from, { text: '✅ Fitur ${f} aktif di CASE mode!' }); break;`;
  }).join('\n      ');

  return `// ${cfg.botName} - CASE BASE V6.2 BUTTON BENERAN by CiKiZz
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: ${cfg.conn==='qr'},
    browser: ['${cfg.botName}', 'Chrome', '1.0'],
    markOnlineOnConnect: true
  });

  if (${cfg.conn==='pairing'} && !sock.authState.creds.registered) {
    const phoneNumber = '${cleanNumber}';
    console.log('[CiKiZz V6.2] Pairing mode: '+phoneNumber+' - Delay 8 detik...');
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\\n==============================\\nPAIRING CODE: '+code+'\\nMasukkan di WA > Perangkat Tertaut > Tautkan nomor\\nExpired 60 detik!\\n==============================\\n');
      } catch(e) { console.error('[PAIRING GAGAL]', e.message); }
    }, 8000);
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Reconnect:', shouldReconnect);
      if(shouldReconnect) startBot();
    } else if(connection === 'open') console.log('${cfg.botName} Connected ✅');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const args = body.split(' '); const command = body.startsWith('.') ? args[0].slice(1).toLowerCase() : ''; const q = args.slice(1).join(' ');
    
    if(command === 'menu') {
      let menuText = '';
      const style = '${cfg.menuStyle}';
      if(style === 'simple') menuText = '*${cfg.botName}*\\n${cfg.features.join('\\n')}';
      else if(style === 'button') {
        // BUTTON BENERAN DI CASE JUGA
        const buttons = [
          { buttonId: '.ping', buttonText: { displayText: '📶 PING' }, type: 1 },
          { buttonId: '.sticker', buttonText: { displayText: '🎨 STICKER' }, type: 1 },
          { buttonId: '.ai halo', buttonText: { displayText: '🤖 AI' }, type: 1 }
        ];
        try {
          await sock.sendMessage(from, { text: '✨ *${cfg.botName} MENU*\\n${cfg.features.map(f=>'• .'+f).join('\\n')}', footer: '${cfg.botName}', buttons, headerType: 1 });
          return;
        } catch { menuText = 'MENU ${cfg.botName}\\n${cfg.features.join('\\n')}'; }
      } else menuText = '╭─ ${cfg.botName}\\n${cfg.features.map(f=>'│ • .'+f).join('\\n')}\\n╰─ CiKiZz V6.2';
      
      ${cfg.thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')) await sock.sendMessage(from, { image: fs.readFileSync('./thumb.jpg'), caption: menuText }); else await sock.sendMessage(from, { text: menuText });" : "await sock.sendMessage(from, { text: menuText });"}
      return;
    }

    switch(command) {
      case 'ping': await sock.sendMessage(from, { text: 'Pong! ${cfg.botName} aktif ✅' }); break;
      ${extraCases}
    }
    ${cfg.features.includes('autoreply') ? "if(body.toLowerCase()==='halo') await sock.sendMessage(from, { text: 'Halo juga!' });" : ""}
  });
}
startBot();
console.log('[CiKiZz] Starting ${cfg.botName} V6.2...');
`;
}

function getEsmTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  return `// ${cfg.botName} - ESM PLUGIN V6.2 BUTTON BENERAN
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
    printQRInTerminal: ${cfg.conn==='qr'},
    browser: ['${cfg.botName}', 'Chrome', '1.0']
  });

  if (${cfg.conn==='pairing'} && !sock.authState.creds.registered) {
    const phoneNumber = '${cleanNumber}';
    console.log('[CiKiZz V6.2] Pairing mode: '+phoneNumber);
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\\nPAIRING CODE: '+code+'\\n');
      } catch(e) { console.error('Pairing gagal:', e.message); }
    }, 8000);
  }

  sock.ev.on('creds.update', saveCreds);
  
  const plugins = {};
  const pluginFolder = path.join(__dirname, 'plugins');
  if(fs.existsSync(pluginFolder)) {
    for(const file of fs.readdirSync(pluginFolder)) {
      if(file.endsWith('.js')) {
        try {
          const mod = await import('./plugins/'+file);
          plugins[file] = mod.default;
          console.log('Loaded plugin: '+file);
        } catch(e){ console.log('Gagal load '+file+': '+e.message) }
      }
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return;
    for(const key in plugins) {
      try { await plugins[key](m, sock); } catch(err){ console.log('Error plugin '+key+': '+err.message) }
    }
  });

  sock.ev.on('connection.update', (u) => {
    if(u.connection === 'open') console.log('${cfg.botName} READY ✅ V6.2 - Plugins: '+Object.keys(plugins).length);
  });
}
startBot();
`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const cfg = req.body;
    if(!cfg.botName) return res.status(400).json({ error: 'botName wajib' });
    if(!cfg.features || cfg.features.length === 0) cfg.features = ['welcome','sticker'];
    
    const zip = new JSZip();
    const safeName = cfg.botName.replace(/[^a-zA-Z0-9-_]/g, '-');
    let botCode = '';
    let deps = { "@whiskeysockets/baileys": "^6.7.18", "pino": "^9.3.2" };
    let fileName = 'index.js';

    if(cfg.type === 'telegram') {
      botCode = `require('dotenv').config();
const { Bot } = require('grammy');
const bot = new Bot(process.env.BOT_TOKEN || '${cfg.token}');
bot.command('start', (ctx) => ctx.reply('⚡ ${cfg.botName} Aktif! /menu'));
bot.command('menu', (ctx) => ctx.reply('Menu: ${cfg.features?.join(', ')}'));
bot.start();
console.log('${cfg.botName} RUNNING');
`;
      deps = { "grammy": "^1.24.0", "dotenv": "^16.4.5" };
    } else {
      if(cfg.base === 'case') {
        botCode = getCaseTemplate(cfg);
      } else {
        botCode = getEsmTemplate(cfg);
        const pluginsFolder = zip.folder('plugins');
        // MENU WAJIB ADA
        pluginsFolder.file('menu.js', getMenuPlugin(cfg));
        // FITUR LAIN SESUAI PILIHAN - SEMUA KE-GENERATE
        for(const feat of cfg.features) {
          if(PLUGIN_TEMPLATES[feat]) {
            pluginsFolder.file(feat+'.js', PLUGIN_TEMPLATES[feat](cfg));
          }
        }
      }
    }

    zip.file(fileName, botCode);
    zip.file("package.json", JSON.stringify({
      name: safeName.toLowerCase(),
      version: "6.2.0",
      type: cfg.base === 'esm' && cfg.type === 'whatsapp' ? "module" : "commonjs",
      main: fileName,
      scripts: { start: "node "+fileName },
      dependencies: deps
    }, null, 2));

    if(cfg.thumb === 'thumb' && cfg.thumbData) {
      const base64Data = cfg.thumbData.split(',')[1];
      zip.file("thumb.jpg", base64Data, { base64: true });
    }

    const readme = `
${cfg.botName} - CiKiZz PRO MAX V6.2

FIX BUTTON BENERAN (bukan text lagi)
- Menu Style: ${cfg.menuStyle}
- Thumb: ${cfg.thumb}
- Base: ${cfg.base}
- Conn: ${cfg.conn}
- Features: ${cfg.features.join(', ')}

Isi ZIP:
- ${fileName} (main bot)
- plugins/ (isi ${cfg.features.length} file + menu.js = ${cfg.features.length + 1} file)
    - menu.js (${cfg.menuStyle} style, BUTTON BENERAN)
  ${cfg.features.map(f => `- ${f}.js`).join('\n  ')}

CARA INSTALL PTERO:
1. Extract ZIP
2. Hapus auth_info jika pairing gagal
3. npm install
4. npm start
5. Jika pairing: tunggu 8 detik, masukkan kode XX-XX dalam 60 detik
6. Ketik .menu di WA -> akan muncul tombol asli PING | STICKER | AI

Button fix V6.2: Image+Buttons anti blokir WA
`;

    zip.file("README.txt", readme);
    zip.file("CARA-INSTALL.txt", readme);
    zip.file(".env.example", cfg.type==='telegram' ? "BOT_TOKEN="+cfg.token : "# WA - tidak perlu token");
    zip.file(".gitignore", "node_modules\nauth_info\n.env\nthumb.jpg\n");

    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename='+safeName+'.zip');
    res.send(buf);

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}