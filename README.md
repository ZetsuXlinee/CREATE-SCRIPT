# CiKiZz - Auto Create Script Bot

> Create WhatsApp & Telegram Bot Script in 10 seconds - No Coding

![Version](https://img.shields.io/badge/version-1.0.0-cyan)
![Platform](https://img.shields.io/badge/platform-WhatsApp%20%7C%20Telegram-25D366)
![Base](https://img.shields.io/badge/base-CASE%20%7C%20ESM%20%7C%20Telegraf-a855f7)
![Plugins](https://img.shields.io/badge/plugins-11%20files-lime)
![Baileys](https://img.shields.io/badge/Baileys-6.7.8-blue)

Auto generator script bot WhatsApp (Baileys) & Telegram (Telegraf) dengan 3 jalur code terpisah - **CASE / ESM / TELEGRAM** - bukan disamain biar gak error 0B.

### ✨ Demo Live
**https://cikizz-create-script-bot-eta.vercel.app**

Isi identitas bot di web → Generate → Download ZIP → `npm install` → `node index.js`

---

## 🚀 Fitur Generator

### Platform Bot
- **WhatsApp Bot** - Baileys 6.7.8 - Pairing Code & QR
- **Telegram Bot** - Telegraf 4.15 - BotFather Token

### Base Terpisah - 3 Code Beda Total
| Base | Code | Cocok Untuk |
| :--- | :--- | :--- |
| **ESM** | `import/export`, `plugins/` folder, dynamic import | Modern, modular |
| **CASE** | `require`, `switch(command)`, single file | Simple, single file, pemula |
| **TELEGRAM** | `Telegraf`, `bot.command`, `ctx.reply`, `bot.launch()` | Telegram BotFather |

> CASE / ESM / TELEGRAM gak bisa disamain - makanya di `api/generate.js` dipisah 3 jalur.

### Tampilan Menu
- **Premium Box** - `╭━━━〔 Bot 〕━━━✦`
- **Simple** - List `.menu .ai .sticker`
- **Image** - Dengan thumbnail

### Gaya Tombol
- Teks Biasa
- Button (WhatsApp Button)

### 11 Fitur Force - Selalu 11 File