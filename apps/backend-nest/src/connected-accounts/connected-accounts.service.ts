import {Injectable, BadRequestException, NotFoundException} from '@nestjs/common';
import {DatabaseService} from '../db/database.service';

export type SocialPlatform = 'instagram' | 'tiktok' | 'pinterest' | 'threads' | 'twitter' | 'facebook' | 'linkedin';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  account_id: string;
  username: string;
  connected_at: Date;
}

@Injectable()
export class ConnectedAccountsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all connected accounts for a user
   */
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    try {
      const result = await this.db.query<ConnectedAccount>(
        `SELECT id, user_id, platform, account_id, username, connected_at
         FROM connected_accounts
         WHERE user_id = $1
         ORDER BY platform ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('[ConnectedAccounts] Error fetching accounts:', error);
      throw new BadRequestException('Failed to fetch connected accounts');
    }
  }

  /**
   * Check if a social account is connected for a user
   */
  async isConnected(userId: string, platform: SocialPlatform): Promise<boolean> {
    try {
      const result = await this.db.query(
        `SELECT id FROM connected_accounts WHERE user_id = $1 AND platform = $2 LIMIT 1`,
        [userId, platform]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('[ConnectedAccounts] Error checking connection:', error);
      return false;
    }
  }

  /**
   * Connect a social account (upsert)
   */
  async connectAccount(
    userId: string,
    platform: SocialPlatform,
    accountId: string,
    username: string
  ): Promise<ConnectedAccount> {
    try {
      // Check if already connected
      const existing = await this.db.query(
        `SELECT id FROM connected_accounts WHERE user_id = $1 AND platform = $2`,
        [userId, platform]
      );

      if (existing.rows.length > 0) {
        // Update existing connection
        const result = await this.db.query<ConnectedAccount>(
          `UPDATE connected_accounts
           SET account_id = $3, username = $4, connected_at = NOW()
           WHERE user_id = $1 AND platform = $2
           RETURNING id, user_id, platform, account_id, username, connected_at`,
          [userId, platform, accountId, username]
        );
        return result.rows[0];
      }

      // Create new connection
      const result = await this.db.query<ConnectedAccount>(
        `INSERT INTO connected_accounts (user_id, platform, account_id, username, connected_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, user_id, platform, account_id, username, connected_at`,
        [userId, platform, accountId, username]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[ConnectedAccounts] Error connecting account:', error);
      throw new BadRequestException(`Failed to connect ${platform} account`);
    }
  }

  /**
   * Disconnect a social account
   */
  async disconnectAccount(userId: string, platform: SocialPlatform): Promise<void> {
    try {
      const result = await this.db.query(
        `DELETE FROM connected_accounts WHERE user_id = $1 AND platform = $2`,
        [userId, platform]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`No connected ${platform} account found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('[ConnectedAccounts] Error disconnecting account:', error);
      throw new BadRequestException(`Failed to disconnect ${platform} account`);
    }
  }

  /**
   * Get a specific connected account
   */
  async getConnectedAccount(userId: string, platform: SocialPlatform): Promise<ConnectedAccount | null> {
    try {
      const result = await this.db.query<ConnectedAccount>(
        `SELECT id, user_id, platform, account_id, username, connected_at
         FROM connected_accounts
         WHERE user_id = $1 AND platform = $2`,
        [userId, platform]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[ConnectedAccounts] Error getting account:', error);
      return null;
    }
  }

  /**
   * Format connected accounts for frontend response
   */
  formatForFrontend(accounts: ConnectedAccount[]) {
    return accounts.map((account) => ({
      platform: account.platform,
      username: account.username,
      isConnected: true,
      accountId: account.account_id,
      connectedAt: account.connected_at.toISOString(),
    }));
  }
}
