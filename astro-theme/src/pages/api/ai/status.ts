/**
 * API Route: GET /api/ai/status
 * Returns OpenAI availability status
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const hasOpenAI = !!import.meta.env.OPENAI_API_KEY;

  return new Response(
    JSON.stringify({
      openai: hasOpenAI,
      news: true,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
