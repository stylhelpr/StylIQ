/**
 * Shared Utilities for Store Layer
 *
 * These utilities are used by Zustand stores and must be pure TypeScript
 * with no React Native dependencies beyond what's available in the store context.
 *
 * @security This file contains security-critical functions. Changes require review.
 */

/**
 * Sanitizes a URL for analytics storage by removing query params and hash.
 * This is critical for privacy - we strip tracking parameters, UTM codes, etc.
 *
 * @param url - Raw URL from the page
 * @returns Canonical URL without query params or hash, or empty string if invalid
 *
 * @example
 * sanitizeUrlForAnalytics('https://shop.com/product?email=user@test.com&utm_source=fb')
 * // Returns: 'https://shop.com/product'
 */
export function sanitizeUrlForAnalytics(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    // Return only scheme + hostname + pathname (no query, no hash)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    // Fallback: regex-based extraction
    const match = url.match(/^(https?:\/\/[^/?#]+(?:\/[^?#]*)?)/);
    return match ? match[1] : '';
  }
}
