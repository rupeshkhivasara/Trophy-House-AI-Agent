# Trophy House AI — Test Guide & Prompts

Use this file to test the full workflow step by step.

**App URL:** http://localhost:3000  
**Start server:** `npm start`

---

## Quick test flow (5 minutes)

| Step | Where | What to do |
|------|--------|------------|
| 1 | Sidebar → **Award Matter** | Paste **Test 1** below |
| 2 | Sidebar → **Image model** | Try `OpenAI` first, then `Replicate — FLUX.2 Pro` |
| 3 | Sidebar → **Layout** | `Certificate / सन्मानचिन्ह` |
| 4 | Chat | Click **Start design in chat** or type: `Create my trophy design` |
| 5 | Wait | See generating bar + Stop button (30–60 seconds) |
| 6 | Chat | Send refinement prompts from **Refinement tests** |
| 7 | History | Scroll up — each reply = new version (v1, v2, v3…) |

---

## Award matter format

Use labeled fields. The app parses these automatically:

```
Header:     institution / academy name
Title:      main award title (large text)
Body:       citation lines (optional)
Level:      event level (optional)
Presenter:  who gives the award (optional)
Year:       year (optional)
```

Marathi text is rendered separately with **Noto Sans Devanagari** (crisp, readable).

---

## Test 1 — Certificate (recommended first test)

**Sidebar settings**
- Layout: `Certificate / सन्मानचिन्ह`
- Image model: `OpenAI — gpt-image-2` OR `Replicate — FLUX.2 Pro`

**Paste in Award Matter:**

```
Header:
क्रिएटिव्ह अकॅडमी, नाशिक

Title:
सन्मानचिन्ह

Body:
आपण सामाजिक क्षेत्रात
केलेल्या उत्कृष्ट कार्याबद्दल
आपला सन्मान करण्यात
येत आहे.

Level:
राज्यस्तरीय

Presenter:
रतन पाटील सन्मान समिती, नाशिक

Year:
२०२६
```

**First chat message:**
```
Create my trophy design
```

**What to check**
- [ ] Version 1 appears in chat with image
- [ ] Marathi text is readable (not garbled)
- [ ] Certificate layout: oval + rectangle style
- [ ] Model name shown under image

---

## Test 2 — Trophy sticker (oval only)

**Sidebar settings**
- Layout: `Trophy sticker (oval only)`
- Design style: `Royal Blue Excellence` (theme 2)

**Paste in Award Matter:**

```
Header:
पुणे विद्यापीठ

Title:
विशिष्ट सेवा पुरस्कार

Body:
सामाजिक व शैक्षणिक
क्षेत्रातील योगदानाबद्दल

Level:
विश्वस्तरीय

Presenter:
कुलगुरू कार्यालय, पुणे

Year:
२०२५
```

**First chat message:**
```
Create a premium oval trophy sticker with royal blue and gold theme
```

---

## Test 3 — University gold theme

**Sidebar settings**
- Layout: `Trophy sticker`
- Design style: `Premium University Gold`

**Paste in Award Matter:**

```
Header:
महाराष्ट्र विद्यालय, मुंबई

Title:
गौरव पुरस्कार

Body:
विद्यार्थ्यांच्या सर्वांगीण
विकासासाठी उल्लेखनीय योगदान

Presenter:
प्राचार्य कार्यालय

Year:
२०२६
```

**First chat message:**
```
Create my trophy design with elegant university gold style
```

---

## Test 4 — Maharashtrian cultural theme

**Sidebar settings**
- Layout: `Trophy sticker`
- Design style: `Maharashtrian Cultural Theme`

**Paste in Award Matter:**

```
Header:
सांस्कृतिक मंडळ, कोल्हापूर

Title:
साहित्य गौरव

Body:
मराठी साहित्यातील
अतुलनीय योगदानाबद्दल

Presenter:
साहित्य समिती, कोल्हापूर

Year:
२०२६
```

**First chat message:**
```
Create trophy design with traditional Maharashtrian cultural ornaments
```

---

## Test 5 — With logo upload (optional)

**Before generating:**
1. Sidebar → **Logo / photo** → upload a PNG/JPG logo (college emblem, portrait, etc.)
2. Use **Test 1** or **Test 2** matter

**First chat message:**
```
Create my trophy design and place the uploaded logo at the top centre
```

**What to check**
- [ ] Logo appears at top of design (sticker layout)
- [ ] Logo does not overlap title text badly

---

## Test 6 — With trophy base upload (optional)

**Before generating:**
1. Sidebar → **Trophy base** → upload a blank trophy/plaque photo
2. Use **Test 1** matter

**First chat message:**
```
Create my trophy design matching the uploaded trophy base shape
```

**What to check**
- [ ] Sidebar shows: `Shape detected: ...`
- [ ] Generated design follows uploaded silhouette

---

## Refinement tests (continuous improvement)

After **Version 1** is ready, send these one at a time in chat.  
Each message creates a **new image** — old versions stay in history.

### Visual changes

```
Use white background instead of gold
```

```
Remove the logo from the design
```

```
Make the design simpler with less decoration
```

```
Add more gold border and premium luxury look
```

```
Use royal blue gradient background with gold ornaments
```

```
Make the layout cleaner and more professional for printing
```

### Text / matter changes

```
Change the title to विशिष्ट पुरस्कार
```

```
Change year to २०२७
```

```
Update presenter to महाराष्ट्र राज्य साहित्य अकादमी, मुंबई
```

### Combined requests

```
White background, remove logo, and make title area more spacious
```

```
Make it more premium with black and gold theme and less clutter
```

---

## Compare OpenAI vs Replicate (FLUX.2 Pro)

Run the **same test** twice with identical matter and first message:

| Run | Image model | First chat message |
|-----|-------------|-------------------|
| A | OpenAI — gpt-image-2 | `Create my trophy design` |
| B | Replicate — FLUX.2 Pro | `Create my trophy design` |

**Compare**
- Visual detail and ornament quality
- Shape accuracy (especially with trophy base upload)
- Time to generate
- Which version customer would approve faster

> OpenAI is still used for parsing matter and understanding refinement chat.  
> Replicate is used only for the background image when selected.

---

## Full production flow test (end-to-end)

Simulate your customer journey:

```
1. Customer Trophy Select   → Choose layout: Certificate or Sticker
2. Upload Logo              → Optional logo in sidebar
3. Enter Award Details      → Paste Test 1 matter
4. AI Generates Designs     → Chat: "Create my trophy design"
5. Customer Edits           → Send 2–3 refinement prompts
6. Approve                  → Pick best version from chat history (manual for now)
7. Auto PDF                 → Download PNG/SVG from chosen version
8. Production               → Send PNG to print team
```

**Suggested refinement sequence for demo:**
```
Create my trophy design
```
```
Use white background and cleaner layout
```
```
Make gold border thicker and more premium
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `OpenAI API key not configured` | Add `OPENAI_API_KEY` to `.env`, restart server |
| `Replicate API token not configured` | Add `REPLICATE_API_TOKEN` to `.env`, restart server |
| `Enter award matter first` | Paste matter in sidebar before sending chat |
| `Upload a logo first` | Add logo in sidebar, then send "add logo" again |
| Server offline | Run `npm start` in project folder |
| Port 3000 in use | Stop old server, then `npm start` again |
| Generation slow | Normal — 30–60 seconds; use Stop button to cancel |

---

## API health check

Open in browser or terminal:

```
http://localhost:3000/api/health
```

Expected fields:
- `openaiConfigured: true`
- `replicateConfigured: true` (if token set)
- `imageProviders` — lists OpenAI and Replicate

---

## Short copy-paste pack (quick demo)

**Matter (minimal):**
```
Header:
क्रिएटिव्ह अकॅडमी, नाशिक
Title:
सन्मानचिन्ह
Presenter:
रतन पाटील सन्मान समिती, नाशिक
Year:
२०२६
```

**Chat sequence:**
```
Create my trophy design
```
```
White background, premium gold border
```
```
Remove logo and simplify design
```

---

*Last updated for chat-style UI with OpenAI + Replicate (FLUX.2 Pro) support.*
