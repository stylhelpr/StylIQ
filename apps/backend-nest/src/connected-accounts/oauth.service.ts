import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from './connected-accounts.service';

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface UserAccountInfo {
  id: string;
  username: string;
  displayName?: string;
  profileUrl?: string;
}

@Injectable()
export class OAuthService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Exchange authorization code for access token
   * Each platform has different token endpoints and parameter requirements
   */
  async exchangeCodeForToken(
    platform: SocialPlatform,
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = this.configService.get(
      `${platform.toUpperCase()}_CLIENT_ID`,
    );
    const clientSecret = this.configService.get(
      `${platform.toUpperCase()}_CLIENT_SECRET`,
    );

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth credentials not configured for ${platform}`);
    }

    const tokenEndpoints: Record<SocialPlatform, string> = {
      instagram: 'https://graph.instagram.com/v18.0/access_token',
      tiktok: 'https://open.tiktokapis.com/v1/oauth/token',
      pinterest: 'https://api.pinterest.com/v1/oauth/token',
      threads: 'https://graph.threads.net/oauth/access_token',
      twitter: 'https://twitter.com/2/oauth2/token',
      facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
      linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
    };

    const tokenUrl = tokenEndpoints[platform];

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = (await response.json()) as OAuthTokenResponse;
      return data;
    } catch (error) {
      console.error(`[OAuth] Token exchange failed for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Fetch user account information from social platform API
   * Uses the access token to get the authenticated user's details
   */
  async fetchUserAccountInfo(
    platform: SocialPlatform,
    accessToken: string,
  ): Promise<UserAccountInfo> {
    const endpoints: Record<
      SocialPlatform,
      { url: string; userField: string }
    > = {
      instagram: {
        url: 'https://graph.instagram.com/me?fields=id,username',
        userField: 'username',
      },
      tiktok: {
        url: 'https://open.tiktokapis.com/v1/user/info/?fields=open_id,display_name',
        userField: 'display_name',
      },
      pinterest: {
        url: 'https://api.pinterest.com/v1/me/?fields=id,username',
        userField: 'username',
      },
      threads: {
        url: 'https://graph.threads.net/me?fields=id,username',
        userField: 'username',
      },
      twitter: {
        url: 'https://twitter.com/2/users/me?user.fields=username',
        userField: 'username',
      },
      facebook: {
        url: 'https://graph.facebook.com/me?fields=id,name,email',
        userField: 'name',
      },
      linkedin: {
        url: 'https://api.linkedin.com/v2/me',
        userField: 'localizedFirstName',
      },
    };

    const endpoint = endpoints[platform];

    try {
      const response = await fetch(endpoint.url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id || data.open_id || data.localizedFirstName,
        username: data[endpoint.userField] || data.name || 'unknown',
        displayName: data.display_name || data.name,
        profileUrl: this.buildProfileUrl(platform, data.id || data.open_id),
      };
    } catch (error) {
      console.error(
        `[OAuth] Failed to fetch user info for ${platform}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Build user profile URL based on platform and user ID
   */
  private buildProfileUrl(platform: SocialPlatform, userId: string): string {
    const profileUrls: Record<SocialPlatform, string> = {
      instagram: `https://instagram.com/${userId}`,
      tiktok: `https://tiktok.com/@${userId}`,
      pinterest: `https://pinterest.com/${userId}`,
      threads: `https://threads.net/@${userId}`,
      twitter: `https://twitter.com/${userId}`,
      facebook: `https://facebook.com/${userId}`,
      linkedin: `https://linkedin.com/in/${userId}`,
    };

    return profileUrls[platform];
  }

  /**
   * Refresh an expired access token using refresh token
   * Not all platforms support refresh tokens
   */
  async refreshAccessToken(
    platform: SocialPlatform,
    refreshToken: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = this.configService.get(
      `${platform.toUpperCase()}_CLIENT_ID`,
    );
    const clientSecret = this.configService.get(
      `${platform.toUpperCase()}_CLIENT_SECRET`,
    );

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth credentials not configured for ${platform}`);
    }

    const tokenEndpoints: Partial<Record<SocialPlatform, string>> = {
      instagram: 'https://graph.instagram.com/v18.0/access_token',
      tiktok: 'https://open.tiktokapis.com/v1/oauth/token',
      pinterest: 'https://api.pinterest.com/v1/oauth/token',
      threads: 'https://graph.threads.net/oauth/access_token',
      twitter: 'https://twitter.com/2/oauth2/token',
      facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
    };

    const tokenUrl = tokenEndpoints[platform];
    if (!tokenUrl) {
      throw new Error(`Token refresh not supported for ${platform}`);
    }

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = (await response.json()) as OAuthTokenResponse;
      return data;
    } catch (error) {
      console.error(`[OAuth] Token refresh failed for ${platform}:`, error);
      throw error;
    }
  }
}
