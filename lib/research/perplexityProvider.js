const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';

export async function askPerplexity({ query, context }) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return { skipped: true, reason: 'PERPLEXITY_API_KEY 미설정' };
  }

  const model = process.env.PERPLEXITY_MODEL || 'sonar';
  const messages = [
    {
      role: 'system',
      content: 'You are a web-grounded research assistant. Return concise Korean notes with source citations when available.',
    },
    {
      role: 'user',
      content: [
        `Research query: ${query}`,
        context ? `Context:\n${context}` : '',
        'Output JSON only: {"key_findings":["..."],"source_notes":[{"title":"...","url":"...","why_useful":"..."}],"missing_context":["..."]}',
      ].filter(Boolean).join('\n\n'),
    },
  ];

  const res = await fetch(PERPLEXITY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Perplexity ${res.status}`);
  }

  const content = json.choices?.[0]?.message?.content || '';
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { key_findings: [content.slice(0, 1200)], source_notes: [], missing_context: ['JSON parse 실패'] };
  }

  return {
    skipped: false,
    model,
    key_findings: Array.isArray(parsed.key_findings) ? parsed.key_findings.filter((x) => typeof x === 'string').slice(0, 6) : [],
    source_notes: Array.isArray(parsed.source_notes)
      ? parsed.source_notes.filter((x) => x && typeof x === 'object').slice(0, 6).map((x) => ({
          title: typeof x.title === 'string' ? x.title : '',
          url: typeof x.url === 'string' ? x.url : '',
          why_useful: typeof x.why_useful === 'string' ? x.why_useful : '',
        }))
      : [],
    missing_context: Array.isArray(parsed.missing_context) ? parsed.missing_context.filter((x) => typeof x === 'string').slice(0, 5) : [],
    raw_citations: Array.isArray(json.citations) ? json.citations : [],
  };
}
