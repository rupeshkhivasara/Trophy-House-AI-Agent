# ✦ Image Generation Agent

A beautiful local web app that generates images from text prompts using **DALL-E 3**.

## Features
- 🎨 DALL-E 3 image generation (1024×1024, landscape, portrait)
- ✦ AI prompt enhancer (GPT-4o rewrites your prompt for better results)
- 🖼 HD & Standard quality modes
- 🎭 Vivid & Natural style modes
- 📜 Session history strip
- ⬇ Direct image download

---

## Setup (3 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Add your OpenAI API key
Open `.env` and replace the placeholder:
```
OPENAI_API_KEY=sk-your-actual-key-here
```
Get your key at → https://platform.openai.com/api-keys

> **Note:** DALL-E 3 HD costs ~$0.080/image. Standard costs ~$0.040/image.

### 3. Start the server
```bash
npm start
```
Then open → **http://localhost:3000**

For development with auto-reload:
```bash
npm run dev
```

---

## Project Structure
```
image-agent/
├── server.js          ← Express backend (API routes)
├── .env               ← Your API key (never commit this!)
├── package.json
└── public/
    └── index.html     ← Frontend UI
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Check server & API key status |
| POST | `/api/generate` | Generate image with DALL-E 3 |
| POST | `/api/enhance` | Enhance prompt with GPT-4o |

### POST /api/generate
```json
{
  "prompt": "A sunset over the ocean",
  "size": "1024x1024",
  "quality": "hd",
  "style": "vivid"
}
```

### POST /api/enhance
```json
{
  "prompt": "a cat"
}
```

---

## Keyboard Shortcut
`Ctrl + Enter` (or `Cmd + Enter`) — Generate image instantly
