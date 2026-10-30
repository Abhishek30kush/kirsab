/**
 * Utility for image URL handling and cache-busting
 * Ensures newly updated images appear immediately without stale browser cache
 */

export function getFreshImageUrl(url, updatedAt) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Data URLs or SVG blobs don't need query params
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // If updatedAt timestamp is provided, append as version param so browser never serves stale cached image
  if (updatedAt) {
    const time = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
    if (time && !isNaN(time)) {
      const sep = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${sep}t=${time}`;
    }
  }

  return cleanUrl;
}
