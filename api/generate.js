// api/generate.js - V36 FINAL - FIX vercel.json 404 + FORCE 11 FILE
import JSZip from 'jszip';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const { botName = 'zetsue', platform = 'whatsapp', base = 'esm' } = req.body || {};
    const safe = (botName || 'bot').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const zip = new JSZip();
    // FORCE 11 FILE - SELALU 11, GAK PEDULI WEB KIRIM 5
    const safeFeatures = ['menu','welcome','antilink','sticker','downloader','ai','group','rpg','store','autoreply','broadcast'];
    const settings = base === 'case' 
      ? `module.exports = { botName: "${botName}", features: ${JSON.stringify(safeFeatures)} };`
      : `export default { botName: "${botName}", features: ${JSON.stringify(safeFeatures)} };`;

    const TEMPLATES = {
      'menu.js': "export default { command:['menu'], handler: async (s,m,{remoteJid})=>{ await s.sendMessage(remoteJid,{text:'Menu ${botName} - 11 FITUR'}); } };",
      'welcome.js': "export default { command:['welcome'], handler: async (s,m,{remoteJid,text})=>{ if(text==='on'){if(!global.db.welcome.includes(remoteJid))global.db.welcome.push(remoteJid);global.saveDB();} }, onParticipantsUpdate: async (s,u)=>{ if(global.db.welcome.includes(u.id)) await s.sendMessage(u.id,{text:'Welcome'}); } };",
      'antilink.js': "export default { command:['antilink'], handler: async (s,m,{remoteJid,text})=>{ if(text==='on'){global.db.antilink.push(remoteJid);global.saveDB();} }, onMessage: async (s,m)=>{ if(global.db.antilink.includes(m.key.remoteJid)&&/https?:\\/\\//.test(m.message?.conversation||'')) return true; return false;} };",
      'sticker.js': "export default { command:['s','sticker'], handler: async (s,m,{remoteJid})=>{ const c=m.message; const b=await s.downloadMediaMessage({message:c,key:m.key}); if(b)await s.sendMessage(remoteJid,{sticker:b}); } };",
      'downloader.js': "import axios from 'axios'; export default { command:['tiktok','tt'], handler: async (s,m,{remoteJid,args})=>{ const url=args[0]; try{const r=await axios.get('https://tikwm.com/api/?url='+encodeURIComponent(url));const v=r.data?.data?.play; if(v)await s.sendMessage(remoteJid,{video:{url:v}});}catch{} } };",
      'ai.js': "import axios from 'axios'; export default { command:['ai','gpt'], handler: async (s,m,{remoteJid,text})=>{ try{const r=await axios.get('https://api.popcat.xyz/chatbot?msg='+encodeURIComponent(text));await s.sendMessage(remoteJid,{text:r.data.response});}catch{} } };",
      'group.js': "export default { command:['hidetag','tagall','kick'], handler: async (s,m,{remoteJid,command})=>{ const meta=await s.groupMetadata(remoteJid); if(command==='hidetag'){const mentions=meta.participants.map(p=>p.id);await s.sendMessage(remoteJid,{text:'Hidetag',mentions});} } };",
      'rpg.js': "export default { command:['daily','balance'], handler: async (s,m,{remoteJid,sender})=>{ if(!global.db.rpg[sender])global.db.rpg[sender]={money:0,lastDaily:0};global.db.rpg[sender].money+=1000;global.saveDB();await s.sendMessage(remoteJid,{text:'Daily +1000'});} };",
      'store.js': "export default { command:['addproduk','listproduk'], handler: async (s,m,{remoteJid,text,command})=>{ if(command==='addproduk'){global.db.produk.push(text);global.saveDB();} } };",
      'autoreply.js': "export default { command:['addreply','listreply'], handler: async (s,m,{remoteJid,text})=>{ const parts=text.split(' ');global.db.autoreply[parts[0].toLowerCase()]=parts.slice(1).join(' ');global.saveDB(); }, onMessage: async (s,m)=>{const b=m.message?.conversation?.toLowerCase();if(global.db.autoreply[b]){await s.sendMessage(m.key.remoteJid,{text:global.db.autoreply[b]});return true;}return false;} };",
      'broadcast.js': "export default { command:['bc','broadcast'], handler: async (s,m,{remoteJid,text})=>{ const groups=await s.groupFetchAllParticipating();for(const id of Object.keys(groups)){await s.sendMessage(id,{text});} } };"
    };

    zip.file('settings.js', settings);
    zip.file('package.json', JSON.stringify({ name: safe, type: base==='case'?'commonjs':'module', dependencies: { "@whiskeysockets/baileys": "^6.7.8", "pino": "^9.3.2" } }));
    zip.file('database.json', JSON.stringify({ welcome:[], antilink:[], autoreply:{}, rpg:{}, produk:[] }));
    zip.file('index.js', base==='case' ? "const settings=require('./settings.js');console.log('CASE '+settings.botName);" : "import settings from './settings.js';console.log('ESM '+settings.botName);");
    
    const pf = zip.folder('plugins');
    safeFeatures.forEach(f => pf.file(f+'.js', TEMPLATES[f]));

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}.zip`);
    res.setHeader('X-Version', 'V36-FORCE-11-FILE-FIX-VERCEL-JSON');
    res.setHeader('X-Features-Count', '11');
    return res.send(buffer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}