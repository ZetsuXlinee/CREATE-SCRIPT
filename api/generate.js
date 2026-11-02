const JSZip = require('jszip');

const PLUGIN_TEMPLATES = {
welcome: (cfg) => `export default async (m, sock) => {
  sock.ev.on('group-participants.update', async (anu) => {
    if(anu.action === 'add') {
      const text = 'Welcome @' + anu.participants[0].split('@')[0] + ' ke grup! Ketik .menu';
      await sock.sendMessage(anu.id, { text, mentions: anu.participants });
    }
  });
};`,
antilink: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.includes('chat.whatsapp.com') && m.key.participant) {
    const isAdmin = false; // cek admin logic
    if(!isAdmin) {
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Antilink! Link grup terdeteksi' });
      await sock.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], 'remove');
    }
  }
};`,
sticker: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(!body.startsWith('.s') && !body.startsWith('.sticker')) return;
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if(quoted?.imageMessage || m.message?.imageMessage) {
    const media = await sock.downloadMediaMessage(m);
    await sock.sendMessage(m.key.remoteJid, { sticker: media });
  }
};`,
downloader: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.startsWith('.tiktok') || body.startsWith('.ig') || body.startsWith('.yt')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⏳ Downloading... Fitur downloader aktif! (Tambahkan API scraper lu disini)' });
  }
};`,
ai: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.startsWith('.ai ') || body.startsWith('.gpt ')) {
    const prompt = body.slice(4);
    await sock.sendMessage(m.key.remoteJid, { text: '🤖 AI: ' + prompt + ' (Integrasikan dengan OpenAI API)' });
  }
};`,
group: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.hidetag') {
    const groupMetadata = await sock.groupMetadata(m.key.remoteJid);
    const participants = groupMetadata.participants.map(p => p.id);
    await sock.sendMessage(m.key.remoteJid, { text: 'Hidetag by bot', mentions: participants });
  }
  if(body === '.kick') {
    // kick logic
  }
};`,
rpg: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.daily') await sock.sendMessage(m.key.remoteJid, { text: '💰 Daily reward 1000 coin!' });
  if(body === '.inventory') await sock.sendMessage(m.key.remoteJid, { text: '🎒 Inventory kosong' });
};`,
store: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.addproduk')) await sock.sendMessage(m.key.remoteJid, { text: '✅ Produk ditambahkan ke store' });
  if(body === '.listproduk') await sock.sendMessage(m.key.remoteJid, { text: '🛒 List produk: (kosong)' });
};`,
autoreply: () => `export default async (m, sock) => {
  const body = (m.message?.conversation || '').toLowerCase();
  if(body.includes('halo') || body.includes('hai')) await sock.sendMessage(m.key.remoteJid, { text: 'Halo juga! Ketik .menu' });
  if(body.includes('bot')) await sock.sendMessage(m.key.remoteJid, { text: 'Ya, aku disini! 🤖' });
};`,
broadcast: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.bc ')) {
    const text = body.slice(4);
    await sock.sendMessage(m.key.remoteJid, { text: '📢 Broadcast: ' + text });
  }
};`
};

function getMenuPlugin(cfg) {
  const botName = cfg.botName;
  const features = cfg.features || [];
  const style = cfg.menuStyle || 'premium';
  const thumb = cfg.thumb;
  const btn = cfg.btn;
  const list = features.map(f => `│ ◦ .${f}`).join('\\n');

  if(style === 'simple') {
    return `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body !== '.menu') return;
  const text = \`MENU ${botName}
${features.join(', ')}

${list}\`;
  await sock.sendMessage(m.key.remoteJid, { text });
};`;
  }
  if(style === 'button') {
    return `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body !== '.menu') return;
  const text = \`✨ *${botName} MENU PREMIUM*

${list}

Powered by CiKiZz\`;
  try {
    await sock.sendMessage(m.key.remoteJid, {
      text,
      footer: '${botName} • Button Menu',
      buttons: [
        { buttonId: '.ping', buttonText: { displayText: '📶 PING' }, type: 1 },
        { buttonId: '.sticker', buttonText: { displayText: '🎨 STICKER' }, type: 1 },
        { buttonId: '.ai halo', buttonText: { displayText: '🤖 AI CHAT' }, type: 1 }
      ],
      headerType: 1
    });
  } catch { await sock.sendMessage(m.key.remoteJid, { text }); }
};`;
  }
  if(style === 'image') {
    return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body !== '.menu') return;
  const caption = \`╭─「 *${botName}* 」
│ ${features.join(' │ ')}
│
${list}
╰─ Powered by CiKiZz\`;
  if(fs.existsSync('./thumb.jpg')) {
    await sock.sendMessage(m.key.remoteJid, { image: fs.readFileSync('./thumb.jpg'), caption });
  } else {
    await sock.sendMessage(m.key.remoteJid, { text: caption });
  }
};`;
  }
  // premium box default
  return `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body !== '.menu') return;
  const text = \`
╭━━━〔 *${botName}* 〕━━━
┃ Owner: ${cfg.owner || '628xxx'}
┃ Base: ${cfg.base} | ${cfg.conn}
┃ Status: Online ✅
┣━━━━━━━━━━━━━━━━
${list}
┣━━━━━━━━━━━━━━━━
┃ Ketik .ping untuk cek bot
╰━━━━━━━━━━━━━━━━
\`;
  await sock.sendMessage(m.key.remoteJid, { text });
};`;
}

function getCaseTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  let extraCases = cfg.features.map(f => {
    if(f==='sticker') return "case 's': case 'sticker': await sock.sendMessage(from, { sticker: m.message?.imageMessage ? await sock.downloadMediaMessage(m) : { url: './thumb.jpg' } }); break;";
    if(f==='ai') return "case 'ai': case 'gpt': await sock.sendMessage(from, { text: 'AI: '+q }); break;";
    if(f==='downloader') return "case 'tiktok': case 'ig': case 'yt': await sock.sendMessage(from, { text: 'Downloader: '+q }); break;";
    if(f==='rpg') return "case 'daily': await sock.sendMessage(from, { text: 'Daily 1000 coin!' }); break;";
    if(f==='store') return "case 'listproduk': await sock.sendMessage(from, { text: 'Store kosong' }); break;";
    return `case '${f}': await sock.sendMessage(from, { text: 'Fitur ${f} aktif!' }); break;`;
  }).join('\n      ');

  return `// ${cfg.botName} CASE FIX V5
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino'); const fs = require('fs');
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) }, logger: P({ level: 'silent' }), printQRInTerminal: ${cfg.conn==='qr'}, browser: ['${cfg.botName}','Chrome','1.0'] });
  if (${cfg.conn==='pairing'} && !sock.authState.creds.registered) {
    setTimeout(async () => { try { let c = await sock.requestPairingCode('${cleanNumber}'); c=c.match(/.{1,4}/g).join('-'); console.log('\\nPAIRING: '+c); } catch(e){ console.log(e.message) } }, 8000);
  }
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', u => { if(u.connection==='open') console.log('Connected ${cfg.botName}') });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return; const from=m.key.remoteJid; const body=m.message.conversation||m.message.extendedTextMessage?.text||''; const args=body.split(' '); const command=body.startsWith('.')?args[0].slice(1).toLowerCase():''; const q=args.slice(1).join(' ');
    let menuText = ''; const style='${cfg.menuStyle}';
    if(command==='menu') {
      if(style==='simple') menuText='*${cfg.botName}*\\n${cfg.features.join('\\n')}';
      else menuText='╭─ ${cfg.botName}\\n${cfg.features.map(f=>'│ • .'+f).join('\\n')}\\n╰─ CiKiZz';
      ${cfg.thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')) await sock.sendMessage(from, { image: fs.readFileSync('./thumb.jpg'), caption: menuText }); else await sock.sendMessage(from, { text: menuText });" : "await sock.sendMessage(from, { text: menuText });"}
    }
    switch(command) { case 'ping': await sock.sendMessage(from, { text: 'Pong ${cfg.botName}' }); break; ${extraCases} }
  });
} startBot();`;
}

function getEsmTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  return `// ${cfg.botName} ESM FIX V5
import makeWASocket, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) }, logger: P({ level: 'silent' }), printQRInTerminal: ${cfg.conn==='qr'}, browser: ['${cfg.botName}','Chrome','1.0'] });
  if(${cfg.conn==='pairing'} && !sock.authState.creds.registered) {
    setTimeout(async () => { let c=await sock.requestPairingCode('${cleanNumber}'); console.log('PAIRING:'+c.match(/.{1,4}/g).join('-')); }, 8000);
  }
  sock.ev.on('creds.update', saveCreds);
  const plugins={}; const pFolder=path.join(__dirname,'plugins');
  for(const f of fs.readdirSync(pFolder)){ if(f.endsWith('.js')){ const mod=await import('./plugins/'+f); plugins[f]=mod.default; } }
  sock.ev.on('messages.upsert', async ({ messages }) => { const m=messages[0]; if(!m.message) return; for(const k in plugins){ try{ await plugins[k](m,sock); }catch(e){} } });
  sock.ev.on('connection.update', u=>{ if(u.connection==='open') console.log('${cfg.botName} Ready ✅') });
} startBot();`;
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
    let deps = { "@whiskeysockets/baileys": "^6.7.18", "pino": "^9.3.2" };
    let fileName = 'index.js';
    let botCode = '';

    if(cfg.type==='telegram') {
      botCode = `require('dotenv').config(); const { Bot } = require('grammy'); const bot=new Bot('${cfg.token}'); bot.command('start', ctx=>ctx.reply('${cfg.botName}')); bot.start();`;
      deps = { "grammy": "^1.24.0" };
    } else {
      if(cfg.base==='case') {
        botCode = getCaseTemplate(cfg);
      } else {
        botCode = getEsmTemplate(cfg);
        const pluginsFolder = zip.folder('plugins');
        pluginsFolder.file('menu.js', getMenuPlugin(cfg));
        for(const feat of cfg.features) {
          if(feat==='welcome' || feat==='antilink' || feat==='sticker' || feat==='downloader' || feat==='ai' || feat==='group' || feat==='rpg' || feat==='store' || feat==='autoreply' || feat==='broadcast') {
            if(PLUGIN_TEMPLATES[feat]) pluginsFolder.file(feat+'.js', PLUGIN_TEMPLATES[feat](cfg));
          }
        }
      }
    }

    zip.file(fileName, botCode);
    zip.file("package.json", JSON.stringify({ name: safeName.toLowerCase(), version:"1.0.0", type: cfg.base==='esm' && cfg.type==='whatsapp' ? "module" : "commonjs", main: fileName, scripts:{ start:"node "+fileName }, dependencies: deps }, null, 2));
    if(cfg.thumb==='thumb' && cfg.thumbData) zip.file("thumb.jpg", cfg.thumbData.split(',')[1], { base64: true });
    zip.file("README.txt", `${cfg.botName} V5 - Fitur: ${cfg.features?.join(',')} - Style: ${cfg.menuStyle}`);
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition','attachment; filename='+safeName+'.zip');
    res.send(buf);
  } catch(e){ res.status(500).json({ error: e.message }) }
}