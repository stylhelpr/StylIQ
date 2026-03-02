import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from '../auth/types/auth-user';
import { BrowserSyncService } from './browser-sync.service';
import {
  SyncRequestDto,
  SyncResponseDto,
  DeleteBookmarkDto,
} from './dto/sync.dto';

@Controller('browser-sync')
@UseGuards(AuthGuard('jwt'))
export class BrowserSyncController {
  constructor(private readonly browserSyncService: BrowserSyncService) {}

  /**
   * GET /browser-sync
   * Full sync - returns all bookmarks, history, collections for the user
   * Use on first app open or when local data is missing
   */
  @Get()
  async getFullSync(
    @Request() req: AuthenticatedRequest,
  ): Promise<SyncResponseDto> {
    const userId = req.user.userId;
    return this.browserSyncService.getFullSync(userId);
  }

  /**
   * GET /browser-sync/delta?since=<timestamp>
   * Delta sync - returns only changes since the given timestamp
   * Use for subsequent syncs to minimize data transfer
   */
  @Get('delta')
  async getDeltaSync(
    @Request() req: AuthenticatedRequest,
    @Query('since') since: string,
  ): Promise<SyncResponseDto> {
    const userId = req.user.userId;
    const timestamp = parseInt(since, 10);

    if (isNaN(timestamp) || timestamp < 0) {
      // Fall back to full sync if invalid timestamp
      return this.browserSyncService.getFullSync(userId);
    }

    return this.browserSyncService.getDeltaSync(userId, timestamp);
  }

  /**
   * POST /browser-sync
   * Push local changes to server
   * Accepts bookmarks, history, collections, and deletion lists
   * Returns full updated state after processing
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async pushSync(
    @Request() req: AuthenticatedRequest,
    @Body() data: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    const userId = req.user.userId;
    return this.browserSyncService.pushSync(userId, data);
  }

  /**
   * DELETE /browser-sync/bookmark
   * Delete a single bookmark by URL
   * More reliable than ID-based deletion for client sync
   */
  @Delete('bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBookmark(
    @Request() req: AuthenticatedRequest,
    @Body() data: DeleteBookmarkDto,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.browserSyncService.deleteBookmarkByUrl(userId, data.url);
  }

  /**
   * DELETE /browser-sync/history
   * Clear all browsing history for the user
   */
  @Delete('history')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearHistory(@Request() req: AuthenticatedRequest): Promise<void> {
    const userId = req.user.userId;
    await this.browserSyncService.clearHistory(userId);
  }

  /**
   * ✅ FIX #4: GDPR DELETE - DELETE /browser-sync/analytics
   * Comprehensive data deletion covering ALL analytics tables
   * Clears: history, bookmarks, interactions, time_to_action, cart_history, collections, tabs, etc.
   * Matches the UI claim: "Delete My Data"
   */
  @Delete('analytics')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllAnalytics(
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.browserSyncService.deleteAllAnalytics(userId);
  }
}
