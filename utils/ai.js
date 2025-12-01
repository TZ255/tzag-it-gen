const OpenAI = require('openai');

/**
 * Generate a concise itinerary overview (<=200 words) using OpenAI Responses API.
 * Falls back to a templated string if the key or request fails.
 * @param {object} payload - itinerary data with title, clientName, pax, days[]
 * @returns {Promise<string>} overview text
 */
async function generateItineraryOverview(payload = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackText(payload);

  const client = new OpenAI({ apiKey });
  const system = 'You are a concise travel copywriter. Summarize itineraries in under 200 words, neutral tone, clear English.';
  const user = buildPrompt(payload);

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions: system,
      input: user,
    });
    const content = response?.output_text;
    if (content && typeof content === 'string') return content.trim().slice(0, 750);
    return fallbackText(payload);
  } catch (err) {
    console.error('AI overview generation failed:', err?.message || err);
    return fallbackText(payload);
  }
}

function buildPrompt({ title, clientName, pax, days } = {}) {
  const paxLine = `Guests: adults ${pax?.adults || 0}, children ${pax?.children || 0}.`;
  const lines = Array.isArray(days)
    ? days
      .slice(0, 8)
      .map((d, i) => {
        const routeName = d.route?.name || d.routeName || 'TBD';
        const routeDesc = d.route?.description || '';
        const accName = d.accomodation?.name;
        const accPlace = d.route?.destination || d.route?.origin || '';
        const accLabel = accName ? ` (Stay: ${accName}${accPlace ? `, ${accPlace}` : ''})` : '';
        return `Day ${i + 1}: ${routeName} — ${routeDesc}${accLabel}`.trim();
      })
      .join('\n')
    : '';
  return [
    `Title: ${title || 'Itinerary'}`,
    clientName ? `Client: ${clientName}` : '',
    paxLine,
    'Outline:',
    lines || 'Days are to be confirmed.',
    'Write in <=200 words.',
  ]
    .filter(Boolean)
    .join('\n');
}

function fallbackText({ title, pax, days } = {}) {
  const dayCount = Array.isArray(days) ? days.length : 0;
  return `${title || 'Your safari plan'} covers ${dayCount || 'several'} day(s) with private guiding, comfortable stays, and balanced pacing. Guests: ${pax?.adults || 0} adults${pax?.children ? ` and ${pax.children} children` : ''}. Expect scenic drives, lodge overnights, and a clear day-by-day flow tailored to your preferences.`;
}

module.exports = { generateItineraryOverview };
