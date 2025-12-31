import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {ConnectedAccountsService, SocialPlatform} from './connected-accounts.service';
import { SkipAuth } from '../auth/skip-auth.decorator';

interface ConnectAccountDto {
  platform: SocialPlatform;
  accountId?: string;
  username?: string;
}

interface ConnectedAccountsResponse {
  accounts: Array<{
    platform: SocialPlatform;
    username?: string;
    isConnected: boolean;
    accountId?: string;
    connectedAt?: string;
  }>;
}

@UseGuards(AuthGuard('jwt'))
@Controller('api/connected-accounts')
export class ConnectedAccountsController {
  constructor(private readonly connectedAccountsService: ConnectedAccountsService) {}

  /**
   * GET /api/connected-accounts/:userId
   * Fetch all connected accounts for a user
   */
  @Get(':userId')
  async getConnectedAccounts(@Req() req): Promise<ConnectedAccountsResponse> {
    const userId = req.user.userId;

    const accounts = await this.connectedAccountsService.getConnectedAccounts(userId);
    const formatted = this.connectedAccountsService.formatForFrontend(accounts);

    return {
      accounts: formatted,
    };
  }

  /**
   * POST /api/connected-accounts/:userId/connect
   * Connect a social account for a user
   * In production, this should verify OAuth tokens and retrieve account details from the social platform
   */
  @Post(':userId/connect')
  @HttpCode(200)
  async connectAccount(
    @Req() req,
    @Body() body: ConnectAccountDto
  ): Promise<{platform: SocialPlatform; isConnected: boolean; username?: string; accountId?: string}> {
    const userId = req.user.userId;
    if (!body.platform) {
      throw new BadRequestException('Platform is required');
    }

    // NOTE: In production, you would:
    // 1. Validate the OAuth token from the request headers
    // 2. Call the social platform's API to verify the token
    // 3. Retrieve the actual account ID and username from the platform
    // 4. Store the OAuth tokens securely (encrypted in DB)
    // For now, we'll accept the provided values

    const accountId = body.accountId || `${body.platform}_${Date.now()}`;
    const username = body.username || `user_${Date.now()}`;

    const connected = await this.connectedAccountsService.connectAccount(
      userId,
      body.platform,
      accountId,
      username
    );

    return {
      platform: connected.platform,
      isConnected: true,
      username: connected.username,
      accountId: connected.account_id,
    };
  }

  /**
   * DELETE /api/connected-accounts/:userId/disconnect/:platform
   * Disconnect a social account
   */
  @Delete(':userId/disconnect/:platform')
  @HttpCode(200)
  async disconnectAccount(
    @Req() req,
    @Param('platform') platform: string
  ): Promise<{success: boolean; message: string}> {
    const userId = req.user.userId;
    if (!platform) {
      throw new BadRequestException('Platform is required');
    }

    await this.connectedAccountsService.disconnectAccount(userId, platform as SocialPlatform);

    return {
      success: true,
      message: `${platform} account disconnected successfully`,
    };
  }

  /**
   * GET /api/connected-accounts/:userId/:platform
   * Check if a specific platform is connected
   */
  @Get(':userId/:platform')
  async checkConnection(
    @Req() req,
    @Param('platform') platform: string
  ): Promise<{isConnected: boolean; username?: string}> {
    const userId = req.user.userId;
    if (!platform) {
      throw new BadRequestException('Platform is required');
    }

    const account = await this.connectedAccountsService.getConnectedAccount(
      userId,
      platform as SocialPlatform
    );

    return {
      isConnected: !!account,
      username: account?.username,
    };
  }

  /**
   * GET /api/oauth/callback/:platform
   * OAuth callback endpoint - handles redirect from social platforms after user authentication
   * Social platforms redirect here with an authorization code that can be exchanged for an access token
   * Returns HTML that redirects back to the mobile app via deep linking
   */
  @SkipAuth()
  @Get('oauth/callback/:platform')
  async handleOAuthCallback(
    @Param('platform') platform: string,
    @Query('code') authCode: string,
    @Query('state') stateParam: string
  ) {
    if (!authCode) {
      throw new BadRequestException('Authorization code is required');
    }

    if (!stateParam) {
      throw new BadRequestException('State parameter is required');
    }

    try {
      // Decode the state parameter to get userId
      let state: {userId: string; platform: SocialPlatform; timestamp: number};
      try {
        // Decode base64 using Node.js Buffer (available on backend)
        const decodedStr = Buffer.from(stateParam, 'base64').toString('utf8');
        state = JSON.parse(decodedStr);
      } catch (e) {
        console.error('[OAuth] Failed to decode state:', e);
        throw new BadRequestException('Invalid state parameter');
      }

      const {userId, platform: statePlatform} = state;

      // Verify platform matches
      if (statePlatform !== platform) {
        throw new BadRequestException('Platform mismatch in state parameter');
      }

      console.log(`[OAuth] Handling callback for ${platform}, userId: ${userId}`);

      // NOTE: In production, you would:
      // 1. Exchange authCode for access_token by calling the social platform's token endpoint
      // 2. Use the access_token to fetch user account info (ID, username, profile URL, etc.)
      // 3. Store the access_token securely (encrypted) in the database for future API calls
      // 4. Return success with the account details

      // For now, we'll create a mock account connection
      // In real implementation, fetch actual account details from the platform API
      const mockAccountId = `${platform}_${Date.now()}`;
      const mockUsername = `user_${platform}`;

      // Store the connected account
      await this.connectedAccountsService.connectAccount(
        userId,
        platform as SocialPlatform,
        mockAccountId,
        mockUsername
      );

      // Return HTML that redirects back to the app via deep linking
      const deepLinkUrl = `styliq://oauth/callback/${platform}?success=true&userId=${userId}`;

      return {
        statusCode: 200,
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connecting ${platform}...</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                  max-width: 400px;
                }
                h1 {
                  color: #333;
                  margin: 0 0 10px 0;
                  font-size: 24px;
                }
                p {
                  color: #666;
                  margin: 0 0 20px 0;
                  font-size: 16px;
                }
                .success {
                  color: #4CAF50;
                  font-size: 48px;
                  margin-bottom: 20px;
                }
                a {
                  display: inline-block;
                  padding: 12px 24px;
                  background: #667eea;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  margin-top: 10px;
                  transition: background 0.3s;
                }
                a:hover {
                  background: #764ba2;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">✓</div>
                <h1>${platform.charAt(0).toUpperCase() + platform.slice(1)} Connected!</h1>
                <p>Your account has been successfully connected.</p>
                <p>Returning to StylIQ...</p>
                <a href="${deepLinkUrl}">Click here if not automatically redirected</a>
              </div>
              <script>
                // Redirect to app via deep link after 1 second
                setTimeout(() => {
                  window.location.href = "${deepLinkUrl}";
                }, 1000);
              </script>
            </body>
          </html>
        `,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OAuth] Error handling callback for ${platform}:`, errorMsg);
      throw new BadRequestException(`Failed to connect ${platform} account: ${errorMsg}`);
    }
  }
}
