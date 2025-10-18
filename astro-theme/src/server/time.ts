/**
 * Time utilities for news recency calculations
 */

export function timeAgo(pubDate: string | undefined): string {
  if (!pubDate) return '';
  const seconds = Math.floor((Date.now() - new Date(pubDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function isRecent(pubDate: string | undefined, hours: number): boolean {
  if (!pubDate) return false;
  const ageMs = Date.now() - new Date(pubDate).getTime();
  return ageMs < hours * 3600 * 1000;
}
