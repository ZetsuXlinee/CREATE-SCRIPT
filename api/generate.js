const JSZip = require('jszip');

const PLUGIN_TEMPLATES = {
welcome: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.welcome on') await sock.sendMessage(m.key.remoteJid, { text: '✅ Welcome ON' });
  if(body === '.welcome off') await sock.sendMessage(m.key.remoteJid, { text: '❌ Welcome OFF' });
};`,
antilink: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.includes('chat.whatsapp.com')) {
    await sock.sendMessage(m.key.remoteJid, { text: '⚠️ Antilink terdeteksi!' });
  }
};`,
sticker: () => `export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(!body.startsWith('.s') && !body.startsWith('.sticker')) return;
  try {
    const buffer = await sock.downloadMediaMessage(m);
    await sock.sendMessage(m.key.remoteJid, { sticker: buffer });
  } catch { await sock.sendMessage(m.key.remoteJid, { text: '❌ Gagal sticker' }) }
};`,
downloader: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.tiktok') || body.startsWith('.tt')) await sock.sendMessage(m.key.remoteJid, { text: '⏳ Tiktok Downloader (tambahkan scraper)' });
  if(body.startsWith('.ig')) await sock.sendMessage(m.key.remoteJid, { text: '⏳ IG Downloader' });
  if(body.startsWith('.yt')) await sock.sendMessage(m.key.remoteJid, { text: '⏳ YT Downloader' });
};`,
ai: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.ai ') || body.startsWith('.gpt ')) {
    await sock.sendMessage(m.key.remoteJid, { text: '🤖 AI: '+body.slice(4)+' (integrasikan OpenAI)' });
  }
};`,
group: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.hidetag') {
    const meta = await sock.groupMetadata(m.key.remoteJid);
    await sock.sendMessage(m.key.remoteJid, { text: 'Hidetag', mentions: meta.participants.map(p=>p.id) });
  }
  if(body === '.open') await sock.groupSettingUpdate(m.key.remoteJid, 'not_announcement');
  if(body === '.close') await sock.groupSettingUpdate(m.key.remoteJid, 'announcement');
};`,
rpg: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body === '.daily') await sock.sendMessage(m.key.remoteJid, { text: '💰 Daily +1000 coin' });
  if(body === '.inventory') await sock.sendMessage(m.key.remoteJid, { text: '🎒 Coin: 1000' });
};`,
store: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.addproduk')) await sock.sendMessage(m.key.remoteJid, { text: '✅ Produk ditambahkan' });
  if(body === '.listproduk') await sock.sendMessage(m.key.remoteJid, { text: '🛒 Store kosong' });
};`,
autoreply: () => `export default async (m, sock) => {
  const body = (m.message?.conversation || '').toLowerCase();
  if(body === 'halo' || body === 'hai') await sock.sendMessage(m.key.remoteJid, { text: 'Halo juga! Ketik .menu' });
  if(body === 'bot') await sock.sendMessage(m.key.remoteJid, { text: 'Ya, online 🤖' });
};`,
broadcast: () => `export default async (m, sock) => {
  const body = m.message?.conversation || '';
  if(body.startsWith('.bc ')) await sock.sendMessage(m.key.remoteJid, { text: '📢 BC: '+body.slice(4) });
};`
};

function getMenuPlugin(cfg) {
  const botName = cfg.botName || 'Bot';
  const features = cfg.features || [];
  let style = cfg.menuStyle || 'premium';
  const btnMode = cfg.btn || 'nobtn';
  const thumb = cfg.thumb || 'nothumb';

  // LOGIC BARU: Jika tanpa thumb tapi pilih IMAGE, auto fallback ke premium
  if(style === 'image' && thumb === 'nothumb') style = 'premium';

  const list = features.map(f => `│ ◦ .${f}`).join('\\n');
  const simpleList = features.map(f => `• .${f}`).join('\\n');

  let baseText = '';
  if(style === 'simple') baseText = `MENU ${botName}\\n${simpleList}`;
  else if(style === 'image') baseText = `╭─「 *${botName}* 」\\n│ Image Menu with thumb.jpg\\n${list}\\n╰─ CiKiZz V7.1`;
  else baseText = `╭━━━〔 *${botName}* 〕━━━\\n┃ Base: ${cfg.base} | Btn: ${btnMode} | Thumb: ${thumb}\\n┣━━━━━━━━\\n${list}\\n╰━━ V7.1`;

  // BUTTON PISAH DARI MENU - BISA DI SEMUA STYLE
  if(btnMode === 'btn') {
    return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const caption = \`${baseText}\`;
  const buttons = [
    { buttonId: '.ping', buttonText: { displayText: '📶 PING' }, type: 1 },
    { buttonId: '.sticker', buttonText: { displayText: '🎨 STICKER' }, type: 1 },
    { buttonId: '.ai halo', buttonText: { displayText: '🤖 AI' }, type: 1 }
  ];
  try {
    if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')) {
      await sock.sendMessage(m.key.remoteJid, { 
        image: fs.readFileSync('./thumb.jpg'), 
        caption, 
        footer: '${botName} • ${style} • Button Beneran', 
        buttons, 
        headerType: 4 
      });
    } else if(${style==='image'} && ${thumb==='thumb'}) {
      // Jika style IMAGE butuh gambar
      await sock.sendMessage(m.key.remoteJid, { 
        image: fs.existsSync('./thumb.jpg') ? fs.readFileSync('./thumb.jpg') : { url: 'https://i.ibb.co/6yQp0Y0/cikizz-thumb.jpg' },
        caption,
        footer: '${botName} • Image Menu',
        buttons,
        headerType: 4
      });
    } else {
      await sock.sendMessage(m.key.remoteJid, { 
        text: caption, 
        footer: '${botName} • ${style}',
        buttons, 
        headerType: 1 
      });
    }
  } catch(e) {
    // Fallback kalo WA blokir button
    await sock.sendMessage(m.key.remoteJid, { text: caption + '\\n\\n• .ping | .sticker | .ai' });
  }
};`;
  } else {
    // TEKS BIASA (TANPA BUTTON)
    return `import fs from 'fs';
export default async (m, sock) => {
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  if(body.trim() !== '.menu') return;
  const text = \`${baseText}\`;
  try {
    if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')) {
      await sock.sendMessage(m.key.remoteJid, { image: fs.readFileSync('./thumb.jpg'), caption: text });
    } else {
      await sock.sendMessage(m.key.remoteJid, { text });
    }
  } catch { await sock.sendMessage(m.key.remoteJid, { text }); }
};`;
  }
}

function getCaseTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  let menuStyle = cfg.menuStyle;
  if(menuStyle === 'image' && cfg.thumb === 'nothumb') menuStyle = 'premium';
  
  const extra = cfg.features.map(f => {
    if(f==='sticker') return "case 's': case 'sticker': { const buf = await sock.downloadMediaMessage(m); if(buf) await sock.sendMessage(from, { sticker: buf }); break; }";
    return `case '${f}': await sock.sendMessage(from, { text: 'Fitur ${f} aktif!' }); break;`;
  }).join('\n      ');

  return `// ${cfg.botName} CASE V7.1 - Thumb Logic + Button Pisah
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino'); const fs = require('fs');
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) }, logger: P({ level: 'silent' }), printQRInTerminal: ${cfg.conn==='qr'}, browser: ['${cfg.botName}','Chrome','1.0'] });
  if (${cfg.conn==='pairing'} && !sock.authState.creds.registered) {
    setTimeout(async () => { let c = await sock.requestPairingCode('${cleanNumber}'); console.log('PAIRING: '+c.match(/.{1,4}/g).join('-')); }, 8000);
  }
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]; if(!m.message) return; const from=m.key.remoteJid; const body=m.message.conversation||m.message.extendedTextMessage?.text||''; const args=body.split(' '); const command=body.startsWith('.')?args[0].slice(1).toLowerCase():''; const q=args.slice(1).join(' ');
    if(command==='menu') {
      let menuText = '${menuStyle==='simple' ? `MENU ${cfg.botName}` : `╭─ ${cfg.botName} ${cfg.features.map(f=>'│ • .'+f).join('\\n')} `}';
      ${cfg.btn==='btn' ? `
      const buttons=[{ buttonId: '.ping', buttonText: { displayText: '📶 PING' }, type: 1 }, { buttonId: '.sticker', buttonText: { displayText: '🎨 STICKER' }, type: 1 }];
      try { 
        ${cfg.thumb==='thumb' ? "const img=fs.existsSync('./thumb.jpg')?fs.readFileSync('./thumb.jpg'):{url:'https://i.ibb.co/6yQp0Y0/cikizz-thumb.jpg'}; await sock.sendMessage(from, { image: img, caption: menuText, footer: '${cfg.botName}', buttons, headerType: 4 });" : "await sock.sendMessage(from, { text: menuText, footer: '${cfg.botName}', buttons, headerType: 1 });"}
      } catch { await sock.sendMessage(from, { text: menuText }); }
      ` : `
      ${cfg.thumb==='thumb' ? "if(fs.existsSync('./thumb.jpg')) await sock.sendMessage(from, { image: fs.readFileSync('./thumb.jpg'), caption: menuText }); else await sock.sendMessage(from, { text: menuText });" : "await sock.sendMessage(from, { text: menuText });"}
      `}
      return;
    }
    switch(command) { case 'ping': await sock.sendMessage(from, { text: 'Pong ${cfg.botName}' }); break; ${extra} }
  });
} startBot();`;
}

function getEsmTemplate(cfg) {
  const cleanNumber = (cfg.pairingNumber || cfg.owner || '').replace(/[^0-9]/g, '');
  return `// ${cfg.botName} ESM V7.1
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) }, logger: P({ level: 'silent' }), printQRInTerminal: ${cfg.conn==='qr'}, browser: ['${cfg.botName}','Chrome','1.0'] });
  if(${cfg.conn==='pairing'} && !sock.authState.creds.registered) { setTimeout(async () => { let c=await sock.requestPairingCode('${cleanNumber}'); console.log('PAIRING:'+c.match(/.{1,4}/g).join('-')); }, 8000); }
  sock.ev.on('creds.update', saveCreds);
  const plugins={}; const pFolder=path.join(__dirname,'plugins');
  for(const f of fs.readdirSync(pFolder)){ if(f.endsWith('.js')){ const mod=await import('./plugins/'+f); plugins[f]=mod.default; } }
  sock.ev.on('messages.upsert', async ({ messages }) => { const m=messages[0]; if(!m.message) return; for(const k in plugins){ try{ await plugins[k](m,sock); }catch(e){} } });
  sock.ev.on('connection.update', u=>{ if(u.connection==='open') console.log('${cfg.botName} V7.1 READY ✅ Plugins: '+Object.keys(plugins).length+' | Thumb: ${cfg.thumb} | Menu: ${cfg.menuStyle} | Btn: ${cfg.btn}'); });
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
    // VALIDASI LOGIC BARU
    if(cfg.menuStyle === 'image' && cfg.thumb !== 'thumb') {
      cfg.menuStyle = 'premium'; // Auto fallback
    }
    const zip = new JSZip();
    const safeName = cfg.botName.replace(/[^a-zA-Z0-9-_]/g,'-');
    let botCode = '';

    if(cfg.type==='telegram') {
      botCode = `require('dotenv').config(); const { Bot } = require('grammy'); const bot=new Bot('${cfg.token}'); bot.command('start', ctx=>ctx.reply('${cfg.botName}')); bot.start();`;
    } else {
      if(cfg.base==='case') botCode = getCaseTemplate(cfg);
      else {
        botCode = getEsmTemplate(cfg);
        const pluginsFolder = zip.folder('plugins');
        pluginsFolder.file('menu.js', getMenuPlugin(cfg));
        for(const feat of cfg.features) {
          if(PLUGIN_TEMPLATES[feat]) pluginsFolder.file(feat+'.js', PLUGIN_TEMPLATES[feat](cfg));
        }
      }
    }

    zip.file('index.js', botCode);
    zip.file("package.json", JSON.stringify({ 
      name: safeName.toLowerCase(), 
      version:"7.1.0", 
      type: cfg.base==='esm' && cfg.type==='whatsapp' ? "module" : "commonjs", 
      main: 'index.js', 
      scripts:{ start:"node index.js" }, 
      dependencies: cfg.type==='telegram' ? { "grammy": "^1.24.0" } : { "@whiskeysockets/baileys": "^6.7.18", "pino": "^9.3.2" } 
    }, null, 2));
    if(cfg.thumb==='thumb' && cfg.thumbData) zip.file("thumb.jpg", cfg.thumbData.split(',')[1], { base64: true });
    zip.file("README.txt", `${cfg.botName} V7.1 - Thumb:${cfg.thumb} Menu:${cfg.menuStyle} Btn:${cfg.btn} - Fitur: ${cfg.features?.join(',')}`);
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition','attachment; filename='+safeName+'.zip');
    res.send(buf);
  } catch(e){ res.status(500).json({ error: e.message }) }
}