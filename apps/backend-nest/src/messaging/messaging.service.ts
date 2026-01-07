import { Injectable, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { pool } from '../db/pool';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(forwardRef(() => MessagingGateway))
    private readonly gateway: MessagingGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.initTables();
  }

  private async initTables() {
    // Direct messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL,
        recipient_id UUID NOT NULL,
        content TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS dm_sender_recipient_idx ON direct_messages(sender_id, recipient_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS dm_recipient_sender_idx ON direct_messages(recipient_id, sender_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS dm_created_at_idx ON direct_messages(created_at DESC)`);
  }

  // Send a message
  async sendMessage(senderId: string, recipientId: string, content: string) {
    if (senderId === recipientId) {
      throw new ForbiddenException('Cannot message yourself');
    }

    // Check if blocked
    const blocked = await pool.query(
      `SELECT 1 FROM blocked_users
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)`,
      [senderId, recipientId]
    );

    if (blocked.rows.length > 0) {
      throw new ForbiddenException('Cannot message this user');
    }

    const res = await pool.query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, recipientId, content]
    );

    const message = res.rows[0];

    // Get sender info for the real-time message
    const senderInfo = await pool.query(
      `SELECT
        COALESCE(first_name, 'StylIQ') || ' ' || COALESCE(last_name, 'User') as sender_name,
        COALESCE(profile_picture, 'https://i.pravatar.cc/100?u=' || $1::text) as sender_avatar
       FROM users WHERE id = $1::uuid`,
      [senderId]
    );

    const enrichedMessage = {
      ...message,
      sender_name: senderInfo.rows[0]?.sender_name || 'StylIQ User',
      sender_avatar: senderInfo.rows[0]?.sender_avatar || `https://i.pravatar.cc/100?u=${senderId}`,
    };

    // Emit via WebSocket for real-time delivery
    this.gateway.emitNewMessage(recipientId, senderId, enrichedMessage);

    // Send push notification to recipient
    const senderName = enrichedMessage.sender_name || 'Someone';
    const truncatedContent = content.length > 100 ? content.slice(0, 100) + '...' : content;
    const title = 'New Direct Message';
    const notificationMessage = `${senderName}: ${truncatedContent}`;

    this.notifications.sendPushToUser(
      recipientId,
      title,
      notificationMessage,
      { type: 'direct_message', senderId },
    ).catch(() => {});

    // Save to notifications inbox so it appears in the Notifications screen
    this.notifications.saveInboxItem({
      id: message.id,
      user_id: recipientId,
      title,
      message: notificationMessage,
      timestamp: new Date().toISOString(),
      category: 'message',
      data: { type: 'direct_message', senderId, senderName, senderAvatar: enrichedMessage.sender_avatar },
      read: false,
    }).catch(() => {});

    return enrichedMessage;
  }

  // Get messages between two users
  async getMessages(userId: string, otherUserId: string, limit: number = 50, before?: string) {
    let query = `
      SELECT
        dm.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as sender_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || dm.sender_id) as sender_avatar
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = $1 AND dm.recipient_id = $2)
         OR (dm.sender_id = $2 AND dm.recipient_id = $1)
    `;

    const params: any[] = [userId, otherUserId];

    if (before) {
      query += ` AND dm.created_at < $3`;
      params.push(before);
    }

    query += ` ORDER BY dm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await pool.query(query, params);

    // Mark messages as read
    await pool.query(
      `UPDATE direct_messages
       SET read_at = NOW()
       WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`,
      [userId, otherUserId]
    );

    return res.rows.reverse(); // Return in chronological order
  }

  // Get new messages since a timestamp (for polling)
  async getNewMessages(userId: string, otherUserId: string, since: string) {
    const res = await pool.query(
      `SELECT
        dm.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as sender_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || dm.sender_id) as sender_avatar
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_id = u.id
      WHERE ((dm.sender_id = $1 AND dm.recipient_id = $2)
         OR (dm.sender_id = $2 AND dm.recipient_id = $1))
         AND dm.created_at > $3
      ORDER BY dm.created_at ASC`,
      [userId, otherUserId, since]
    );

    // Mark as read
    if (res.rows.length > 0) {
      await pool.query(
        `UPDATE direct_messages
         SET read_at = NOW()
         WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`,
        [userId, otherUserId]
      );
    }

    return res.rows;
  }

  // Get list of conversations for a user
  async getConversations(userId: string) {
    const res = await pool.query(
      `SELECT
        CASE
          WHEN dm.sender_id = $1 THEN dm.recipient_id
          ELSE dm.sender_id
        END as other_user_id,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as other_user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' ||
          CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END
        ) as other_user_avatar,
        dm.content as last_message,
        dm.sender_id as last_sender_id,
        dm.created_at as last_message_at,
        (SELECT COUNT(*) FROM direct_messages
         WHERE recipient_id = $1
         AND sender_id = CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END
         AND read_at IS NULL) as unread_count
      FROM direct_messages dm
      LEFT JOIN users u ON u.id = CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END
      WHERE dm.sender_id = $1 OR dm.recipient_id = $1
      AND dm.created_at = (
        SELECT MAX(created_at) FROM direct_messages dm2
        WHERE (dm2.sender_id = $1 AND dm2.recipient_id = CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END)
           OR (dm2.recipient_id = $1 AND dm2.sender_id = CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END)
      )
      ORDER BY dm.created_at DESC`,
      [userId]
    );

    return res.rows;
  }

  // Get unread message count
  async getUnreadCount(userId: string) {
    const res = await pool.query(
      `SELECT COUNT(*) as count FROM direct_messages
       WHERE recipient_id = $1 AND read_at IS NULL`,
      [userId]
    );

    return parseInt(res.rows[0].count);
  }
}
