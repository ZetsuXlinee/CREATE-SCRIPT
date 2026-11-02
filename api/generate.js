const JSZip = require('jszip');

const PLUGIN_TEMPLATES = {
welcome: () => `export default async (m, sock) => { if((m.message?.conversation||'').startsWith('.welcome')) await sock.sendMessage(m.key.remoteJid,{text:'✅ Welcome ON'}); };`,
antilink: () => `export default async (m, sock) => { if((m.message?.conversation||'').includes('chat.whatsapp.com')) await sock.sendMessage(m.key.remoteJid,{text:'⚠️ Antilink!'}); };`,
sticker: () => `export default async (m, sock) => { const b=m.message?.conversation||''; if(!b.startsWith('.s')) return; try{ const buf=await sock.downloadMediaMessage(m); await sock.sendMessage(m.key.remoteJid,{sticker:buf}); }catch{} };`,
downloader: () => `export default async (m, sock) => { const b=m.message?.conversation||''; if(b.startsWith('.tiktok')) await sock.sendMessage(m.key.remoteJid,{text:'⏳ Downloader aktif'}); };`,
ai: () => `export default async (m, sock) => { const b=m.message?.conversation||''; if(b.startsWith('.ai ')) await sock.sendMessage(m.key.remoteJid,{text:'🤖 AI: '+b.slice(4)}); };`,
group: () => `export default async (m, sock) => { const b=m.message?.conversation||''; if(b==='.hidetag'){ const meta=await sock.groupMetadata(m.key.remoteJid); await sock.sendMessage(m.key.remoteJid,{text:'Hidetag',mentions:meta.participants.map(p=>p.id)}); } };`,
rpg: () => `export default async (m, sock) => { if(m.message?.conversation==='.daily') await sock.sendMessage(m.key.remoteJid,{text:'💰 Daily +1000'}); };`,
store: () => `export default async (m, sock) => { if((m.message?.conversation||'').startsWith('.addproduk')) await sock.sendMessage(m.key.remoteJid,{text:'✅ Produk add'}); };`,
autoreply: () => `export default async (m, sock) => { const b=(m.message?.conversation||'').toLowerCase(); if(b==='halo') await sock.sendMessage(m.key.remoteJid,{text:'Halo juga! .menu'}); };`,
broadcast: () => `export default async (m, sock) => { if((m.message?.conversation||'').startsWith('.bc ')) await sock.sendMessage(m.key.remoteJid,{text:'📢 BC OK'}); };`
};

function getMenuPlugin(cfg){
  const botName=cfg.botName||'Bot'; const features=cfg.features||[]; let style=cfg.menuStyle||'premium'; const btnMode=cfg.btn||'nobtn'; const thumb=cfg.thumb||'nothumb';
  if(style==='image' && thumb==='nothumb') style='premium';
  const list=features.map(f=>`│ ◦ .${f}`).join('\\n');
  let baseText = style==='simple' ? `MENU ${botName}\\n${list}` : style==='image' ? `╭─「 *${botName}* 」\\n${list}\\n╰─` : `╭━━━〔 *${botName}* 〕━━━\\n${list}\\n╰━━`;
  if(btnMode==='btn'){
    return `import fs from 'fs'; export default async (m,sock)=>{ if((m.message?.conversation||'').trim()!=='.menu') return; const caption=\`${baseText}\`; const buttons=[{buttonId:'.ping',buttonText:{displayText:'📶 PING'},type:1},{buttonId:'.sticker',buttonText:{displayText:'🎨 STICKER'},type:1},{buttonId:'.ai halo',buttonText:{displayText:'🤖 AI'},type:1}]; try{ if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')) await sock.sendMessage(m.key.remoteJid,{image:fs.readFileSync('./thumb.jpg'),caption,footer:'${botName}',buttons,headerType:4}); else await sock.sendMessage(m.key.remoteJid,{text:caption,footer:'${botName}',buttons,headerType:1}); }catch{ await sock.sendMessage(m.key.remoteJid,{text:caption}); } };`;
  } else {
    return `import fs from 'fs'; export default async (m,sock)=>{ if((m.message?.conversation||'').trim()!=='.menu') return; const text=\`${baseText}\`; if(${thumb==='thumb'} && fs.existsSync('./thumb.jpg')) await sock.sendMessage(m.key.remoteJid,{image:fs.readFileSync('./thumb.jpg'),caption:text}); else await sock.sendMessage(m.key.remoteJid,{text}); };`;
  }
}

function getCaseTemplate(cfg){
  const cleanNumber=(cfg.pairingNumber||cfg.owner||'').replace(/[^0-9]/g,'');
  return `// ${cfg.botName} - CASE V9 PAIRING ANTI GAGAL (logic dari code lu)
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "noxleyss";
import pino from "pino";
import fs from "fs";

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: ${cfg.conn==='qr'}
  });

  // === LOGIC PERSIS CODE LU YANG ENAK - GAK BURU-BURU 1 MENIT MASIH BISA ===
  if (!sock.authState.creds.registered) {
    const phoneNumber = "${cleanNumber}";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(\`[PAIRING CODE] Kode Pairing Anda: \${code} - Berlaku 1-2 menit, santai!\`);
      } catch (err) {
        console.error("Gagal mendapatkan pairing code:", err);
      }
    }, 4000);
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("[SUCCESS] ${cfg.botName} terhubung!");
    } else if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({messages})=>{
    const m=messages[0]; if(!m.message) return; const from=m.key.remoteJid; const body=m.message.conversation||m.message.extendedTextMessage?.text||''; 
    if(body.trim()==='.menu'){ await sock.sendMessage(from,{text:'MENU ${cfg.botName}\\n${cfg.features.map(f=>'• .'+f).join('\\n')}'}); }
    if(body.trim()==='.ping'){ await sock.sendMessage(from,{text:'Pong ${cfg.botName} V9 ✅'}); }
  });
}
startBot();
`;
}

function getEsmTemplate(cfg){
  const cleanNumber=(cfg.pairingNumber||cfg.owner||'').replace(/[^0-9]/g,'');
  return `// ${cfg.botName} ESM V9 - PAIRING LOGIC PERSIS PUNYA LU
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "noxleyss";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pinkSoft = "\\x1b[38;5;213m";
const resetColor = "\\x1b[0m";

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
        console.log(\`\${pinkSoft}[PAIRING CODE] Kode: \${code} - Berlaku 60-120 detik, gak perlu buru-buru kayak screenshot error 2L3F-PWB8\${resetColor}\`);
      } catch (err) {
        console.error("Gagal mendapatkan pairing code:", err);
      }
    }, 4000);
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("[SUCCESS] ${cfg.botName} terhubung ke WhatsApp! V9 FIX");
    } else if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  const plugins={}; const pFolder=path.join(__dirname,'plugins');
  if(fs.existsSync(pFolder)) for(const f of fs.readdirSync(pFolder)){ if(f.endsWith('.js')){ const mod=await import('./plugins/'+f); plugins[f]=mod.default; } }
  sock.ev.on("messages.upsert", async ({messages})=>{ const m=messages?.[0]; if(!m?.message) return; for(const k in plugins){ try{ await plugins[k](m,sock); }catch{} } });
}
startBot();
`;
}

module.exports = async (req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const cfg=req.body; if(!cfg.botName) return res.status(400).json({error:'botName wajib'});
    if(cfg.menuStyle==='image' && cfg.thumb!=='thumb') cfg.menuStyle='premium';
    const zip=new (require('jszip'))(); const safeName=cfg.botName.replace(/[^a-zA-Z0-9-_]/g,'-');
    let botCode = cfg.base==='case' ? getCaseTemplate(cfg) : getEsmTemplate(cfg);
    const pluginsFolder = cfg.base!=='case' ? zip.folder('plugins') : null;
    if(pluginsFolder){ pluginsFolder.file('menu.js', getMenuPlugin(cfg)); for(const f of cfg.features||[]){ if(PLUGIN_TEMPLATES[f]) pluginsFolder.file(f+'.js', PLUGIN_TEMPLATES[f](cfg)); } }
    zip.file('index.js', botCode);
    zip.file('package.json', JSON.stringify({
      name: safeName.toLowerCase(),
      version: '9.0.0',
      type: cfg.base==='esm' ? 'module' : 'commonjs',
      main: 'index.js',
      scripts: { start: 'node index.js' },
      dependencies: { "noxleyss": "^1.2.1", "pino": "^9.3.2" }
    }, null, 2));
    if(cfg.thumb==='thumb' && cfg.thumbData) zip.file('thumb.jpg', cfg.thumbData.split(',')[1], {base64:true});
    zip.file('README.txt', \`PAIRING V9 FIX GAGAL MENUTKAN PERANGKAT\nLogic dari code lu: noxleyss + 4 detik delay\nKode berlaku 1-2 menit, bukan 20 detik kayak Baileys lama\nJika error 2L3F-PWB8 seperti screenshot, ini fixnya\n\`);
    const buf=await zip.generateAsync({type:'nodebuffer'}); res.setHeader('Content-Type','application/zip'); res.setHeader('Content-Disposition','attachment; filename='+safeName+'.zip'); res.send(buf);
  }catch(e){ res.status(500).json({error:e.message}); }
}