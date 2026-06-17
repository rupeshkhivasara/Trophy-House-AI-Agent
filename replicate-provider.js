const Replicate = require('replicate');

const FLUX_MODEL = 'black-forest-labs/flux-2-pro';
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1792;

function isReplicateConfigured() {
  return !!process.env.REPLICATE_API_TOKEN?.trim();
}

function getClient() {
  if (!isReplicateConfigured()) {
    throw new Error('Replicate API token not configured. Add REPLICATE_API_TOKEN to your .env file.');
  }
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN.trim() });
}

function normalizeOutput(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return output[0] || null;
  if (typeof output.url === 'function') return output.url();
  if (output.url) return output.url;
  return null;
}

async function generateFluxImage(prompt, { trophyBaseDataUrl = null } = {}) {
  const replicate = getClient();
  const trimmedPrompt = prompt.trim();

  const input = {
    prompt: trimmedPrompt,
    aspect_ratio: 'custom',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    output_format: 'png',
    output_quality: 100,
    safety_tolerance: 2,
  };

  if (trophyBaseDataUrl) {
    input.input_images = [trophyBaseDataUrl];
    input.aspect_ratio = 'match_input_image';
    input.prompt = `${trimmedPrompt}\n\nDecorate inside the uploaded trophy base shape. Keep the exact outer silhouette and border. No text, no letters, no words.`;
  }

  const output = await replicate.run(FLUX_MODEL, { input });
  const imageUrl = normalizeOutput(output);
  if (!imageUrl) throw new Error('No image returned from Replicate FLUX.2 Pro.');

  return {
    imageUrl,
    model: FLUX_MODEL,
    mode: trophyBaseDataUrl ? 'edit' : 'generate',
  };
}

module.exports = {
  FLUX_MODEL,
  isReplicateConfigured,
  generateFluxImage,
};
