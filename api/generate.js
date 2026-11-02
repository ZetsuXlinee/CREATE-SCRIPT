const JSZip = require('jszip');

// TEMPLATE TELEGRAM
function getTelegramTemplate(botName, token, features) {
  return `require('dotenv').config();
const { Bot } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN || '${token}');

console.log('[CiKiZz] Starting ${botName}...');

// START
bot.command('start', async (ctx) => {
  await ctx.reply(
    '⚡ Halo! Saya *${botName}*\\n' +
    'Dibuat dengan CiKiZz Generate Script\\n\\n' +
    '/help untuk bantuan',
    { parse_mode: 'Markdown' }
  );
});

// HELP
bot.command('help', async (ctx) => {
  await ctx.reply('📜 Menu ${botName}:\\n/start - Mulai\\n/help - Bantuan' + 
  ${features.includes('broadcast') ? "'\\n/bc <pesan> - Broadcast (admin)'" : "''"});
});

${features.includes('autoreply') ? `
// AUTO REPLY
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.toLowerCase();
  if(text.includes('halo') || text.includes('hai')) {
    await ctx.reply('Halo juga! Ada yang bisa dibantu?');
  }
});
` : ''}

${features.includes('broadcast') ? `
// BROADCAST - Set ADMIN_ID di .env
const ADMIN_ID = process.env.ADMIN_ID || '';
bot.command('bc', async (ctx) => {
  if(ADMIN_ID && ctx.from.id.toString() !== ADMIN_ID) return ctx.reply('⛔ Bukan admin!');
  const msg = ctx.match;
  if(!msg) return ctx.reply('Cara: /bc Halo semua');
  await ctx.reply('✅ Broadcast terkirim (demo, tambah DB untuk real broadcast)');
});
` : ''}

${features.includes('logging') ? `
// LOGGING
bot.use(async (ctx, next) => {
  console.log(\`[LOG] \${ctx.from?.id} - \${ctx.message?.text}\`);
  await next();
});
` : ''}

bot.catch((err) => console.error('[ERROR]', err));

bot.start();
console.log('[CiKiZz] ${botName} RUNNING! ✅');
`;
}

// TEMPLATE WHATSAPP
function getWhatsappTemplate(botName, features) {
  return `require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['CiKiZz Bot', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[CiKiZz] Connection closed, reconnecting:', shouldReconnect);
      if(shouldReconnect) startBot();
    } else if(connection === 'open') {
      console.log('[CiKiZz] ${botName} Connected ✅');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const from = m.key.remoteJid;

    if(text.toLowerCase() === '.menu') {
      await sock.sendMessage(from, { text: '⚡ *${botName}*\\n\\n.menu - Menu\\n.ping - Cek bot\\n.sticker - Jadikan sticker\\n\\nDibuat dengan CiKiZz Generate Script' });
    }
    if(text.toLowerCase() === '.ping') {
      await sock.sendMessage(from, { text: 'Pong! ✅ ${botName} aktif' });
    }
    ${features.includes('autoreply') ? `
    if(text.toLowerCase().includes('halo')) {
      await sock.sendMessage(from, { text: 'Halo juga! Saya ${botName}' });
    }` : ''}

    ${features.includes('logging') ? `console.log(\`[LOG] \${from}: \${text}\`);` : ''}
  });
}

startBot();
console.log('[CiKiZz] Starting ${botName}...');
console.log('[CiKiZz] Tunggu QR Code muncul lalu scan pakai WhatsApp!');
`;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { botName, token, type, features } = req.body;
    
    if(!botName || !type) return res.status(400).json({ error: 'botName & type wajib diisi' });

    const zip = new JSZip();
    const safeName = botName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/\s+/g, '-');
    let botCode, dependencies;

    if(type === 'telegram') {
      botCode = getTelegramTemplate(botName, token || 'YOUR_TOKEN_HERE', features || []);
      dependencies = {
        "grammy": "^1.24.0",
        "dotenv": "^16.4.5"
      };
    } else {
      botCode = getWhatsappTemplate(botName, features || []);
      dependencies = {
        "@whiskeysockets/baileys": "^6.7.8",
        "pino": "^8.17.2",
        "dotenv": "^16.4.5"
      };
    }

    const pkg = {
      name: safeName.toLowerCase(),
      version: "1.0.0",
      main: "bot.js",
      scripts: { "start": "node bot.js" },
      dependencies: dependencies
    };

    // README LENGKAP + NOTED NPM INSTALL
    const readmeContent = `

 CiKiZz Generate Script - ${botName}

Tipe Bot: ${type.toUpperCase()}
Dibuat: ${new Date().toLocaleString('id-ID')}
Fitur: ${(features || []).join(', ') || 'basic'}

 [ CARA INSTALL DI PTERODACTYL PANEL ]


LANGKAH 1: UPLOAD & EXTRACT
1. Upload file ${safeName}.zip ke File Manager Ptero
2. Klik kanan file zip > Unarchive / Extract

LANGKAH 2: WAJIB NPM INSTALL (PENTING!)
Buka tab Console / Terminal di Ptero, ketik:

   npm install

Tekan Enter, tunggu sampai selesai 100%.
Jangan skip langkah ini! Kalau tidak, error "Cannot find module"

Perintah "npm install" akan otomatis install:
${type === 'telegram' 
? `   - grammy (framework bot telegram) -> WAJIB
   - dotenv (baca token dari .env) -> WAJIB`
: `   - @whiskeysockets/baileys (WA connection) -> WAJIB
   - pino (logger) -> WAJIB
   - dotenv -> WAJIB`}

Cukup ketik "npm install" saja, semua akan terinstall otomatis dari package.json!

LANGKAH 3: ISI TOKEN
${type === 'telegram' 
? `BUKA file .env.example, ganti isinya jadi:
BOT_TOKEN=${token || 'ISI_TOKEN_BOT_KAMU_DISINI'}
ADMIN_ID=ID_TELEGRAM_KAMU

Atau langsung edit di bot.js baris:
const bot = new Bot('TOKEN_KAMU')

Cara dapet token: Chat @BotFather di Telegram -> /newbot`
: `WA BOT TIDAK BUTUH TOKEN!
Nanti pas kamu start, QR Code akan muncul di Console.
Scan QR pakai WhatsApp kamu (Linked Devices).
Folder auth_info akan terbuat otomatis, JANGAN DIHAPUS!`}

LANGKAH 4: START BOT
Startup Command di Ptero harus: npm start
Atau ketik manual di Console:
   npm start

Jika berhasil, akan muncul:
[CiKiZz] ${botName} RUNNING! ✅

 [ JIKA ERROR ]

- Error "Cannot find module 'grammy' / 'baileys'" 
  => Solusi: Belum npm install! Ketik npm install

- Error 401 Unauthorized (Telegram)
  => Solusi: Token salah, cek lagi token dari @BotFather

- QR WhatsApp tidak muncul
  => Solusi: Hapus folder auth_info, lalu npm start lagi

- Bot mati setelah start
  => Solusi: Cek log di Console, pastikan token benar & sudah npm install

 Support: kizzshopgame.store
 Dibuat dengan CiKiZz Generate Script PRO v2.1.0

`;

    zip.file("bot.js", botCode);
    zip.file("package.json", JSON.stringify(pkg, null, 2));
    zip.file("README.txt", readmeContent);
    zip.file("CARA-INSTALL.txt", readmeContent);
    zip.file(".env.example", type === 'telegram' 
      ? `BOT_TOKEN=${token || 'ISI_TOKEN_BOT_DISINI'}\nADMIN_ID=ISI_ID_KAMU\n# Dapatkan token di @BotFather\n# Dapatkan ID di @userinfobot`
      : `# WA BOT - TIDAK PERLU TOKEN\n# QR akan muncul di console saat npm start\n# Scan dengan WhatsApp kamu\n`
    );
    zip.file(".gitignore", "node_modules\n.auth_info\nauth_info\n.env\n");

    if(type === 'whatsapp') {
      zip.file("auth_info/.keep", "");
    }

    const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}.zip`);
    res.send(content);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}