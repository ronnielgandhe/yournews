/**
 * AI-powered and fallback digest builders
 */

interface DigestResult {
  summaryMd: string;
  usedOpenAI: boolean;
}

export async function buildDigest(
  urls: string[],
  titles: { title: string; source?: string }[],
  style: 'bullets' | 'short' | 'detailed',
  useOpenAI: boolean
): Promise<DigestResult> {
  const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;

  // Try OpenAI if enabled and key available
  if (useOpenAI && OPENAI_API_KEY) {
    try {
      const prompt = buildPrompt(titles, style);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: 'You are a news explainer. Given recent article titles and sources, write what CHANGED in the last 24–72 hours: 3–5 bullets summarizing the key developments, then 1–2 sentences explaining "Why it matters". Base all points on the provided articles only. Be concise and factual.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const summaryMd = data.choices?.[0]?.message?.content || fallbackBullets(titles);
        return { summaryMd, usedOpenAI: true };
      }
    } catch (error) {
      console.error('OpenAI digest error:', error);
    }
  }

  // Fallback: bullet list of titles
  return {
    summaryMd: fallbackBullets(titles),
    usedOpenAI: false,
  };
}

function buildPrompt(titles: { title: string; source?: string }[], style: string): string {
  const articleList = titles
    .slice(0, 12)
    .map((t, i) => `${i + 1}. "${t.title}" (${t.source || 'Source unknown'})`)
    .join('\n');

  const styleHint = style === 'detailed' 
    ? 'Provide detailed analysis with context.' 
    : style === 'short'
    ? 'Keep it concise, 3-4 bullets max.'
    : 'Medium detail, 4-5 bullets.';

  return `Recent news articles:\n${articleList}\n\n${styleHint}\n\nSummarize what changed recently and why it matters.`;
}

function fallbackBullets(titles: { title: string; source?: string }[]): string {
  const bullets = titles
    .slice(0, 7)
    .map(t => `- **${t.title}** (${t.source || 'Unknown source'})`)
    .join('\n');

  return `## Recent Headlines\n\n${bullets}\n\n*AI summarization unavailable - showing top headlines.*`;
}
