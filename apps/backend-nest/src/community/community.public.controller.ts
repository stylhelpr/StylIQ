import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CommunityService } from './community.service';
import { SkipAuth } from '../auth/skip-auth.decorator';

@SkipAuth() // Public community feed - read-only, no user-specific data exposed
@Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
@Controller('community')
export class CommunityPublicController {
  constructor(private readonly service: CommunityService) {}

  // ==================== PUBLIC FEED ====================

  @Get('posts')
  async getPosts(
    @Query('filter') filter: string = 'all',
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getPosts(
      filter,
      currentUserId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('posts/search')
  async searchPosts(
    @Query('q') query: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.service.searchPosts(query, currentUserId, parseInt(limit));
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
    @Param('id') postId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getPostById(postId, currentUserId);
  }

  // ==================== PUBLIC COMMENTS ====================

  @Get('posts/:id/comments')
  async getComments(
    @Param('id') postId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getComments(postId, currentUserId);
  }

  // ==================== PUBLIC USER PROFILE ====================

  @Get('users/:id/bio')
  async getBio(@Param('id') userId: string) {
    return this.service.getBio(userId);
  }

  @Get('users/:id/profile')
  async getUserProfile(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getUserProfile(userId, currentUserId);
  }

  @Get('users/:id/followers')
  async getFollowers(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getFollowers(userId, currentUserId);
  }

  @Get('users/:id/following')
  async getFollowing(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getFollowing(userId, currentUserId);
  }
}
