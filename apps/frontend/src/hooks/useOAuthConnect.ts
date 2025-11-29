import {useState, useCallback} from 'react';
import {Linking} from 'react-native';
import {API_BASE_URL} from '../config/api';
import {SocialPlatform} from '../../../../store/connectedAccountsStore';
import {encodeBase64} from '../utils/base64';

interface OAuthConfig {
  platform: SocialPlatform;
  clientId: string;
  scope: string;
  authUrl: string;
  tokenUrl?: string;
}

// OAuth configurations for each platform
// These require you to register your app with each social platform and get credentials
const OAUTH_CONFIGS: Record<SocialPlatform, OAuthConfig> = {
  instagram: {
    platform: 'instagram',
    clientId: process.env.INSTAGRAM_CLIENT_ID || '',
    scope: 'user_profile,user_media',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://graph.instagram.com/v18.0/access_token',
  },
  tiktok: {
    platform: 'tiktok',
    clientId: process.env.TIKTOK_CLIENT_ID || '',
    scope: 'user.info.basic,user.info.profile',
    authUrl: 'https://www.tiktok.com/v1/oauth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v1/oauth/token',
  },
  pinterest: {
    platform: 'pinterest',
    clientId: process.env.PINTEREST_CLIENT_ID || '',
    scope: 'user_accounts:read,pins:read',
    authUrl: 'https://api.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v1/oauth/token',
  },
  threads: {
    platform: 'threads',
    clientId: process.env.THREADS_CLIENT_ID || '',
    scope: 'threads_basic,threads_content_publish',
    authUrl: 'https://threads.net/oauth/authorize',
  },
  twitter: {
    platform: 'twitter',
    clientId: process.env.TWITTER_CLIENT_ID || '',
    scope: 'tweet.read,users.read,follows.manage',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://twitter.com/2/oauth2/token',
  },
  facebook: {
    platform: 'facebook',
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    scope: 'public_profile,user_friends',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  },
  linkedin: {
    platform: 'linkedin',
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    scope: 'r_liteprofile,r_emailaddress',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
};

interface OAuthConnectState {
  loading: boolean;
  error: string | null;
}

export const useOAuthConnect = () => {
  const [state, setState] = useState<OAuthConnectState>({
    loading: false,
    error: null,
  });

  /**
   * Generate OAuth authorization URL for a platform
   * This is the first step in OAuth flow - redirect user to this URL
   */
  const buildOAuthUrl = useCallback(
    (platform: SocialPlatform, userId: string): string => {
      const config = OAUTH_CONFIGS[platform];

      // Allow empty clientId for demo/testing purposes
      // In production, you must have valid client IDs
      if (!config.clientId) {
        console.warn(
          `[OAuth] ${platform} OAuth client ID not configured. Please set ${platform.toUpperCase()}_CLIENT_ID in your .env file.`
        );
        // For testing, we'll still allow the flow to proceed
        // In production, throw an error instead
      }

      // Use backend to handle the OAuth callback
      const redirectUri = `${API_BASE_URL}/api/oauth/callback/${platform}`;
      const stateObj = {userId, platform, timestamp: Date.now()};
      const state = encodeBase64(JSON.stringify(stateObj));

      // Use actual client ID or a test placeholder
      const clientId = config.clientId || `test_${platform}_client_id`;

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
        // Platform-specific params
        ...(platform === 'instagram' && {response_type: 'code'}),
        ...(platform === 'tiktok' && {client_key: clientId}),
        ...(platform === 'twitter' && {code_challenge: 'challenge', code_challenge_method: 'plain'}),
      });

      return `${config.authUrl}?${params.toString()}`;
    },
    []
  );

  /**
   * Initiate OAuth flow by opening the authorization URL
   * User will authenticate with the social platform and be redirected back
   */
  const initiateOAuthFlow = useCallback(
    async (platform: SocialPlatform, userId: string): Promise<boolean> => {
      setState({loading: true, error: null});

      try {
        const oauthUrl = buildOAuthUrl(platform, userId);

        console.log(`[OAuth] Opening ${platform} OAuth URL`);

        // Check if URL can be opened
        const canOpen = await Linking.canOpenURL(oauthUrl);
        if (!canOpen) {
          throw new Error(`Cannot open OAuth URL for ${platform}`);
        }

        // Open the OAuth URL in native browser
        await Linking.openURL(oauthUrl);

        // Note: After user authenticates:
        // 1. They'll be redirected to /api/oauth/callback/{platform}
        // 2. Backend exchanges auth code for access token
        // 3. Backend fetches user account info from social platform API
        // 4. Backend stores connected account and returns success
        // 5. App can use deep linking to detect when user returns
        //    and then fetch updated accounts list

        setState({loading: false, error: null});
        return true;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[OAuth] Error for ${platform}:`, errorMsg);
        setState({loading: false, error: errorMsg});
        return false;
      }
    },
    [buildOAuthUrl]
  );

  return {
    ...state,
    initiateOAuthFlow,
    buildOAuthUrl,
  };
};
