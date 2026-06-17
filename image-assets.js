const sharp = require('sharp');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image too large. Please use a file under 8 MB.');
  }
  return buffer;
}

function bufferToDataUrl(buffer, mime = 'image/png') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function preparePngBuffer(dataUrl) {
  const buffer = dataUrlToBuffer(dataUrl);
  if (!buffer) return null;
  return sharp(buffer).rotate().png().toBuffer();
}

async function analyzeTrophyBase(openai, textModel, baseDataUrl) {
  const completion = await openai.chat.completions.create({
    model: textModel,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this trophy base / plaque / sticker blank. Return JSON only:
{
  "shape": "vertical oval | horizontal oval | shield | rectangle | round | custom",
  "orientation": "portrait | landscape | square",
  "aspectRatio": "e.g. 3:4",
  "borderDescription": "describe the frame/border",
  "innerAreaDescription": "describe the printable inner panel",
  "designGuidance": "one sentence telling a designer how to match this silhouette"
}`,
          },
          { type: 'image_url', image_url: { url: baseDataUrl } },
        ],
      },
    ],
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(completion.choices[0].message.content.trim());
  } catch {
    return {
      shape: 'vertical oval',
      orientation: 'portrait',
      aspectRatio: '3:4',
      borderDescription: 'metallic gold frame',
      innerAreaDescription: 'central panel',
      designGuidance: 'Match the uploaded trophy base silhouette exactly.',
    };
  }
}

async function compositePhotoOnImage(imageUrl, photoDataUrl) {
  const bgBuffer = await imageToBuffer(imageUrl);
  const photoBuffer = await preparePngBuffer(photoDataUrl);
  if (!photoBuffer) return imageUrl;

  const meta = await sharp(bgBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1536;
  const logoSize = Math.round(width * 0.16);
  const radius = logoSize / 2;

  const resized = await sharp(photoBuffer)
    .resize(logoSize, logoSize, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${logoSize}" height="${logoSize}">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
    </svg>`
  );

  const masked = await sharp(resized)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const ring = Buffer.from(
    `<svg width="${logoSize + 8}" height="${logoSize + 8}">
      <circle cx="${(logoSize + 8) / 2}" cy="${(logoSize + 8) / 2}" r="${radius + 2}" fill="none" stroke="#c9a227" stroke-width="3"/>
    </svg>`
  );

  const left = Math.round((width - logoSize) / 2);
  const top = Math.round(height * 0.055);

  const composite = await sharp(bgBuffer)
    .composite([
      { input: masked, top, left },
      { input: ring, top: top - 4, left: left - 4 },
    ])
    .png()
    .toBuffer();

  return bufferToDataUrl(composite);
}

async function imageToBuffer(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    return dataUrlToBuffer(imageUrl);
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Failed to fetch image.');
  return Buffer.from(await res.arrayBuffer());
}

module.exports = {
  MAX_IMAGE_BYTES,
  dataUrlToBuffer,
  bufferToDataUrl,
  preparePngBuffer,
  analyzeTrophyBase,
  compositePhotoOnImage,
  imageToBuffer,
};
