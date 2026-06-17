const REFINEMENT_SYSTEM = `You interpret user feedback on a trophy/certificate design and return JSON instructions.

Current design context will be provided. Parse the user's refinement request.

Return JSON only:
{
  "summary": "Brief confirmation of what you will change (1 sentence, speak to the user)",
  "visualChanges": "Detailed instructions to add to the image generation prompt (background color, remove decorations, border style, etc.)",
  "removePhoto": false,
  "keepPhoto": true,
  "matterUpdates": {},
  "regenerateVisual": true,
  "editPrevious": false
}

Rules:
- "remove logo" / "remove photo" → removePhoto: true, keepPhoto: false
- "add logo" / "add photo" → keepPhoto: true (user must upload file separately; mention in summary if they need to upload)
- "white background" → visualChanges must say pure white/cream background, no gold fill, gold borders only
- "remove golden background" → visualChanges: white background, keep gold border lines only
- Text changes (fix title, change name) → matterUpdates with field keys: header, title, body, presenter, level, year
- editPrevious: always false — always create a brand new image, never edit the previous one
- regenerateVisual: true almost always
- Accumulate visual intent clearly in visualChanges`;

async function parseRefinement(openai, textModel, feedback, context) {
  const completion = await openai.chat.completions.create({
    model: textModel,
    messages: [
      { role: 'system', content: REFINEMENT_SYSTEM },
      {
        role: 'user',
        content: `Design context:
- Layout: ${context.layout}
- Theme: ${context.themeName || context.theme}
- Has logo/photo: ${context.hasPhoto}
- Has trophy base upload: ${context.hasTrophyBase}
- Previous refinements: ${context.refinementHistory?.length ? context.refinementHistory.join('; ') : 'none'}

Award matter:
${context.matter}

User feedback:
${feedback}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content.trim());
    return {
      summary: parsed.summary || 'Applying your changes...',
      visualChanges: parsed.visualChanges || feedback,
      removePhoto: !!parsed.removePhoto,
      keepPhoto: parsed.keepPhoto !== false,
      matterUpdates: parsed.matterUpdates || {},
      regenerateVisual: parsed.regenerateVisual !== false,
      editPrevious: parsed.editPrevious !== false,
    };
  } catch {
    return {
      summary: 'Applying your feedback...',
      visualChanges: feedback,
      removePhoto: /remove.*(logo|photo)/i.test(feedback),
      keepPhoto: !/remove.*(logo|photo)/i.test(feedback),
      matterUpdates: {},
      regenerateVisual: true,
      editPrevious: true,
    };
  }
}

function applyMatterUpdates(parsed, updates) {
  const next = { ...parsed, institutions: [...(parsed.institutions || [])] };
  for (const [key, value] of Object.entries(updates || {})) {
    if (value && key in next) next[key] = value;
  }
  return next;
}

function buildRefinementPrompt(basePrompt, refinementHistory, latestVisual) {
  const history = [...(refinementHistory || []), latestVisual].filter(Boolean);
  if (!history.length) return basePrompt;
  return `${basePrompt}

REFINEMENT INSTRUCTIONS (apply all):
${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
}

module.exports = {
  parseRefinement,
  applyMatterUpdates,
  buildRefinementPrompt,
};
