/**
 * Environment variable validation using Zod
 * Ensures type-safe access to configuration
 */

import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  PUBLIC_API_BASE: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validated environment variables
 * Access via `env.OPENAI_API_KEY` instead of `import.meta.env.OPENAI_API_KEY`
 */
const result = EnvSchema.safeParse({
  OPENAI_API_KEY: import.meta.env.OPENAI_API_KEY,
  PUBLIC_API_BASE: import.meta.env.PUBLIC_API_BASE,
});

if (!result.success) {
  console.warn('[YN env] Environment validation failed:', result.error.format());
}

export const env: Env = result.success ? result.data : {};

/**
 * Check if OpenAI is configured and available
 */
export function isOpenAIAvailable(): boolean {
  return !!env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 0;
}
