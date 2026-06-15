require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const {
  OPTION_THEMES,
  buildPreviewImagePrompt,
  buildFinalImagePrompt,
  RECOMMENDATION_SYSTEM,
  SVG_SYSTEM,
  buildSvgUserPrompt,
} = require('./trophy-prompts');

const app = express();
const PORT = process.env.PORT || 3000;

const OPENAI_PLACEHOLDER = 'sk-your-openai-api-key-here';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-1';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gpt-4o';

const PREVIEW_SIZE = '1792x1024';
const FINAL_SIZE = '1024x1792';
const QUALITY = 'hd';

const OPENAI_GPT_SIZE_MAP = {
  '1024x1024': '1024x1024',
  '1792x1024': '1536x1024',
  '1024x1792': '1024x1536',
};
const OPENAI_GPT_QUALITY_MAP = {
  hd: 'high',
  standard: 'medium',
};

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== OPENAI_PLACEHOLDER
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function isOpenAiConfigured() {
  return !!openai;
}

function toImageUrl(imageData) {
  if (imageData.url) return imageData.url;
  if (imageData.b64_json) return `data:image/png;base64,${imageData.b64_json}`;
  return null;
}

function parseProviderError(err) {
  const status = err.status || err.statusCode;
  let message = err.message || 'Request failed.';

  if (typeof message === 'string' && message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      message = parsed.error?.message || message;
    } catch {
      // keep original message
    }
  }

  return { status, message };
}

function isGptImageModel(model) {
  return model.startsWith('gpt-image');
}

function validateMatter(matter) {
  if (!matter || matter.trim() === '') {
    return 'Award matter is required.';
  }
  return null;
}

function validateOption(option) {
  const num = Number(option);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return 'Invalid option. Choose 1–5.';
  }
  return null;
}

async function generateImage(prompt, size) {
  const params = {
    model: IMAGE_MODEL,
    prompt: prompt.trim(),
    n: 1,
  };

  if (isGptImageModel(IMAGE_MODEL)) {
    params.size = OPENAI_GPT_SIZE_MAP[size];
    params.quality = OPENAI_GPT_QUALITY_MAP[QUALITY] || 'high';
  } else {
    params.size = size;
    params.quality = QUALITY === 'hd' ? 'hd' : 'standard';
  }

  const response = await openai.images.generate(params);
  const imageData = response.data[0];
  const imageUrl = toImageUrl(imageData);

  if (!imageUrl) {
    throw new Error('No image data returned from OpenAI.');
  }

  return {
    imageUrl,
    revisedPrompt: imageData.revised_prompt,
    model: IMAGE_MODEL,
  };
}

async function getRecommendation(matter, imageUrl) {
  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: RECOMMENDATION_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Award matter:\n${matter.trim()}\n\nWhich option (1–5) do you recommend?` },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content.trim();
  try {
    const parsed = JSON.parse(raw);
    const option = Number(parsed.recommendedOption);
    return {
      recommendedOption: option >= 1 && option <= 5 ? option : null,
      title: parsed.title || (option ? OPTION_THEMES[option]?.name : null),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [parsed.reason || raw],
    };
  } catch {
    return { recommendedOption: null, title: null, reasons: [raw] };
  }
}

async function generateSvg(matter, option) {
  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: SVG_SYSTEM },
      { role: 'user', content: buildSvgUserPrompt(matter, option) },
    ],
    max_tokens: 4000,
    temperature: 0.4,
  });

  let svg = completion.choices[0].message.content.trim();
  svg = svg.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();

  if (!svg.startsWith('<svg')) {
    throw new Error('SVG generation did not return valid markup.');
  }

  return svg;
}

function handleApiError(err, res) {
  const { status, message } = parseProviderError(err);
  console.error('  ✗ Error:', message);

  if (status === 401) {
    return res.status(401).json({ error: 'Invalid API key. Check OPENAI_API_KEY in .env' });
  }
  if (status === 429) {
    return res.status(429).json({ error: 'Rate limit reached. Wait a moment and try again.' });
  }
  if (status === 400) {
    const isPolicyViolation = /content policy|safety system|moderation|blocked/i.test(message);
    return res.status(400).json({
      error: isPolicyViolation ? `Content policy violation: ${message}` : message,
    });
  }
  if (status === 402) {
    return res.status(402).json({ error: 'Insufficient credits. Check your OpenAI billing settings.' });
  }

  return res.status(500).json({ error: message || 'Request failed. Please try again.' });
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    openaiConfigured: isOpenAiConfigured(),
    apiKeyConfigured: isOpenAiConfigured(),
    imageModel: IMAGE_MODEL,
    textModel: TEXT_MODEL,
  });
});

app.get('/api/options', (req, res) => {
  res.json({
    options: Object.entries(OPTION_THEMES).map(([num, o]) => ({
      number: Number(num),
      ...o,
    })),
  });
});

app.post('/api/preview', async (req, res) => {
  const { matter } = req.body;
  const matterError = validateMatter(matter);
  if (matterError) return res.status(400).json({ error: matterError });
  if (!isOpenAiConfigured()) {
    return res.status(401).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.' });
  }

  try {
    console.log(`\n[${new Date().toLocaleTimeString()}] Generating 5-option preview...`);
    console.log(`  Matter : ${matter.trim().slice(0, 80)}${matter.trim().length > 80 ? '...' : ''}`);

    const imagePrompt = buildPreviewImagePrompt(matter);
    const image = await generateImage(imagePrompt, PREVIEW_SIZE);

    console.log('  ⟳ Getting recommendation...');
    const recommendation = await getRecommendation(matter, image.imageUrl);

    console.log(`  ✓ Preview ready — recommends Option ${recommendation.recommendedOption || '?'}`);

    res.json({
      success: true,
      step: 'preview',
      matter: matter.trim(),
      imageUrl: image.imageUrl,
      revisedPrompt: image.revisedPrompt,
      model: image.model,
      recommendation,
      options: Object.entries(OPTION_THEMES).map(([num, o]) => ({
        number: Number(num),
        name: o.name,
        theme: o.theme,
      })),
    });
  } catch (err) {
    return handleApiError(err, res);
  }
});

app.post('/api/finalize', async (req, res) => {
  const { matter, option } = req.body;
  const matterError = validateMatter(matter);
  if (matterError) return res.status(400).json({ error: matterError });
  const optionError = validateOption(option);
  if (optionError) return res.status(400).json({ error: optionError });
  if (!isOpenAiConfigured()) {
    return res.status(401).json({ error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.' });
  }

  const optionNum = Number(option);

  try {
    console.log(`\n[${new Date().toLocaleTimeString()}] Finalizing Option ${optionNum}...`);
    console.log(`  Matter : ${matter.trim().slice(0, 80)}${matter.trim().length > 80 ? '...' : ''}`);

    const imagePrompt = buildFinalImagePrompt(matter, optionNum);
    const image = await generateImage(imagePrompt, FINAL_SIZE);

    console.log('  ⟳ Generating editable SVG...');
    let svg = null;
    let svgError = null;
    try {
      svg = await generateSvg(matter, optionNum);
    } catch (svgErr) {
      svgError = svgErr.message;
      console.warn('  ⚠ SVG generation failed:', svgError);
    }

    console.log('  ✓ Final artwork ready');

    res.json({
      success: true,
      step: 'final',
      matter: matter.trim(),
      selectedOption: optionNum,
      optionDetails: OPTION_THEMES[optionNum],
      imageUrl: image.imageUrl,
      revisedPrompt: image.revisedPrompt,
      model: image.model,
      svg,
      svgError,
    });
  } catch (err) {
    return handleApiError(err, res);
  }
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     Trophy House AI Agent              ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n  Running at → http://localhost:${PORT}`);
  console.log(`  OpenAI    → ${isOpenAiConfigured() ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Models    → ${IMAGE_MODEL} (image) | ${TEXT_MODEL} (text)`);
  console.log('\n  Press Ctrl+C to stop\n');
});
