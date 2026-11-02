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
// BROADCAST
const ADMIN_ID = process.env.ADMIN_ID || '';
bot.command('bc', async (ctx) => {
  if(ADMIN_ID && ctx.from.id.toString() !== ADMIN_ID) return ctx.reply('⛔ Bukan admin!');
  const msg = ctx.match;
  if(!msg) return ctx.reply('Cara: /bc Halo semua');
  await ctx.reply('✅ Broadcast terkirim (fitur demo, tambah DB untuk real broadcast)');
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
      await sock.sendMessage(from, { text: '⚡ *${botName}*\\n\\n.menu - Menu\\n.ping - Cek bot\\n.sticker - Jadikan sticker' });
    }
    ${features.includes('autoreply') ? `
    if(text.toLowerCase().includes('halo')) {
      await sock.sendMessage(from, { text: 'Halo juga! - ${botName}' });
    }` : ''}
  });
}

startBot();
console.log('[CiKiZz] Starting ${botName}...');
`;
}

module.exports = async (req, res) => {
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { botName, token, type, features } = req.body;
    
    if(!botName || !type) return res.status(400).json({ error: 'botName & type required' });

    const zip = new JSZip();
    const safeName = botName.replace(/[^a-zA-Z0-9-_]/g, '-');
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

    // package.json ANTI ERROR PTERODACTYL
    const pkg = {
      name: safeName.toLowerCase(),
      version: "1.0.0",
      main: "bot.js",
      scripts: { "start": "node bot.js" },
      dependencies: dependencies
    };

    zip.file("bot.js", botCode);
    zip.file("package.json", JSON.stringify(pkg, null, 2));
    zip.file(".env.example", type === 'telegram' ? `BOT_TOKEN=${token || 'ISI_TOKEN_BOT_DISINI'}\nADMIN_ID=ISI_ID_KAMU` : `# WA Bot - Tidak perlu token, scan QR pas start\n`);
    zip.file("README.txt", `CiKiZz Generate Script - ${botName}
1. Upload semua file ke Pterodactyl
2. Jika Telegram: isi .env atau ganti token di bot.js
3. Jalankan: npm install
4. Start: npm start
5. Done! Bot jalan 24 jam

Support: kizzshopgame.store
`);

    if(type === 'whatsapp') {
      zip.file(".gitignore", "node_modules\nauth_info\n");
    }

    const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}.zip`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}