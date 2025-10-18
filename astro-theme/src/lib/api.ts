/**
 * API client for YourNews - uses same-origin endpoints
 */

// Always use same-origin (no base URL needed)
export function getApiBase(): string {
  return '';
}

interface FetchResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface PostJSONOptions {
  timeoutMs?: number;
}

/**
 * POST JSON with timeout and error handling
 */
export async function postJSON<T = any>(
  path: string,
  body: any,
  { timeoutMs = 30000 }: PostJSONOptions = {}
): Promise<FetchResult<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return { ok: false, error: 'Request timeout' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Unknown error' };
  }
}

/**
 * Panel data structure from backend
 */
export interface Panel {
  title: string;
  summaryMd: string;
  items: Array<{
    title: string;
    url: string;
    source: string;
    pubDate?: string;
    timeAgo?: string;
  }>;
  meta?: {
    linkCount?: number;
    usedOpenAI?: boolean;
    recentWindowHours?: number;
  };
}

export interface SearchPanelsResponse {
  panels: Panel[];
}

/**
 * Search for panels
 */
export async function searchPanels(
  query: string,
  preferences?: any
): Promise<FetchResult<SearchPanelsResponse>> {
  const result = await postJSON<SearchPanelsResponse>('/api/search-panels', {
    query,
    preferences,
  });

  // Defensive validation
  if (result.ok && result.data) {
    if (!Array.isArray(result.data.panels)) {
      return {
        ok: false,
        error: 'Invalid response: missing panels array',
      };
    }
  }

  return result;
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<FetchResult> {
  try {
    const response = await fetch('/api/ai/status', {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Health check failed' };
  }
}
