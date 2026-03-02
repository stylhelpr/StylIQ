import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Map userId -> Set of socket IDs (user can have multiple connections)
  private userSockets = new Map<string, Set<string>>();
  // Map socketId -> userId
  private socketUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    // console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
    }
    // console.log(`🔌 Client disconnected: ${client.id}`);
  }

  // User joins with their userId to receive messages
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;
    if (!userId) return;

    // Track this socket for the user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    this.socketUsers.set(client.id, userId);

    // Join a room named after the userId for easy targeting
    client.join(`user:${userId}`);

    // console.log(`👤 User ${userId} joined with socket ${client.id}`);
    return { success: true };
  }

  // Called by MessagingService when a new message is sent
  emitNewMessage(
    recipientId: string,
    senderId: string,
    message: {
      id: string;
      sender_id: string;
      recipient_id: string;
      content: string;
      created_at: string;
      sender_name: string;
      sender_avatar: string;
    },
  ) {
    // Debug: Log all connected users
    // console.log(`📊 Connected users:`, Array.from(this.userSockets.keys()));
    // console.log(`📊 Recipient ${recipientId} online:`, this.isUserOnline(recipientId));
    // console.log(`📊 Sender ${senderId} online:`, this.isUserOnline(senderId));
    // console.log(`📊 Recipient sockets:`, this.userSockets.get(recipientId) || 'none');

    // Emit to all sockets of the recipient
    this.server.to(`user:${recipientId}`).emit('new_message', message);

    // Also emit to sender's other devices (for multi-device sync)
    this.server.to(`user:${senderId}`).emit('message_sent', message);

    // console.log(`📨 Emitted message from ${senderId} to ${recipientId}`);
  }

  // Typing indicator
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { senderId: string; recipientId: string; isTyping: boolean },
  ) {
    this.server.to(`user:${data.recipientId}`).emit('user_typing', {
      userId: data.senderId,
      isTyping: data.isTyping,
    });
  }

  // Mark messages as read
  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; otherUserId: string },
  ) {
    // Notify the other user that their messages were read
    this.server.to(`user:${data.otherUserId}`).emit('messages_read', {
      readBy: data.userId,
    });
  }

  // Check if a user is online
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  // Emit community notification (like, comment, follow) - same pattern as DM messages
  emitCommunityNotification(
    recipientId: string,
    notification: {
      id: string;
      type: 'like' | 'comment' | 'follow';
      title: string;
      message: string;
      senderId: string;
      senderName: string;
      senderAvatar: string;
      postId?: string;
      created_at: string;
    },
  ) {
    console.log(
      `📨 Emitting community notification to ${recipientId}:`,
      notification.type,
    );
    this.server
      .to(`user:${recipientId}`)
      .emit('community_notification', notification);
  }
}
