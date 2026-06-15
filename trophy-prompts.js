const OPTION_THEMES = {
  1: {
    name: 'Premium University Gold',
    theme: 'Elite Academic Excellence',
    features: 'Rich gold border, university seal style, gold foil appearance, ivory background, elegant serif typography, academic prestige',
    mood: 'Convocation Award',
  },
  2: {
    name: 'Royal Blue Excellence',
    theme: 'National Level Recognition',
    features: 'Royal blue, metallic gold accents, formal composition, ribbon style hierarchy, premium academic feel',
    mood: 'State Award',
  },
  3: {
    name: 'Literary Poetry Theme',
    theme: 'Poetry and Literature',
    features: 'Poetry waves, abstract book forms, knowledge flame, literary crest, ink-inspired geometry, elegant Marathi composition — not only feather pens',
    mood: 'Poet Recognition',
  },
  4: {
    name: 'Maharashtrian Cultural Theme',
    theme: 'Traditional Maharashtra',
    features: 'Warli inspired motifs, traditional borders, cultural ornamentation, rich saffron-maroon palette, ceremonial appearance',
    mood: 'Cultural Excellence Award',
  },
  5: {
    name: 'Ultra Luxury Trophy Theme',
    theme: 'Premium Trophy Product',
    features: 'Black and gold, metallic finish, modern luxury, clean hierarchy, minimal ornamentation',
    mood: 'High-End Trophy Manufacturer Edition',
  },
};

const CORE_RULES = `You are a world-class Trophy Sticker Designer with 50+ years of experience. Think like a real trophy designer, not a generic AI image generator. Every design must look like a premium commercially manufacturable trophy sticker.

MANDATORY SHAPE: Vertical portrait oval only — tall oval like professional trophy stickers. NOT horizontal, circular, shield, or rectangle. All content must fit completely inside the oval with 5% safe margin; text and decoration never touch the border.

PRINT: Readable at 90mm×65mm and 100mm×75mm. Suitable for UV, eco-solvent, vinyl, digital trophy, acrylic, wooden, and metal plaque production.

TYPOGRAPHY HIERARCHY: Primary = Award Title; Secondary = Event Level; Tertiary = Institution Names; Supporting = Year, tagline, sponsors, category. Marathi Devanagari must be prestigious, ceremonial, academic, and highly readable — no fancy unreadable or condensed fonts.

QUALITY: Premium, elegant, expensive, award-worthy, collectible, professional. NOT cheap, generic, template-based, or social-media style. Avoid certificate/poster/flyer layouts.

CREATIVITY: Each option must differ completely in layout, border, hierarchy, decoration, background, typography, theme, and mood — as if designed by five different senior designers. NOT five color variations of the same layout.`;

function buildPreviewImagePrompt(matter) {
  const optionBlocks = Object.entries(OPTION_THEMES).map(([num, o]) =>
    `OPTION ${num} — ${o.name}: ${o.theme}. ${o.features}. Mood: ${o.mood}.`
  ).join('\n');

  return `${CORE_RULES}

TASK: Generate ONE preview sheet image only. Inside this single image, show all five trophy sticker options arranged clearly in a grid (e.g. row of five or 2+3 layout). Each option is a separate vertical portrait oval sticker, clearly labeled "OPTION 1" through "OPTION 5" above or below each oval.

Each of the five ovals must contain the complete award matter below with proper typography hierarchy. All five must look completely different — different designers, different themes:

${optionBlocks}

If award title is short, add an elegant prestige tagline in Marathi or English that enhances the design.

Include layered borders, metallic accents, foil-style effects, elegant dividers, trophy-grade ornaments, and award medallion elements where appropriate.

AWARD MATTER (include in every option with correct hierarchy):
${matter.trim()}`;
}

function buildFinalImagePrompt(matter, option) {
  const o = OPTION_THEMES[option];
  if (!o) throw new Error('Invalid option. Choose 1–5.');

  return `${CORE_RULES}

TASK: Generate ONE final production-ready trophy sticker design only — not a comparison sheet.

SELECTED DESIGN: OPTION ${option} — ${o.name}
Theme: ${o.theme}
Features: ${o.features}
Mood: ${o.mood}

Show a single vertical portrait oval trophy sticker, centered, print-ready, with all award matter rendered with perfect typography hierarchy inside the oval. Premium manufacturing quality with layered borders, metallic accents, and foil-style effects appropriate to this theme.

If award title is short, add an elegant prestige tagline.

AWARD MATTER:
${matter.trim()}`;
}

const RECOMMENDATION_SYSTEM = `You are a senior Trophy Sticker Creative Director and manufacturing consultant. You review preview sheets showing 5 trophy sticker options (OPTION 1–5) for award stickers.

Analyze the preview image and award matter. Recommend the single strongest option number (1, 2, 3, 4, or 5).

Respond in JSON only:
{"recommendedOption":1,"title":"Option name","reasons":["reason 1","reason 2","reason 3"]}

Evaluate: visibility from distance, trophy presence, manufacturing quality, Marathi/Devanagari readability if present, prestige factor, long-term appearance, and commercial sellability.`;

const SVG_SYSTEM = `You are a trophy sticker vector production specialist. Generate clean, print-ready SVG code for a vertical portrait oval trophy sticker.

Requirements:
- Proper viewBox for 90mm×65mm proportions (use viewBox="0 0 900 650")
- Organized groups with ids: border, background, ornaments, text-primary, text-secondary, text-tertiary, text-supporting
- Editable text elements (not paths) for all award matter lines
- 5% safe margin inside oval clipPath
- CorelDRAW, Illustrator, and Inkscape compatible
- Simple vector shapes for borders and ornaments; no raster embeds
- Return ONLY valid SVG markup, no markdown fences, no explanation`;

function buildSvgUserPrompt(matter, option) {
  const o = OPTION_THEMES[option];
  return `Create editable SVG for OPTION ${option} — ${o.name} (${o.theme}).
Style: ${o.features}. Mood: ${o.mood}.

Award matter with hierarchy:
${matter.trim()}`;
}

module.exports = {
  OPTION_THEMES,
  buildPreviewImagePrompt,
  buildFinalImagePrompt,
  RECOMMENDATION_SYSTEM,
  SVG_SYSTEM,
  buildSvgUserPrompt,
};
