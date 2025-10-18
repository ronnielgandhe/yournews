// lib/ai.ts
// Typed wrapper that re-exports the runtime CommonJS implementation in lib/ai.js.
// Keeps types for TypeScript callers while delegating runtime logic to lib/ai.js.

export interface ArticleNormalized {
  id: string;
  title: string;
  url: string;
  source: { name: string; domain: string; favicon?: string };
  publishedAt: string;
  summary: string;
}

type AiModule = {
  aiSuggestQueries: (userText: string) => Promise<{ queries: string[]; intentTags: string[] }>;
  aiBuildDigest: (input: { query: string; articles: ArticleNormalized[] }) => Promise<string>;
  aiExtractEntities: (articles: ArticleNormalized[]) => Promise<{ entities: { name: string; type: 'person'|'org'|'place'|'event' }[] }>;
  aiBuildTimeline: (articles: ArticleNormalized[]) => Promise<{ buckets: { startISO: string; endISO: string; titles: string[] }[] }>;
  aiCompareCoverage: (groups: { label: string; articles: ArticleNormalized[] }[]) => Promise<string>;
  aiSummarizeAtLevel: (digestMd: string, level: 'tldr'|'student'|'expert') => Promise<string>;
  aiBiasLens: (articles: ArticleNormalized[]) => Promise<{ leftRight: 'left'|'center'|'right'|'unknown'; sensationalism: number; subjectivity: number; note: string }>;
};

// Use require so this file works in Node and bundlers that load CommonJS
const impl: AiModule = require('./ai.js');

export const aiSuggestQueries = impl.aiSuggestQueries;
export const aiBuildDigest = impl.aiBuildDigest;
export const aiExtractEntities = impl.aiExtractEntities;
export const aiBuildTimeline = impl.aiBuildTimeline;
export const aiCompareCoverage = impl.aiCompareCoverage;
export const aiSummarizeAtLevel = impl.aiSummarizeAtLevel;
export const aiBiasLens = impl.aiBiasLens;

export default impl;
// Lightweight OpenAI helper with conservative fallbacks.
