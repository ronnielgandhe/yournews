// Lightweight OpenAI helper with conservative fallbacks.
// Exports functions used by the feature flags: aiSuggestQueries, aiBuildDigest, aiExtractEntities, aiBuildTimeline,
// aiCompareCoverage, aiSummarizeAtLevel, aiBiasLens.

import fetch from 'node-fetch';

type ArticleNormalized = {
  id: string;
  title: string;
  url: string;
  source: { name: string; domain: string; favicon?: string };
  publishedAt: string; // ISO
  summary: string;
};

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '' ? process.env.OPENAI_API_KEY : undefined;

async function _callOpenAI(systemPrompt: string, userPrompt: string, timeoutMs = 20000): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    // No key: deterministic fallback
    return Promise.resolve('');
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.2
      }),
      signal: controller.signal
    });

    clearTimeout(id);
    if (!res.ok) {
      console.error('OpenAI call failed', res.status, await res.text());
      return '';
    }
    const j = await res.json();
    const msg = j?.choices?.[0]?.message?.content || '';
    return String(msg);
  } catch (e) {
    console.error('OpenAI request error (masked):', e && e.message ? e.message : e);
    return '';
  }
}

export async function aiSuggestQueries(userText: string): Promise<{ queries: string[]; intentTags: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    // naive heuristic fallback: split on 'and' and commas, trim
    const parts = userText.split(/\band\b|,|\band what's\b/i).map(p => p.trim()).filter(Boolean);
    const queries = parts.slice(0, 4);
    const intentTags = queries.map(q => (q.match(/\b(nba|sports|politics|tariff|economy)\b/i) ? (q.match(/nba|sports/i) ? 'sports' : 'politics') : 'general'));
    return { queries, intentTags };
  }

  const system = 'You are an assistant that extracts 1-4 concise search queries and intent tags from a user question.';
  const user = `Input: ${userText}\n\nReturn JSON: {"queries": [..], "intentTags": [..]}`;
  const out = await _callOpenAI(system, user);
  try {
    const m = out.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      return { queries: parsed.queries || [], intentTags: parsed.intentTags || [] };
    }
  } catch (e) {
    // fallthrough
  }
  // fallback
  return aiSuggestQueries(userText.replace(/\s+/g, ' '));
}

export async function aiBuildDigest(input: { query: string; articles: ArticleNormalized[] }): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    // Simple fallback: build a markdown list of titles + URLs
    const lines = [`# Digest: ${input.query}`, ''];
    for (const a of input.articles.slice(0, 10)) {
      lines.push(`- [${a.title}](${a.url}) — ${a.source.name}`);
    }
    return lines.join('\n');
  }
  const system = `You are a concise news editor. Produce a helpful markdown digest for the query: ${input.query}`;
  const user = `Articles:\n${input.articles.map(a => `- ${a.title} | ${a.url} | ${a.source.name} | ${a.publishedAt} | ${a.summary}`).join('\n')}\n\nReturn markdown.`;
  const out = await _callOpenAI(system, user);
  return out || '';
}

export async function aiExtractEntities(articles: ArticleNormalized[]) {
  if (!process.env.OPENAI_API_KEY) {
    return { entities: [] };
  }
  const system = 'Extract named entities from the articles and return JSON: {entities: [{name, type}] } where type is person|org|place|event.';
  const user = `Articles:\n${articles.map(a => `${a.title} — ${a.summary}`).join('\n')}`;
  const out = await _callOpenAI(system, user);
  try {
    const m = out.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (e) {}
  return { entities: [] };
}

export async function aiBuildTimeline(articles: ArticleNormalized[]) {
  // fallback groups by day
  if (!process.env.OPENAI_API_KEY) {
    const buckets: { startISO: string; endISO: string; titles: string[] }[] = [];
    const map = new Map<string, string[]>();
    for (const a of articles) {
      const day = a.publishedAt.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(a.title);
    }
    for (const [day, titles] of map.entries()) {
      buckets.push({ startISO: day + 'T00:00:00Z', endISO: day + 'T23:59:59Z', titles });
    }
    return { buckets };
  }
  const system = 'Given article dates and titles, return buckets grouping them into date ranges as JSON.';
  const user = `Articles:\n${articles.map(a => `${a.publishedAt} | ${a.title}`).join('\n')}`;
  const out = await _callOpenAI(system, user);
  try { const m = out.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (e) {}
  return { buckets: [] };
}

export async function aiCompareCoverage(groups: { label: string; articles: ArticleNormalized[] }[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return groups.map(g => `## ${g.label}\n${g.articles.slice(0,3).map(a => `- ${a.title}`).join('\n')}`).join('\n\n');
  }
  const system = 'Compare coverage between groups and return a concise markdown difference summary.';
  const user = `Groups:\n${groups.map(g => `${g.label}: ${g.articles.map(a=>a.title).join('; ')}`).join('\n')}`;
  const out = await _callOpenAI(system, user);
  return out || '';
}

export async function aiSummarizeAtLevel(digestMd: string, level: 'tldr'|'student'|'expert') {
  if (!process.env.OPENAI_API_KEY) return digestMd;
  const system = `Summarize the following markdown for the audience: ${level}`;
  const user = `Digest:\n${digestMd}`;
  const out = await _callOpenAI(system, user);
  return out || digestMd;
}

export async function aiBiasLens(articles: ArticleNormalized[]) {
  if (!process.env.OPENAI_API_KEY) return { leftRight: 'unknown', sensationalism: 0, subjectivity: 0, note: '' };
  const system = 'Analyze bias and return JSON: {leftRight, sensationalism: 0-1, subjectivity:0-1, note}';
  const user = `Articles:\n${articles.map(a=>`${a.title} — ${a.summary}`).join('\n')}`;
  const out = await _callOpenAI(system, user);
  try { const m = out.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (e) {}
  return { leftRight: 'unknown', sensationalism: 0, subjectivity: 0, note: '' };
}

export type { ArticleNormalized };
