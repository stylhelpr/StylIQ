import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  // ==================== POSTS ====================

  @Post('posts')
  async createPost(
    @Body() body: {
      userId: string;
      imageUrl?: string;
      topImage?: string;
      bottomImage?: string;
      shoesImage?: string;
      accessoryImage?: string;
      description?: string;
      tags?: string[];
    },
  ) {
    return this.service.createPost(body.userId, {
      imageUrl: body.imageUrl,
      topImage: body.topImage,
      bottomImage: body.bottomImage,
      shoesImage: body.shoesImage,
      accessoryImage: body.accessoryImage,
      description: body.description,
      tags: body.tags,
    });
  }

  @Get('posts')
  async getPosts(
    @Query('filter') filter: string = 'all',
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
    @Query('userId') userId?: string,
  ) {
    return this.service.getPosts(
      filter,
      userId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('posts/search')
  async searchPosts(
    @Query('q') query: string,
    @Query('userId') userId?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.service.searchPosts(query, userId, parseInt(limit));
  }

  @Get('posts/saved')
  async getSavedPosts(
    @Query('userId') userId: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    return this.service.getSavedPosts(userId, parseInt(limit), parseInt(offset));
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
  async getPost(@Param('id') postId: string, @Query('userId') userId?: string) {
    return this.service.getPostById(postId, userId);
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') postId: string, @Query('userId') userId: string) {
    return this.service.deletePost(postId, userId);
  }

  @Patch('posts/:id')
  async updatePost(
    @Param('id') postId: string,
    @Body() body: { userId: string; title?: string; description?: string; tags?: string[] },
  ) {
    return this.service.updatePost(postId, body.userId, body.title, body.description, body.tags);
  }

  // ==================== LIKES ====================

  @Post('posts/:id/like')
  async likePost(@Param('id') postId: string, @Body('userId') userId: string) {
    return this.service.likePost(postId, userId);
  }

  @Delete('posts/:id/like')
  async unlikePost(@Param('id') postId: string, @Query('userId') userId: string) {
    return this.service.unlikePost(postId, userId);
  }

  // ==================== COMMENTS ====================

  @Get('posts/:id/comments')
  async getComments(
    @Param('id') postId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.getComments(postId, userId);
  }

  @Post('posts/:id/comments')
  async addComment(
    @Param('id') postId: string,
    @Body() body: { userId: string; content: string; replyToId?: string; replyToUser?: string },
  ) {
    return this.service.addComment(
      postId,
      body.userId,
      body.content,
      body.replyToId,
      body.replyToUser,
    );
  }

  @Delete('posts/:postId/comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Query('userId') userId: string,
  ) {
    return this.service.deleteComment(commentId, userId);
  }

  @Post('comments/:id/like')
  async likeComment(@Param('id') commentId: string, @Body('userId') userId: string) {
    return this.service.likeComment(commentId, userId);
  }

  @Delete('comments/:id/like')
  async unlikeComment(@Param('id') commentId: string, @Query('userId') userId: string) {
    return this.service.unlikeComment(commentId, userId);
  }

  // ==================== FOLLOWS ====================

  @Post('users/:id/follow')
  async followUser(@Param('id') followingId: string, @Body('userId') followerId: string) {
    return this.service.followUser(followerId, followingId);
  }

  @Delete('users/:id/follow')
  async unfollowUser(@Param('id') followingId: string, @Query('userId') followerId: string) {
    return this.service.unfollowUser(followerId, followingId);
  }

  // ==================== SAVES ====================

  @Post('posts/:id/save')
  async savePost(@Param('id') postId: string, @Body('userId') userId: string) {
    return this.service.savePost(userId, postId);
  }

  @Delete('posts/:id/save')
  async unsavePost(@Param('id') postId: string, @Query('userId') userId: string) {
    return this.service.unsavePost(userId, postId);
  }

  // ==================== BLOCK/MUTE ====================

  @Post('users/:id/block')
  async blockUser(@Param('id') blockedId: string, @Body('userId') blockerId: string) {
    return this.service.blockUser(blockerId, blockedId);
  }

  @Delete('users/:id/block')
  async unblockUser(@Param('id') blockedId: string, @Query('userId') blockerId: string) {
    return this.service.unblockUser(blockerId, blockedId);
  }

  @Post('users/:id/mute')
  async muteUser(@Param('id') mutedId: string, @Body('userId') muterId: string) {
    return this.service.muteUser(muterId, mutedId);
  }

  @Delete('users/:id/mute')
  async unmuteUser(@Param('id') mutedId: string, @Query('userId') muterId: string) {
    return this.service.unmuteUser(muterId, mutedId);
  }

  // ==================== REPORTS ====================

  @Post('posts/:id/report')
  async reportPost(
    @Param('id') postId: string,
    @Body() body: { userId: string; reason: string },
  ) {
    return this.service.reportPost(body.userId, postId, body.reason);
  }

  // ==================== VIEW TRACKING ====================

  @Post('posts/:id/view')
  async trackView(
    @Param('id') postId: string,
    @Body('userId') userId?: string,
  ) {
    return this.service.trackView(postId, userId);
  }

  // ==================== USER BIO ====================

  @Patch('users/:id/bio')
  async updateBio(
    @Param('id') userId: string,
    @Body('bio') bio: string,
  ) {
    return this.service.updateBio(userId, bio);
  }

  @Get('users/:id/bio')
  async getBio(@Param('id') userId: string) {
    return this.service.getBio(userId);
  }

  // ==================== USER PROFILE ====================

  @Get('users/:id/profile')
  async getUserProfile(
    @Param('id') userId: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.service.getUserProfile(userId, currentUserId);
  }

  // ==================== FOLLOWERS / FOLLOWING LISTS ====================

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

  // ==================== USER SUGGESTIONS ====================

  @Get('users/suggestions')
  async getSuggestedUsers(
    @Query('userId') userId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.service.getSuggestedUsers(userId, parseInt(limit));
  }
}
