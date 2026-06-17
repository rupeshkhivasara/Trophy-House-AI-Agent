const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { OPTION_THEMES } = require('./trophy-prompts');

const FONT_REGULAR = path.join(
  __dirname,
  'node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff'
);
const FONT_SEMIBOLD = path.join(
  __dirname,
  'node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-600-normal.woff'
);
const FONT_BOLD = path.join(
  __dirname,
  'node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff'
);

const FONT = 'Noto Sans Devanagari';

const OPTION_TEXT_STYLE = {
  1: { primary: '#4a1010', secondary: '#2d1a08', accent: '#6b4f0a', year: '#4a1010', banner: '#d4af37', bannerText: '#2d1a08' },
  2: { primary: '#fff8e7', secondary: '#f0e6c8', accent: '#ffd700', year: '#ffd700', banner: '#8b0000', bannerText: '#fff8e7' },
  3: { primary: '#6b1010', secondary: '#3d2810', accent: '#8b4513', year: '#5c1a1a', banner: '#f5e6c8', bannerText: '#6b1010' },
  4: { primary: '#fff8e7', secondary: '#f5e0b0', accent: '#ffd700', year: '#ffd700', banner: '#7a1a1a', bannerText: '#fff8e7' },
  5: { primary: '#ffd700', secondary: '#e8d5a3', accent: '#c9a227', year: '#ffd700', banner: '#1a1a1a', bannerText: '#ffd700' },
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text, maxChars) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textShadow(id, x, y, size, weight, fill, content) {
  const safe = escapeXml(content);
  return `
    <text x="${x}" y="${y + 1.5}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="rgba(0,0,0,0.35)">${safe}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${safe}</text>`;
}

function ribbonRect(cx, y, w, h, fill) {
  return `<rect x="${cx - w / 2}" y="${y - h * 0.72}" width="${w}" height="${h}" rx="${h * 0.2}" fill="${fill}" opacity="0.92" stroke="#c9a227" stroke-width="2"/>`;
}

function buildTextOverlaySvg(parsed, option, width, height, options = {}) {
  const { hasPhoto = false } = options;
  const style = OPTION_TEXT_STYLE[option] || OPTION_TEXT_STYLE[2];
  const cx = width / 2;
  const instLines = parsed.institutions.flatMap((i) => wrapLines(i, 20)).slice(0, 3);
  const titleLines = wrapLines(parsed.title, 12).slice(0, 2);
  const titleSize = width * 0.052;
  const instSize = width * 0.026;
  const levelSize = width * 0.032;
  const yearSize = width * 0.038;

  const shapes = [];
  const texts = [];

  let y = hasPhoto ? height * 0.24 : height * 0.13;

  for (const line of instLines) {
    texts.push(textShadow('inst', cx, y, instSize, 600, style.secondary, line));
    y += height * 0.036;
  }

  y = Math.max(y + height * 0.02, height * 0.30);
  for (const line of titleLines) {
    const bannerW = Math.min(width * 0.72, line.length * titleSize * 0.62 + 40);
    const bannerH = titleSize * 1.35;
    shapes.push(ribbonRect(cx, y, bannerW, bannerH, style.banner));
    texts.push(textShadow('title', cx, y, titleSize, 700, style.bannerText || style.primary, line));
    y += height * 0.075;
  }

  if (parsed.level) {
    y += height * 0.015;
    const bannerW = Math.min(width * 0.55, parsed.level.length * levelSize * 0.65 + 30);
    shapes.push(ribbonRect(cx, y, bannerW, levelSize * 1.3, style.accent));
    texts.push(textShadow('level', cx, y, levelSize, 600, style.bannerText || '#1a1a1a', parsed.level));
    y += height * 0.055;
  }

  if (parsed.tagline) {
    for (const line of wrapLines(parsed.tagline, 22).slice(0, 2)) {
      y += height * 0.01;
      texts.push(textShadow('tag', cx, y, width * 0.022, 400, style.secondary, line));
      y += height * 0.03;
    }
  }

  if (parsed.year) {
    const yearY = height * 0.87;
    const yearW = width * 0.22;
    shapes.push(`<ellipse cx="${cx}" cy="${yearY}" rx="${yearW / 2}" ry="${yearSize * 0.9}" fill="none" stroke="#c9a227" stroke-width="3"/>`);
    texts.push(textShadow('year', cx, yearY + yearSize * 0.12, yearSize, 700, style.year, parsed.year));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="ovalClip">
      <ellipse cx="${cx}" cy="${height / 2}" rx="${width * 0.38}" ry="${height * 0.44}" />
    </clipPath>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5e6a8"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a67c00"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#ovalClip)">
    ${shapes.join('\n    ')}
    ${texts.join('\n    ')}
  </g>
</svg>`;
}

function renderSvgToPng(svg) {
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      fontFiles: [FONT_REGULAR, FONT_SEMIBOLD, FONT_BOLD],
      defaultFontFamily: FONT,
    },
  });
  return resvg.render().asPng();
}

async function imageToBuffer(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    return Buffer.from(imageUrl.split(',')[1], 'base64');
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Failed to fetch image for text overlay.');
  return Buffer.from(await res.arrayBuffer());
}

function toDataUrl(buffer, mime = 'image/png') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function compositeTextOnImage(imageUrl, parsed, option, options = {}) {
  const { hasPhoto = false, layout = 'sticker' } = options;
  const bgBuffer = await imageToBuffer(imageUrl);
  const meta = await sharp(bgBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1536;

  const svg = layout === 'certificate'
    ? buildCertificateOverlaySvg(parsed, width, height)
    : buildTextOverlaySvg(parsed, option, width, height, { hasPhoto });
  const textPng = renderSvgToPng(svg);

  const composite = await sharp(bgBuffer)
    .composite([{ input: textPng, top: 0, left: 0 }])
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer();

  return toDataUrl(composite);
}

function buildCertificateOverlaySvg(parsed, width, height) {
  const cx = width / 2;
  const maroon = '#8b1a1a';
  const gold = '#9a7b2f';
  const black = '#1a1a1a';
  const texts = [];
  const shapes = [];

  const divider = (y) => {
    shapes.push(`<line x1="${cx - width * 0.2}" y1="${y}" x2="${cx + width * 0.2}" y2="${y}" stroke="${gold}" stroke-width="1.5"/>`);
    shapes.push(`<polygon points="${cx},${y - 4} ${cx + 5},${y} ${cx},${y + 4} ${cx - 5},${y}" fill="${gold}"/>`);
  };

  let y = height * 0.14;
  if (parsed.header) {
    texts.push(textShadow('h', cx, y, width * 0.028, 600, gold, parsed.header));
    y += height * 0.04;
    divider(y);
    y += height * 0.05;
  }

  if (parsed.title) {
    const titleSize = width * 0.065;
    texts.push(textShadow('t', cx, y, titleSize, 700, maroon, parsed.title));
    y += height * 0.07;
    divider(y);
    y += height * 0.05;
  }

  const bodyText = parsed.body || parsed.level || '';
  const bodyLines = bodyText.split('\n').filter(Boolean);
  const bodySize = width * 0.028;
  for (const line of bodyLines.slice(0, 6)) {
    texts.push(textShadow('b', cx, y, bodySize, 400, black, line));
    y += height * 0.038;
  }

  const rectTop = height * 0.72;
  y = rectTop + height * 0.06;
  divider(y);
  y += height * 0.05;

  texts.push(textShadow('p', cx, y, width * 0.03, 600, maroon, 'सन्मानकर्ता'));
  y += height * 0.05;
  divider(y);
  y += height * 0.05;

  const presenter = parsed.presenter || parsed.institutions.join(', ');
  if (presenter) {
    for (const line of wrapLines(presenter, 24).slice(0, 2)) {
      texts.push(textShadow('o', cx, y, width * 0.032, 700, maroon, line));
      y += height * 0.04;
    }
  }

  if (parsed.year) {
    texts.push(textShadow('y', cx, height * 0.95, width * 0.028, 600, black, parsed.year));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g>
    ${shapes.join('\n    ')}
    ${texts.join('\n    ')}
  </g>
</svg>`;
}

module.exports = {
  buildTextOverlaySvg,
  buildCertificateOverlaySvg,
  compositeTextOnImage,
  OPTION_TEXT_STYLE,
};
