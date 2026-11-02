// api/generate.js V12 - FULL FITUR PLUGIN + CASE LENGKAP + PAIRING 1 MENIT + FIX VERCEL + ALL SVG
import JSZip from 'jszip';

const PLUGIN_TEMPLATES = {
welcome: (botName) => `import fs from 'fs';
export default async (m, sock) => {
  const body = (m.message?.conversation||m.message?.extendedTextMessage?.text||'').trim();
  if(!body.startsWith('.welcome')) return;
  const args = body.split(' ');
  const mode = args[1]||'ON';
  await sock.sendMessage(m.key.remoteJid, {text: \`✅ Welcome \${mode}\\nBot: ${botName}\`});
};
`,
antilink: () => `export default async (m, sock) => {
  if(m.key.fromMe) return;
  const body = m.message?.conversation||m.message?.extendedTextMessage?.text||'';
  if(!body.includes('chat.whatsapp.com')) return;
  const isGroup = m.key.remoteJid.endsWith('@g.us');
  if(!isGroup) return;
  try{
    const meta = await sock.groupMetadata(m.key.remoteJid);
    const botId = sock.user.id.split(':')[0]+'@s.whatsapp.net';
    const botParticipant = meta.participants.find(p=>p.id===botId || p.id.includes(sock.user.id.split(':')[0]));
    const isAdmin = botParticipant?.admin==='admin' || botParticipant?.admin==='superadmin';
    if(isAdmin){
      await sock.sendMessage(m.key.remoteJid, {delete: m.key});
      await sock.sendMessage(m.key.remoteJid, {text: '⚠️ *Antilink Detected!* Link grup dihapus!'});
    }
  }catch(e){ console.log('Antilink error', e.message) }
};
`,
sticker: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(!body.startsWith('.s') && !body.startsWith('.sticker')) return;
  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const hasMedia = m.message?.imageMessage || m.message?.videoMessage || quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;
  if(!hasMedia){
    await sock.sendMessage(m.key.remoteJid, {text: 'Reply gambar/video dengan .s untuk jadi sticker'});
    return;
  }
  try{
    const buf = await sock.downloadMediaMessage(m);
    await sock.sendMessage(m.key.remoteJid, {sticker: buf});
  }catch(e){
    await sock.sendMessage(m.key.remoteJid, {text: 'Gagal bikin sticker: '+e.message});
  }
};
`,
downloader: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.tiktok') || body.startsWith('.yt') || body.startsWith('.ig') || body.startsWith('.fb')){
    const url = body.split(' ')[1];
    if(!url) return sock.sendMessage(m.key.remoteJid, {text: 'Mana url nya? Contoh: .tiktok https://...'});
    await sock.sendMessage(m.key.remoteJid, {text: '⏳ Downloader aktif\\nURL: '+url+'\\n[Integrasikan API downloader lu disini]\\nFitur: tiktok, yt, ig, fb'});
  }
};
`,
ai: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(!body.startsWith('.ai ')) return;
  const prompt = body.slice(4).trim();
  if(!prompt) return sock.sendMessage(m.key.remoteJid, {text: 'Tanya apa? Contoh: .ai halo bot'});
  await sock.sendMessage(m.key.remoteJid, {text: '🤖 *AI Thinking...*\\n\\nPrompt: '+prompt+'\\n\\n[Integrasikan OpenAI/Gemini API lu disini]'});
};
`,
group: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  const from = m.key.remoteJid;
  if(!from.endsWith('@g.us')) return;
  if(body==='.hidetag'){
    const meta = await sock.groupMetadata(from);
    const mentions = meta.participants.map(p=>p.id);
    await sock.sendMessage(from, {text: '📢 Hidetag by bot\\n'+body, mentions});
  }
  if(body.startsWith('.kick')){
    const target = body.split(' ')[1];
    if(target) await sock.sendMessage(from, {text: 'Kick: '+target+' [butuh bot admin]'});
  }
  if(body==='.group open') await sock.groupSettingUpdate(from, 'not_announcement');
  if(body==='.group close') await sock.groupSettingUpdate(from, 'announcement');
};
`,
rpg: () => `const db = global.rpgDB = global.rpgDB || {};
export default async (m, sock) => {
  const from = m.key.remoteJid;
  const sender = m.key.participant || from;
  if(!db[sender]) db[sender] = {money:0, exp:0, level:1};
  const body = (m.message?.conversation||'').trim();
  if(body==='.daily'){
    db[sender].money+=1000;
    db[sender].exp+=50;
    await sock.sendMessage(from, {text: '💰 Daily Claim!\\n+1000 Money\\n+50 Exp\\nBalance: '+db[sender].money+' Money, Level: '+db[sender].level});
  }
  if(body==='.balance' || body==='.bal'){
    await sock.sendMessage(from, {text: '💰 Balance\\nMoney: '+db[sender].money+'\\nExp: '+db[sender].exp+'\\nLevel: '+db[sender].level});
  }
  if(body==='.levelup' && db[sender].exp>=100){
    db[sender].level++;
    db[sender].exp=0;
    await sock.sendMessage(from, {text: '🎉 Level Up! Sekarang Level '+db[sender].level});
  }
};
`,
store: () => `const produkDB = global.produkDB = global.produkDB || [];
export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(body.startsWith('.addproduk')){
    const name = body.slice(10).trim();
    if(!name) return sock.sendMessage(m.key.remoteJid, {text: 'Contoh: .addproduk Nama Produk - Harga'});
    produkDB.push({name, id: Date.now()});
    await sock.sendMessage(m.key.remoteJid, {text: '✅ Produk ditambah:\\n'+name+'\\nTotal produk: '+produkDB.length});
  }
  if(body==='.listproduk' || body==='.produk'){
    if(produkDB.length===0) return sock.sendMessage(m.key.remoteJid, {text: 'Belum ada produk'});
    const list = produkDB.map((p,i)=> (i+1)+'. '+p.name).join('\\n');
    await sock.sendMessage(m.key.remoteJid, {text: '📦 *LIST PRODUK*\\n\\n'+list});
  }
  if(body.startsWith('.delproduk')){
    const idx = parseInt(body.split(' ')[1])-1;
    if(!isNaN(idx) && produkDB[idx]){ produkDB.splice(idx,1); await sock.sendMessage(m.key.remoteJid, {text: '✅ Produk dihapus'}); }
  }
};
`,
autoreply: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').toLowerCase().trim();
  if(body==='halo' || body==='hai' || body==='bot' || body==='p' || body==='cie'){
    await sock.sendMessage(m.key.remoteJid, {text: 'Halo juga! 👋 Ketik .menu untuk lihat menu bot'});
  }
  if(body.includes('assalamualaikum')){
    await sock.sendMessage(m.key.remoteJid, {text: 'Waalaikumsalam! 👋'});
  }
};
`,
broadcast: () => `export default async (m, sock) => {
  const body = (m.message?.conversation||'').trim();
  if(!body.startsWith('.bc ') && !body.startsWith('.broadcast ')) return;
  if(!m.key.fromMe && !global.owner) return;
  const text = body.slice(body.indexOf(' ')+1);
  if(!text) return sock.sendMessage(m.key.remoteJid, {text: 'Contoh: .bc Halo semua'});
  try{
    const chats = await sock.groupFetchAllParticipating();
    let count=0;
    for(const id in chats){
      await sock.sendMessage(id, {text: '📢 *BROADCAST*\\n\\n'+text});
      count++;
      await new Promise(r=>setTimeout(r,1000));
    }
    await sock.sendMessage(m.key.remoteJid, {text: '✅ Broadcast terkirim ke '+count+' grup'});
  }catch(e){
    await sock.sendMessage(m.key.remoteJid, {text: 'Gagal BC: '+e.message});
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
  if(style==='simple') baseText = `*MENU ${botName}*\\nOwner: ${cfg.owner}\\n\\n${features.map(f=>'• .'+f).join('\\n')}`;
  else if(style==='image') baseText = `╭─「 *${botName}* 」\\n│ Owner: ${cfg.owner}\\n${list}\\n╰─ Image Menu`;
  else baseText = `╭━━━〔 *${botName}* 〕━━━┈⊷\\n┃ Owner: ${cfg.owner}\\n┃ Bot: ${botName}\\n┃ Pairing: ${cfg.pairingNumber}\\n╰━━━━━━━━━━━━┈⊷\\n${list}\\n╰━━━━━━━━━━━━┈⊷\\n\\nKetik .ping untuk cek bot`;

  if(btnMode==='btn'){
    return `import fs from 'fs';
export default async (m,sock)=>{
  const body = (m.message?.conversation||m.message?.extendedTextMessage?.text||'').trim();
  if(body!=='.menu' && body!=='.help' && body!=='.bot') return;
  const caption = \`${baseText}\`;
  const buttons = [
    {buttonId:'.ping', buttonText:{displayText:'📶 PING BOT'}, type:1},
    {buttonId:'.sticker', buttonText:{displayText:'🎨 STICKER'}, type:1},
    {buttonId:'.ai halo', buttonText:{displayText:'🤖 AI CHAT'}, type:1},
    {buttonId:'.listproduk', buttonText:{displayText:'📦 PRODUK'}, type:1}
  ];
  try{
    if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')){
      await sock.sendMessage(m.key.remoteJid, {image: fs.readFileSync('./thumb.jpg'), caption, footer: '${botName} - ${cfg.owner}', buttons, headerType: 4});
    } else {
      await sock.sendMessage(m.key.remoteJid, {text: caption, footer: '${botName}', buttons, headerType: 1});
    }
  }catch(e){ await sock.sendMessage(m.key.remoteJid, {text: caption}); }
};`;
  } else {
    return `import fs from 'fs';
export default async (m,sock)=>{
  const body = (m.message?.conversation||m.message?.extendedTextMessage?.text||'').trim();
  if(body!=='.menu' && body!=='.help' && body!=='.bot') return;
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

  return `// ${botName} - CASE V12 FULL FITUR + PAIRING 1 MENIT (logic dari code lu - anti Gagal menautkan perangkat)
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("noxleyss");
const pino = require("pino");
const fs = require("fs");

const ownerNumber = "${cfg.owner}";
const botName = "${botName}";
const pairingNumber = "${cleanNumber}";
let rpgDB = {};
let produkDB = [];

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: ${cfg.conn==='qr'}
  });

  // === PAIRING FIX - LOGIC PERSIS CODE LU YANG GAK BURU-BURU 1 MENIT MASIH BISA ===
  if (!sock.authState.creds.registered) {
    const phoneNumber = "${cleanNumber}";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(\`[PAIRING CODE] Kode: \${code} - Berlaku 60-120 detik, santai! Fix error 2L3F-PWB8 Gagal menautkan perangkat\`);
      } catch (err) {
        console.error("Gagal pairing:", err.message);
      }
    }, 4000);
  }

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open"){
      console.log(\`[SUCCESS] \${botName} terhubung! V12 FULL FITUR\`);
      console.log(\`Owner: \${ownerNumber} | Pairing: \${pairingNumber} | Base: CASE | Menu: ${menuStyle} | Btn: ${btn} | Thumb: ${thumb}\`);
    } else if (connection === "close") {
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
    const args = body.split(' ').slice(1).join(' ');

    // === MENU - ${menuStyle} + ${btn} + ${thumb} ===
    if(command==='menu' || command==='help' || command==='bot'){
      let menuText = '';
      if('${menuStyle}'==='simple') menuText = \`MENU \${botName}\\n${features.map(f=>'• .'+f).join('\\n')}\`;
      else if('${menuStyle}'==='image') menuText = \`╭─「 \${botName} 」\\n${features.map(f=>'│ • .'+f).join('\\n')}\\n╰─ Image Menu\`;
      else menuText = \`╭━━━〔 \${botName} 〕━━━\\n${features.map(f=>'┃ • .'+f).join('\\n')}\\n╰━━━━━━━━━━━━\\nOwner: \${ownerNumber}\\nBot: \${botName}\`;

      if('${thumb}'==='thumb' && fs.existsSync('./thumb.jpg')){
        await sock.sendMessage(from, {image: fs.readFileSync('./thumb.jpg'), caption: menuText});
      } else {
        await sock.sendMessage(from, {text: menuText});
      }
      ${btn==='btn' ? `await sock.sendMessage(from, {text: 'Pilih fitur:', footer: botName, buttons: [{buttonId:'.ping', buttonText:{displayText:'📶 PING'}, type:1}, {buttonId:'.sticker', buttonText:{displayText:'🎨 STICKER'}, type:1}], headerType:1});` : ''}
      return;
    }

    if(command==='ping'){
      await sock.sendMessage(from, {text: \`Pong! \${botName} aktif ✅ V12 FULL\\nOwner: \${ownerNumber}\\nPairing: \${pairingNumber}\\nBase: CASE\\nFitur: ${(cfg.features||[]).join(', ')}\`});
      return;
    }

    // === FULL FITUR CASE LENGKAP ===
    ${features.includes('welcome') ? `if(command==='welcome'){ await sock.sendMessage(from,{text:'✅ Welcome '+(args||'ON')}); return; }` : ''}
    ${features.includes('antilink') ? `if(body.includes('chat.whatsapp.com') && from.endsWith('@g.us')){ try{ const meta=await sock.groupMetadata(from); const botId=sock.user.id.split(':')[0]+'@s.whatsapp.net'; const isAdmin=meta.participants.find(p=>p.id===botId)?.admin; if(isAdmin) await sock.sendMessage(from,{delete:m.key}); }catch{} await sock.sendMessage(from,{text:'⚠️ Antilink Detected!'}); }` : ''}
    ${features.includes('sticker') ? `if(command==='s' || command==='sticker'){ try{ const buf=await sock.downloadMediaMessage(m); await sock.sendMessage(from,{sticker:buf}); }catch{ await sock.sendMessage(from,{text:'Reply gambar dengan .s'}); } return; }` : ''}
    ${features.includes('downloader') ? `if(['tiktok','yt','ig','fb'].includes(command)){ await sock.sendMessage(from,{text:'⏳ Downloader: '+command+' - '+args}); return; }` : ''}
    ${features.includes('ai') ? `if(command==='ai'){ await sock.sendMessage(from,{text:'🤖 AI: '+args}); return; }` : ''}
    ${features.includes('group') ? `if(command==='hidetag'){ if(!from.endsWith('@g.us')) return; const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:'Hidetag', mentions:meta.participants.map(p=>p.id)}); return; }` : ''}
    ${features.includes('rpg') ? `if(command==='daily'){ if(!rpgDB[from]) rpgDB[from]={money:0}; rpgDB[from].money+=1000; await sock.sendMessage(from,{text:'💰 Daily +1000! Balance: '+rpgDB[from].money}); return; } if(command==='balance'||command==='bal'){ await sock.sendMessage(from,{text:'💰 Balance: '+(rpgDB[from]?.money||0)}); return; }` : ''}
    ${features.includes('store') ? `if(command==='addproduk'){ produkDB.push(args); await sock.sendMessage(from,{text:'✅ Produk ditambah: '+args+'\\nTotal: '+produkDB.length}); return; } if(command==='listproduk'||command==='produk'){ await sock.sendMessage(from,{text:'📦 List:\\n'+produkDB.map((p,i)=>(i+1)+'. '+p).join('\\n')}); return; }` : ''}
    ${features.includes('autoreply') ? `if(['halo','hai','bot','p'].includes(body.toLowerCase())){ await sock.sendMessage(from,{text:'Halo juga! Ketik .menu'}); return; }` : ''}
    ${features.includes('broadcast') ? `if(command==='bc' || command==='broadcast'){ const chats=await sock.groupFetchAllParticipating(); for(const id in chats){ await sock.sendMessage(id,{text:'📢 BC\\n\\n'+args}); } await sock.sendMessage(from,{text:'✅ BC ke '+Object.keys(chats).length+' grup'}); return; }` : ''}
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
    if(!cfg.pairingNumber) return res.status(400).json({error:'Nomor Bot Pairing wajib - isi 628xxxx'});
    const cleanNumber = (cfg.pairingNumber||'').replace(/[^0-9]/g,'');
    const botName = cfg.botName;
    const safeName = botName.replace(/[^a-zA-Z0-9-_]/g,'-');
    const zip = new JSZip();

    let botCode = '';
    if(cfg.base==='case'){
      botCode = getCaseTemplate(cfg);
    } else {
      botCode = \`// \${botName} ESM V12 FULL PLUGIN + PAIRING 1 MENIT (logic dari code lu)
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
    printQRInTerminal: \${cfg.conn==='qr'}
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = "\${cleanNumber}";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(\`[PAIRING CODE] \${code} - Berlaku 60-120 detik, santai! Fix error Gagal menautkan perangkat\`);
      } catch (err) {
        console.error("Gagal pairing:", err.message);
      }
    }, 4000);
  }

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (u)=>{
    if(u.connection==="open") console.log("${botName} CONNECTED V12 FULL");
    if(u.connection==="close" && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });

  const plugins={}; const pFolder=path.join(__dirname,'plugins');
  if(fs.existsSync(pFolder)) for(const f of fs.readdirSync(pFolder)){ if(f.endsWith('.js')){ const mod=await import('./plugins/'+f); plugins[f]=mod.default; console.log('Loaded '+f); } }
  sock.ev.on("messages.upsert", async ({messages})=>{ const m=messages?.[0]; if(!m?.message) return; for(const k in plugins){ try{ await plugins[k](m,sock); }catch(e){ console.error('Plugin error',k,e.message)} } });
}
startBot();
\`;
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
      version: '12.0.0',
      type: cfg.base==='esm' ? 'module' : 'commonjs',
      main: 'index.js',
      scripts: { start: 'node index.js' },
      dependencies: { "noxleyss": "^1.2.1", "pino": "^9.3.2" }
    }, null, 2));

    if(cfg.thumb==='thumb' && cfg.thumbData){
      const b64 = cfg.thumbData.split(',')[1];
      if(b64) zip.file('thumb.jpg', b64, {base64:true});
    }

    zip.file('README.txt', \`BOT: \${botName}
PAIRING: \${cleanNumber}
OWNER: \${cfg.owner}
BASE: \${cfg.base}
CONN: \${cfg.conn}
MENU: \${cfg.menuStyle}
BTN: \${cfg.btn}
THUMB: \${cfg.thumb}
FITUR: \${(cfg.features||[]).join(', ')}

V12 FULL FITUR - FIX SVG + FIX FUNCTION_INVOCATION_FAILED + PAIRING 1 MENIT
Logic pairing dari code lu: noxleyss + 4 detik delay, kode hidup 60-120 detik
Fix error screenshot 2L3F-PWB8 Gagal menautkan perangkat
Cara: npm install && npm start
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