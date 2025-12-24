export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  image_url?: string;
  top_image?: string;
  bottom_image?: string;
  shoes_image?: string;
  accessory_image?: string;
  title?: string;
  description?: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_liked_by_me: boolean;
  is_saved_by_me: boolean;
  is_following_author: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  reply_to_id?: string;
  reply_to_user?: string;
  likes_count: number;
  is_liked_by_me: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_name: string;
  user_avatar: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
  is_blocked?: boolean;
  is_muted?: boolean;
}

export type PostFilter = 'all' | 'foryou' | 'trending' | 'new' | 'following' | 'saved';

export interface FollowUser {
  id: string;
  user_name: string;
  user_avatar: string;
  bio?: string;
  followed_at: string;
  is_following?: boolean;
}
