<div align="center">

![CiKiZz Banner](./banner.png.jpg)

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=24&pause=1000&center=true&vCenter=true&width=900&height=70&lines=Create+WhatsApp+Bot+in+10+seconds+⚡;No+Coding+Needed+🚀;CASE+%7C+ESM+%7C+TELEGRAM+3+Jalur+Beda;11+Plugins+Force+Bukan+0B+🔥;Made+by+KizzuRyuichi+💜" />

<a href="https://cikizz-create-script-bot-eta.vercel.app/"><img src="https://img.shields.io/badge/🔥_LIVE_WEBSITE-cikizz--create--script--bot--eta.vercel.app-06b6d4?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0a0b14" /></a>

<br>

<img src="https://img.shields.io/badge/Version-1.0.0-06b6d4?style=flat-square" />
<img src="https://img.shields.io/badge/Platform-WA_Telegram-25D366?style=flat-square&logo=whatsapp" />
<img src="https://img.shields.io/badge/Base-CASE_ESM_Telegraf-a855f7?style=flat-square&logo=javascript" />
<img src="https://img.shields.io/badge/Plugins-11_Files-lime?style=flat-square" />
<img src="https://img.shields.io/badge/Fix-0B_Bug-22c55e?style=flat-square" />

</div>

---

## 🌐 Tentang Website

**Link:** https://cikizz-create-script-bot-eta.vercel.app/

Website ini adalah **Generator Script Bot Otomatis** buatan **KizzuRyuichi**.
Lu isi form di web, pilih platform, base, fitur, klik generate, langsung dapat ZIP siap jalan.

### ✨ Fitur Website Lengkap

- **Platform:** WhatsApp Bot (Baileys 6.7.8) & Telegram Bot (Telegraf 4.15)
- **Base:** CASE (require) - Classic, ESM (import) - Modern, TELE - Telegraf
- **Koneksi:** Pairing Code 8 digit & QR Code
- **Bot Identity:** Nama bot, owner number, owner name, pairing number, token tele
- **Tampilan Menu:** Premium Box `╭━━━〔 Bot 〕━━━`, Simple, Image + thumbnail upload
- **Gaya Tombol:** Teks Biasa / Button WhatsApp
- **11 Plugin:** menu, welcome, antilink, sticker, downloader, ai, group, rpg, store, autoreply, broadcast
- **Server Generate:** api/generate.js pakai nodebuffer - anti 0B di HP Android
- **Responsive:** Support HP - File Manager gak 0B lagi

### 🛠️ Tech Stack

- Frontend: Next.js + Tailwind CSS - Dark cyan #06b6d4 purple #a855f7
- Backend: Vercel Serverless Function
- ZIP: JSZip + nodebuffer
- Hosting: Vercel

---

## 📖 Cara Penggunaan Generator

> [!IMPORTANT]
> Semua nilai nunggu dari web, bukan hardcode.

### STEP 1 - Buka Website

Buka https://cikizz-create-script-bot-eta.vercel.app/

### STEP 2 - Isi BOT IDENTITY

**Untuk WhatsApp:**
- Nama Bot: `ZetsuXlinee`
- Owner Number: `62882000572938` (pakai 62)
- Owner Name: `KizzuRyuichi`
- Pairing Number: `62882000572938`

**Untuk Telegram:**
- Token: `123456:ABC-DEF...` dari @BotFather > /newbot
- Username: `@zetsuluyy_bot`

> [!TIP]
> Pairing Number harus 62 - kalau 0882 gak muncul code.

### STEP 3 - Pilih Konfigurasi

- **BASE:**
    - `ESM` = Modern - import/export - plugins folder
    - `CASE` = Classic - require - switch case
    - `TELEGRAM` = Telegraf - bot.command - ctx.reply

- **KONEKSI:** Pairing Code / QR Code
- **MENU:** Premium Box / Simple / Image
- **TOMBOL:** Teks Biasa / Button

### STEP 4 - Pilih 11 Fitur Force

Centang semua biar jadi 11 file ada isinya:

1. menu.js - Menu utama
2. welcome.js - Welcome member
3. antilink.js - Anti link
4. sticker.js - Sticker maker
5. downloader.js - TikTok YTMP3
6. ai.js - AI Chatbot
7. group.js - Hidetag TagAll
8. rpg.js - Daily Balance
9. store.js - Store Produk
10. autoreply.js - Auto reply
11. broadcast.js - Broadcast

> [!WARNING]
> Kalau gak centang semua, `plugins/` bisa 0B kayak error lama.

### STEP 5 - Generate & Download

Klik `Generate Script - 11 File` -> Tunggu -> `Download ZetsuXlinee.zip`

### STEP 6 - Jalankan Bot

**WhatsApp:**

```bash
unzip ZetsuXlinee.zip
cd ZetsuXlinee
npm install
node index.js