/**
 * Text Sanitization Utilities
 *
 * Provides functions to sanitize user-controlled text before storage or display.
 * Prevents XSS, layout injection, and display issues.
 *
 * @security This is a security-critical file. Changes require security review.
 */

/**
 * Sanitizes a page title for safe storage and display.
 * - Removes HTML tags
 * - Removes control characters
 * - Limits length to prevent layout issues
 * - Returns 'Untitled' for empty/invalid input
 *
 * @param title - Raw title from WebView page
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized title safe for storage and display
 */
export function sanitizeTitle(
  title: string | undefined | null,
  maxLength = 200,
): string {
  if (!title || typeof title !== 'string') {
    return 'Untitled';
  }

  const sanitized = title
    // Remove HTML tags (prevent XSS in any rendering context)
    .replace(/<[^>]*>/g, '')
    // Remove control characters (U+0000-U+001F, U+007F, U+0080-U+009F)
    .replace(/[\x00-\x1F\x7F\x80-\x9F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim()
    // Limit length
    .slice(0, maxLength);

  return sanitized || 'Untitled';
}

/**
 * Sanitizes a URL for safe display (NOT for navigation).
 * Blocks dangerous schemes and returns a placeholder for unsafe URLs.
 *
 * @param url - Raw URL to sanitize
 * @returns Safe URL for display, or '[blocked URL]' for dangerous schemes
 */
export function sanitizeUrlForDisplay(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const lowerUrl = url.toLowerCase().trim();

  // Block dangerous schemes
  const dangerousSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'blob:',
  ];

  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return '[blocked URL]';
    }
  }

  // Limit URL length for display
  if (url.length > 2000) {
    return url.slice(0, 2000) + '...';
  }

  return url;
}

/**
 * Sanitizes text content for safe display.
 * More permissive than title sanitization but still removes dangerous content.
 *
 * @param text - Raw text to sanitize
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Sanitized text safe for display
 */
export function sanitizeTextContent(
  text: string | undefined | null,
  maxLength = 10000,
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove null bytes and other dangerous control chars
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit length
      .slice(0, maxLength)
  );
}

/**
 * Sanitizes a domain name for display.
 *
 * @param domain - Raw domain to sanitize
 * @returns Sanitized domain or empty string
 */
export function sanitizeDomain(domain: string | undefined | null): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  // Only allow valid domain characters
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '')
    .slice(0, 253);
}

/**
 * Extracts and sanitizes domain from URL.
 *
 * @param url - URL to extract domain from
 * @returns Sanitized domain or 'unknown'
 */
export function getDomainFromUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return 'unknown';
  }

  try {
    const parsed = new URL(url);
    return sanitizeDomain(parsed.hostname) || 'unknown';
  } catch {
    // Try to extract domain with regex if URL parsing fails
    const match = url.match(/^https?:\/\/([^/?#]+)/i);
    if (match && match[1]) {
      return sanitizeDomain(match[1]) || 'unknown';
    }
    return 'unknown';
  }
}

/**
 * Sanitizes a URL for analytics storage (removes query params and hash).
 * This is critical for privacy - we strip tracking parameters, UTM codes, etc.
 *
 * @param url - Raw URL from the page
 * @returns Canonical URL without query params or hash
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
