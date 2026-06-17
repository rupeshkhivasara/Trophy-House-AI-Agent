require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const { toFile } = require('openai');
const {
  OPTION_THEMES,
  buildVisualOnlyPrompt,
  SVG_SYSTEM,
  buildSvgUserPrompt,
} = require('./trophy-prompts');
const { parseMatter } = require('./matter-parser');
const { compositeTextOnImage, buildTextOverlaySvg, buildCertificateOverlaySvg } = require('./text-overlay');
const {
  analyzeTrophyBase,
  compositePhotoOnImage,
  preparePngBuffer,
} = require('./image-assets');
const {
  parseRefinement,
  applyMatterUpdates,
  buildRefinementPrompt,
} = require('./refinement');
const {
  FLUX_MODEL,
  isReplicateConfigured,
  generateFluxImage,
} = require('./replicate-provider');

const app = express();
const PORT = process.env.PORT || 3000;

const OPENAI_PLACEHOLDER = 'sk-your-openai-api-key-here';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-2';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gpt-4o';
const DEFAULT_THEME = 2;
const DEFAULT_IMAGE_PROVIDER = process.env.IMAGE_PROVIDER === 'replicate' ? 'replicate' : 'openai';

const OPTION_SIZE = '1024x1792';
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
app.use(express.json({ limit: '20mb' }));
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
      // keep original
    }
  }

  return { status, message };
}

function isGptImageModel(model) {
  return model.startsWith('gpt-image');
}

function validateMatter(matter) {
  if (!matter || matter.trim() === '') return 'Award matter is required.';
  return null;
}

function parseImageProvider(provider) {
  return provider === 'replicate' ? 'replicate' : 'openai';
}

function isImageProviderConfigured(provider) {
  if (provider === 'replicate') return isReplicateConfigured();
  return isOpenAiConfigured();
}

function validateImageProvider(provider) {
  if (!isImageProviderConfigured(provider)) {
    if (provider === 'replicate') {
      return 'Replicate API token not configured. Add REPLICATE_API_TOKEN to your .env file.';
    }
    return 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.';
  }
  return null;
}

function parseTheme(theme) {
  const num = Number(theme) || DEFAULT_THEME;
  if (!Number.isInteger(num) || num < 1 || num > 5) return DEFAULT_THEME;
  return num;
}

function parseAssets(body) {
  return {
    trophyBase: body.trophyBase || null,
    photo: body.photo || null,
    shapeProfile: body.shapeProfile || null,
  };
}

async function resolveShapeProfile(assets) {
  if (assets.shapeProfile) return assets.shapeProfile;
  if (!assets.trophyBase) return null;

  console.log('  ⟳ Analyzing uploaded trophy base shape...');
  const profile = await analyzeTrophyBase(openai, TEXT_MODEL, assets.trophyBase);
  console.log(`  ✓ Shape detected: ${profile.shape} (${profile.orientation})`);
  return profile;
}

async function generateImageEdit(prompt, sourceDataUrl, size = OPTION_SIZE) {
  const pngBuffer = await preparePngBuffer(sourceDataUrl);
  const file = await toFile(pngBuffer, 'design.png', { type: 'image/png' });

  const params = {
    model: IMAGE_MODEL,
    image: file,
    prompt: `${prompt.trim()}\n\nApply these visual changes to the existing design. Keep layout and shape. No text or letters.`,
    n: 1,
  };

  if (isGptImageModel(IMAGE_MODEL)) {
    params.size = OPENAI_GPT_SIZE_MAP[size] || 'auto';
    params.quality = OPENAI_GPT_QUALITY_MAP[QUALITY] || 'high';
  }

  const response = await openai.images.edit(params);
  const imageData = response.data[0];
  const imageUrl = toImageUrl(imageData);
  if (!imageUrl) throw new Error('No image data returned from OpenAI edit.');
  return { imageUrl, revisedPrompt: imageData.revised_prompt, model: IMAGE_MODEL, mode: 'edit' };
}

async function generateImage(prompt, size = OPTION_SIZE, trophyBaseDataUrl = null) {
  if (trophyBaseDataUrl) {
    const pngBuffer = await preparePngBuffer(trophyBaseDataUrl);
    const file = await toFile(pngBuffer, 'trophy-base.png', { type: 'image/png' });

    const params = {
      model: IMAGE_MODEL,
      image: file,
      prompt: `${prompt.trim()}\n\nDecorate inside the uploaded trophy base shape. Keep the exact outer silhouette and border. No text.`,
      n: 1,
    };

    if (isGptImageModel(IMAGE_MODEL)) {
      params.size = OPENAI_GPT_SIZE_MAP[size] || 'auto';
      params.quality = OPENAI_GPT_QUALITY_MAP[QUALITY] || 'high';
    }

    const response = await openai.images.edit(params);
    const imageData = response.data[0];
    const imageUrl = toImageUrl(imageData);
    if (!imageUrl) throw new Error('No image data returned from OpenAI edit.');
    return { imageUrl, revisedPrompt: imageData.revised_prompt, model: IMAGE_MODEL, mode: 'edit' };
  }

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
  if (!imageUrl) throw new Error('No image data returned from OpenAI.');
  return { imageUrl, revisedPrompt: imageData.revised_prompt, model: IMAGE_MODEL, mode: 'generate' };
}

async function generateImageWithProvider(provider, prompt, size = OPTION_SIZE, trophyBaseDataUrl = null) {
  if (provider === 'replicate') {
    return generateFluxImage(prompt, { trophyBaseDataUrl });
  }
  return generateImage(prompt, size, trophyBaseDataUrl);
}

async function generateTrophyDesign(matter, parsed, theme, assets = {}, layout = 'sticker', refineOptions = {}, imageProvider = 'openai') {
  const { refinementHistory = [], visualChanges = null } = refineOptions;

  const hasPhoto = !!assets.photo && !refineOptions.forceNoPhoto;
  const basePrompt = buildVisualOnlyPrompt(theme, assets.shapeProfile, hasPhoto, layout);
  const prompt = buildRefinementPrompt(basePrompt, refinementHistory, visualChanges);

  const image = await generateImageWithProvider(imageProvider, prompt, OPTION_SIZE, assets.trophyBase);

  let workingUrl = image.imageUrl;
  if (hasPhoto && layout !== 'certificate') {
    workingUrl = await compositePhotoOnImage(workingUrl, assets.photo);
  }

  const imageUrl = await compositeTextOnImage(workingUrl, parsed, theme, { hasPhoto, layout });

  return {
    theme,
    name: OPTION_THEMES[theme].name,
    themeDetails: OPTION_THEMES[theme],
    backgroundUrl: image.imageUrl,
    imageUrl,
    model: image.model,
    generationMode: image.mode,
  };
}

async function buildDesignResponse(matter, parsed, theme, assets, layout, result, refinementHistory = [], meta = {}) {
  let svg = null;
  let svgError = null;
  try {
    svg = await generateSvg(matter, theme);
  } catch (svgErr) {
    svgError = svgErr.message;
    svg = layout === 'certificate'
      ? buildCertificateOverlaySvg(parsed, 900, 1300)
      : buildTextOverlaySvg(parsed, theme, 900, 1300, { hasPhoto: !!assets.photo });
  }

  return {
    success: true,
    matter: matter.trim(),
    parsedMatter: parsed,
    shapeProfile: assets.shapeProfile,
    hasTrophyBase: !!assets.trophyBase,
    hasPhoto: !!assets.photo,
    theme,
    layout,
    refinementHistory,
    version: refinementHistory.length + 1,
    refinementSummary: meta.refinementSummary || null,
    userMessage: meta.userMessage || null,
    optionDetails: layout === 'certificate'
      ? { name: 'Classic Certificate', theme: 'Oval + rectangle सन्मानचिन्ह layout' }
      : result.themeDetails,
    imageUrl: result.imageUrl,
    backgroundUrl: result.backgroundUrl,
    model: result.model,
    imageProvider: meta.imageProvider || 'openai',
    svg,
    svgError,
  };
}

async function generateSvg(matter, theme) {
  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: SVG_SYSTEM },
      { role: 'user', content: buildSvgUserPrompt(matter, theme) },
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
    return res.status(401).json({ error: message.includes('Replicate') ? message : 'Invalid API key. Check your .env configuration.' });
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
    replicateConfigured: isReplicateConfigured(),
    imageModel: IMAGE_MODEL,
    replicateModel: FLUX_MODEL,
    defaultImageProvider: DEFAULT_IMAGE_PROVIDER,
    textModel: TEXT_MODEL,
    textOverlay: 'Noto Sans Devanagari',
    imageProviders: [
      {
        id: 'openai',
        name: `OpenAI ${IMAGE_MODEL}`,
        configured: isOpenAiConfigured(),
      },
      {
        id: 'replicate',
        name: 'Replicate FLUX.2 Pro',
        model: FLUX_MODEL,
        configured: isReplicateConfigured(),
      },
    ],
    features: { trophyBaseUpload: true, photoUpload: true, singleImage: true, refinement: true },
    themes: Object.entries(OPTION_THEMES).map(([num, o]) => ({
      number: Number(num),
      name: o.name,
      theme: o.theme,
    })),
  });
});

app.post('/api/generate', async (req, res) => {
  const { matter } = req.body;
  const matterError = validateMatter(matter);
  if (matterError) return res.status(400).json({ error: matterError });
  if (!isOpenAiConfigured()) {
    return res.status(401).json({ error: 'OpenAI API key not configured. Required for text parsing and refinement.' });
  }

  const imageProvider = parseImageProvider(req.body.imageProvider || DEFAULT_IMAGE_PROVIDER);
  const providerError = validateImageProvider(imageProvider);
  if (providerError) return res.status(401).json({ error: providerError });

  const theme = parseTheme(req.body.theme);
  const layout = req.body.layout === 'certificate' ? 'certificate' : 'sticker';
  const assets = parseAssets(req.body);

  try {
    const parsed = parseMatter(matter);
    assets.shapeProfile = await resolveShapeProfile(assets);

    console.log(`\n[${new Date().toLocaleTimeString()}] Generating trophy design...`);
    console.log(`  Title  : ${parsed.title || '(from lines)'}`);
    console.log(`  Layout : ${layout}`);
    console.log(`  Theme  : ${layout === 'certificate' ? 'Certificate' : OPTION_THEMES[theme].name}`);
    console.log(`  Provider: ${imageProvider}`);
    console.log(`  Model  : ${imageProvider === 'replicate' ? FLUX_MODEL : IMAGE_MODEL}`);
    console.log(`  Base   : ${assets.trophyBase ? 'uploaded' : 'default oval'}`);
    console.log(`  Photo  : ${assets.photo ? 'uploaded' : 'none'}`);

    const result = await generateTrophyDesign(matter, parsed, theme, assets, layout, {}, imageProvider);
    const response = await buildDesignResponse(matter, parsed, theme, assets, layout, result, [], {
      userMessage: 'Create trophy design',
      refinementSummary: 'Here is your first design. Tell me what to change and I will create a new version.',
      imageProvider,
    });

    console.log('  ✓ Design ready');
    res.json(response);
  } catch (err) {
    return handleApiError(err, res);
  }
});

app.post('/api/refine', async (req, res) => {
  const { feedback, matter, refinementHistory = [] } = req.body;
  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ error: 'Describe what you want to change.' });
  }
  const matterError = validateMatter(matter);
  if (matterError) return res.status(400).json({ error: matterError });
  if (!isOpenAiConfigured()) {
    return res.status(401).json({ error: 'OpenAI API key not configured. Required for text parsing and refinement.' });
  }

  const imageProvider = parseImageProvider(req.body.imageProvider || DEFAULT_IMAGE_PROVIDER);
  const providerError = validateImageProvider(imageProvider);
  if (providerError) return res.status(401).json({ error: providerError });

  const theme = parseTheme(req.body.theme);
  const layout = req.body.layout === 'certificate' ? 'certificate' : 'sticker';
  const assets = parseAssets(req.body);
  const history = Array.isArray(refinementHistory) ? [...refinementHistory] : [];

  try {
    let parsed = parseMatter(matter);
    assets.shapeProfile = await resolveShapeProfile(assets);

    const refinement = await parseRefinement(openai, TEXT_MODEL, feedback.trim(), {
      layout,
      theme,
      themeName: layout === 'certificate' ? 'Certificate' : OPTION_THEMES[theme].name,
      hasPhoto: !!assets.photo,
      hasTrophyBase: !!assets.trophyBase,
      matter,
      refinementHistory: history,
    });

    if (refinement.removePhoto) assets.photo = null;
    if (/add.*(logo|photo)/i.test(feedback) && !assets.photo) {
      return res.status(400).json({
        error: 'Upload a logo/photo in the sidebar first, then send your refine request again.',
        needsPhoto: true,
      });
    }

    parsed = applyMatterUpdates(parsed, refinement.matterUpdates);
    history.push(refinement.visualChanges);

    console.log(`\n[${new Date().toLocaleTimeString()}] Refining design...`);
    console.log(`  Feedback: ${feedback.trim().slice(0, 80)}`);
    console.log(`  Change  : ${refinement.summary}`);
    console.log(`  Provider: ${imageProvider}`);
    console.log(`  Model  : ${imageProvider === 'replicate' ? FLUX_MODEL : IMAGE_MODEL}`);

    const result = await generateTrophyDesign(matter, parsed, theme, assets, layout, {
      refinementHistory: history,
      visualChanges: refinement.visualChanges,
      forceNoPhoto: refinement.removePhoto,
    }, imageProvider);

    const response = await buildDesignResponse(matter, parsed, theme, assets, layout, result, history, {
      refinementSummary: refinement.summary,
      userMessage: feedback.trim(),
      imageProvider,
    });

    console.log('  ✓ Refinement applied');
    res.json(response);
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
  console.log(`  Replicate → ${isReplicateConfigured() ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  OpenAI model → ${IMAGE_MODEL}`);
  console.log(`  Replicate model → ${FLUX_MODEL}`);
  console.log(`  Default provider → ${DEFAULT_IMAGE_PROVIDER}`);
  console.log(`  Mode      → Chat-style · new image every turn`);
  console.log('\n  Press Ctrl+C to stop\n');
});
