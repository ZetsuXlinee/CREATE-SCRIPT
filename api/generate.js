// api/generate.js - ULTIMATE FULL FIX (9 BUGS FIXED)
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  
  try {
    const {
      botName, ownerNumber, ownerName, pairingNumber,
      teleToken, teleUsername, platform, base,
      menuType, btnType, thumbType, thumbData,
      usePanel, panelDomain, panelPtla, panelEgg, panelLoc,
      features
    } = req.body || {};

    if(!botName) return res.status(400).json({ error: 'Isi botName dulu' });

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    
    let list = features && features.length > 0 ? features : [
      'menu','ping','owner','info','vidsave','bypass','rch','iqc','web2apk','unblur','fotolive','welcome','antilink','hidetag'
    ];

    if (usePanel && !list.includes('panel')) list.push('panel');

    if (thumbType === 'thumb' && thumbData && thumbData.startsWith('data:image')) {
      const base64Data = thumbData.split(',')[1];
      zip.file('thumbnail.jpg', Buffer.from(base64Data, 'base64'));
    }

    const panelConfigString = usePanel ? `panel: { domain: "${panelDomain || ''}", ptla: "${panelPtla || ''}", egg: "${panelEgg || '15'} ", loc: "${panelLoc || '1'}" },` : '';

    // ================= 1. TELEGRAM =================
    if(platform === 'telegram'){
      const settingsTele = `module.exports = { botName: "${botName}", ownerName: "${ownerName}", features: ${JSON.stringify(list)} };`;
      zip.file('settings.js', settingsTele);
      const pkgDeps = { telegraf: "^4.15.3", axios: "^1.7.2", "node-fetch": "^3.3.2", "moment-timezone": "^0.5.45", "jimp": "^0.22.12", "form-data": "^4.0.0" };
      zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "commonjs", dependencies: pkgDeps }, null, 2));
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 2. CASE =================
    if(base === 'case'){
      const settingsCase = `module.exports = { botName: "${botName}", ownerNumber: "${ownerNumber}", ownerName: "${ownerName}", pairingNumber: "${pairingNumber}", prefix: ".", features: ${JSON.stringify(list)}, menuType: "${menuType}", btnType: "${btnType}", thumbType: "${thumbType}", ${panelConfigString} };`;
      
      const indexCase = `const settings = require('./settings.js');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('noxleys-baileys');
const pino = require('pino'); const fs = require('fs'); const path = require('path'); const axios = require('axios'); const os = require('os');
const moment = require('moment-timezone');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();
global.plugins = {};
${usePanel ? `global.panel = settings.panel;` : ''}

['./src/database/welcome', './src/database/welcome-bg'].forEach(d => { if(!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

function fontBold(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D400 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D41A + n - 97); if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7CE + n - 48); return c; }).join(''); }
function fontSmallCaps(str) { const map = { 'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ' }; return [...String(str).toLowerCase()].map(c => map[c] || c).join(''); }
function fontItalic(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D608 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D622 + n - 97); return c; }).join(''); }
function runtime() { const s = process.uptime(); const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); const m = Math.floor((s%3600)/60); return [d?d+'d':'', h?h+'h':'', m?m+'m':'', Math.floor(s%60)+'s'].filter(Boolean).join(' '); }
function ucapan() { const h = moment.tz('Asia/Jakarta').hour(); if(h<4)return'Good Night'; if(h<11)return'Good Morning'; if(h<15)return'Good Afternoon'; if(h<18)return'Good Evening'; return 'Good Night'; }

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){ setTimeout(async()=>{ try{ const code = await sock.requestPairingCode(settings.pairingNumber); console.log('Pairing Code ' + settings.botName + ': ' + code); }catch(e){} }, 3000); }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(settings.botName + ' Connected!');
    if(u.connection === 'close'){ const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if(r) setTimeout(()=>startBot(), 3000); }
  });

  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0]; if(!msg || !msg.message) return;
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    // FIX BUTTON CLICK CASE
    if (msg.message?.buttonsResponseMessage) {
        body = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message?.templateButtonReplyMessage) {
        body = msg.message.templateButtonReplyMessage.selectedId;
    }

    if (body) console.log(\`\\x1b[36m[PESAN MASUK]\\x1b[0m Dari: \\x1b[33m\${sender.split('@')[0]}\\x1b[0m | Isi: \\x1b[32m\${body}\\x1b[0m\`);

    if(msg.key.fromMe && !body.startsWith('.')) return;
    if(!body.startsWith('.')) return;
    
    await sock.sendPresenceUpdate('composing', remoteJid);

    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase(); const text = args.join(' ');

    if(command === 'menu' || command === 'help') {
        let textMenu = '';
        const d = { greeting: ucapan(), user: sender.split('@')[0], role: 'Beginner', level: 0, limit: 'Unlimited', runtime: runtime(), commands: settings.features.length, categories: 1 };
        const sys = { platform: os.platform(), node: process.version, ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB' };

        if (settings.menuType === '1') {
            textMenu = \`╭─── ⟡ \${fontBold(settings.botName)} ⟡ ───\\n│ \${d.greeting}, \${fontItalic(d.user)}\\n│\\n├ ⊛ \${fontSmallCaps('Role')}     : \${fontItalic(d.role)}\\n├ ⊛ \${fontSmallCaps('Level')}    : \${d.level}\\n├ ⊛ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n│\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Category')} : \${d.categories}\\n│\\n╰── ■■■■■■■■■■ 100%\`;
        } else if (settings.menuType === '2') {
            textMenu = \`⟪ \${fontBold('EDEN ACADEMY')} ⟫\\n═══════════════════════\\n✧ \${fontSmallCaps('Student')}  : \${fontItalic(d.user)}\\n✧ \${fontSmallCaps('Rank')}     : \${fontItalic(d.role)}\\n✧ \${fontSmallCaps('Level')}    : \${d.level}\\n✧ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n\\n✧ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n✧ \${fontSmallCaps('Commands')} : \${d.commands}\\n✧ \${fontSmallCaps('Category')} : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n═══════════════════════\\n⟡ \${fontSmallCaps('Status')} : \${fontItalic('Imperial Scholar')}\`;
        } else if (settings.menuType === '3') {
            textMenu = \`[ \${fontBold(settings.botName.toUpperCase())} ]\\n-----------------------\\n> \${fontBold('PROFILE')}\\n  \${fontSmallCaps('User')}      : \${fontItalic(d.user)}\\n  \${fontSmallCaps('Role')}      : \${fontItalic(d.role)}\\n  \${fontSmallCaps('Level')}     : \${d.level}\\n  \${fontSmallCaps('Limit')}     : \${fontItalic(d.limit)}\\n\\n> \${fontBold('SYSTEM')}\\n  \${fontSmallCaps('Status')}    : ᴏɴʟɪɴᴇ\\n  \${fontSmallCaps('Runtime')}   : \${d.runtime}\\n  \${fontSmallCaps('Platform')}  : \${sys.platform}\\n  \${fontSmallCaps('Node')}      : \${sys.node}\\n\\n> \${fontBold('STATISTICS')}\\n  \${fontSmallCaps('Commands')}  : \${d.commands}\\n  \${fontSmallCaps('Category')}  : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n-----------------------\`;
        } else {
            textMenu = \`┌─✦ \${fontBold(settings.botName + ' SYSTEM')} ✦─┐\\n│\\n├ ⊛ \${fontSmallCaps('Mode')}     : PUBLIC\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Platform')} : \${sys.platform}\\n├ ⊛ \${fontSmallCaps('RAM')}      : \${sys.ram}\\n├ ⊛ \${fontSmallCaps('Status')}   : ᴏɴʟɪɴᴇ\\n│\\n└─ ■■■■■■■■■■ 100%\`;
        }
        textMenu += \`\\n\\n╭━━━〔 \${settings.features.length} FITUR 〕━━━\\n\` + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + \`\\n╰━━━━━━━━━━━━━━\`;
        
        if (settings.btnType === 'btn') {
            try {
                const imgPath = './thumbnail.jpg';
                const msgPayload = { text: textMenu, footer: 'Powered by ' + settings.botName, buttons: [ { buttonId: '.menu', buttonText: { displayText: '≡ Menu' }, type: 1 }, { buttonId: '.ping', buttonText: { displayText: '⟳ Ping' }, type: 1 }, { buttonId: '.owner', buttonText: { displayText: '⟡ Owner' }, type: 1 } ], headerType: 1 };
                if (fs.existsSync(imgPath)) { msgPayload.image = fs.readFileSync(imgPath); msgPayload.headerType = 4; }
                await sock.sendMessage(remoteJid, msgPayload, { quoted: msg });
            } catch (e) { await sock.sendMessage(remoteJid, { text: textMenu }, { quoted: msg }); }
        } else {
            await sock.sendMessage(remoteJid, { text: textMenu }, { quoted: msg });
        }
        return;
    }
    if(command === 'ping') return await sock.sendMessage(remoteJid, { text: '🏓 Pong!' }, { quoted: msg });
    if(command === 'owner') return await sock.sendMessage(remoteJid, { text: '👑 Owner: ' + settings.ownerName }, { quoted: msg });
  });
}
startBot();
`;

      zip.file('settings.js', settingsCase);
      const pkgDeps = { "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2", "axios": "^1.7.2", "node-fetch": "^3.3.2", "fflate": "^0.8.2", "sharp": "^0.34.5", "jimp": "^0.22.12", "moment-timezone": "^0.5.45" };
      zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "commonjs", main: "index.js", scripts: { start: "node index.js" }, dependencies: pkgDeps }, null, 2));
      zip.file('database.json', JSON.stringify({ data: { users: {}, chats: {}, settings: {} }, welcome:[], antilink:[], autoreply:{} }, null, 2));
      zip.file('index.js', indexCase);
      
      const pf = zip.folder('plugins');
      list.forEach(f => { if(f !== 'panel') pf.file(f+'.js', `module.exports = {};\n`); });
      
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
      return res.send(buffer);
    }

    // ================= 3. ESM =================
    const settingsESM = `export default { botName: "${botName}", ownerNumber: "${ownerNumber}", ownerName: "${ownerName}", pairingNumber: "${pairingNumber}", prefix: ".", features: ${JSON.stringify(list)}, menuType: "${menuType}", btnType: "${btnType}", thumbType: "${thumbType}", ${panelConfigString} };`;
    
    const indexESM = `import settings from './settings.js';
import {makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from 'noxleys-baileys';
import pino from 'pino'; import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import os from 'os'; import moment from 'moment-timezone';

global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();
global.plugins = {};
${usePanel ? `global.panel = settings.panel;` : ''}

['./src/database/welcome', './src/database/welcome-bg'].forEach(d => { if(!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

console.log('Starting ESM ' + settings.botName);

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ logger: pino({ level: "silent" }), auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  
  if(!state.creds.registered){ setTimeout(async()=>{ try{ const code = await sock.requestPairingCode(settings.pairingNumber); console.log('Pairing Code: ' + code); }catch(e){} }, 3000); }
  
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const plugins = [];
  if(fs.existsSync(pluginsDir)){
    const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
    for(const file of files){ 
        const mod = await import(pathToFileURL(path.join(pluginsDir, file)).href); 
        if(mod.default) { plugins.push(mod.default); global.plugins[file.replace('.js', '')] = mod.default; } 
    }
  }
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log('Connected!');
    if(u.connection === 'close'){ const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if(r) setTimeout(()=>startBot(), 3000); }
  });
  sock.ev.on('group-participants.update', async (update) => { for(const p of plugins){ if(p.onParticipantsUpdate) await p.onParticipantsUpdate(sock, update); } });
  
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0]; if(!msg || !msg.message) return;
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    
    // FIX BUTTON CLICK ESM
    if (msg.message?.buttonsResponseMessage) {
        body = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message?.templateButtonReplyMessage) {
        body = msg.message.templateButtonReplyMessage.selectedId;
    }

    if (body) console.log(\`\\x1b[36m[PESAN MASUK]\\x1b[0m Dari: \\x1b[33m\${sender.split('@')[0]}\\x1b[0m | Isi: \\x1b[32m\${body}\\x1b[0m\`);

    if (msg.key.fromMe && !body.startsWith('.')) return;
    if(body && global.db.autoreply[body.toLowerCase()]){ await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg }); return; }
    if(global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)){ if(!msg.key.fromMe){ try{ await sock.sendMessage(remoteJid, { delete: msg.key }); }catch{} } return; }
    if(!body.startsWith('.')) return;
    
    await sock.sendPresenceUpdate('composing', remoteJid);

    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase(); const text = args.join(' ');
    
    for(const p of plugins){ if(p.command && p.command.includes(command)){ try{ await p.handler(sock, msg, { remoteJid, sender, command, args, text, settings, isGroup: remoteJid.endsWith('@g.us') }); }catch(e){ console.error(e); } } }
  });
}
startBot();
`;

    zip.file('settings.js', settingsESM);
    const pkgDeps = { "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2", "axios": "^1.7.2", "node-fetch": "^3.3.2", "fflate": "^0.8.2", "sharp": "^0.34.5", "jimp": "^0.22.12", "moment-timezone": "^0.5.45", "fluent-ffmpeg": "^2.1.2", "ffmpeg-static": "^5.2.0", "form-data": "^4.0.0" };
    zip.file('package.json', JSON.stringify({ name: safe, version: "1.0.0", type: "module", main: "index.js", scripts: { start: "node index.js" }, dependencies: pkgDeps }, null, 2));
    zip.file('database.json', JSON.stringify({ data: { users: {}, chats: {}, settings: {} }, welcome:[], antilink:[], autoreply:{} }, null, 2));
    zip.file('index.js', indexESM);

    // ================= LIB FOLDER =================
    const libFolder = zip.folder('lib');
    libFolder.file('levelling.js', `export const xpRange = (level) => { let min = level * 100; let max = min + 100; return { min, max, xp: max - min }; };\nexport const getLevel = (exp) => { let level = 0; while (xpRange(level).max <= exp) level++; return level; };`);
    libFolder.file('vidsave.js', `import crypto from "crypto";\nconst AES_KEYS = ["4c9b7d2e".repeat(3) + "4c9b7d21", "rz18efAXUbdiaO7k"];\nconst BASE_API = "https://api.vidssave.com/api/contentsite_api";\nconst SSE_BASE = "https://api.vidssave.com/sse/contentsite_api";\nconst DEFAULT_HEADERS = { "User-Agent": "Mozilla/5.0", "Referer": "https://vidssave.com/", "Origin": "https://vidssave.com", "Content-Type": "application/x-www-form-urlencoded" };\nfunction decryptAES(cipherTextB64) {\n  for (const keyStr of AES_KEYS) {\n    try {\n      const key = Buffer.from(keyStr, "utf8"); const iv = Buffer.from(keyStr.slice(0, 16), "utf8");\n      const decipher = crypto.createDecipheriv(key.length === 32 ? "aes-256-cbc" : "aes-128-cbc", key, iv);\n      decipher.setAutoPadding(false);\n      const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherTextB64.trim(), "base64")), decipher.final()]);\n      let end = decrypted.length; while (end > 0 && decrypted[end - 1] === 0) end--;\n      return JSON.parse(decrypted.slice(0, end).toString("utf8"));\n    } catch {}\n  }\n  throw new Error("Gagal dekripsi VidSave");\n}\nasync function requestApi(path, data = {}) {\n  const payload = { hostname: "vidssave.com", auth: "4c9b7d21", domain: "api-ak.vidssave.com", ...data };\n  const res = await fetch(\`\${BASE_API}/\${path}\`, { method: "POST", headers: DEFAULT_HEADERS, body: new URLSearchParams(payload).toString() });\n  const json = await res.json(); if (json.status !== 1) throw new Error("API Error");\n  return typeof json.data === "string" ? decryptAES(json.data) : json.data;\n}\nexport async function parse(url) { const data = await requestApi("media/parse", { origin: "source", link: url }); return { title: data.title, resources: data.resources }; }\nexport async function download(videoUrl, format = "") { const info = await parse(videoUrl); let target = format ? info.resources.find(r => r.quality.toLowerCase() === format.toLowerCase() || r.type === format.toLowerCase()) : info.resources[0]; if (!target) target = info.resources[0]; if(!target || !target.resource_content) throw new Error("Resource tidak ditemukan"); const dlData = await requestApi("media/download", { request: target.resource_content, no_encrypt: 1, ...(format ? { output: format } : {}) }); const sseUrl = \`\${SSE_BASE}/media/download_query?auth=20250901majwlqo&domain=api-ak.vidssave.com&task_id=\${dlData.task_id}&download_domain=vidssave.com&origin=content_site\`; const sseRes = await fetch(sseUrl, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/event-stream" } }); const reader = sseRes.body.getReader(); const decoder = new TextDecoder(); let dlUrl = null; while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split("\\n")) { if (line.startsWith("data:")) { try { const p = JSON.parse(line.slice(5).trim()); if (p.download_link) { dlUrl = p.download_link; break; } } catch {} } } if (dlUrl) break; } if(!dlUrl) throw new Error("Gagal mendapatkan link download"); const redRes = await fetch(dlUrl, { redirect: "manual" }); return { title: info.title, downloadUrl: redRes.headers.get("location") || dlUrl }; }`);

    // ================= PLUGINS =================
    const pf = zip.folder('plugins');

    if (list.includes('menu')) {
        pf.file('menu.js', `import moment from 'moment-timezone'; import fs from 'fs'; import os from 'os'; import sharp from 'sharp';
const BOT_NAME = '${botName}'; const BOT_AUTHOR = '${ownerName}';
const THUMB_URL = 'https://n.uguu.se/oVprmTOj.jpeg';
async function getThumbnail() { 
    if (fs.existsSync('./thumbnail.jpg')) return fs.readFileSync('./thumbnail.jpg');
    try { const res = await fetch(THUMB_URL); return await sharp(Buffer.from(await res.arrayBuffer())).resize(300, 300).jpeg().toBuffer(); } catch { return null; } 
}
function fontBold(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D400 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D41A + n - 97); if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7CE + n - 48); return c; }).join(''); }
function fontSmallCaps(str) { const map = { 'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ' }; return [...String(str).toLowerCase()].map(c => map[c] || c).join(''); }
function fontItalic(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D608 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D622 + n - 97); return c; }).join(''); }
function runtime() { const s = process.uptime(); const d = Math.floor(s/86400); const h = Math.floor((s%86400)/3600); const m = Math.floor((s%3600)/60); return [d?d+'d':'', h?h+'h':'', m?m+'m':'', Math.floor(s%60)+'s'].filter(Boolean).join(' '); }
function ucapan() { const h = moment.tz('Asia/Jakarta').hour(); if(h<4)return'Good Night'; if(h<11)return'Good Morning'; if(h<15)return'Good Afternoon'; if(h<18)return'Good Evening'; return 'Good Night'; }

export default { command: ['menu', 'help'], tags: ['main'], help: ['menu'], handler: async (sock, msg, o) => {
    const feats = o.settings.features;
    const d = { greeting: ucapan(), user: o.sender.split('@')[0], role: 'Beginner', level: 0, limit: 'Unlimited', runtime: runtime(), commands: feats.length, categories: 1 };
    const sys = { platform: os.platform(), node: process.version, ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB' };
    let textMenu = '';
    
    if (o.settings.menuType === '1') {
        textMenu = \`╭─── ⟡ \${fontBold(BOT_NAME)} ⟡ ───\\n│ \${d.greeting}, \${fontItalic(d.user)}\\n│\\n├ ⊛ \${fontSmallCaps('Role')}     : \${fontItalic(d.role)}\\n├ ⊛ \${fontSmallCaps('Level')}    : \${d.level}\\n├ ⊛ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n│\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Category')} : \${d.categories}\\n│\\n╰── ■■■■■■■■■■ 100%\`;
    } else if (o.settings.menuType === '2') {
        textMenu = \`⟪ \${fontBold('EDEN ACADEMY')} ⟫\\n═══════════════════════\\n✧ \${fontSmallCaps('Student')}  : \${fontItalic(d.user)}\\n✧ \${fontSmallCaps('Rank')}     : \${fontItalic(d.role)}\\n✧ \${fontSmallCaps('Level')}    : \${d.level}\\n✧ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n\\n✧ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n✧ \${fontSmallCaps('Commands')} : \${d.commands}\\n✧ \${fontSmallCaps('Category')} : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n═══════════════════════\\n⟡ \${fontSmallCaps('Status')} : \${fontItalic('Imperial Scholar')}\`;
    } else if (o.settings.menuType === '3') {
        textMenu = \`[ \${fontBold(BOT_NAME.toUpperCase())} ]\\n-----------------------\\n> \${fontBold('PROFILE')}\\n  \${fontSmallCaps('User')}      : \${fontItalic(d.user)}\\n  \${fontSmallCaps('Role')}      : \${fontItalic(d.role)}\\n  \${fontSmallCaps('Level')}     : \${d.level}\\n  \${fontSmallCaps('Limit')}     : \${fontItalic(d.limit)}\\n\\n> \${fontBold('SYSTEM')}\\n  \${fontSmallCaps('Status')}    : ᴏɴʟɪɴᴇ\\n  \${fontSmallCaps('Runtime')}   : \${d.runtime}\\n  \${fontSmallCaps('Platform')}  : \${sys.platform}\\n  \${fontSmallCaps('Node')}      : \${sys.node}\\n\\n> \${fontBold('STATISTICS')}\\n  \${fontSmallCaps('Commands')}  : \${d.commands}\\n  \${fontSmallCaps('Category')}  : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n-----------------------\`;
    } else {
        textMenu = \`┌─✦ \${fontBold(BOT_NAME + ' SYSTEM')} ✦─┐\\n│\\n├ ⊛ \${fontSmallCaps('Mode')}     : PUBLIC\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Platform')} : \${sys.platform}\\n├ ⊛ \${fontSmallCaps('RAM')}      : \${sys.ram}\\n├ ⊛ \${fontSmallCaps('Status')}   : ᴏɴʟɪɴᴇ\\n│\\n└─ ■■■■■■■■■■ 100%\`;
    }

    textMenu += \`\\n\\n╭━━━〔 \${feats.length} FITUR 〕━━━\\n\` + feats.map(f => '┃ ❒ .' + f).join('\\n') + \`\\n╰━━━━━━━━━━━━━━\`;
    
    if (o.settings.btnType === 'btn') {
        try {
            const thumb = await getThumbnail();
            const msgPayload = {
                text: textMenu,
                footer: 'Powered by ' + BOT_NAME,
                buttons: [
                    { buttonId: '.menu', buttonText: { displayText: '≡ Menu' }, type: 1 },
                    { buttonId: '.ping', buttonText: { displayText: '⟳ Ping' }, type: 1 },
                    { buttonId: '.owner', buttonText: { displayText: '⟡ Owner' }, type: 1 }
                ],
                headerType: 1
            };
            if (thumb) { msgPayload.image = thumb; msgPayload.headerType = 4; }
            await sock.sendMessage(o.remoteJid, msgPayload, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(o.remoteJid, { text: textMenu }, { quoted: msg });
        }
    } else {
        try {
            const thumb = await getThumbnail();
            if (thumb) await sock.sendMessage(o.remoteJid, { image: thumb, caption: textMenu }, { quoted: msg });
            else throw new Error('no thumb');
        } catch {
            await sock.sendMessage(o.remoteJid, { text: textMenu }, { quoted: msg });
        }
    }
} };`);
    }

    if (list.includes('vidsave')) {
        pf.file('downloader.js', `import { download } from '../lib/vidsave.js';
export default { command: ['dl', 'tiktok', 'ig', 'yt'], tags: ['downloader'], help: ['dl <url>'], handler: async (sock, msg, o) => {
    if (!o.args[0]) return sock.sendMessage(o.remoteJid, { text: 'Kirim URL TikTok/IG/YT!\\n\\nContoh:\\n.' + o.command + ' https://vt.tiktok.com/xxxx' }, { quoted: msg });
    await sock.sendMessage(o.remoteJid, { text: '⏳ Mendownload...' }, { quoted: msg });
    try { const res = await download(o.args[0]); await sock.sendMessage(o.remoteJid, { video: { url: res.downloadUrl }, caption: '✅ ' + res.title }, { quoted: msg }); } catch(e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('bypass')) {
        pf.file('bypass.js', `import axios from 'axios';
export default { command: ['bypass', 'bypass2'], tags: ['tools'], help: ['bypass <url>'], handler: async (sock, msg, o) => {
    if (!o.text) return sock.sendMessage(o.remoteJid, { text: 'Kirim link yang mau dibypass!\\n\\nContoh:\\n.' + o.command + ' https://bit.ly/xxx' }, { quoted: msg });
    await sock.sendMessage(o.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(()=>{});
    try { const { data } = await axios.get('https://bypass-links.com/api/token', { headers: { Referer: 'https://bypass-links.com/' } }); const res = await axios.post('https://bypass-links.com/api/bypass', { url: o.text, bypass_token: data.token }, { headers: { Referer: 'https://bypass-links.com/', 'content-type': 'application/json' } }); await sock.sendMessage(o.remoteJid, { text: '✅ Result:\\n' + (res.data.result || res.data.url || JSON.stringify(res.data)) }, { quoted: msg }); } catch(e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('rch')) {
        pf.file('rch.js', `import axios from 'axios';
export default { command: ['rch', 'reactch'], tags: ['tools'], help: ['rch <link> <emoji>'], handler: async (sock, msg, o) => {
    if (!o.args[0] || !o.args[1]) return sock.sendMessage(o.remoteJid, { text: 'Format Salah!\\n\\nContoh:\\n.' + o.command + ' https://whatsapp.com/channel/xxx 😭,🔥\\n\\n(Maks 4 emoji dipisah koma)' }, { quoted: msg });
    await sock.sendMessage(o.remoteJid, { react: { text: '🕒', key: msg.key } }).catch(()=>{});
    try { 
        const tokenRes = await axios.get('https://omegatech-api.dixonomega.tech/api/tools/recaptcha-v3', { params: { sitekey: '6LemKk8sAAAAAH5PB3f1EspbMlXjtwv5C8tiMHSm', url: 'https://back.asitha.top/api', use_enterprise: 'false' } }); 
        const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NTZmMzhjOTllNGEzOTVlOWM0ZTc3NSIsImlhdCI6MTc3NzE2NjQ0MiwiZXhwIjoxNzc3NzcxMjQyfQ.V3yZRhC5aVoFX7rwRwjIUGLH9Ly8mz4BsqgRA8ZOcH0'; 
        const temp = await axios.post('https://back.asitha.top/api/user/get-temp-token', { recaptcha_token: tokenRes.data.token }, { headers: { Authorization: 'Bearer ' + jwt } }); 
        await axios.post('https://back.asitha.top/api/channel/react-to-post?apiKey=' + temp.data.token, { post_link: o.args[0], reacts: o.args.slice(1).join(' ') }, { headers: { Authorization: 'Bearer ' + jwt } }); 
        await sock.sendMessage(o.remoteJid, { react: { text: '✅', key: msg.key } }).catch(()=>{}); 
        await sock.sendMessage(o.remoteJid, { text: '🔥 Reactions sent successfully.' }, { quoted: msg }); 
    } catch(e) { 
        let errMsg = e.message;
        if (errMsg.includes('ENOTFOUND')) errMsg = 'Server API sedang down (Domain tidak ditemukan).';
        await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + errMsg }, { quoted: msg }); 
    }
} };`);
    }

    if (list.includes('iqc')) {
        pf.file('iqc.js', `import axios from 'axios'; import FormData from 'form-data';
export default { command: ['iqc', 'iqcv2'], tags: ['maker'], help: ['iqc <text>'], handler: async (sock, msg, o) => {
    let text = o.text;
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!text && !msg.message.imageMessage && !q?.imageMessage) return sock.sendMessage(o.remoteJid, { text: 'Kirim gambar atau reply + caption\\n\\nContoh:\\n.' + o.command + ' halo cihuyy' }, { quoted: msg });
    
    await sock.sendMessage(o.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(()=>{});
    let imgUrl = '';
    if (msg.message.imageMessage || q?.imageMessage) {
        try { 
            const targetMsg = q ? { message: q, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } } : msg;
            const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino() }); 
            const form = new FormData(); form.append('files[]', buf, 'img.jpg'); 
            const res = await axios.post('https://uguu.se/upload.php', form, { headers: form.getHeaders() }); 
            imgUrl = res.data.files[0].url; 
        } catch {}
    }
    try { const res = await axios.post('https://brat.siputzx.my.id/v2/iphone-quoted', { sender: 'other', message: text || ' ', imageUrl: imgUrl, status: { carrierName: 'INDOSAT', batteryPercentage: 88, signalStrength: 4, wifi: true }, emojiStyle: 'apple' }, { headers: { 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }); await sock.sendMessage(o.remoteJid, { image: Buffer.from(res.data) }, { quoted: msg }); } catch(e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('web2apk')) {
        pf.file('web2apk.js', `export default { command: ['web2apk'], tags: ['tools'], help: ['web2apk <url> | <Nama> | <Package>'], handler: async (sock, msg, o) => {
    if (!o.text) return sock.sendMessage(o.remoteJid, { text: 'Format: .web2apk <url> | <Nama App> | <Package>\\n\\nContoh:\\n.web2apk https://google.com | GoogleKu | com.google.ku' }, { quoted: msg });
    
    const parts = o.text.split('|');
    const url = parts[0]?.trim();
    const appName = parts[1]?.trim() || 'MyApp';
    const packageName = parts[2]?.trim() || 'com.myapp';

    if (!url || !url.startsWith('http')) return sock.sendMessage(o.remoteJid, { text: 'URL tidak valid!' }, { quoted: msg });

    await sock.sendMessage(o.remoteJid, { text: '⏳ Building APK... (Bisa memakan waktu 1-2 menit)' }, { quoted: msg });
    try { 
        const res = await fetch('https://code-v-compiler-sr.vercel.app/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, appName, packageName }) }); 
        const data = await res.json(); 
        let attempts = 0; 
        while(attempts < 40) { 
            await new Promise(r=>setTimeout(r,3000)); 
            const poll = await (await fetch('https://code-v-compiler-sr.vercel.app/api/build/' + data.build_id)).json(); 
            if(poll.status === 'ready') { 
                await sock.sendMessage(o.remoteJid, { document: { url: 'https://code-v-compiler-sr.vercel.app' + poll.download_url }, mimetype: 'application/vnd.android.package-archive', fileName: appName + '.apk' }, { quoted: msg }); 
                return; 
            } 
            attempts++; 
        } 
        throw new Error('Timeout'); 
    } catch(e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('unblur')) {
        pf.file('unblur.js', `import crypto from 'crypto';
import { downloadMediaMessage } from 'noxleys-baileys';
import pino from 'pino';
export default { command: ['unblur'], tags: ['ai'], help: ['unblur'], handler: async (sock, msg, o) => {
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!msg.message.imageMessage && !q?.imageMessage) return sock.sendMessage(o.remoteJid, { text: 'Kirim/reply gambar buram!\\n\\nContoh:\\nKirim gambar + caption .' + o.command }, { quoted: msg });
    await sock.sendMessage(o.remoteJid, { text: '⏳ Processing...' }, { quoted: msg });
    try { 
        const targetMsg = q ? { message: q, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } } : msg;
        const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino() }); 
        const form = new FormData(); form.append('original_image_file', new Blob([buf], { type: 'image/png' }), 'image.png'); 
        const dev = 'fallback_' + crypto.randomBytes(6).toString('hex'); 
        const res = await fetch('https://api.unwatermark.ai/api/web/unblurimage/v1/image-unblur-v2/create-job', { method: 'POST', headers: { 'Product-Code': '067003', 'Product-Serial': dev, Origin: 'https://unblurimage.ai', Referer: 'https://unblurimage.ai/' }, body: form }); 
        const data = await res.json(); if(!data.result) throw new Error('Gagal buat job'); let out = null; 
        for(let i=0; i<20; i++) { await new Promise(r=>setTimeout(r,2000)); const poll = await (await fetch('https://api.unwatermark.ai/api/web/unblurimage/v1/image-unblur-v2/get-job/' + data.result.job_id, { headers: { 'Product-Code': '067003', 'Product-Serial': dev } })).json(); if(poll.result?.status === 1) { out = poll.result.output_url?.[0]; break; } } 
        await sock.sendMessage(o.remoteJid, { image: { url: out }, caption: '✅ Selesai!' }, { quoted: msg }); 
    } catch(e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('fotolive')) {
        pf.file('fotolive.js', `import fs from 'fs'; import os from 'os'; import path from 'path'; import ffmpeg from 'fluent-ffmpeg'; 
import { downloadMediaMessage, prepareWAMessageMedia, generateWAMessageFromContent } from 'noxleys-baileys';
import pino from 'pino';
export default { command: ['fotolive', 'livephoto'], tags: ['maker'], help: ['fotolive'], handler: async (sock, msg, o) => {
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isVideo = msg.message.videoMessage || q?.videoMessage;
    if (!isVideo) return sock.sendMessage(o.remoteJid, { text: 'Balas/reply video yang valid untuk dijadikan Live Photo!\\n\\nContoh:\\nReply video + ketik .' + o.command }, { quoted: msg });

    const vid = path.join(os.tmpdir(), 'vid_'+Date.now()+'.mp4'); const thumb = path.join(os.tmpdir(), 'thumb_'+Date.now()+'.jpg');
    await sock.sendMessage(o.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(()=>{});
    await sock.sendMessage(o.remoteJid, { text: '⏳ Memproses Live Photo...' }, { quoted: msg });

    try { 
        const targetMsg = q ? { message: q, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } } : msg;
        const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino() }); 
        fs.writeFileSync(vid, buf); 
        await new Promise((res,rej)=>{ ffmpeg(vid).outputOptions(['-vframes 1']).output(thumb).on('end',res).on('error',rej).run(); }); 
        const tBuf = fs.readFileSync(thumb); 
        const iM = await prepareWAMessageMedia({ image: tBuf }, { upload: sock.waUploadToServer }); 
        const vM = await prepareWAMessageMedia({ video: buf }, { upload: sock.waUploadToServer }); 
        const pMsg = generateWAMessageFromContent(o.remoteJid, { imageMessage: { ...iM.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } }, { quoted: msg }); 
        await sock.relayMessage(o.remoteJid, pMsg.message, { messageId: pMsg.key.id }); 
        await sock.relayMessage(o.remoteJid, { videoMessage: { ...vM.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } }, messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: pMsg.key } } }, {}); 
        await sock.sendMessage(o.remoteJid, { react: { text: '✅', key: msg.key } }).catch(()=>{});
    } catch(e) { 
        await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); 
        await sock.sendMessage(o.remoteJid, { react: { text: '❌', key: msg.key } }).catch(()=>{});
    } finally { try { fs.unlinkSync(vid); fs.unlinkSync(thumb); } catch {} }
} };`);
    }

    if (list.includes('welcome')) {
        pf.file('welcome.js', `import fs from 'fs'; import path from 'path'; import Jimp from 'jimp'; import { downloadContentFromMessage } from 'noxleyss'; import settings from '../settings.js';
const DIR = './src/database/welcome'; const BGDIR = './src/database/welcome-bg';
function getPath(id) { return path.join(DIR, id.replace(/[^a-zA-Z0-9]/g, '_') + '.json'); }
function load(id) { try { return JSON.parse(fs.readFileSync(getPath(id))); } catch { return { welcomeOn: false, leftOn: false, welcomeCaption: "👋 Selamat datang @user di {group}", leftCaption: "👋 Dadah @user" }; } }
function save(id, d) { fs.writeFileSync(getPath(id), JSON.stringify(d, null, 2)); }
async function genImg(pp, bgPath, name, group, type) {
    const W=800, H=500; let bg = bgPath && fs.existsSync(bgPath) ? await Jimp.read(bgPath) : new Jimp(W, H, type==='welcome' ? '#0f172a' : '#2a0f0f'); bg.cover(W,H);
    const ov = new Jimp(W,H, type==='welcome' ? '#00000080' : '#000000a0'); bg.composite(ov,0,0);
    let p; try { p = await Jimp.read(pp); } catch { p = new Jimp(200,200,type==='welcome'?'#38bdf8':'#ef4444'); } p.resize(200,200).circle();
    bg.composite(p, (W-200)/2, 60);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE); const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    bg.print(font, 0, 300, { text: type==='welcome'?'WELCOME':'GOODBYE', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 40);
    bg.print(font, 0, 350, { text: name, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 40);
    bg.print(fontSmall, 0, 400, { text: group.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 30);
    return await bg.getBufferAsync(Jimp.MIME_JPEG);
}
export default { command: ['welcome', 'left'], tags: ['admin'], help: ['welcome on/off'], handler: async (sock, msg, o) => {
    if (!o.isGroup) return; const conf = load(o.remoteJid); const cmd = o.command.includes('left') ? 'left' : 'welcome'; const sub = (o.args[0]||'').toLowerCase();
    if (sub === 'on') { if(cmd==='welcome') conf.welcomeOn=true; else conf.leftOn=true; save(o.remoteJid, conf); return sock.sendMessage(o.remoteJid, { text: '✅ ON' }, { quoted: msg }); }
    if (sub === 'off') { if(cmd==='welcome') conf.welcomeOn=false; else conf.leftOn=false; save(o.remoteJid, conf); return sock.sendMessage(o.remoteJid, { text: '❌ OFF' }, { quoted: msg }); }
    if (sub === 'setbg') { const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; const imgMsg = q?.imageMessage || msg.message?.imageMessage; if(!imgMsg) return sock.sendMessage(o.remoteJid, { text: 'Reply foto!' }, { quoted: msg }); const str = await downloadContentFromMessage(imgMsg, 'image'); let buf = Buffer.from([]); for await(const c of str) buf = Buffer.concat([buf,c]); if(!fs.existsSync(BGDIR)) fs.mkdirSync(BGDIR,{recursive:true}); fs.writeFileSync(path.join(BGDIR, o.remoteJid.replace(/[^a-zA-Z0-9]/g,'_')+'_'+cmd+'.jpg'), buf); return sock.sendMessage(o.remoteJid, { text: '✅ BG disimpan' }, { quoted: msg }); }
    return sock.sendMessage(o.remoteJid, { text: 'Format: .welcome on/off/setbg' }, { quoted: msg });
}, onParticipantsUpdate: async (sock, update) => {
    const conf = load(update.id); if(!conf.welcomeOn && !conf.leftOn) return; if(update.action !== 'add' && update.action !== 'remove') return;
    for(const p of update.participants) { try { const pp = await sock.profilePictureUrl(p, 'image').catch(()=>null); const buf = pp ? Buffer.from(await (await fetch(pp)).arrayBuffer()) : null; const type = update.action==='add'?'welcome':'left'; const bg = path.join(BGDIR, update.id.replace(/[^a-zA-Z0-9]/g,'_')+'_'+type+'.jpg'); const name = p.split('@')[0]; const meta = await sock.groupMetadata(update.id); const img = await genImg(buf, bg, name, meta.subject, type); const cap = (type==='welcome'?conf.welcomeCaption:conf.leftCaption).replace(/@user/g,'@'+name).replace(/{user}/g,name).replace(/{group}/g,meta.subject); await sock.sendMessage(update.id, { image: img, caption: cap, mentions: [p] }); } catch {} }
} };`);
    }

    list.forEach(f => {
        if (['menu','vidsave','bypass','rch','iqc','web2apk','unblur','fotolive','welcome'].includes(f)) return;
        if (f === 'panel' && usePanel) {
             pf.file('panel.js', `import fetch from "node-fetch"; import settings from "../settings.js"; export default { command: ['panel'], tags: ['panel'], help: ['panel'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: 'Silakan cek menu panel di file asli / sesuaikan.' }, { quoted: msg }); } };`);
        } else if (f !== 'panel') {
             pf.file(f+'.js', `export default { command: ['${f}'], tags: ['tools'], help: ['${f}'], handler: async (sock, msg, o) => { await sock.sendMessage(o.remoteJid, { text: 'Fitur ${f} belum diimplementasikan penuh di versi ini.' }, { quoted: msg }); } };`);
        }
    });

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
    return res.send(buffer);

  } catch (e) {
    console.error('Generate Error:', e);
    return res.status(500).json({ error: e.message });
  }
}