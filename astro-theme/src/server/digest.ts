/**
 * AI-powered and fallback digest builders
 */

interface DigestResult {
  summaryMd: string;
  usedOpenAI: boolean;
}

interface StructuredDigestResult {
  insights: string[];
  tags: string[];
  summaryMd: string;
  usedOpenAI: boolean;
}

export async function buildDigestStructured(
  urls: string[],
  titles: { title: string; source?: string }[],
  style: 'bullets' | 'short' | 'detailed',
  useOpenAI: boolean,
  windowHours: number = 72
): Promise<StructuredDigestResult> {
  const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;

  // Try OpenAI if enabled and key available
  if (useOpenAI && OPENAI_API_KEY) {
    try {
      const articleList = titles.slice(0, 12).map((t, i) => ({
        title: t.title,
        source: t.source || 'Unknown',
      }));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a news explainer. Given recent article titles and sources, produce a concise, factual digest. Return ONLY valid JSON with these exact keys: "insights" (array of 3-5 short strings, each max 18 words, describing concrete changes), "tags" (array of 3-6 hashtag-style strings like "#Ukraine" or "#ClimatePolicy"), "summaryMd" (markdown string with 3-5 bullets on what changed, then a **Why it matters** section with 1-2 sentences).',
            },
            {
              role: 'user',
              content: JSON.stringify({
                articles: articleList,
                style: style,
                windowHours: windowHours,
              }),
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          try {
            const parsed = JSON.parse(content);
            
            // Validate and clean the response
            const insights = (Array.isArray(parsed.insights) ? parsed.insights : [])
              .slice(0, 5)
              .map((s: any) => String(s).slice(0, 150));
            
            const tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
              .slice(0, 6)
              .map((s: any) => {
                const tag = String(s).slice(0, 24);
                return tag.startsWith('#') ? tag : `#${tag}`;
              });
            
            let summaryMd = String(parsed.summaryMd || '').trim();
            // Strip top-level heading if present
            summaryMd = summaryMd.replace(/^#\s+[^\n]+\n+/, '');
            
            if (insights.length > 0 && summaryMd) {
              return { insights, tags, summaryMd, usedOpenAI: true };
            }
          } catch (parseError) {
            console.error('[digest] JSON parse error:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('[digest] OpenAI error:', error);
    }
  }

  // Fallback: derive insights and tags from titles
  return fallbackStructured(titles);
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

function fallbackStructured(titles: { title: string; source?: string }[]): StructuredDigestResult {
  // Derive insights from top titles (rewrite as "change" statements)
  const insights = titles
    .slice(0, 4)
    .map(t => t.title.slice(0, 100))
    .map(t => t.endsWith('.') ? t : `${t}.`);

  // Derive tags from sources and capitalized tokens
  const tagSet = new Set<string>();
  
  // Add source domains as tags
  titles.slice(0, 6).forEach(t => {
    if (t.source) {
      const domain = t.source.replace(/^www\./, '').split('.')[0];
      if (domain.length > 2) {
        tagSet.add(`#${domain.charAt(0).toUpperCase()}${domain.slice(1)}`);
      }
    }
  });

  // Extract capitalized words (potential entities)
  const allText = titles.slice(0, 6).map(t => t.title).join(' ');
  const capitalizedWords = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  capitalizedWords.slice(0, 4).forEach(word => {
    if (word.length > 2 && word.length < 20) {
      tagSet.add(`#${word.replace(/\s+/g, '')}`);
    }
  });

  const tags = Array.from(tagSet).slice(0, 6);

  // Build markdown summary
  const bullets = titles
    .slice(0, 5)
    .map(t => `- ${t.title}`)
    .join('\n');

  const summaryMd = `${bullets}\n\n**Why it matters:** These are the latest developments based on recent coverage.`;

  return {
    insights: insights.length > 0 ? insights : ['Recent news updates available.'],
    tags: tags.length > 0 ? tags : ['#News'],
    summaryMd,
    usedOpenAI: false,
  };
}
