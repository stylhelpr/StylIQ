/**
 * Deep Link Router
 *
 * Parses deep link URLs and returns navigation targets.
 * Supports the stylhelpr:// scheme for in-app navigation.
 *
 * Supported patterns:
 * - stylhelpr://community/post/:postId
 * - stylhelpr://community/user/:userId
 * - stylhelpr://community/hashtag/:tag
 * - stylhelpr://chat/:userId
 */

export type DeepLinkTarget =
  | { screen: 'CommunityPostDetail'; params: { postId: string } }
  | { screen: 'UserProfileScreen'; params: { userId: string } }
  | { screen: 'CommunityShowcaseScreen'; params: { hashtag: string } }
  | { screen: 'ChatScreen'; params: { recipientId: string } }
  | null;

/**
 * Parses a deep link URL and returns the navigation target.
 *
 * @param url - The deep link URL to parse
 * @returns Navigation target with screen name and params, or null if unknown
 */
export function parseDeepLink(url: string | null | undefined): DeepLinkTarget {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  try {
    // Handle both stylhelpr:// and styliq:// (legacy) schemes
    // Normalize to a parseable format
    let normalizedUrl = trimmedUrl;

    // Check for our app schemes
    const isStylhelpr = trimmedUrl.toLowerCase().startsWith('stylhelpr://');
    const isStyliq = trimmedUrl.toLowerCase().startsWith('styliq://');

    if (!isStylhelpr && !isStyliq) {
      // Not a recognized deep link scheme
      return null;
    }

    // Extract path after scheme
    const schemeEnd = trimmedUrl.indexOf('://');
    if (schemeEnd === -1) {
      return null;
    }

    const pathPart = trimmedUrl.substring(schemeEnd + 3); // After "://"
    const pathSegments = pathPart.split('/').filter(Boolean);

    if (pathSegments.length === 0) {
      return null;
    }

    // Route: community/post/:postId
    if (
      pathSegments[0] === 'community' &&
      pathSegments[1] === 'post' &&
      pathSegments[2]
    ) {
      return {
        screen: 'CommunityPostDetail',
        params: { postId: pathSegments[2] },
      };
    }

    // Route: community/user/:userId
    if (
      pathSegments[0] === 'community' &&
      pathSegments[1] === 'user' &&
      pathSegments[2]
    ) {
      return {
        screen: 'UserProfileScreen',
        params: { userId: pathSegments[2] },
      };
    }

    // Route: community/hashtag/:tag
    if (
      pathSegments[0] === 'community' &&
      pathSegments[1] === 'hashtag' &&
      pathSegments[2]
    ) {
      // Decode URI component for hashtags with special chars
      const tag = decodeURIComponent(pathSegments[2]);
      return {
        screen: 'CommunityShowcaseScreen',
        params: { hashtag: tag },
      };
    }

    // Route: chat/:userId (for DM notifications)
    if (pathSegments[0] === 'chat' && pathSegments[1]) {
      return {
        screen: 'ChatScreen',
        params: { recipientId: pathSegments[1] },
      };
    }

    // Unknown route
    console.log('[DeepLink] Unknown route:', pathPart);
    return null;
  } catch (error) {
    console.warn('[DeepLink] Failed to parse URL:', url, error);
    return null;
  }
}

/**
 * Checks if a URL is a valid deep link for this app.
 *
 * @param url - The URL to check
 * @returns true if URL is a valid deep link
 */
export function isAppDeepLink(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();
  return lowerUrl.startsWith('stylhelpr://') || lowerUrl.startsWith('styliq://');
}
