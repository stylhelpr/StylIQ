import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CommunityService } from './community.service';
import { SkipAuth } from '../auth/skip-auth.decorator';

/**
 * Resolves the effective userId for personalization.
 * SECURITY: Never trust currentUserId from query params - it enables user impersonation.
 * If authenticated, use req.user.userId. If unauthenticated, disable personalization.
 */
function resolveUserId(req: any, queryUserId?: string): string | undefined {
  // Use JWT userId if authenticated, otherwise fall back to query parameter
  return req?.user?.userId ?? queryUserId ?? undefined;
}

@SkipAuth() // Public community feed - read-only, no user-specific data exposed
@Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
@Controller('community')
export class CommunityPublicController {
  constructor(private readonly service: CommunityService) {}

  // ==================== PUBLIC FEED ====================

  @Get('posts')
  async getPosts(
    @Req() req,
    @Query('filter') filter: string = 'all',
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getPosts(
      filter,
      resolveUserId(req, currentUserId),
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('posts/search')
  async searchPosts(
    @Req() req,
    @Query('q') query: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.service.searchPosts(query, resolveUserId(req, currentUserId), parseInt(limit));
  }

  @Get('posts/by-user/:authorId')
  async getPostsByUser(
    @Param('authorId') authorId: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    return this.service.getPostsByUser(authorId, parseInt(limit), parseInt(offset));
  }

  @Get('posts/:id')
  async getPost(
    @Req() req,
    @Param('id') postId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getPostById(postId, resolveUserId(req, currentUserId));
  }

  // ==================== PUBLIC COMMENTS ====================

  @Get('posts/:id/comments')
  async getComments(
    @Req() req,
    @Param('id') postId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getComments(postId, resolveUserId(req, currentUserId));
  }

  // ==================== PUBLIC USER SEARCH ====================

  @Get('users/search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    return this.service.searchUsers(
      query || '',
      parseInt(limit),
      parseInt(offset),
    );
  }

  // ==================== PUBLIC USER PROFILE ====================

  @Get('users/:id/bio')
  async getBio(@Param('id') userId: string) {
    return this.service.getBio(userId);
  }

  @Get('users/:id/profile')
  async getUserProfile(
    @Req() req,
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getUserProfile(userId, resolveUserId(req, currentUserId));
  }

  @Get('users/:id/followers')
  async getFollowers(
    @Req() req,
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getFollowers(userId, resolveUserId(req, currentUserId));
  }

  @Get('users/:id/following')
  async getFollowing(
    @Req() req,
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getFollowing(userId, resolveUserId(req, currentUserId));
  }
}
