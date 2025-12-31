// src/utils/ssrf-protection.ts
// Shared SSRF protection utilities

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * SSRF Protection: Allowed domains for feed scraping
 */
export const ALLOWED_FEED_DOMAINS = new Set([
  'vogue.com',
  'www.vogue.com',
  'gq.com',
  'www.gq.com',
  'elle.com',
  'www.elle.com',
  'harpersbazaar.com',
  'www.harpersbazaar.com',
  'wwd.com',
  'www.wwd.com',
  'businessoffashion.com',
  'www.businessoffashion.com',
  'fashionista.com',
  'www.fashionista.com',
  'thecut.com',
  'www.thecut.com',
  'refinery29.com',
  'www.refinery29.com',
  'whowhatwear.com',
  'www.whowhatwear.com',
  'highsnobiety.com',
  'www.highsnobiety.com',
  'hypebeast.com',
  'www.hypebeast.com',
  'nymag.com',
  'www.nymag.com',
  'feeds.feedburner.com',
  'medium.com',
  'substack.com',
]);

/**
 * SSRF Protection: Allowed domains for image caching
 * Includes trusted CDNs and shopping API image sources
 */
export const ALLOWED_IMAGE_DOMAINS = new Set([
  // Google Cloud Storage
  'storage.googleapis.com',
  'storage.cloud.google.com',
  // SerpAPI thumbnails
  'serpapi.com',
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
  // Google Shopping images
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  // ASOS
  'images.asos-media.com',
  'asos-media.com',
  // Farfetch
  'cdn-images.farfetch-contents.com',
  'farfetch-contents.com',
  // Common fashion retailer CDNs
  'images.unsplash.com',
  'i.imgur.com',
  'cloudinary.com',
  'res.cloudinary.com',
  // Wikimedia (fallback placeholder)
  'upload.wikimedia.org',
]);

/**
 * Check if an IP address is private/loopback/link-local
 */
export function isPrivateIP(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1') return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return ip.startsWith('::') || ip.startsWith('fe80:');
  const [a, b] = parts;
  if (a === 127) return true; // 127.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

/**
 * Validate a URL for SSRF attacks
 * Checks: protocol, domain allowlist, DNS resolution, private IP blocking
 */
export async function validateUrlForSSRF(
  urlString: string,
  allowedDomains: Set<string>,
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new BadRequestException('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only http/https protocols allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!allowedDomains.has(hostname)) {
    throw new ForbiddenException(`Domain not in allowlist: ${hostname}`);
  }

  try {
    const { address } = await dnsLookup(hostname);
    if (isPrivateIP(address)) {
      throw new ForbiddenException('Request blocked: private IP');
    }
  } catch (err) {
    if (
      err instanceof ForbiddenException ||
      err instanceof BadRequestException
    ) {
      throw err;
    }
    throw new BadRequestException('DNS resolution failed');
  }

  return parsed;
}

/**
 * Validate a URL for SSRF with feed domain allowlist
 */
export async function validateFeedUrlForSSRF(urlString: string): Promise<URL> {
  return validateUrlForSSRF(urlString, ALLOWED_FEED_DOMAINS);
}

/**
 * Validate a URL for SSRF with image domain allowlist
 */
export async function validateImageUrlForSSRF(urlString: string): Promise<URL> {
  return validateUrlForSSRF(urlString, ALLOWED_IMAGE_DOMAINS);
}

/**
 * Safe fetch with redirect validation - validates each redirect hop
 */
export async function safeFetchWithRedirects(
  url: string,
  allowedDomains: Set<string>,
  options: RequestInit = {},
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    await validateUrlForSSRF(currentUrl, allowedDomains);
    const res = await fetch(currentUrl, { ...options, redirect: 'manual' });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) break;
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;
      continue;
    }

    return res;
  }

  throw new BadRequestException('Too many redirects');
}
