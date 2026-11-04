// api/generate.js - ULTIMATE FINAL v4 (WA THUMBNAIL + RCH V2 + 8 BUGS FIXED)
import JSZip from 'jszip';

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const {
      platform, base, menuType, botName, ownerName, ownerNumber,
      pairingNumber, teleToken, teleUsername, teleChannel,
      features, usePanel, thumbUrl
    } = req.body;

    if (!botName) return res.status(400).json({ error: 'Isi botName dulu' });

    const sBotName      = esc(botName);
    const sOwnerName    = esc(ownerName);
    const sOwnerNumber  = esc(ownerNumber);
    const sPairing      = esc(pairingNumber);
    const sTeleToken    = esc(teleToken);
    const sTeleUsername = esc(teleUsername);
    const sTeleChannel  = esc(teleChannel);
    const sPanelDomain  = esc(req.body.panelDomain);
    const sPanelPtla    = esc(req.body.panelPtla);
    const sPanelEgg     = esc(req.body.panelEgg || '15');
    const sPanelLoc     = esc(req.body.panelLoc || '1');
    const sMenuType     = esc(menuType || '1');

    const safe = botName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'bot';
    const zip = new JSZip();
    const list = Array.isArray(features) ? features : [];

    // =========================================================================
    // ================= 1. TELEGRAM (Telegraf) ================================
    // =========================================================================
    if (platform === 'telegram') {
      zip.file('settings.js', `module.exports = {
  botName: "${sBotName}",
  ownerName: "${sOwnerName}",
  ownerNumber: "${sOwnerNumber}",
  username: "${sTeleUsername || '@bot'}",
  token: "${sTeleToken}",
  channelInfo: "${sTeleChannel}",
  features: ${JSON.stringify(list)}
};`);

      // Simpan Media Start (JPG/PNG/GIF/MP4)
      if (thumbUrl && thumbUrl.startsWith('http')) {
        try {
          const fetchRes = await fetch(thumbUrl);
          if (fetchRes.ok) {
            const contentType = fetchRes.headers.get('content-type') || '';
            let ext = 'jpg';
            if (contentType.includes('png')) ext = 'png';
            else if (contentType.includes('gif')) ext = 'gif';
            else if (contentType.includes('mp4')) ext = 'mp4';
            zip.file(`media/start_media.${ext}`, Buffer.from(await fetchRes.arrayBuffer()));
          }
        } catch (err) { console.error('Gagal download thumbTele:', err); }
      }

      zip.file('index.js', `const settings = require('./settings.js');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(settings.token);
global.bot = bot;
global.startTime = Date.now();
console.log('🤖 BOT TELEGRAM STARTING - ' + settings.botName);

const DB_DIR = path.join(__dirname, 'database');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
['users.json', 'groups.json', 'maintenance.json'].forEach(f => {
  const p = path.join(DB_DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, f === 'maintenance.json' ? '{"maintenance": false}' : (f === 'groups.json' ? '[]' : '{}'));
});

const pluginsDir = path.join(__dirname, 'plugins');
const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
const plugins = files.map(f => require(path.join(pluginsDir, f)));
console.log(\`✅ Loaded \${plugins.length} plugins\`);

bot.use(async (ctx, next) => {
  if (!ctx.message) return next();
  const { isMaintenance } = require('./lib/helper_tg.js');
  if (isMaintenance(ctx)) return;
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    const gfilter = plugins.find(p => p.name === 'gfilter');
    if (gfilter && gfilter.onMessage) {
      const blocked = await gfilter.onMessage(bot, ctx);
      if (blocked) return;
    }
  }
  return next();
});

plugins.forEach(p => {
  if (p.command) {
    const cmds = Array.isArray(p.command) ? p.command : [p.command];
    cmds.forEach(cmd => bot.command(cmd, (ctx) => p.handler(bot, ctx)));
  }
});

bot.on('message', async (ctx) => {
  for (const p of plugins) {
    if (p.onMessage && p.name !== 'gfilter') {
      if (await p.onMessage(bot, ctx)) break;
    }
  }
});

bot.launch().then(() => console.log('> ' + settings.botName + ' is Running!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
`);

      const pkgDeps = {
        telegraf: "^4.15.3", axios: "^1.7.2", "node-fetch": "^3.3.2",
        "moment-timezone": "^0.5.45", "form-data": "^4.0.0", "sharp": "^0.34.5",
        "fflate": "^0.8.2", "archiver": "^7.0.1", "fluent-ffmpeg": "^2.1.3",
        "ffmpeg-static": "^5.3.0", canvas: "^2.11.2", chalk: "^4.1.2"
      };
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" }, dependencies: pkgDeps
      }, null, 2));

      zip.file('database/maintenance.json', JSON.stringify({ maintenance: false }, null, 2));
      zip.file('database/users.json', '{}');
      zip.file('database/groups.json', '[]');

      zip.folder('lib').file('helper_tg.js', `const fs = require('fs'); const path = require('path');
const mFile = path.join(__dirname, '..', 'database', 'maintenance.json');
function getM() { try { return JSON.parse(fs.readFileSync(mFile)).maintenance; } catch { return false; } }
function setM(s) { fs.writeFileSync(mFile, JSON.stringify({ maintenance: s }, null, 2)); }
function isMaintenance(ctx) {
  const settings = require('../settings.js');
  if (getM() && String(ctx.from.id) !== String(settings.ownerNumber)) {
    ctx.reply('🛠 Bot sedang maintenance.'); return true;
  } return false;
}
async function muteUser(bot, chatId, userId, mentionUser, reason) {
  try {
    const member = await bot.telegram.getChatMember(chatId, userId);
    if (['administrator', 'creator'].includes(member.status)) return false;
    const until = Math.floor(Date.now() / 1000) + 300;
    await bot.telegram.restrictChatMember(chatId, userId, { permissions: { can_send_messages: false }, until_date: until });
    bot.telegram.sendMessage(chatId, \`🚫 <b>\${mentionUser}</b> dimute 5 menit karena \${reason}.\`, { parse_mode: "HTML" });
    return true;
  } catch (err) { return false; }
}
module.exports = { getM, setM, isMaintenance, muteUser };`);

      const pf = zip.folder('plugins');

      if (list.includes('start')) {
        pf.file('start.js', `const fs = require('fs'); const path = require('path'); const settings = require('../settings.js');
function getUptime() {
  const s = process.uptime(); const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  return [d ? d + 'd' : '', h ? h + 'h' : '', m ? m + 'm' : '', Math.floor(s % 60) + 's'].filter(Boolean).join(' ');
}
module.exports = { command: ['start'], handler: async (bot, ctx) => {
  const userId = ctx.from.id; const usersFile = path.join(__dirname, '..', 'database', 'users.json');
  let users = {}; try { users = JSON.parse(fs.readFileSync(usersFile)); } catch {}
  if (!users[userId]) { users[userId] = { id: userId, name: ctx.from.first_name }; fs.writeFileSync(usersFile, JSON.stringify(users, null, 2)); }
  const botName = settings.botName.toUpperCase();
  const textStart = \`<blockquote>👋 <b>Halo, \${ctx.from.first_name}!</b>

Selamat datang di <b>\${botName}</b>.
Eksplorasi fitur seru yang tersedia di dalam bot ini.</blockquote>

<blockquote>⚡ <b>Status:</b> Online
⏱️ <b>Uptime:</b> \${getUptime()}
👑 <b>Owner:</b> \${settings.ownerName}</blockquote>\`;

  const buttons = [
    [{ text: "≡ Menu Utama", callback_data: "/menu" }],
    [
      { text: "👑 Owner", url: \`https://t.me/\${settings.ownerNumber || 'telegram'}\` },
      { text: "📢 Channel", url: settings.channelInfo || "https://t.me/telegram" }
    ],
    [{ text: "➕ Tambah ke Grup", url: \`https://t.me/\${settings.username.replace('@', '')}?startgroup=true\` }]
  ];

  const opts = { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } };
  const mediaPath = path.join(__dirname, '..', 'media');
  const mp4 = path.join(mediaPath, 'start_media.mp4');
  const gif = path.join(mediaPath, 'start_media.gif');
  const jpg = path.join(mediaPath, 'start_media.jpg');
  const png = path.join(mediaPath, 'start_media.png');

  try {
    if (fs.existsSync(mp4)) await ctx.replyWithVideo({ source: mp4 }, { caption: textStart, ...opts });
    else if (fs.existsSync(gif)) await ctx.replyWithAnimation({ source: gif }, { caption: textStart, ...opts });
    else if (fs.existsSync(jpg)) await ctx.replyWithPhoto({ source: jpg }, { caption: textStart, ...opts });
    else if (fs.existsSync(png)) await ctx.replyWithPhoto({ source: png }, { caption: textStart, ...opts });
    else await ctx.reply(textStart, opts);
  } catch (e) {
    await ctx.reply(textStart, opts);
  }
} };`);
      }

      if (list.includes('menu')) {
        pf.file('menu.js', `const { Markup } = require('telegraf'); const settings = require('../settings.js');
module.exports = { command: ['menu', 'help'], handler: async (bot, ctx) => {
  let t = '<blockquote>╭━━━〔 <b>' + settings.botName + '</b> 〕━━━✦\\n┃ 👤 Owner: ' + settings.ownerName + '\\n┣━━━〔 <b>' + settings.features.length + ' FITUR</b> 〕━━━\\n';
  settings.features.forEach(f => { t += '┃ ❒ /' + f + '\\n'; });
  t += '╰━━━━━━━━━━━━━━</blockquote>';
  
  const finalText = t.length > 3900 ? t.slice(0, 3900) + '\\n...(truncated)' : t;
  
  let buttons = [], row = [];
  settings.features.forEach(f => { row.push(Markup.button.callback('/' + f, f)); if (row.length === 2) { buttons.push(row); row = []; } });
  if (row.length > 0) buttons.push(row);
  const opts = { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(buttons) };
  
  try { await ctx.replyWithPhoto('https://n.uguu.se/oVprmTOj.jpeg', { caption: finalText, ...opts }); }
  catch { await ctx.reply(finalText, opts); }
} };`);
      }

      if (list.includes('tiktok')) {
        pf.file('tiktok.js', `const axios = require('axios'); const settings = require('../settings.js');
module.exports = { command: ['tiktok', 'tt'], handler: async (bot, ctx) => {
  const url = ctx.message.text.split(' ').slice(1)[0]; if (!url) return ctx.reply('⚠️ Contoh:\\n/tiktok https://vt.tiktok.com/xxxxx/');
  const sent = await ctx.reply('🕐 Sedang mengambil video...');
  try {
    const response = await axios.get(\`https://api.betabotz.eu.org/api/download/tiktok?url=\${encodeURIComponent(url)}&apikey=ISI_APIKEY_KAMU\`);
    if (!response.data || !response.data.status) throw new Error('Gagal');
    const data = response.data.result; const videoUrl = data.video?.[0]; const audioUrl = data.audio?.[0];
    const caption = \`🎵 *TikTok Downloader*\\n📝 Caption: \${data.title || "-"}\\n👑 By \${settings.ownerName}\`;
    if (videoUrl) { try { const v = await axios.get(videoUrl, { responseType: "arraybuffer" }); await ctx.replyWithVideo({ source: Buffer.from(v.data) }, { caption, parse_mode: 'Markdown' }); } catch (e) {} }
    if (audioUrl) { try { const a = await axios.get(audioUrl, { responseType: "arraybuffer" }); await ctx.replyWithAudio({ source: Buffer.from(a.data) }, { caption: \`🎧 Audio By \${settings.botName}\`, parse_mode: 'Markdown' }); } catch (e) {} }
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, null, '❌ Gagal mengambil video'); }
} };`);
      }

      if (list.includes('tiktokslide')) {
        pf.file('tiktokslide.js', `const axios = require('axios'); const settings = require('../settings.js');
module.exports = { command: ['tiktokslide', 'ttslide'], handler: async (bot, ctx) => {
  const url = ctx.message.text.split(' ').slice(1)[0]; if (!url) return ctx.reply('⚠️ Contoh:\\n/tiktokslide https://vt.tiktok.com/xxxxx/');
  const sent = await ctx.reply('🕐 Sedang mengambil slide...');
  try {
    const response = await axios.get(\`https://api.betabotz.eu.org/api/download/ttslide?url=\${encodeURIComponent(url)}&apikey=ISI_APIKEY_KAMU\`);
    if (!response.data || !response.data.status) throw new Error("Slide gagal");
    const data = response.data.result; const images = data.images || []; const audioUrl = data.audio?.[0];
    if (images.length === 0) throw new Error("Tidak ada gambar");
    const caption = \`📸 *TikTok Slide*\\n📝 Caption: \${data.title || "-"}\\n👑 By \${settings.ownerName}\`;
    const mediaGroup = images.slice(0, 10).map((img, i) => ({ type: "photo", media: img, caption: i === 0 ? caption : undefined, parse_mode: "Markdown" }));
    await ctx.replyWithMediaGroup(mediaGroup);
    if (audioUrl) await ctx.replyWithAudio({ url: audioUrl }, { caption: \`🎧 Audio Slide\`, parse_mode: "Markdown" });
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, null, '❌ Gagal mengambil slide'); }
} };`);
      }

      if (list.includes('iqc')) {
        pf.file('iqc.js', `const axios = require('axios'); const settings = require('../settings.js');
module.exports = { command: ['iqc'], handler: async (bot, ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim(); if (!text) return ctx.reply('⚠️ Contoh:\\n/iqc Angkasa');
  const sent = await ctx.reply('🕐 Membuat IQC...');
  try {
    const url = \`https://api.betabotz.eu.org/api/maker/iqc?text=\${encodeURIComponent(text)}&apikey=ISI_APIKEY_KAMU\`;
    const response = await axios.get(url, { responseType: "arraybuffer" });
    if (!(response.headers["content-type"] || "").includes("image")) throw new Error('Bukan gambar');
    await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, { caption: \`🧠 *IQC Maker*\\n📝 Text: \${text}\\n👑 By \${settings.ownerName}\`, parse_mode: "Markdown" });
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, null, '❌ Gagal membuat IQC'); }
} };`);
      }

      if (list.includes('brat')) {
        pf.file('brat.js', `const axios = require('axios'); const settings = require('../settings.js');
module.exports = { command: ['brat'], handler: async (bot, ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim(); if (!text) return ctx.reply('⚠️ Contoh:\\n/brat Love');
  const sent = await ctx.reply('🕐 Membuat brat sticker...');
  try {
    const url = \`https://api.betabotz.eu.org/api/maker/brat?text=\${encodeURIComponent(text)}&apikey=ISI_APIKEY_KAMU\`;
    const response = await axios.get(url, { responseType: "arraybuffer" });
    await ctx.replyWithSticker({ source: Buffer.from(response.data) }, { filename: "brat.webp" });
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, null, '❌ Gagal membuat brat'); }
} };`);
      }

      if (list.includes('bratvid')) {
        pf.file('bratvid.js', `const axios = require('axios'); const fs = require('fs'); const path = require('path'); const { exec } = require('child_process'); const settings = require('../settings.js');
module.exports = { command: ['bratvid'], handler: async (bot, ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim(); if (!text) return ctx.reply('⚠️ Contoh:\\n/bratvid Love');
  const sent = await ctx.reply('🕐 Membuat Brat Animated...');
  const tempMp4 = path.join(__dirname, \`brat_\${Date.now()}.mp4\`);
  const tempWebm = path.join(__dirname, \`brat_\${Date.now()}.webm\`);
  try {
    const url = \`https://api.betabotz.eu.org/api/maker/brat-video?text=\${encodeURIComponent(text)}&apikey=ISI_APIKEY_KAMU\`;
    const response = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(tempMp4, response.data);
    await new Promise((res, rej) => { exec(\`ffmpeg -i "\${tempMp4}" -vf "scale=512:512:force_original_aspect_ratio=decrease" -c:v libvpx-vp9 -b:v 256K -an "\${tempWebm}"\`, (err) => { if (err) rej(err); else res(); }); });
    await ctx.replyWithSticker({ source: tempWebm });
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(ctx.chat.id, sent.message_id, null, '❌ Gagal membuat animated sticker'); }
  finally { try { if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4); } catch (_) {} try { if (fs.existsSync(tempWebm)) fs.unlinkSync(tempWebm); } catch (_) {} }
} };`);
      }

      if (list.includes('cekid')) {
        pf.file('cekid.js', `const { createCanvas, loadImage } = require('canvas'); const axios = require('axios'); const settings = require('../settings.js');
function escapeHtml(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
async function generateIdCard(user, token) {
  const width = 800, height = 400;
  const canvas = createCanvas(width, height); const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e293b'); gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, width - 10, height - 10);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('TELEGRAM ID CARD', 50, 80);
  ctx.beginPath(); ctx.moveTo(50, 100); ctx.lineTo(width - 50, 100); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#cbd5e1'; ctx.font = '28px sans-serif';
  ctx.fillText(\`Name : \${user.first_name || '-'} \${user.last_name || ''}\`, 50, 160);
  ctx.fillText(\`ID   : \${user.id}\`, 50, 210);
  ctx.fillText(\`User : @\${user.username || 'Tidak ada'}\`, 50, 260);
  try {
    const av = await axios.get(\`https://api.telegram.org/bot\${token}/getUserProfilePhotos?user_id=\${user.id}\`);
    const fid = av.data?.result?.photos?.[0]?.[0]?.file_id;
    if (fid) {
      const fp = await axios.get(\`https://api.telegram.org/bot\${token}/getFile?file_id=\${fid}\`);
      const img = await loadImage(\`https://api.telegram.org/file/bot\${token}/\${fp.data.result.file_path}\`);
      ctx.save(); ctx.beginPath(); ctx.arc(650, 200, 80, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip(); ctx.drawImage(img, 570, 120, 160, 160); ctx.restore();
      ctx.beginPath(); ctx.arc(650, 200, 80, 0, Math.PI * 2, true); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 5; ctx.stroke();
    }
  } catch (e) {}
  return canvas.toBuffer();
}
module.exports = { command: ['cekid'], handler: async (bot, ctx) => {
  const targetUser = ctx.message.reply_to_message ? ctx.message.reply_to_message.from : ctx.from;
  try {
    const loadingMsg = await ctx.reply('🕐 Sedang membuat kartu ID...');
    const img = await generateIdCard(targetUser, settings.token);
    const caption = \`「 *Telegram ID Card* 」\\n\\n👤 Name: \${escapeHtml(targetUser.first_name)} \${escapeHtml(targetUser.last_name || '')}\\n🔖 ID: \\\`\${targetUser.id}\\\`\\n👑 Powered: \${settings.ownerName}\`;
    await ctx.replyWithPhoto({ source: img }, { caption, parse_mode: "Markdown" });
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
  } catch (e) { ctx.reply('❌ Error: ' + e.message); }
} };`);
      }

      if (list.includes('tofigure') || list.includes('hytamkan')) {
        pf.file('image_edit.js', `const axios = require('axios'); const FormData = require('form-data'); const settings = require('../settings.js');
const pendingToFigure = new Set(); const pendingHitam = new Set();
async function uploadToCatbox(imageBuffer, filename = 'file.jpg') {
  try {
    const fileSizeMB = imageBuffer.length / (1024 * 1024); if (fileSizeMB > 200) return null;
    const ext = filename.split('.').pop().toLowerCase(); const mimeMap = { 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp' };
    const form = new FormData(); form.append('reqtype', 'fileupload'); form.append('fileToUpload', imageBuffer, { filename, contentType: mimeMap[ext] || 'application/octet-stream' });
    const response = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 60000 });
    return response.data.trim();
  } catch (error) { return null; }
}
async function processToFigure(ctx, photoArray) {
  const chatId = ctx.chat.id; const sent = await ctx.reply('🕐 Mengubah ke Figure...');
  try {
    const fileLink = await ctx.telegram.getFileLink(photoArray[photoArray.length - 1].file_id);
    const buffer = Buffer.from((await axios.get(fileLink.href, { responseType: 'arraybuffer' })).data);
    const publicUrl = await uploadToCatbox(buffer, 'img.jpg'); if (!publicUrl) throw new Error('Gagal upload Catbox');
    const apiUrl = \`https://api.betabotz.eu.org/api/maker/tofigurev2?url=\${encodeURIComponent(publicUrl)}&apikey=ISI_APIKEY_KAMU\`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer" });
    await ctx.replyWithPhoto({ source: Buffer.from(res.data) }, { caption: \`🖼 Efek: Figure Style\\n👑 By \${settings.ownerName}\`, parse_mode: "Markdown" });
    await ctx.telegram.deleteMessage(chatId, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(chatId, sent.message_id, null, \`❌ Gagal: \${err.message}\`); }
}
async function processHitam(ctx, photoArray) {
  const chatId = ctx.chat.id; const sent = await ctx.reply('🕐 Menghitamkan gambar...');
  try {
    const fileLink = await ctx.telegram.getFileLink(photoArray[photoArray.length - 1].file_id);
    const buffer = Buffer.from((await axios.get(fileLink.href, { responseType: 'arraybuffer' })).data);
    const publicUrl = await uploadToCatbox(buffer, 'img.jpg'); if (!publicUrl) throw new Error('Gagal upload Catbox');
    const apiUrl = \`https://api.betabotz.eu.org/api/maker/jadihitam?url=\${encodeURIComponent(publicUrl)}&apikey=ISI_APIKEY_KAMU\`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer" });
    await ctx.replyWithPhoto({ source: Buffer.from(res.data) }, { caption: \`🖤 Efek: Hitam Style\\n👑 By \${settings.ownerName}\`, parse_mode: "Markdown" });
    await ctx.telegram.deleteMessage(chatId, sent.message_id);
  } catch (err) { await ctx.telegram.editMessageText(chatId, sent.message_id, null, \`❌ Gagal: \${err.message}\`); }
}
module.exports = { command: ['tofigure', 'hytamkan', 'hitamkan'], handler: async (bot, ctx) => {
  const chatId = ctx.chat.id;
  const cmd = ctx.message.text.split(' ')[0].replace('/', '').split('@')[0];
  const tp = ctx.message.reply_to_message && ctx.message.reply_to_message.photo ? ctx.message.reply_to_message.photo : null;
  if (tp) { if (cmd === 'tofigure') return processToFigure(ctx, tp); if (cmd === 'hytamkan' || cmd === 'hitamkan') return processHitam(ctx, tp); }
  else { if (cmd === 'tofigure') { pendingToFigure.add(chatId); return ctx.reply('🖼 Kirim fotonya...'); } if (cmd === 'hytamkan' || cmd === 'hitamkan') { pendingHitam.add(chatId); return ctx.reply('🖤 Kirim fotonya...'); } }
}, onMessage: async (bot, ctx) => {
  if (!ctx.message.photo) return false; const chatId = ctx.chat.id;
  if (pendingToFigure.has(chatId)) { pendingToFigure.delete(chatId); await processToFigure(ctx, ctx.message.photo); return true; }
  if (pendingHitam.has(chatId)) { pendingHitam.delete(chatId); await processHitam(ctx, ctx.message.photo); return true; }
  return false;
} };`);
      }

      if (list.includes('gempa')) {
        pf.file('gempa.js', `const axios = require('axios');
module.exports = { command: ['gempa'], handler: async (bot, ctx) => {
  await ctx.reply('⏳ Mengambil info gempa...');
  try {
    const res = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    const g = res.data.Infogempa.gempa;
    let txt = \`🚨 *INFO GEMPA* 🚨\\n\\n📅 \${g.Tanggal}\\n⏰ \${g.Jam}\\n📍 \${g.Wilayah}\\n📏 \${g.Magnitude} SR\\n⚓ \${g.Kedalaman}\\n🌊 \${g.Potensi}\`;
    await ctx.replyWithPhoto('https://data.bmkg.go.id/DataMKG/TEWS/' + g.Shakemap, { caption: txt, parse_mode: 'Markdown' });
  } catch (e) { await ctx.reply('❌ Gagal mengambil data.'); }
} };`);
      }

      if (list.includes('gfilter')) {
        pf.file('gfilter.js', `const { muteUser } = require('../lib/helper_tg.js');
module.exports = { name: 'gfilter', command: [], handler: async () => {}, onMessage: async (bot, ctx) => {
  if (!ctx.message || ctx.from?.is_bot) return false;
  const chatId = ctx.chat.id.toString(); if (!chatId.startsWith("-")) return false;
  const senderId = ctx.from.id;
  let admins = []; try { admins = await ctx.telegram.getChatAdministrators(chatId); } catch { return false; }
  const isAdmin = admins.some(a => a.user.id === senderId);
  if (isAdmin) return false;
  const mentionUser = ctx.from.username ? \`@\${ctx.from.username}\` : ctx.from.first_name;
  const text = (ctx.message.text || ctx.message.caption || "").toLowerCase();
  if (ctx.message.text && ctx.message.text.trim().startsWith('/')) return false;
  if (ctx.message.photo && ctx.message.photo.length > 0) {
    await ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
    const warn = await ctx.reply(\`❌ <b>\${mentionUser}</b>, foto tidak diizinkan!\`, { parse_mode: 'HTML' });
    setTimeout(() => { ctx.telegram.deleteMessage(chatId, warn.message_id).catch(() => {}); }, 10000);
    return true;
  }
  if (/(https?:\\/\\/|t\\.me\\/|telegram\\.me\\/|www\\.)/i.test(text)) {
    await ctx.telegram.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
    const warn = await ctx.reply(\`⚠️ <b>\${mentionUser}</b> Link tidak diizinkan!\`, { parse_mode: 'HTML' });
    setTimeout(() => { ctx.telegram.deleteMessage(chatId, warn.message_id).catch(() => {}); }, 10000);
    return true;
  }
  return false;
} };`);
      }

      if (list.includes('owner')) {
        pf.file('owner.js', `const { setM, getM, muteUser } = require('../lib/helper_tg.js'); const settings = require('../settings.js');
module.exports = { command: ['maintenance', 'mt', 'mute'], handler: async (bot, ctx) => {
  const senderId = String(ctx.from.id); const chatId = ctx.chat.id;
  const cmd = ctx.message.text.split(' ')[0].replace('/', '');
  const args = ctx.message.text.split(' ').slice(1);
  if (senderId !== String(settings.ownerNumber)) return ctx.reply('❌ Hanya owner!');
  if (cmd === 'maintenance' || cmd === 'mt') {
    if (args[0] === 'on') { setM(true); return ctx.reply('✅ Maintenance ON'); }
    else if (args[0] === 'off') { setM(false); return ctx.reply('✅ Maintenance OFF'); }
    else return ctx.reply(\`Status: \${getM() ? 'AKTIF' : 'MATI'}\`);
  }
  if (cmd === 'mute') {
    if (!ctx.message.reply_to_message) return ctx.reply('Reply pesan user!');
    const target = ctx.message.reply_to_message.from;
    await muteUser(bot, chatId, target.id, target.first_name, 'melanggar aturan');
  }
} };`);
      }

      if (list.includes('backup')) {
        pf.file('backup.js', `const fs = require('fs'); const path = require('path'); const archiver = require('archiver'); const settings = require('../settings.js');
module.exports = { command: ['backup'], handler: async (bot, ctx) => {
  if (String(ctx.from.id) !== String(settings.ownerNumber)) return ctx.reply('❌ Hanya owner!');
  const loadingMsg = await ctx.reply('⏳ Memulai backup...');
  const sourceDir = path.join(__dirname, '..');
  const backupName = \`BACKUP_\${settings.botName.replace(/[^a-zA-Z0-9]/g, '_')}.zip\`;
  const outputPath = path.join(sourceDir, backupName);
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', async () => {
    try {
      await ctx.telegram.sendDocument(ctx.from.id, { source: outputPath }, { caption: \`📦 Backup \${settings.botName} (\${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)\` });
      await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, '✅ Backup terkirim ke private.');
    } catch (e) { await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, '❌ Gagal kirim backup.'); }
    finally { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }
  });
  archive.pipe(output);
  archive.glob("**/*", { cwd: sourceDir, ignore: ["node_modules/**", "package-lock.json", "session/**", backupName] });
  await archive.finalize();
} };`);
      }

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.zip"`);
      return res.send(buffer);
    }

    // =========================================================================
    // ================= 2. WHATSAPP (CASE) ====================================
    // =========================================================================
    if (platform === 'whatsapp' && base === 'case') {
      zip.file('settings.js', `module.exports = { botName: "${sBotName}", ownerNumber: "${sOwnerNumber}", ownerName: "${sOwnerName}", pairingNumber: "${sPairing}", prefix: ".", features: ${JSON.stringify(list)}, menuType: "${sMenuType}", btnType: "btn", thumbType: "nothumb" };`);

      zip.file('index.js', `const settings = require('./settings.js');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('noxleys-baileys');
const pino = require('pino'); const fs = require('fs'); const path = require('path'); const os = require('os');
const moment = require('moment-timezone');
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now();
global.plugins = {};
['./src/database/welcome', './src/database/welcome-bg'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
function fontBold(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D400 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D41A + n - 97); if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7CE + n - 48); return c; }).join(''); }
function fontSmallCaps(str) { const map = { 'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ' }; return [...String(str).toLowerCase()].map(c => map[c] || c).join(''); }
function fontItalic(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D608 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D622 + n - 97); return c; }).join(''); }
function runtime() { const s = process.uptime(); const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); return [d ? d + 'd' : '', h ? h + 'h' : '', m ? m + 'm' : '', Math.floor(s % 60) + 's'].filter(Boolean).join(' '); }
function ucapan() { const h = moment.tz('Asia/Jakarta').hour(); if (h < 4) return 'Good Night'; if (h < 11) return 'Good Morning'; if (h < 15) return 'Good Afternoon'; if (h < 18) return 'Good Evening'; return 'Good Night'; }
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  if (!state.creds.registered) { setTimeout(async () => { try { const code = await sock.requestPairingCode(settings.pairingNumber); console.log('Pairing Code ' + settings.botName + ': ' + code); } catch (e) {} }, 3000); }
  sock.ev.on('connection.update', (u) => { if (u.connection === 'open') console.log(settings.botName + ' Connected!'); if (u.connection === 'close') { const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if (r) setTimeout(() => startBot(), 3000); } });
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]; if (!msg || !msg.message) return;
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    if (msg.message?.buttonsResponseMessage) body = msg.message.buttonsResponseMessage.selectedButtonId;
    else if (msg.message?.templateButtonReplyMessage) body = msg.message.templateButtonReplyMessage.selectedId;
    if (msg.key.fromMe && !body.startsWith('.')) return;
    if (!body.startsWith('.')) return;
    await sock.sendPresenceUpdate('composing', remoteJid);
    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase();
    if (command === 'menu' || command === 'help') {
      let textMenu = '';
      const d = { greeting: ucapan(), user: sender.split('@')[0], role: 'Beginner', level: 0, limit: 'Unlimited', runtime: runtime(), commands: settings.features.length, categories: 1 };
      const sys = { platform: os.platform(), node: process.version, ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB' };
      if (settings.menuType === '1') { textMenu = \`╭─── ⟡ \${fontBold(settings.botName)} ⟡ ───\\n│ \${d.greeting}, \${fontItalic(d.user)}\\n│\\n├ ⊛ \${fontSmallCaps('Role')}     : \${fontItalic(d.role)}\\n├ ⊛ \${fontSmallCaps('Level')}    : \${d.level}\\n├ ⊛ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n│\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Category')} : \${d.categories}\\n│\\n╰── ■■■■■■■■■■ 100%\`; }
      else if (settings.menuType === '2') { textMenu = \`⟪ \${fontBold('EDEN ACADEMY')} ⟫\\n═══════════════════════\\n✧ \${fontSmallCaps('Student')}  : \${fontItalic(d.user)}\\n✧ \${fontSmallCaps('Rank')}     : \${fontItalic(d.role)}\\n✧ \${fontSmallCaps('Level')}    : \${d.level}\\n✧ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n\\n✧ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n✧ \${fontSmallCaps('Commands')} : \${d.commands}\\n✧ \${fontSmallCaps('Category')} : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n═══════════════════════\\n⟡ \${fontSmallCaps('Status')} : \${fontItalic('Imperial Scholar')}\`; }
      else if (settings.menuType === '3') { textMenu = \`[ \${fontBold(settings.botName.toUpperCase())} ]\\n-----------------------\\n> \${fontBold('PROFILE')}\\n  \${fontSmallCaps('User')}      : \${fontItalic(d.user)}\\n  \${fontSmallCaps('Role')}      : \${fontItalic(d.role)}\\n  \${fontSmallCaps('Level')}     : \${d.level}\\n  \${fontSmallCaps('Limit')}     : \${fontItalic(d.limit)}\\n\\n> \${fontBold('SYSTEM')}\\n  \${fontSmallCaps('Status')}    : ᴏɴʟɪɴᴇ\\n  \${fontSmallCaps('Runtime')}   : \${d.runtime}\\n  \${fontSmallCaps('Platform')}  : \${sys.platform}\\n  \${fontSmallCaps('Node')}      : \${sys.node}\\n\\n> \${fontBold('STATISTICS')}\\n  \${fontSmallCaps('Commands')}  : \${d.commands}\\n  \${fontSmallCaps('Category')}  : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n-----------------------\`; }
      else { textMenu = \`┌─✦ \${fontBold(settings.botName + ' SYSTEM')} ✦─┐\\n│\\n├ ⊛ \${fontSmallCaps('Mode')}     : PUBLIC\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Platform')} : \${sys.platform}\\n├ ⊛ \${fontSmallCaps('RAM')}      : \${sys.ram}\\n├ ⊛ \${fontSmallCaps('Status')}   : ᴏɴʟɪɴᴇ\\n│\\n└─ ■■■■■■■■■■ 100%\`; }
      textMenu += \`\\n\\n╭━━━〔 \${settings.features.length} FITUR 〕━━━\\n\` + settings.features.map(f => '┃ ❒ .' + f).join('\\n') + \`\\n╰━━━━━━━━━━━━━━\`;
      await sock.sendMessage(remoteJid, { text: textMenu }, { quoted: msg });
      return;
    }
    if (command === 'ping') return await sock.sendMessage(remoteJid, { text: '🏓 Pong!' }, { quoted: msg });
    if (command === 'owner') return await sock.sendMessage(remoteJid, { text: '👑 Owner: ' + settings.ownerName }, { quoted: msg });
  });
}
startBot().catch(e => { console.error('FATAL:', e); setTimeout(() => startBot().catch(console.error), 5000); });
`);

      const pkgDeps = {
        "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2",
        "axios": "^1.7.2", "node-fetch": "^3.3.2", "fflate": "^0.8.2",
        "sharp": "^0.34.5", "jimp": "^0.22.12", "moment-timezone": "^0.5.45"
      };
      zip.file('package.json', JSON.stringify({
        name: safe, version: "1.0.0", type: "commonjs", main: "index.js",
        scripts: { start: "node index.js" }, dependencies: pkgDeps
      }, null, 2));
      zip.file('database.json', JSON.stringify({ data: { users: {}, chats: {}, settings: {} }, welcome: [], antilink: [], autoreply: {} }, null, 2));

      list.forEach(f => { if (f !== 'panel') zip.file(`plugins/${f}.js`, `module.exports = {};\n`); });

      // Download thumbnail untuk WA CASE
      if (thumbUrl && thumbUrl.startsWith('http')) {
        try {
          const res = await fetch(thumbUrl);
          if (res.ok) zip.file('thumbnail.jpg', Buffer.from(await res.arrayBuffer()));
        } catch (e) { console.error('Gagal download thumb WA CASE:', e); }
      }

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.zip"`);
      return res.send(buffer);
    }

    // =========================================================================
    // ================= 3. WHATSAPP (ESM) =====================================
    // =========================================================================
    
    // Download thumbnail untuk WA ESM
    if (thumbUrl && thumbUrl.startsWith('http')) {
      try {
        const res = await fetch(thumbUrl);
        if (res.ok) zip.file('thumbnail.jpg', Buffer.from(await res.arrayBuffer()));
      } catch (e) { console.error('Gagal download thumb WA ESM:', e); }
    }

    zip.file('settings.js', `export default { botName: "${sBotName}", ownerNumber: "${sOwnerNumber}", ownerName: "${sOwnerName}", pairingNumber: "${sPairing}", prefix: ".", features: ${JSON.stringify(list)}, menuType: "${sMenuType}", btnType: "btn", thumbType: "nothumb", panel: { domain: "${sPanelDomain}", ptla: "${sPanelPtla}", egg: "${sPanelEgg}", loc: "${sPanelLoc}" } };`);

    zip.file('index.js', `import settings from './settings.js';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'noxleys-baileys';
import pino from 'pino'; import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import moment from 'moment-timezone';
global.db = JSON.parse(fs.readFileSync('./database.json'));
global.saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
global.startTime = Date.now(); global.plugins = {};
global.panel = settings.panel || {};
['./src/database/welcome', './src/database/welcome-bg'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
console.log('Starting ESM ' + settings.botName);
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ logger: pino({ level: "silent" }), auth: state, printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);
  if (!state.creds.registered) { setTimeout(async () => { try { const code = await sock.requestPairingCode(settings.pairingNumber); console.log('Pairing Code: ' + code); } catch (e) {} }, 3000); }
  const pluginsDir = path.join(process.cwd(), 'plugins'); const plugins = [];
  if (fs.existsSync(pluginsDir)) {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
    for (const file of files) { const mod = await import(pathToFileURL(path.join(pluginsDir, file)).href); if (mod.default) { plugins.push(mod.default); global.plugins[file.replace('.js', '')] = mod.default; } }
  }
  sock.ev.on('connection.update', (u) => { if (u.connection === 'open') console.log('Connected!'); if (u.connection === 'close') { const r = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; if (r) setTimeout(() => startBot(), 3000); } });
  sock.ev.on('group-participants.update', async (update) => { for (const p of plugins) { if (p.onParticipantsUpdate) await p.onParticipantsUpdate(sock, update); } });
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]; if (!msg || !msg.message) return;
    const remoteJid = msg.key.remoteJid; const sender = msg.key.participant || remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
    if (msg.message?.buttonsResponseMessage) body = msg.message.buttonsResponseMessage.selectedButtonId;
    else if (msg.message?.templateButtonReplyMessage) body = msg.message.templateButtonReplyMessage.selectedId;
    if (msg.key.fromMe && !body.startsWith('.')) return;
    if (body && global.db.autoreply[body.toLowerCase()]) { await sock.sendMessage(remoteJid, { text: global.db.autoreply[body.toLowerCase()] }, { quoted: msg }); return; }
    if (global.db.antilink.includes(remoteJid) && /https?:\\/\\/|www\\.|t\\.me\\//i.test(body)) { if (!msg.key.fromMe) { try { await sock.sendMessage(remoteJid, { delete: msg.key }); } catch {} } return; }
    if (!body.startsWith('.')) return;
    await sock.sendPresenceUpdate('composing', remoteJid);
    const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase(); const text = args.join(' ');
    for (const p of plugins) { if (p.command && p.command.includes(command)) { try { await p.handler(sock, msg, { remoteJid, sender, command, args, text, settings, isGroup: remoteJid.endsWith('@g.us') }); } catch (e) { console.error(e); } } }
  });
}
startBot().catch(e => { console.error('FATAL:', e); setTimeout(() => startBot().catch(console.error), 5000); });
`);

    const pkgDeps = {
      "noxleys-baileys": "^2.0.0", "noxleyss": "latest", "pino": "^8.17.2",
      "axios": "^1.7.2", "node-fetch": "^3.3.2", "fflate": "^0.8.2",
      "sharp": "^0.34.5", "jimp": "^0.22.12", "moment-timezone": "^0.5.45",
      "fluent-ffmpeg": "^2.1.2", "ffmpeg-static": "^5.2.0", "form-data": "^4.0.0"
    };
    zip.file('package.json', JSON.stringify({
      name: safe, version: "1.0.0", type: "module", main: "index.js",
      scripts: { start: "node index.js" }, dependencies: pkgDeps
    }, null, 2));
    zip.file('database.json', JSON.stringify({ data: { users: {}, chats: {}, settings: {} }, welcome: [], antilink: [], autoreply: {} }, null, 2));

    const libFolder = zip.folder('lib');
    libFolder.file('levelling.js', `export const xpRange = (level) => { let min = level * 100; let max = min + 100; return { min, max, xp: max - min }; };
export const getLevel = (exp) => { let level = 0; while (xpRange(level).max <= exp) level++; return level; };`);

    libFolder.file('vidsave.js', `import crypto from "crypto";
const AES_KEYS = ["4c9b7d2e".repeat(3) + "4c9b7d21", "rz18efAXUbdiaO7k"];
const BASE_API = "https://api.vidssave.com/api/contentsite_api";
const SSE_BASE = "https://api.vidssave.com/sse/contentsite_api";
const DEFAULT_HEADERS = { "User-Agent": "Mozilla/5.0", "Referer": "https://vidssave.com/", "Origin": "https://vidssave.com", "Content-Type": "application/x-www-form-urlencoded" };
function decryptAES(cipherTextB64) {
  for (const keyStr of AES_KEYS) {
    try {
      const key = Buffer.from(keyStr, "utf8"); const iv = Buffer.from(keyStr.slice(0, 16), "utf8");
      const decipher = crypto.createDecipheriv(key.length === 32 ? "aes-256-cbc" : "aes-128-cbc", key, iv);
      decipher.setAutoPadding(false);
      const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherTextB64.trim(), "base64")), decipher.final()]);
      let end = decrypted.length; while (end > 0 && decrypted[end - 1] === 0) end--;
      return JSON.parse(decrypted.slice(0, end).toString("utf8"));
    } catch {}
  }
  throw new Error("Gagal dekripsi VidSave");
}
async function requestApi(path, data = {}) {
  const payload = { hostname: "vidssave.com", auth: "4c9b7d21", domain: "api-ak.vidssave.com", ...data };
  const res = await fetch(\`\${BASE_API}/\${path}\`, { method: "POST", headers: DEFAULT_HEADERS, body: new URLSearchParams(payload).toString() });
  const json = await res.json(); if (json.status !== 1) throw new Error("API Error");
  return typeof json.data === "string" ? decryptAES(json.data) : json.data;
}
export async function parse(url) { const data = await requestApi("media/parse", { origin: "source", link: url }); return { title: data.title, resources: data.resources }; }
export async function download(videoUrl, format = "") {
  const info = await parse(videoUrl);
  let target = format ? info.resources.find(r => r.quality.toLowerCase() === format.toLowerCase() || r.type === format.toLowerCase()) : info.resources[0];
  if (!target) target = info.resources[0];
  if (!target || !target.resource_content) throw new Error("Resource tidak ditemukan");
  const dlData = await requestApi("media/download", { request: target.resource_content, no_encrypt: 1, ...(format ? { output: format } : {}) });
  const sseUrl = \`\${SSE_BASE}/media/download_query?auth=20250901majwlqo&domain=api-ak.vidssave.com&task_id=\${dlData.task_id}&download_domain=vidssave.com&origin=content_site\`;
  const sseRes = await fetch(sseUrl, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/event-stream" } });
  const reader = sseRes.body.getReader(); const decoder = new TextDecoder(); let dlUrl = null;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\\n")) {
      if (line.startsWith("data:")) { try { const p = JSON.parse(line.slice(5).trim()); if (p.download_link) { dlUrl = p.download_link; break; } } catch {} }
    }
    if (dlUrl) break;
  }
  if (!dlUrl) throw new Error("Gagal mendapatkan link download");
  const redRes = await fetch(dlUrl, { redirect: "manual" });
  return { title: info.title, downloadUrl: redRes.headers.get("location") || dlUrl };
}`);

    const pf = zip.folder('plugins');

    if (list.includes('menu')) {
      pf.file('menu.js', `import moment from 'moment-timezone'; import fs from 'fs'; import os from 'os'; import sharp from 'sharp';
const BOT_NAME = '${sBotName}';
const THUMB_URL = 'https://n.uguu.se/oVprmTOj.jpeg';
async function getThumbnail() { if (fs.existsSync('./thumbnail.jpg')) return fs.readFileSync('./thumbnail.jpg'); try { const res = await fetch(THUMB_URL); return await sharp(Buffer.from(await res.arrayBuffer())).resize(300, 300).jpeg().toBuffer(); } catch { return null; } }
function fontBold(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D400 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D41A + n - 97); if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7CE + n - 48); return c; }).join(''); }
function fontSmallCaps(str) { const map = { 'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ' }; return [...String(str).toLowerCase()].map(c => map[c] || c).join(''); }
function fontItalic(str) { return [...String(str)].map(c => { const n = c.codePointAt(0); if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D608 + n - 65); if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D622 + n - 97); return c; }).join(''); }
function runtime() { const s = process.uptime(); const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); return [d ? d + 'd' : '', h ? h + 'h' : '', m ? m + 'm' : '', Math.floor(s % 60) + 's'].filter(Boolean).join(' '); }
function ucapan() { const h = moment.tz('Asia/Jakarta').hour(); if (h < 4) return 'Good Night'; if (h < 11) return 'Good Morning'; if (h < 15) return 'Good Afternoon'; if (h < 18) return 'Good Evening'; return 'Good Night'; }
export default { command: ['menu', 'help'], tags: ['main'], help: ['menu'], handler: async (sock, msg, o) => {
  const feats = o.settings.features;
  const d = { greeting: ucapan(), user: o.sender.split('@')[0], role: 'Beginner', level: 0, limit: 'Unlimited', runtime: runtime(), commands: feats.length, categories: 1 };
  const sys = { platform: os.platform(), node: process.version, ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB' };
  let textMenu = '';
  if (o.settings.menuType === '1') { textMenu = \`╭─── ⟡ \${fontBold(BOT_NAME)} ⟡ ───\\n│ \${d.greeting}, \${fontItalic(d.user)}\\n│\\n├ ⊛ \${fontSmallCaps('Role')}     : \${fontItalic(d.role)}\\n├ ⊛ \${fontSmallCaps('Level')}    : \${d.level}\\n├ ⊛ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n│\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Category')} : \${d.categories}\\n│\\n╰── ■■■■■■■■■■ 100%\`; }
  else if (o.settings.menuType === '2') { textMenu = \`⟪ \${fontBold('EDEN ACADEMY')} ⟫\\n═══════════════════════\\n✧ \${fontSmallCaps('Student')}  : \${fontItalic(d.user)}\\n✧ \${fontSmallCaps('Rank')}     : \${fontItalic(d.role)}\\n✧ \${fontSmallCaps('Level')}    : \${d.level}\\n✧ \${fontSmallCaps('Limit')}    : \${fontItalic(d.limit)}\\n\\n✧ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n✧ \${fontSmallCaps('Commands')} : \${d.commands}\\n✧ \${fontSmallCaps('Category')} : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n═══════════════════════\\n⟡ \${fontSmallCaps('Status')} : \${fontItalic('Imperial Scholar')}\`; }
  else if (o.settings.menuType === '3') { textMenu = \`[ \${fontBold(BOT_NAME.toUpperCase())} ]\\n-----------------------\\n> \${fontBold('PROFILE')}\\n  \${fontSmallCaps('User')}      : \${fontItalic(d.user)}\\n  \${fontSmallCaps('Role')}      : \${fontItalic(d.role)}\\n  \${fontSmallCaps('Level')}     : \${d.level}\\n  \${fontSmallCaps('Limit')}     : \${fontItalic(d.limit)}\\n\\n> \${fontBold('SYSTEM')}\\n  \${fontSmallCaps('Status')}    : ᴏɴʟɪɴᴇ\\n  \${fontSmallCaps('Runtime')}   : \${d.runtime}\\n  \${fontSmallCaps('Platform')}  : \${sys.platform}\\n  \${fontSmallCaps('Node')}      : \${sys.node}\\n\\n> \${fontBold('STATISTICS')}\\n  \${fontSmallCaps('Commands')}  : \${d.commands}\\n  \${fontSmallCaps('Category')}  : \${d.categories}\\n\\n  ■■■■■■■■■■ 100%\\n-----------------------\`; }
  else { textMenu = \`┌─✦ \${fontBold(BOT_NAME + ' SYSTEM')} ✦─┐\\n│\\n├ ⊛ \${fontSmallCaps('Mode')}     : PUBLIC\\n├ ⊛ \${fontSmallCaps('Runtime')}  : \${d.runtime}\\n├ ⊛ \${fontSmallCaps('Commands')} : \${d.commands}\\n├ ⊛ \${fontSmallCaps('Platform')} : \${sys.platform}\\n├ ⊛ \${fontSmallCaps('RAM')}      : \${sys.ram}\\n├ ⊛ \${fontSmallCaps('Status')}   : ᴏɴʟɪɴᴇ\\n│\\n└─ ■■■■■■■■■■ 100%\`; }
  textMenu += \`\\n\\n╭━━━〔 \${feats.length} FITUR 〕━━━\\n\` + feats.map(f => '┃ ❒ .' + f).join('\\n') + \`\\n╰━━━━━━━━━━━━━━\`;
  try {
    const thumb = await getThumbnail();
    if (thumb) await sock.sendMessage(o.remoteJid, { image: thumb, caption: textMenu }, { quoted: msg });
    else throw new Error('no thumb');
  } catch { await sock.sendMessage(o.remoteJid, { text: textMenu }, { quoted: msg }); }
} };`);
    }

    if (list.includes('vidsave')) {
      pf.file('downloader.js', `import { download } from '../lib/vidsave.js';
export default { command: ['dl', 'tiktok', 'ig', 'yt'], tags: ['downloader'], help: ['dl <url>'], handler: async (sock, msg, o) => {
  if (!o.args[0]) return sock.sendMessage(o.remoteJid, { text: 'Kirim URL TikTok/IG/YT!\\n\\nContoh:\\n.' + o.command + ' https://vt.tiktok.com/xxxx' }, { quoted: msg });
  await sock.sendMessage(o.remoteJid, { text: '⏳ Mendownload...' }, { quoted: msg });
  try { const res = await download(o.args[0]); await sock.sendMessage(o.remoteJid, { video: { url: res.downloadUrl }, caption: '✅ ' + res.title }, { quoted: msg }); }
  catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('bypass')) {
      pf.file('bypass.js', `import axios from 'axios';
export default { command: ['bypass', 'bypass2'], tags: ['tools'], help: ['bypass <url>'], handler: async (sock, msg, o) => {
  if (!o.text) return sock.sendMessage(o.remoteJid, { text: 'Kirim link yang mau dibypass!\\n\\nContoh:\\n.' + o.command + ' https://bit.ly/xxx' }, { quoted: msg });
  try {
    const { data } = await axios.get('https://bypass-links.com/api/token', { headers: { Referer: 'https://bypass-links.com/' } });
    const res = await axios.post('https://bypass-links.com/api/bypass', { url: o.text, bypass_token: data.token }, { headers: { Referer: 'https://bypass-links.com/', 'content-type': 'application/json' } });
    await sock.sendMessage(o.remoteJid, { text: '✅ Result:\\n' + (res.data.result || res.data.url || JSON.stringify(res.data)) }, { quoted: msg });
  } catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('rch')) {
      pf.file('rch.js', `import fetch from 'node-fetch';
export default { command: ['rch', 'reactchannel'], tags: ['tools'], help: ['rch <url_channel> <reaction>'], handler: async (sock, msg, o) => {
  try {
    if (!o.text) return await sock.sendMessage(o.remoteJid, { text: \`❌ *Format Salah!*\\n\\nContoh:\\n> \${o.settings.prefix + o.command} https://whatsapp.com/channel/0029VasWNKC11ulJ4iNmXD13/521 👍\` }, { quoted: msg });
    let args = o.text.trim().split(/\\s+/);
    let url = args[0];
    let reaction = args[1] || '👍';
    if (!url.includes('whatsapp.com/channel/')) return await sock.sendMessage(o.remoteJid, { text: '❌ URL harus berupa link pesan WhatsApp Channel yang valid.' }, { quoted: msg });
    let api = \`https://api-cloud.my.id/tools/rchv2?link=\${encodeURIComponent(url)}&emoji=\${encodeURIComponent(reaction)}\`;
    let res = await fetch(api);
    let json = await res.json();
    if (!json.status && json.status !== 200 && !json.success) throw new Error(json.message || json.msg || 'Gagal mengirim reaction.');
    await sock.sendMessage(o.remoteJid, { text: \`✅ *Reaction berhasil dikirim!*\\n\\n💬 Reaction : \${reaction}\\n📢 Channel : WhatsApp Channel\\n📝 Status : Berhasil mengirim react ke pesan channel\` }, { quoted: msg });
  } catch (error) {
    console.error('RCH Plugin Error:', error);
    await sock.sendMessage(o.remoteJid, { text: '❌ *GAGAL*\\n\\n> ' + error.message }, { quoted: msg });
  }
} };`);
    }

    if (list.includes('iqc')) {
      pf.file('iqc.js', `import axios from 'axios';
import FormData from 'form-data';
import pino from 'pino';
import { downloadMediaMessage } from 'noxleys-baileys';
export default { command: ['iqc', 'iqcv2'], tags: ['maker'], help: ['iqc <text>'], handler: async (sock, msg, o) => {
  let text = o.text;
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!text && !msg.message.imageMessage && !q?.imageMessage) return sock.sendMessage(o.remoteJid, { text: 'Kirim gambar atau reply + caption\\n\\nContoh:\\n.' + o.command + ' halo' }, { quoted: msg });
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
  try {
    const res = await axios.post('https://brat.siputzx.my.id/v2/iphone-quoted', { sender: 'other', message: text || ' ', imageUrl: imgUrl, status: { carrierName: 'INDOSAT', batteryPercentage: 88, signalStrength: 4, wifi: true }, emojiStyle: 'apple' }, { headers: { 'Content-Type': 'application/json' }, responseType: 'arraybuffer' });
    await sock.sendMessage(o.remoteJid, { image: Buffer.from(res.data) }, { quoted: msg });
  } catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('web2apk')) {
      pf.file('web2apk.js', `export default { command: ['web2apk'], tags: ['tools'], help: ['web2apk <url> | <Nama> | <Package>'], handler: async (sock, msg, o) => {
  if (!o.text) return sock.sendMessage(o.remoteJid, { text: 'Format: .web2apk <url> | <Nama App> | <Package>' }, { quoted: msg });
  const parts = o.text.split('|'); const url = parts[0]?.trim(); const appName = parts[1]?.trim() || 'MyApp'; const packageName = parts[2]?.trim() || 'com.myapp';
  if (!url || !url.startsWith('http')) return sock.sendMessage(o.remoteJid, { text: 'URL tidak valid!' }, { quoted: msg });
  await sock.sendMessage(o.remoteJid, { text: '⏳ Building APK...' }, { quoted: msg });
  try {
    const res = await fetch('https://code-v-compiler-sr.vercel.app/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, appName, packageName }) });
    const data = await res.json(); let attempts = 0;
    while (attempts < 40) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await (await fetch('https://code-v-compiler-sr.vercel.app/api/build/' + data.build_id)).json();
      if (poll.status === 'ready') { await sock.sendMessage(o.remoteJid, { document: { url: 'https://code-v-compiler-sr.vercel.app' + poll.download_url }, mimetype: 'application/vnd.android.package-archive', fileName: appName + '.apk' }, { quoted: msg }); return; }
      attempts++;
    }
    throw new Error('Timeout');
  } catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('unblur')) {
      pf.file('unblur.js', `import crypto from 'crypto';
import FormData from 'form-data';
import { downloadMediaMessage } from 'noxleys-baileys';
import pino from 'pino';
export default { command: ['unblur'], tags: ['ai'], help: ['unblur'], handler: async (sock, msg, o) => {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!msg.message.imageMessage && !q?.imageMessage) return sock.sendMessage(o.remoteJid, { text: 'Kirim/reply gambar buram!' }, { quoted: msg });
  await sock.sendMessage(o.remoteJid, { text: '⏳ Processing...' }, { quoted: msg });
  try {
    const targetMsg = q ? { message: q, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } } : msg;
    const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino() });
    const form = new FormData();
    form.append('original_image_file', buf, { filename: 'image.png', contentType: 'image/png' });
    const dev = 'fallback_' + crypto.randomBytes(6).toString('hex');
    const res = await fetch('https://api.unwatermark.ai/api/web/unblurimage/v1/image-unblur-v2/create-job', { method: 'POST', headers: { 'Product-Code': '067003', 'Product-Serial': dev, Origin: 'https://unblurimage.ai', Referer: 'https://unblurimage.ai/', ...form.getHeaders() }, body: form });
    const data = await res.json(); if (!data.result) throw new Error('Gagal buat job');
    let out = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await (await fetch('https://api.unwatermark.ai/api/web/unblurimage/v1/image-unblur-v2/get-job/' + data.result.job_id, { headers: { 'Product-Code': '067003', 'Product-Serial': dev } })).json();
      if (poll.result?.status === 1) { out = poll.result.output_url?.[0]; break; }
    }
    await sock.sendMessage(o.remoteJid, { image: { url: out }, caption: '✅ Selesai!' }, { quoted: msg });
  } catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
} };`);
    }

    if (list.includes('fotolive')) {
      pf.file('fotolive.js', `import fs from 'fs'; import os from 'os'; import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { downloadMediaMessage, prepareWAMessageMedia, generateWAMessageFromContent } from 'noxleys-baileys';
import pino from 'pino';
export default { command: ['fotolive', 'livephoto'], tags: ['maker'], help: ['fotolive'], handler: async (sock, msg, o) => {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const isVideo = msg.message.videoMessage || q?.videoMessage;
  if (!isVideo) return sock.sendMessage(o.remoteJid, { text: 'Reply video untuk dijadikan Live Photo!' }, { quoted: msg });
  const vid = path.join(os.tmpdir(), 'vid_' + Date.now() + '.mp4');
  const thumb = path.join(os.tmpdir(), 'thumb_' + Date.now() + '.jpg');
  await sock.sendMessage(o.remoteJid, { text: '⏳ Memproses Live Photo...' }, { quoted: msg });
  try {
    const targetMsg = q ? { message: q, key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId } } : msg;
    const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: pino() });
    fs.writeFileSync(vid, buf);
    await new Promise((res, rej) => { ffmpeg(vid).outputOptions(['-vframes 1']).output(thumb).on('end', res).on('error', rej).run(); });
    const tBuf = fs.readFileSync(thumb);
    const iM = await prepareWAMessageMedia({ image: tBuf }, { upload: sock.waUploadToServer });
    const vM = await prepareWAMessageMedia({ video: buf }, { upload: sock.waUploadToServer });
    const pMsg = generateWAMessageFromContent(o.remoteJid, { imageMessage: { ...iM.imageMessage, contextInfo: { pairedMediaType: 5, statusSourceType: 0 } } }, { quoted: msg });
    await sock.relayMessage(o.remoteJid, pMsg.message, { messageId: pMsg.key.id });
    await sock.relayMessage(o.remoteJid, { videoMessage: { ...vM.videoMessage, contextInfo: { pairedMediaType: 6, statusSourceType: 0 } }, messageContextInfo: { messageAssociation: { associationType: 12, parentMessageKey: pMsg.key } } }, {});
  } catch (e) { await sock.sendMessage(o.remoteJid, { text: '❌ Gagal: ' + e.message }, { quoted: msg }); }
  finally { try { fs.unlinkSync(vid); fs.unlinkSync(thumb); } catch {} }
} };`);
    }

    if (list.includes('welcome')) {
      pf.file('welcome.js', `import fs from 'fs'; import path from 'path'; import Jimp from 'jimp';
import { downloadContentFromMessage } from 'noxleys-baileys';
const DIR = './src/database/welcome'; const BGDIR = './src/database/welcome-bg';
function getPath(id) { return path.join(DIR, id.replace(/[^a-zA-Z0-9]/g, '_') + '.json'); }
function load(id) { try { return JSON.parse(fs.readFileSync(getPath(id))); } catch { return { welcomeOn: false, leftOn: false, welcomeCaption: "👋 Selamat datang @user di {group}", leftCaption: "👋 Dadah @user" }; } }
function save(id, d) { fs.writeFileSync(getPath(id), JSON.stringify(d, null, 2)); }
async function genImg(pp, bgPath, name, group, type) {
  const W = 800, H = 500;
  let bg = bgPath && fs.existsSync(bgPath) ? await Jimp.read(bgPath) : new Jimp(W, H, type === 'welcome' ? '#0f172a' : '#2a0f0f');
  bg.cover(W, H);
  const ov = new Jimp(W, H, type === 'welcome' ? '#00000080' : '#000000a0'); bg.composite(ov, 0, 0);
  let p; try { p = await Jimp.read(pp); } catch { p = new Jimp(200, 200, type === 'welcome' ? '#38bdf8' : '#ef4444'); }
  p.resize(200, 200).circle(); bg.composite(p, (W - 200) / 2, 60);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE); const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  bg.print(font, 0, 300, { text: type === 'welcome' ? 'WELCOME' : 'GOODBYE', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 40);
  bg.print(font, 0, 350, { text: name, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 40);
  bg.print(fontSmall, 0, 400, { text: group.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W, 30);
  return await bg.getBufferAsync(Jimp.MIME_JPEG);
}
export default { command: ['welcome', 'left'], tags: ['admin'], help: ['welcome on/off'], handler: async (sock, msg, o) => {
  if (!o.isGroup) return;
  const conf = load(o.remoteJid); const cmd = o.command.includes('left') ? 'left' : 'welcome';
  const sub = (o.args[0] || '').toLowerCase();
  if (sub === 'on') { if (cmd === 'welcome') conf.welcomeOn = true; else conf.leftOn = true; save(o.remoteJid, conf); return sock.sendMessage(o.remoteJid, { text: '✅ ON' }, { quoted: msg }); }
  if (sub === 'off') { if (cmd === 'welcome') conf.welcomeOn = false; else conf.leftOn = false; save(o.remoteJid, conf); return sock.sendMessage(o.remoteJid, { text: '❌ OFF' }, { quoted: msg }); }
  if (sub === 'setbg') {
    const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = q?.imageMessage || msg.message?.imageMessage;
    if (!imgMsg) return sock.sendMessage(o.remoteJid, { text: 'Reply foto!' }, { quoted: msg });
    const str = await downloadContentFromMessage(imgMsg, 'image');
    let buf = Buffer.from([]); for await (const c of str) buf = Buffer.concat([buf, c]);
    if (!fs.existsSync(BGDIR)) fs.mkdirSync(BGDIR, { recursive: true });
    fs.writeFileSync(path.join(BGDIR, o.remoteJid.replace(/[^a-zA-Z0-9]/g, '_') + '_' + cmd + '.jpg'), buf);
    return sock.sendMessage(o.remoteJid, { text: '✅ BG disimpan' }, { quoted: msg });
  }
  return sock.sendMessage(o.remoteJid, { text: 'Format: .welcome on/off/setbg' }, { quoted: msg });
}, onParticipantsUpdate: async (sock, update) => {
  const conf = load(update.id); if (!conf.welcomeOn && !conf.leftOn) return;
  if (update.action !== 'add' && update.action !== 'remove') return;
  for (const p of update.participants) {
    try {
      const pp = await sock.profilePictureUrl(p, 'image').catch(() => null);
      const buf = pp ? Buffer.from(await (await fetch(pp)).arrayBuffer()) : null;
      const type = update.action === 'add' ? 'welcome' : 'left';
      const bg = path.join(BGDIR, update.id.replace(/[^a-zA-Z0-9]/g, '_') + '_' + type + '.jpg');
      const name = p.split('@')[0]; const meta = await sock.groupMetadata(update.id);
      const img = await genImg(buf, bg, name, meta.subject, type);
      const cap = (type === 'welcome' ? conf.welcomeCaption : conf.leftCaption).replace(/@user/g, '@' + name).replace(/{user}/g, name).replace(/{group}/g, meta.subject);
      await sock.sendMessage(update.id, { image: img, caption: cap, mentions: [p] });
    } catch {}
  }
} };`);
    }

    const handled = ['menu', 'vidsave', 'bypass', 'rch', 'iqc', 'web2apk', 'unblur', 'fotolive', 'welcome'];
    list.forEach(f => {
      if (handled.includes(f)) return;
      if (f === 'panel' && usePanel) {
        pf.file('panel.js', `import settings from '../settings.js';
export default { command: ['panel'], tags: ['panel'], help: ['panel'], handler: async (sock, msg, o) => {
  await sock.sendMessage(o.remoteJid, { text: '⚠️ Fitur panel Pterodactyl belum diimplementasikan. Silakan isi di plugins/panel.js.' }, { quoted: msg });
} };`);
      } else if (f !== 'panel') {
        pf.file(`${f}.js`, `export default { command: ['${f}'], tags: ['tools'], help: ['${f}'], handler: async (sock, msg, o) => {
  await sock.sendMessage(o.remoteJid, { text: 'Fitur ${f} belum diimplementasikan penuh di versi ini.' }, { quoted: msg });
} };`);
      }
    });

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.zip"`);
    return res.send(buffer);

  } catch (e) {
    console.error('Generate Error:', e);
    return res.status(500).json({ error: e.message });
  }
}