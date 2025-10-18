/**
 * AI-powered and fallback digest builders
 */

interface DigestResult {
  summaryMd: string;
  usedOpenAI: boolean;
}

interface StructuredDigestResult {
  insights: string[];
  takeaways?: string[];
  actions?: string[];
  watch?: string[];
  tags: string[];
  summaryMd: string;
  usedOpenAI: boolean;
}

export async function buildDigestStructured(
  urls: string[],
  titles: { title: string; source?: string }[],
  summaryLevel: 'short' | 'medium' | 'long',
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

      // Adjust prompt based on summary level
      let systemPrompt = 'You are a sober news analyst. Be precise, recent, non-hype. No invented facts. Given article titles and sources, write JSON ONLY with keys: insights, takeaways, actions, watch, tags. ';
      
      if (summaryLevel === 'short') {
        systemPrompt += 'Insights: 2-3 concrete changes (1 sentence each). Takeaways: 2 bullets. Actions: 2-3 bullets. Watch: 2-3 bullets. Tags: 3-5 hashtags.';
      } else if (summaryLevel === 'medium') {
        systemPrompt += 'Insights: 3-5 concrete changes (1-2 sentences each). Takeaways: 3 bullets. Actions: 3-4 bullets. Watch: 3-4 bullets. Tags: 5-6 hashtags.';
      } else { // long
        systemPrompt += 'Insights: 5-7 concrete changes with context (2-3 sentences each). Takeaways: 4-5 bullets with details. Actions: 5-6 specific steps. Watch: 5-6 specific triggers. Tags: 6-8 hashtags.';
      }

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
              content: systemPrompt,
            },
            {
              role: 'user',
              content: JSON.stringify({
                articles: articleList,
                summaryLevel: summaryLevel,
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
              .slice(0, 6)
              .map((s: any) => String(s).slice(0, 150));
            
            const takeaways = (Array.isArray(parsed.takeaways) ? parsed.takeaways : [])
              .slice(0, 4)
              .map((s: any) => String(s).slice(0, 200));
            
            const actions = (Array.isArray(parsed.actions) ? parsed.actions : [])
              .slice(0, 5)
              .map((s: any) => String(s).slice(0, 200));
            
            const watch = (Array.isArray(parsed.watch) ? parsed.watch : [])
              .slice(0, 5)
              .map((s: any) => String(s).slice(0, 150));
            
            const tags = (Array.isArray(parsed.tags) ? parsed.tags : [])
              .slice(0, 7)
              .map((s: any) => {
                const tag = String(s).slice(0, 24);
                return tag.startsWith('#') ? tag : `#${tag}`;
              });
            
            // Build summary from insights
            const summaryMd = insights.slice(0, 4).map((i: string) => `- ${i}`).join('\n') + 
              (takeaways.length > 0 ? `\n\n**Why it matters:** ${takeaways[0]}` : '');
            
            if (insights.length > 0) {
              return { 
                insights, 
                takeaways, 
                actions, 
                watch, 
                tags, 
                summaryMd, 
                usedOpenAI: true 
              };
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

  // Generic takeaways
  const takeaways = [
    'These developments may impact markets, policies, or public sentiment.',
    'Key stakeholders should monitor upcoming announcements and reactions.',
  ];

  // Generic actions
  const actions = [
    'Monitor official sources for updates and clarifications.',
    'Set alerts for related keywords to track developments.',
    'Compare coverage across multiple reputable outlets.',
  ];

  // Derive watch items from pubDates (upcoming days)
  const watch = [
    'Follow-up announcements expected in 24-48 hours.',
    'Watch for official statements and regulatory responses.',
    'Track social media and expert analysis for context.',
  ];

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
    takeaways,
    actions,
    watch,
    tags: tags.length > 0 ? tags : ['#News'],
    summaryMd,
    usedOpenAI: false,
  };
}
