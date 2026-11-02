// api/generate.js V11 - FULL FITUR PLUGIN + CASE + PAIRING 1 MENIT + FIX VERCEL
import JSZip from 'jszip';

const PLUGIN_TEMPLATES = {
welcome: (botName) => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.welcome')){
    const args = body.split(' ');
    await sock.sendMessage(m.key.remoteJid, {text: \`✅ Welcome \${args[1]||'ON'} untuk \${args[0]||''}\`});
  }
};
`,
antilink: () => `export default async (m, sock) => {
  if(m.key.fromMe) return;
  const body = m.message?.conversation||m.message?.extendedTextMessage?.text||'';
  if(body.includes('chat.whatsapp.com')){
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if(isGroup){
      try{
        const meta = await sock.groupMetadata(m.key.remoteJid);
        const botId = sock.user.id.split(':')[0]+'@s.whatsapp.net';
        const isAdmin = meta.participants.find(p=>p.id===botId)?.admin;
        if(isAdmin) await sock.sendMessage(m.key.remoteJid, {delete: m.key});
      }catch{}
      await sock.sendMessage(m.key.remoteJid, {text: '⚠️ *Antilink Detected!*'});
    }
  }
};
`,
sticker: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(!body.startsWith('.s')) return;
  const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const hasMedia = m.message?.imageMessage || m.message?.videoMessage || q?.imageMessage || q?.videoMessage;
  if(!hasMedia) return sock.sendMessage(m.key.remoteJid, {text: 'Reply gambar/video dengan .s'});
  try{
    const buf = await sock.downloadMediaMessage(m);
    await sock.sendMessage(m.key.remoteJid, {sticker: buf});
  }catch(e){ await sock.sendMessage(m.key.remoteJid, {text: 'Gagal bikin sticker: '+e.message}); }
};
`,
downloader: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.tiktok') || body.startsWith('.yt') || body.startsWith('.ig')){
    await sock.sendMessage(m.key.remoteJid, {text: '⏳ Downloader: '+body+'\\nFitur downloader aktif, integrasikan API lu disini!'});
  }
};
`,
ai: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.ai ')){
    const prompt = body.slice(4);
    await sock.sendMessage(m.key.remoteJid, {text: '🤖 AI Response untuk: '+prompt+'\\n[Integrasikan OpenAI API lu disini]'});
  }
};
`,
group: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body==='.hidetag'){
    if(!m.key.remoteJid.endsWith('@g.us')) return;
    const meta = await sock.groupMetadata(m.key.remoteJid);
    await sock.sendMessage(m.key.remoteJid, {text: 'Hidetag by bot', mentions: meta.participants.map(p=>p.id)});
  }
  if(body.startsWith('.kick')){
    await sock.sendMessage(m.key.remoteJid, {text: 'Fitur kick - butuh bot admin'});
  }
};
`,
rpg: () => `const db = {};
export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  const sender = m.key.remoteJid;
  if(!db[sender]) db[sender] = {money:0};
  if(body==='.daily'){
    db[sender].money+=1000;
    await sock.sendMessage(m.key.remoteJid, {text: '💰 Daily! Money: '+db[sender].money});
  }
  if(body==='.balance'){
    await sock.sendMessage(m.key.remoteJid, {text: '💰 Balance: '+db[sender].money});
  }
};
`,
store: () => `const produk = [];
export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.addproduk')){
    const name = body.slice(10).trim();
    produk.push(name);
    await sock.sendMessage(m.key.remoteJid, {text: '✅ Produk ditambah: '+name+'\\nTotal: '+produk.length});
  }
  if(body==='.listproduk'){
    await sock.sendMessage(m.key.remoteJid, {text: '📦 List Produk:\\n'+produk.map((p,i)=> (i+1)+'. '+p).join('\\n')});
  }
};
`,
autoreply: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').toLowerCase().trim();
  if(body==='halo' || body==='hai' || body==='bot'){
    await sock.sendMessage(m.key.remoteJid, {text: 'Halo juga! Ketik .menu untuk lihat menu 👋'});
  }
};
`,
broadcast: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.bc ') && m.key.fromMe){
    const text = body.slice(4);
    const chats = await sock.groupFetchAllParticipating();
    for(const id in chats){
      await sock.sendMessage(id, {text: '📢 *BROADCAST*\\n\\n'+text});
    }
    await sock.sendMessage(m.key.remoteJid, {text: '✅ BC terkirim ke '+Object.keys(chats).length+' grup'});
  }
};
`
};

function getMenuPlugin(cfg){
  const botName = cfg.botName||'Bot';
  const features = cfg.features||[];
  let style = cfg.menuStyle||'premium';
  const btnMode = cfg.btn||'nobtn';
  const thumb = cfg.thumb||'nothumb';
  if(style==='image' && thumb==='nothumb') style='premium';
  const list = features.map(f=>'│ ◦ .'+f).join('\\n');
  let baseText = '';
  if(style==='simple') baseText = `*MENU ${botName}*\\n${features.map(f=>'• .'+f).join('\\n')}`;
  else if(style==='image') baseText = `╭─「 *${botName}* 」\\n${list}\\n╰─ Image Menu`;
  else baseText = `╭━━━〔 *${botName}* 〕━━━┈⊷\\n┃ Owner: ${cfg.owner}\\n┃ Bot: ${botName}\\n╰━━━━━━━━━━━━┈⊷\\n${list}\\n╰━━━━━━━━━━━━┈⊷`;

  if(btnMode==='btn'){
    return `import fs from 'fs';
export default async (m,sock)=>{
  const body = (m.message?.conversation||m.message?.extendedTextMessage?.text||'').trim();
  if(body!=='.menu' && body!=='.help') return;
  const caption = \`${baseText}\`;
  const buttons = [
    {buttonId:'.ping', buttonText:{displayText:'📶 PING BOT'}, type:1},
    {buttonId:'.sticker', buttonText:{displayText:'🎨 STICKER'}, type:1},
    {buttonId:'.ai halo', buttonText:{displayText:'🤖 AI CHAT'}, type:1}
  ];
  try{
    if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')){
      await sock.sendMessage(m.key.remoteJid, {image: fs.readFileSync('./thumb.jpg'), caption, footer: '${botName}', buttons, headerType: 4});
    } else {
      await sock.sendMessage(m.key.remoteJid, {text: caption, footer: '${botName}', buttons, headerType: 1});
    }
  }catch{ await sock.sendMessage(m.key.remoteJid, {text: caption}); }
};`;
  } else {
    return `import fs from 'fs';
export default async (m,sock)=>{
  const body = (m.message?.conversation||m.message?.extendedTextMessage?.text||'').trim();
  if(body!=='.menu' && body!=='.help') return;
  const text = \`${baseText}\`;
  if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')){
    await sock.sendMessage(m.key.remoteJid, {image: fs.readFileSync('./thumb.jpg'), caption: text});
  } else {
    await sock.sendMessage(m.key.remoteJid, {text});
  }
};`;
  }
}

function getCaseTemplate(cfg){
  const cleanNumber = (cfg.pairingNumber||'').replace(/[^0-9]/g,'');
  const botName = cfg.botName||'Bot';
  const features = cfg.features||[];
  const thumb = cfg.thumb||'nothumb';
  const btn = cfg.btn||'nobtn';
  const menuStyle = cfg.menuStyle||'premium';
  
  const featureCases = features.map(f=>{
    switch(f){
      case 'welcome': return `      case 'welcome': { const args=body.split(' '); await sock.sendMessage(from,{text:'✅ Welcome '+ (args[1]||'ON')}); break; }`;
      case 'antilink': return `      case 'antilink': await sock.sendMessage(from,{text:'⚠️ Antilink aktif di grup ini!'}); break;`;
      case 'sticker': return `      case 's': case 'sticker': { try{ const buf=await sock.downloadMediaMessage(m); await sock.sendMessage(from,{sticker:buf}); }catch{ await sock.sendMessage(from,{text:'Reply gambar dengan .s'}); } break; }`;
      case 'downloader': return `      case 'tiktok': case 'yt': case 'ig': await sock.sendMessage(from,{text:'⏳ Downloader: '+command}); break;`;
      case 'ai': return `      case 'ai': { const prompt=body.slice(4); await sock.sendMessage(from,{text:'🤖 AI: '+prompt}); break; }`;
      case 'group': return `      case 'hidetag': { if(!from.endsWith('@g.us')) break; const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:'Hidetag', mentions:meta.participants.map(p=>p.id)}); break; }`;
      case 'rpg': return `      case 'daily': case 'balance': await sock.sendMessage(from,{text:'💰 RPG: '+command}); break;`;
      case 'store': return `      case 'addproduk': case 'listproduk': await sock.sendMessage(from,{text:'📦 Store: '+body}); break; }`;
      case 'autoreply': return `      case 'autoreply': await sock.sendMessage(from,{text:'Autoreply aktif'}); break; }`;
      case 'broadcast': return `      case 'bc': await sock.sendMessage(from,{text:'📢 BC: '+body.slice(4)}); break;`;
      default: return `      case '${f}': await sock.sendMessage(from,{text:'✅ Fitur ${f} OK'}); break;`;
    }
  }).join('\\n');

  return `// ${botName} - CASE V11 FULL FITUR + PAIRING 1 MENIT (logic dari code lu)
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("noxleyss");
const pino = require("pino");
const fs = require("fs");

const ownerNumber = "${cfg.owner}";
const botName = "${botName}";

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: ${cfg.conn==='qr'}
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = "${cleanNumber}";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(\`[PAIRING CODE] \${code} - Berlaku 60-120 detik, santai input!\`);
      } catch (err) {
        console.error("Gagal pairing:", err.message);
      }
    }, 4000);
  }

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") console.log(\`[SUCCESS] \${botName} terhubung! V11\`);
    else if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Koneksi putus, reconnect:", shouldReconnect);
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({messages})=>{
    const m = messages[0];
    if(!m.message) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const command = body.startsWith('.') ? body.slice(1).split(' ')[0].toLowerCase() : '';

    // MENU LOGIC - ${menuStyle} + ${btn} + ${thumb}
    if(command==='menu' || command==='help'){
      let menuText = '';
      if('${menuStyle}'==='simple') menuText = \`MENU \${botName}\\n${features.map(f=>'• .'+f).join('\\n')}\`;
      else if('${menuStyle}'==='image') menuText = \`╭─「 \${botName} 」\\n${features.map(f=>'│ • .'+f).join('\\n')}\\n╰─\`;
      else menuText = \`╭━━━〔 \${botName} 〕━━━\\n${features.map(f=>'┃ • .'+f).join('\\n')}\\n╰━━━━\`;

      if('${thumb}'==='thumb' && fs.existsSync('./thumb.jpg')){
        await sock.sendMessage(from, {image: fs.readFileSync('./thumb.jpg'), caption: menuText});
      } else {
        await sock.sendMessage(from, {text: menuText});
      }
      ${btn==='btn' ? `await sock.sendMessage(from, {text: 'Pilih fitur:', footer: botName, buttons: [{buttonId:'.ping', buttonText:{displayText:'📶 PING'}, type:1}, {buttonId:'.sticker', buttonText:{displayText:'🎨 STICKER'}, type:1}], headerType:1});` : ''}
      return;
    }

    if(command==='ping'){
      await sock.sendMessage(from, {text: \`Pong! \${botName} aktif ✅ V11\\nOwner: \${ownerNumber}\\nPairing: ${cleanNumber}\`});
      return;
    }

    // === FULL FITUR CASE ===
    switch(command){
${featureCases}
      default: {
        if(body.toLowerCase()==='halo' || body.toLowerCase()==='bot'){
          await sock.sendMessage(from, {text: 'Halo! Ketik .menu'});
        }
      }
    }
  });
}
startBot();
`;
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});

  try{
    const cfg = req.body || {};
    if(!cfg.botName) return res.status(400).json({error:'Nama Bot wajib'});
    if(!cfg.pairingNumber) return res.status(400).json({error:'Nomor Bot Pairing wajib'});
    const cleanNumber = (cfg.pairingNumber||'').replace(/[^0-9]/g,'');
    const botName = cfg.botName;
    const safeName = botName.replace(/[^a-zA-Z0-9-_]/g,'-');

    const zip = new JSZip();

    // Pilih template
    const botCode = cfg.base==='case' ? getCaseTemplate(cfg) : (() => {
      const esmPairingLogic = `// ${botName} ESM V11 FULL PLUGIN + PAIRING 1 MENIT
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "noxleyss";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: ${cfg.conn==='qr'}
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = "${cleanNumber}";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(\`[PAIRING CODE] \${code} - 60-120 detik\`);
      } catch (err) {
        console.error("Gagal pairing:", err);
      }
    }, 4000);
  }

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u)=>{
    if(u.connection==="open") console.log("${botName} CONNECTED V11");
    if(u.connection==="close" && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });

  const plugins={}; const pFolder=path.join(__dirname,'plugins');
  if(fs.existsSync(pFolder)) for(const f of fs.readdirSync(pFolder)){ if(f.endsWith('.js')){ const mod=await import('./plugins/'+f); plugins[f]=mod.default; console.log('Loaded '+f); } }
  sock.ev.on("messages.upsert", async ({messages})=>{ const m=messages?.[0]; if(!m?.message) return; for(const k in plugins){ try{ await plugins[k](m,sock); }catch(e){ console.error('Plugin error',k,e.message)} } });
}
startBot();
`;
      return esmPairingLogic;
    })();

    // FULL PLUGIN FILES UNTUK ESM
    if(cfg.base==='esm'){
      const pluginsFolder = zip.folder('plugins');
      pluginsFolder.file('menu.js', getMenuPlugin(cfg));
      for(const f of (cfg.features||[])){
        if(PLUGIN_TEMPLATES[f]){
          pluginsFolder.file(f+'.js', PLUGIN_TEMPLATES[f](botName));
        }
      }
    }

    zip.file('index.js', botCode);
    zip.file('package.json', JSON.stringify({
      name: safeName.toLowerCase(),
      version: '11.0.0',
      type: cfg.base==='esm' ? 'module' : 'commonjs',
      main: 'index.js',
      scripts: { start: 'node index.js' },
      dependencies: { "noxleyss": "^1.2.1", "pino": "^9.3.2" }
    }, null, 2));

    if(cfg.thumb==='thumb' && cfg.thumbData){
      const b64 = cfg.thumbData.split(',')[1];
      if(b64) zip.file('thumb.jpg', b64, {base64:true});
    }

    zip.file('README.txt', \`BOT: ${botName}
PAIRING: ${cleanNumber}
OWNER: ${cfg.owner}
BASE: ${cfg.base}
CONN: ${cfg.conn}
MENU: ${cfg.menuStyle}
BTN: ${cfg.btn}
THUMB: ${cfg.thumb}
FITUR: ${(cfg.features||[]).join(', ')}

V11 FULL FITUR + FIX FUNCTION_INVOCATION_FAILED + PAIRING 1 MENIT (logic code lu)
Cara: npm install && npm start
Kode pairing muncul setelah 4 detik, berlaku 60-120 detik - gak buru-buru kayak error 2L3F-PWB8
\`);

    const buf = await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE', compressionOptions:{level:6}});
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition','attachment; filename='+safeName+'.zip');
    return res.send(buf);

  }catch(e){
    console.error('GENERATE ERROR:', e);
    return res.status(500).json({error: e.message, stack: e.stack});
  }
}