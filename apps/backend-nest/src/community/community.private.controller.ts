import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedRequest } from '../auth/types/auth-user';
import { CommunityService } from './community.service';
import { CommunityRecommendationsService } from './community-recommendations.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateBioDto } from './dto/update-bio.dto';
import { ReportPostDto } from './dto/report-post.dto';

@Controller('community')
@UseGuards(AuthGuard('jwt'))
export class CommunityPrivateController {
  constructor(
    private readonly service: CommunityService,
    private readonly recommendations: CommunityRecommendationsService,
  ) {}

  // ==================== POSTS ====================

  @Post('posts')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createPost(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreatePostDto,
  ) {
    const actorId = req.user.userId;
    return this.service.createPost(actorId, {
      imageUrl: dto.imageUrl,
      topImage: dto.topImage,
      bottomImage: dto.bottomImage,
      shoesImage: dto.shoesImage,
      accessoryImage: dto.accessoryImage,
      name: dto.name,
      description: dto.description,
      tags: dto.tags,
    });
  }

  @Get('posts/saved')
  async getSavedPosts(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    const actorId = req.user.userId;
    return this.service.getSavedPosts(
      actorId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Delete('posts/:id')
  async deletePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.deletePost(postId, actorId);
  }

  @Patch('posts/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updatePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    const actorId = req.user.userId;
    return this.service.updatePost(
      postId,
      actorId,
      dto.name,
      dto.description,
      dto.tags,
    );
  }

  // ==================== LIKES ====================

  @Post('posts/:id/like')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async likePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.likePost(postId, actorId);
  }

  @Delete('posts/:id/like')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async unlikePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unlikePost(postId, actorId);
  }

  // ==================== COMMENTS ====================

  @Post('posts/:id/comments')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async addComment(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const actorId = req.user.userId;
    return this.service.addComment(
      postId,
      actorId,
      dto.content,
      dto.replyToId,
      dto.replyToUser,
    );
  }

  @Delete('posts/:postId/comments/:commentId')
  async deleteComment(
    @Request() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.deleteComment(commentId, actorId);
  }

  @Post('comments/:id/like')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async likeComment(
    @Request() req: AuthenticatedRequest,
    @Param('id') commentId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.likeComment(commentId, actorId);
  }

  @Delete('comments/:id/like')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async unlikeComment(
    @Request() req: AuthenticatedRequest,
    @Param('id') commentId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unlikeComment(commentId, actorId);
  }

  // ==================== FOLLOWS ====================

  @Post('users/:id/follow')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async followUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') followingId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.followUser(actorId, followingId);
  }

  @Delete('users/:id/follow')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async unfollowUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') followingId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unfollowUser(actorId, followingId);
  }

  // ==================== SAVES ====================

  @Post('posts/:id/save')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async savePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.savePost(actorId, postId);
  }

  @Delete('posts/:id/save')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async unsavePost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unsavePost(actorId, postId);
  }

  // ==================== BLOCK/MUTE ====================

  @Post('users/:id/block')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async blockUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') blockedId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.blockUser(actorId, blockedId);
  }

  @Delete('users/:id/block')
  async unblockUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') blockedId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unblockUser(actorId, blockedId);
  }

  @Post('users/:id/mute')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async muteUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') mutedId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.muteUser(actorId, mutedId);
  }

  @Delete('users/:id/mute')
  async unmuteUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') mutedId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.unmuteUser(actorId, mutedId);
  }

  // ==================== REPORTS ====================

  @Post('posts/:id/report')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reportPost(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: ReportPostDto,
  ) {
    const actorId = req.user.userId;
    return this.service.reportPost(actorId, postId, dto.reason);
  }

  // ==================== VIEW TRACKING ====================

  @Post('posts/:id/view')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async trackView(
    @Request() req: AuthenticatedRequest,
    @Param('id') postId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.trackView(postId, actorId);
  }

  // ==================== USER BIO ====================

  @Patch('users/:id/bio')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateBio(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() dto: UpdateBioDto,
  ) {
    const actorId = req.user.userId;
    return this.service.updateBio(userId, dto.bio, actorId);
  }

  // ==================== USER SUGGESTIONS ====================

  @Get('users/suggestions')
  async getSuggestedUsers(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit: string = '10',
  ) {
    const actorId = req.user.userId;
    return this.service.getSuggestedUsers(actorId, parseInt(limit));
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Get recommended posts for the "Recommended for You" carousel.
   * Uses signal-based ranking: following, frequently visited, hashtags, keywords, recency, engagement.
   * Returns 5-10 posts max, 1 per author.
   */
  @Get('posts/recommended')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getRecommendedPosts(@Request() req: AuthenticatedRequest) {
    const actorId = req.user.userId;
    const posts = await this.recommendations.getRecommendedPosts(actorId);
    return this.recommendations.formatPostsForResponse(posts, actorId);
  }

  /**
   * Track a profile visit (for "frequently visited" signal).
   * Called when viewing another user's profile.
   */
  @Post('users/:id/visit')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async trackProfileVisit(
    @Request() req: AuthenticatedRequest,
    @Param('id') visitedId: string,
  ) {
    const actorId = req.user.userId;
    await this.recommendations.trackProfileVisit(actorId, visitedId);
    return { success: true };
  }

  /**
   * Trigger update of user's hashtag and keyword preferences.
   * Called after likes/saves to update signal preferences.
   */
  @Post('signals/refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refreshUserSignals(@Request() req: AuthenticatedRequest) {
    const actorId = req.user.userId;
    await Promise.all([
      this.recommendations.updateHashtagPreferences(actorId),
      this.recommendations.updateKeywordPreferences(actorId),
    ]);
    return { success: true };
  }

  // ==================== GDPR DELETE ====================

  @Delete('users/:id/data')
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
  async deleteUserData(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
  ) {
    const actorId = req.user.userId;
    return this.service.deleteUserData(userId, actorId);
  }
}
