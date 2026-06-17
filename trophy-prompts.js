const OPTION_THEMES = {
  1: {
    name: 'Premium University Gold',
    theme: 'Elite Academic Excellence',
    features: 'Rich gold border, university seal crest area at top, gold foil appearance, ivory parchment background, laurel wreaths, open book with quill at bottom',
    mood: 'Convocation Award',
  },
  2: {
    name: 'Royal Blue Excellence',
    theme: 'National Level Recognition',
    features: 'Royal blue gradient, metallic gold accents, swirling gold ribbons, quill in inkwell, musical staff ornaments',
    mood: 'State Award',
  },
  3: {
    name: 'Literary Poetry Theme',
    theme: 'Poetry and Literature',
    features: 'Warm parchment background, watercolor splashes, open book with knowledge flame, feather quill, literary crest ornaments',
    mood: 'Poet Recognition',
  },
  4: {
    name: 'Maharashtrian Cultural Theme',
    theme: 'Traditional Maharashtra',
    features: 'Warli inspired motifs, saffron-maroon gradient, traditional borders, cultural ornamentation, ceremonial medallion',
    mood: 'Cultural Excellence Award',
  },
  5: {
    name: 'Ultra Luxury Trophy Theme',
    theme: 'Premium Trophy Product',
    features: 'Solid black background, polished gold lines, vintage microphone, open book with gold quill, soundwave gold accents',
    mood: 'High-End Trophy Manufacturer Edition',
  },
};

const NO_TEXT_RULE = `CRITICAL — NO TEXT RULE:
Do NOT render ANY text, letters, numbers, words, Devanagari script, Hindi, Marathi, English, or gibberish characters anywhere in the image.
Leave clean empty zones for text overlay:
- Top 20%: blank cream or subtle area for institution names (small circular seal/logo placeholders allowed but no text)
- Center 35%: clear banner or open area for large award title
- Mid section: blank ribbon or space for event level
- Bottom 15%: clear area for year between laurel wreaths or ornaments
All typography will be added separately — the image must be decoration and layout ONLY.`;

const CORE_RULES = `You are a world-class Trophy Sticker background artist. Create premium commercially manufacturable trophy sticker VISUALS only.

PRINT: Suitable for UV, vinyl, and trophy manufacturing at 90mm×65mm and 100mm×75mm.

QUALITY: Ultra-premium photorealistic 3D trophy product render. Studio lighting with soft specular highlights on gold metal. Deep rich gradients (navy-to-cream, royal blue, or warm parchment). Embossed layered gold borders with realistic metallic reflection. Decorative ornaments: laurel wreaths, open books, fountain pens, quills, ribbons, medallions. Professional trophy manufacturer catalog quality — like a ₹500+ commercial award sticker.

${NO_TEXT_RULE}`;

function buildShapeRules(shapeProfile) {
  if (!shapeProfile) {
    return `MANDATORY SHAPE: Vertical portrait oval only — tall oval like professional trophy stickers. Thick polished metallic gold frame. NOT horizontal, circular, shield, or rectangle. 5% safe margin inside oval.`;
  }

  return `MANDATORY SHAPE (from uploaded trophy base — match exactly):
- Shape: ${shapeProfile.shape || 'custom'}
- Orientation: ${shapeProfile.orientation || 'portrait'}
- Aspect ratio: ${shapeProfile.aspectRatio || 'match reference'}
- Border: ${shapeProfile.borderDescription || 'preserve uploaded border'}
- Inner panel: ${shapeProfile.innerAreaDescription || 'decorate inside only'}
- Guidance: ${shapeProfile.designGuidance || 'Follow the uploaded silhouette precisely.'}
Preserve the exact outer silhouette of the uploaded trophy base. Decorate only inside the inner printable area. Leave top-center space clear for a circular logo/photo overlay.`;
}

function buildVisualOnlyPrompt(option, shapeProfile = null, hasPhoto = false, layout = 'sticker') {
  if (layout === 'certificate') {
    return buildCertificateVisualPrompt(shapeProfile);
  }

  const o = OPTION_THEMES[option];
  const shapeRules = buildShapeRules(shapeProfile);
  const photoNote = hasPhoto
    ? '\nLeave a clear circular zone at top-center (about 16% width) for a logo/photo — no decoration overlapping that area.'
    : '';

  return `${CORE_RULES}

${shapeRules}${photoNote}

TASK: Generate ONE single trophy sticker BACKGROUND — centered, filling the frame. No comparison sheet, no multiple designs.

DESIGN THEME: ${o.name}
Theme: ${o.theme}
Visual features: ${o.features}
Mood: ${o.mood}

Composition: Single vertical portrait oval centered on dark neutral background. Thick polished gold oval frame with 3D depth. Inner design uses rich gradients and ornamental details at top and bottom thirds. Middle third must stay relatively clean/open for text overlay banners. Bottom: decorative book, quill, or laurel wreath. Top: ornamental crest area (leave center-top clear for logo).

Photorealistic trophy manufacturer product shot. Decorative elements only — absolutely zero text or letter-like shapes.`;
}

function buildCertificateVisualPrompt(shapeProfile) {
  const shapeNote = shapeProfile
    ? `Match uploaded base shape: ${shapeProfile.shape}. ${shapeProfile.designGuidance}`
    : `Layout: Large vertical OVAL frame on top (70% height) connected to smaller RECTANGLE frame below (30% height) — classic Indian award certificate / सन्मानचिन्ह plaque layout.`;

  return `Create a premium Marathi award certificate BACKGROUND template — visuals only, NO TEXT.

${shapeNote}

STYLE (match professional trophy-shop certificate templates):
- Clean white or cream background — NOT dark, NOT blue gradient
- Thin double-line GOLD borders on both oval and rectangle
- Ornamental gold filigree flourishes at top of oval and between oval and rectangle
- Small gold diamond divider lines between text zones (decorative only, no letters)
- Elegant, formal, minimal — like a physical wooden/acrylic plaque
- NO open books, NO quills, NO flames, NO microphones, NO watercolor
- NO 3D objects in center — keep center area clean/open for text overlay
- NO Devanagari, NO Hindi, NO English, NO numbers, NO gibberish characters anywhere

Leave open blank zones:
- Top of oval: header institution name area
- Center of oval: large title area (सन्मानचिन्ह size)
- Lower oval: 4 lines of body/citation text area
- Bottom rectangle: presenter organization name area

Print-ready, symmetrical, centered, professional certificate template.`;
}

function buildPreviewSheetPrompt() {
  const optionBlocks = Object.entries(OPTION_THEMES).map(([num, o]) =>
    `Oval ${num} — ${o.name}: ${o.theme}. ${o.features}.`
  ).join('\n');

  return `${CORE_RULES}

TASK: Generate ONE preview presentation image showing five vertical portrait oval trophy sticker backgrounds in a horizontal row.

Below each oval only the English labels "OPTION 1", "OPTION 2", "OPTION 3", "OPTION 4", "OPTION 5" in plain sans-serif outside the ovals.

Inside each oval: decoration and layout only — NO award text, NO Devanagari, NO institution names, NO year numbers inside the ovals.

Five completely different visual themes:
${optionBlocks}

Photorealistic premium trophy manufacturer presentation on dark background.`;
}

function buildFinalImagePrompt(option) {
  return buildVisualOnlyPrompt(option);
}

const RECOMMENDATION_SYSTEM = `You are a senior Trophy Sticker Creative Director. Review trophy sticker design previews (OPTION 1–5) and recommend the strongest option.

Respond in JSON only:
{"recommendedOption":1,"title":"Option name","reasons":["reason 1","reason 2","reason 3"]}

Evaluate: visual impact from distance, trophy presence, manufacturing quality, prestige factor, and commercial sellability. Text is added separately so ignore missing text.`;

const SVG_SYSTEM = `You are a trophy sticker vector production specialist. Generate clean, print-ready SVG for a vertical portrait oval trophy sticker.

Requirements:
- viewBox="0 0 900 650"
- Use font-family="Noto Sans Devanagari, sans-serif" on all text elements
- Groups: border, background, ornaments, text-primary, text-secondary, text-tertiary, text-supporting
- Editable <text> elements (not paths) for all award matter
- Oval clipPath with 5% safe margin
- Return ONLY valid SVG markup, no markdown`;

function buildSvgUserPrompt(matter, option) {
  const o = OPTION_THEMES[option];
  return `Create editable SVG for OPTION ${option} — ${o.name} (${o.theme}).
Style: ${o.features}. Use Noto Sans Devanagari for all text.

Award matter:
${matter.trim()}`;
}

module.exports = {
  OPTION_THEMES,
  buildVisualOnlyPrompt,
  buildCertificateVisualPrompt,
  buildPreviewSheetPrompt,
  buildPreviewImagePrompt: buildPreviewSheetPrompt,
  buildFinalImagePrompt,
  RECOMMENDATION_SYSTEM,
  SVG_SYSTEM,
  buildSvgUserPrompt,
};
