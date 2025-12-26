import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from '../context/ThemeContext';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
import {useUUID} from '../context/UUIDContext';
import {
  useMessages,
  useSendMessage,
  Message as ApiMessage,
} from '../hooks/useMessaging';
import {useMessagingSocket, SocketMessage} from '../hooks/useSocket';
import {useVoiceControl} from '../hooks/useVoiceControl';
import EmojiPicker from 'rn-emoji-keyboard';

type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
};

type Props = {
  navigate: (screen: string, params?: any) => void;
  route?: {
    recipientId?: string;
    recipientName?: string;
    recipientAvatar?: string;
  };
};

const h = (type: 'selection' | 'impactLight' | 'impactMedium') =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Transform API message to local message format
const transformMessage = (msg: ApiMessage, currentUserId: string): Message => ({
  id: msg.id,
  text: msg.content,
  senderId: msg.sender_id === currentUserId ? currentUserId : msg.sender_id,
  timestamp: new Date(msg.created_at),
  status: msg.read_at ? 'read' : 'delivered',
});

export default function ChatScreen({navigate, route}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const currentUserId = useUUID();
  const recipientId = route?.recipientId || '';
  const recipientName = route?.recipientName || 'StyleQueen';
  // Filter out fake pravatar URLs
  const isRealAvatar = (url?: string) => url && !url.includes('pravatar.cc');
  const recipientAvatar = isRealAvatar(route?.recipientAvatar)
    ? route?.recipientAvatar
    : '';

  // Get initials from recipient name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return 'U';
  };
  const recipientInitials = getInitials(recipientName);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice input using the same hook as AiStyleChatScreen
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  // Fetch initial messages
  const {data: apiMessages, isLoading} = useMessages(
    currentUserId || '',
    recipientId,
  );

  // Send message mutation
  const sendMutation = useSendMessage();

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback(
    (msg: SocketMessage) => {
      if (!currentUserId) return;
      // Only add if from the current conversation
      if (msg.sender_id !== recipientId && msg.recipient_id !== recipientId)
        return;

      const transformed: Message = {
        id: msg.id,
        text: msg.content,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at),
        status: 'delivered',
      };

      setMessages(prev => {
        // Filter out duplicates
        if (prev.some(p => p.id === msg.id)) return prev;
        return [...prev, transformed];
      });

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);

      // Haptic feedback for incoming message
      h('impactLight');
    },
    [currentUserId, recipientId],
  );

  // Handle typing indicator
  const handleUserTyping = useCallback(
    (data: {userId: string; isTyping: boolean}) => {
      if (data.userId === recipientId) {
        setIsTyping(data.isTyping);
      }
    },
    [recipientId],
  );

  // Connect to WebSocket for real-time messages
  const {sendTyping, markRead} = useMessagingSocket(
    currentUserId,
    handleNewMessage,
    undefined, // onMessageSent - not needed since we handle it locally
    handleUserTyping,
  );

  // Transform API messages when they load
  useEffect(() => {
    if (apiMessages && currentUserId) {
      const transformed = apiMessages.map(m =>
        transformMessage(m, currentUserId),
      );
      setMessages(transformed);

      // Mark messages as read when entering the chat
      if (recipientId) {
        markRead(recipientId);
      }
    }
  }, [apiMessages, currentUserId, recipientId, markRead]);

  // Sync speech from voice hook to input text
  useEffect(() => {
    if (typeof speech === 'string' && speech) {
      setInputText(speech);
    }
  }, [speech]);

  // Toggle voice input
  const handleVoicePress = () => {
    h('impactMedium');
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sendMessage = async () => {
    console.log('📤 Sending message:', {
      currentUserId,
      recipientId,
      text: inputText.trim(),
    });

    if (!inputText.trim() || !currentUserId || !recipientId) {
      console.warn('❌ Cannot send - missing:', {
        hasText: !!inputText.trim(),
        hasCurrentUserId: !!currentUserId,
        hasRecipientId: !!recipientId,
      });
      return;
    }

    h('impactLight');
    const tempId = Date.now().toString();
    const text = inputText.trim();

    // Optimistic update
    const newMessage: Message = {
      id: tempId,
      text,
      senderId: currentUserId,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);

    try {
      const sent = await sendMutation.mutateAsync({
        senderId: currentUserId,
        recipientId,
        content: text,
      });

      // Update the message with the real ID and status
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? {...m, id: sent.id, status: 'sent' as const} : m,
        ),
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as failed (could add a failed status)
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? {...m, status: 'sent' as const} : m)),
      );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const renderMessage = ({item, index}: {item: Message; index: number}) => {
    const isMe = item.senderId === currentUserId;
    const showAvatar =
      !isMe && (index === 0 || messages[index - 1]?.senderId === currentUserId);

    return (
      <Animated.View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              recipientAvatar ? (
                <Image source={{uri: recipientAvatar}} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: theme.colors.button1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}>
                  <Text
                    style={{color: '#fff', fontWeight: '600', fontSize: 14}}>
                    {recipientInitials}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            {
              backgroundColor: isMe
                ? theme.colors.button1
                : theme.colors.surface,
            },
          ]}>
          <Text
            style={[
              styles.messageText,
              {
                color: isMe
                  ? theme.colors.buttonText1
                  : theme.colors.foreground,
              },
            ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                {
                  color: isMe
                    ? 'rgba(255,255,255,0.6)'
                    : theme.colors.foreground3,
                },
              ]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMe && (
              <MaterialIcons
                name={
                  item.status === 'read'
                    ? 'done-all'
                    : item.status === 'delivered'
                    ? 'done-all'
                    : item.status === 'sent'
                    ? 'done'
                    : 'schedule'
                }
                size={14}
                color={
                  item.status === 'read' ? '#4FC3F7' : 'rgba(255,255,255,0.5)'
                }
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingTop: insets.top + 70,
      paddingBottom: moderateScale(tokens.spacing.sm),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surface,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: moderateScale(tokens.spacing.sm),
    },
    headerInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: moderateScale(tokens.spacing.sm),
    },
    headerTextContainer: {
      flex: 1,
    },
    headerName: {
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    headerStatus: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.foreground3,
      marginTop: 1,
    },
    headerActions: {
      flexDirection: 'row',
      gap: moderateScale(tokens.spacing.xs),
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    messagesList: {
      flex: 1,
      paddingHorizontal: moderateScale(tokens.spacing.md),
    },
    messagesContent: {
      paddingVertical: moderateScale(tokens.spacing.md),
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: moderateScale(tokens.spacing.xs),
      maxWidth: '85%',
    },
    messageRowMe: {
      alignSelf: 'flex-end',
    },
    messageRowOther: {
      alignSelf: 'flex-start',
    },
    avatarContainer: {
      width: 32,
      marginRight: moderateScale(tokens.spacing.xs),
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'white',
    },
    avatarSpacer: {
      width: 28,
    },
    messageBubble: {
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: moderateScale(tokens.spacing.xs),
      borderRadius: 18,
      maxWidth: '100%',
    },
    bubbleMe: {
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      borderBottomLeftRadius: 4,
      backgroundColor: '#FF4D6D',
    },
    messageText: {
      fontSize: fontScale(tokens.fontSize.sm),
      lineHeight: 20,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      gap: 4,
    },
    messageTime: {
      fontSize: 10,
    },
    statusIcon: {
      marginLeft: 2,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingVertical: moderateScale(tokens.spacing.xs),
    },
    typingAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: moderateScale(tokens.spacing.xs),
    },
    typingText: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.foreground3,
      fontStyle: 'italic',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingTop: moderateScale(tokens.spacing.sm),
      paddingBottom: insets.bottom + 60,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surface,
      backgroundColor: theme.colors.background,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      marginRight: moderateScale(tokens.spacing.xs),
    },
    textInput: {
      flex: 1,
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground,
      maxHeight: 100,
      paddingHorizontal: moderateScale(tokens.spacing.xs),
      paddingVertical: 0,
      textAlignVertical: 'center',
    },
    emojiButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.button1,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.surface2,
    },
    sendButtonRecording: {
      backgroundColor: theme.colors.error || '#FF3B30',
    },
    dateSeparator: {
      alignSelf: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.sm),
      paddingVertical: moderateScale(tokens.spacing.xxs),
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      marginVertical: moderateScale(tokens.spacing.md),
    },
    dateSeparatorText: {
      fontSize: fontScale(tokens.fontSize.xs),
      color: theme.colors.foreground,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            h('selection');
            navigate('MessagesScreen');
          }}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.foreground}
          />
        </Pressable>

        <Pressable
          style={styles.headerInfo}
          onPress={() => {
            h('selection');
            navigate('UserProfileScreen', {
              userId: recipientId,
              userName: recipientName,
              userAvatar: recipientAvatar,
            });
          }}>
          {recipientAvatar ? (
            <Image
              source={{uri: recipientAvatar}}
              style={styles.headerAvatar}
            />
          ) : (
            <View
              style={[
                styles.headerAvatar,
                {
                  backgroundColor: theme.colors.button1,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}>
              <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
                {recipientInitials}
              </Text>
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{recipientName}</Text>
            <Text style={styles.headerStatus}>online</Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable style={styles.headerAction} onPress={() => h('selection')}>
            <MaterialIcons
              name="more-vert"
              size={20}
              color={theme.colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({animated: false})
          }
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            {recipientAvatar ? (
              <Image
                source={{uri: recipientAvatar}}
                style={styles.typingAvatar}
              />
            ) : (
              <View
                style={[
                  styles.typingAvatar,
                  {
                    backgroundColor: theme.colors.button1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}>
                <Text style={{color: '#fff', fontWeight: '600', fontSize: 12}}>
                  {recipientInitials}
                </Text>
              </View>
            )}
            <Text style={[styles.typingText, {color: theme.colors.muted}]}>
              {recipientName} is typing...
            </Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={theme.colors.foreground}
              value={inputText}
              onChangeText={text => {
                setInputText(text);
                // Send typing indicator
                if (recipientId) {
                  sendTyping(recipientId, text.length > 0);
                }
              }}
              onBlur={() => {
                // Stop typing indicator when input loses focus
                if (recipientId) {
                  sendTyping(recipientId, false);
                }
              }}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={styles.emojiButton}
              onPress={() => {
                h('selection');
                setShowEmojiPicker(true);
              }}>
              <MaterialIcons
                name="emoji-emotions"
                size={22}
                color={
                  showEmojiPicker
                    ? theme.colors.button1
                    : theme.colors.foreground
                }
              />
            </Pressable>
          </View>

          {inputText.trim() ? (
            <Pressable style={styles.sendButton} onPress={sendMessage}>
              <MaterialIcons
                name="send"
                size={22}
                color={theme.colors.buttonText1}
              />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.sendButton,
                isRecording && styles.sendButtonRecording,
              ]}
              onPress={handleVoicePress}>
              {isRecording ? (
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={1000}>
                  <MaterialIcons
                    name="mic"
                    size={22}
                    color={theme.colors.buttonText1}
                  />
                </Animatable.View>
              ) : (
                <MaterialIcons
                  name="mic"
                  size={22}
                  color={theme.colors.foreground3}
                />
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker
        onEmojiSelected={emoji => {
          setInputText(prev => prev + emoji.emoji);
        }}
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        theme={{
          backdrop: theme.colors.background + 'CC',
          knob: theme.colors.foreground3,
          container: theme.colors.surface,
          header: theme.colors.foreground,
          skinTonesContainer: theme.colors.surface2,
          category: {
            icon: theme.colors.foreground3,
            iconActive: theme.colors.button1,
            container: theme.colors.surface,
            containerActive: theme.colors.surface2,
          },
          search: {
            background: theme.colors.surface2,
            placeholder: theme.colors.foreground3,
            text: theme.colors.foreground,
            icon: theme.colors.foreground3,
          },
          emoji: {
            selected: theme.colors.surface2,
          },
        }}
      />
    </SafeAreaView>
  );
}

////////////////////

// import React, {useState, useRef, useEffect, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   Pressable,
//   Animated,
//   ActivityIndicator,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useUUID} from '../context/UUIDContext';
// import {
//   useMessages,
//   useSendMessage,
//   Message as ApiMessage,
// } from '../hooks/useMessaging';
// import {useMessagingSocket, SocketMessage} from '../hooks/useSocket';

// type Message = {
//   id: string;
//   text: string;
//   senderId: string;
//   timestamp: Date;
//   status: 'sending' | 'sent' | 'delivered' | 'read';
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   route?: {
//     recipientId?: string;
//     recipientName?: string;
//     recipientAvatar?: string;
//   };
// };

// const h = (type: 'selection' | 'impactLight' | 'impactMedium') =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// // Transform API message to local message format
// const transformMessage = (msg: ApiMessage, currentUserId: string): Message => ({
//   id: msg.id,
//   text: msg.content,
//   senderId: msg.sender_id === currentUserId ? currentUserId : msg.sender_id,
//   timestamp: new Date(msg.created_at),
//   status: msg.read_at ? 'read' : 'delivered',
// });

// export default function ChatScreen({navigate, route}: Props) {
//   const {theme} = useAppTheme();
//   const insets = useSafeAreaInsets();
//   const flatListRef = useRef<FlatList>(null);
//   const inputRef = useRef<TextInput>(null);

//   const currentUserId = useUUID();
//   const recipientId = route?.recipientId || '';
//   const recipientName = route?.recipientName || 'StyleQueen';
//   const recipientAvatar =
//     route?.recipientAvatar || 'https://i.pravatar.cc/100?img=1';

//   const [messages, setMessages] = useState<Message[]>([]);
//   const [inputText, setInputText] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   // Fetch initial messages
//   const {data: apiMessages, isLoading} = useMessages(
//     currentUserId || '',
//     recipientId,
//   );

//   // Send message mutation
//   const sendMutation = useSendMessage();

//   // Handle new messages from WebSocket
//   const handleNewMessage = useCallback(
//     (msg: SocketMessage) => {
//       if (!currentUserId) return;
//       // Only add if from the current conversation
//       if (msg.sender_id !== recipientId && msg.recipient_id !== recipientId) return;

//       const transformed: Message = {
//         id: msg.id,
//         text: msg.content,
//         senderId: msg.sender_id,
//         timestamp: new Date(msg.created_at),
//         status: 'delivered',
//       };

//       setMessages(prev => {
//         // Filter out duplicates
//         if (prev.some(p => p.id === msg.id)) return prev;
//         return [...prev, transformed];
//       });

//       // Scroll to bottom when new messages arrive
//       setTimeout(() => {
//         flatListRef.current?.scrollToEnd({animated: true});
//       }, 100);

//       // Haptic feedback for incoming message
//       h('impactLight');
//     },
//     [currentUserId, recipientId],
//   );

//   // Handle typing indicator
//   const handleUserTyping = useCallback(
//     (data: {userId: string; isTyping: boolean}) => {
//       if (data.userId === recipientId) {
//         setIsTyping(data.isTyping);
//       }
//     },
//     [recipientId],
//   );

//   // Connect to WebSocket for real-time messages
//   const {sendTyping, markRead} = useMessagingSocket(
//     currentUserId,
//     handleNewMessage,
//     undefined, // onMessageSent - not needed since we handle it locally
//     handleUserTyping,
//   );

//   // Transform API messages when they load
//   useEffect(() => {
//     if (apiMessages && currentUserId) {
//       const transformed = apiMessages.map(m =>
//         transformMessage(m, currentUserId),
//       );
//       setMessages(transformed);

//       // Mark messages as read when entering the chat
//       if (recipientId) {
//         markRead(recipientId);
//       }
//     }
//   }, [apiMessages, currentUserId, recipientId, markRead]);

//   const sendMessage = async () => {
//     console.log('📤 Sending message:', {
//       currentUserId,
//       recipientId,
//       text: inputText.trim(),
//     });

//     if (!inputText.trim() || !currentUserId || !recipientId) {
//       console.warn('❌ Cannot send - missing:', {
//         hasText: !!inputText.trim(),
//         hasCurrentUserId: !!currentUserId,
//         hasRecipientId: !!recipientId,
//       });
//       return;
//     }

//     h('impactLight');
//     const tempId = Date.now().toString();
//     const text = inputText.trim();

//     // Optimistic update
//     const newMessage: Message = {
//       id: tempId,
//       text,
//       senderId: currentUserId,
//       timestamp: new Date(),
//       status: 'sending',
//     };

//     setMessages(prev => [...prev, newMessage]);
//     setInputText('');

//     // Scroll to bottom
//     setTimeout(() => {
//       flatListRef.current?.scrollToEnd({animated: true});
//     }, 100);

//     try {
//       const sent = await sendMutation.mutateAsync({
//         senderId: currentUserId,
//         recipientId,
//         content: text,
//       });

//       // Update the message with the real ID and status
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === tempId
//             ? {...m, id: sent.id, status: 'sent' as const}
//             : m,
//         ),
//       );
//     } catch (error) {
//       console.error('Failed to send message:', error);
//       // Mark as failed (could add a failed status)
//       setMessages(prev =>
//         prev.map(m => (m.id === tempId ? {...m, status: 'sent' as const} : m)),
//       );
//     }
//   };

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
//   };

//   const renderMessage = ({item, index}: {item: Message; index: number}) => {
//     const isMe = item.senderId === currentUserId;
//     const showAvatar =
//       !isMe &&
//       (index === 0 || messages[index - 1]?.senderId === currentUserId);

//     return (
//       <Animated.View
//         style={[
//           styles.messageRow,
//           isMe ? styles.messageRowMe : styles.messageRowOther,
//         ]}>
//         {!isMe && (
//           <View style={styles.avatarContainer}>
//             {showAvatar ? (
//               <Image source={{uri: recipientAvatar}} style={styles.avatar} />
//             ) : (
//               <View style={styles.avatarSpacer} />
//             )}
//           </View>
//         )}

//         <View
//           style={[
//             styles.messageBubble,
//             isMe ? styles.bubbleMe : styles.bubbleOther,
//             {
//               backgroundColor: isMe
//                 ? theme.colors.button1
//                 : theme.colors.surface,
//             },
//           ]}>
//           <Text
//             style={[
//               styles.messageText,
//               {
//                 color: isMe
//                   ? theme.colors.buttonText1
//                   : theme.colors.foreground,
//               },
//             ]}>
//             {item.text}
//           </Text>
//           <View style={styles.messageFooter}>
//             <Text
//               style={[
//                 styles.messageTime,
//                 {
//                   color: isMe
//                     ? 'rgba(255,255,255,0.6)'
//                     : theme.colors.foreground3,
//                 },
//               ]}>
//               {formatTime(item.timestamp)}
//             </Text>
//             {isMe && (
//               <MaterialIcons
//                 name={
//                   item.status === 'read'
//                     ? 'done-all'
//                     : item.status === 'delivered'
//                     ? 'done-all'
//                     : item.status === 'sent'
//                     ? 'done'
//                     : 'schedule'
//                 }
//                 size={14}
//                 color={
//                   item.status === 'read' ? '#4FC3F7' : 'rgba(255,255,255,0.5)'
//                 }
//                 style={styles.statusIcon}
//               />
//             )}
//           </View>
//         </View>
//       </Animated.View>
//     );
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: insets.top + 70,
//       paddingBottom: moderateScale(tokens.spacing.sm),
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       borderBottomColor: theme.colors.surface,
//       backgroundColor: theme.colors.background,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     headerInfo: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     headerAvatar: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     headerTextContainer: {
//       flex: 1,
//     },
//     headerName: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     headerStatus: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground3,
//       marginTop: 1,
//     },
//     headerActions: {
//       flexDirection: 'row',
//       gap: moderateScale(tokens.spacing.xs),
//     },
//     headerAction: {
//       width: 36,
//       height: 36,
//       borderRadius: 18,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.surface2,
//     },
//     messagesList: {
//       flex: 1,
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//     },
//     messagesContent: {
//       paddingVertical: moderateScale(tokens.spacing.md),
//     },
//     messageRow: {
//       flexDirection: 'row',
//       marginBottom: moderateScale(tokens.spacing.xs),
//       maxWidth: '85%',
//     },
//     messageRowMe: {
//       alignSelf: 'flex-end',
//     },
//     messageRowOther: {
//       alignSelf: 'flex-start',
//     },
//     avatarContainer: {
//       width: 32,
//       marginRight: moderateScale(tokens.spacing.xs),
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//     },
//     avatar: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//     },
//     avatarSpacer: {
//       width: 28,
//     },
//     messageBubble: {
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 18,
//       maxWidth: '100%',
//     },
//     bubbleMe: {
//       borderBottomRightRadius: 4,
//     },
//     bubbleOther: {
//       borderBottomLeftRadius: 4,
//       backgroundColor: '#FF4D6D',
//     },
//     messageText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       lineHeight: 20,
//     },
//     messageFooter: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 4,
//       gap: 4,
//     },
//     messageTime: {
//       fontSize: 10,
//     },
//     statusIcon: {
//       marginLeft: 2,
//     },
//     typingIndicator: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//     },
//     typingAvatar: {
//       width: 24,
//       height: 24,
//       borderRadius: 12,
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     typingText: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground3,
//       fontStyle: 'italic',
//     },
//     inputContainer: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: moderateScale(tokens.spacing.sm),
//       paddingBottom: insets.bottom + 60,
//       borderTopWidth: StyleSheet.hairlineWidth,
//       borderTopColor: theme.colors.surface,
//       backgroundColor: theme.colors.background,
//     },
//     inputWrapper: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: Platform.OS === 'ios' ? 8 : 4,
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     attachButton: {
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     textInput: {
//       flex: 1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground,
//       maxHeight: 100,
//       paddingHorizontal: moderateScale(tokens.spacing.xs),
//       paddingTop: Platform.OS === 'ios' ? 0 : 8,
//       paddingBottom: Platform.OS === 'ios' ? 0 : 8,
//     },
//     emojiButton: {
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     sendButton: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     sendButtonDisabled: {
//       backgroundColor: theme.colors.surface2,
//     },
//     dateSeparator: {
//       alignSelf: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       backgroundColor: theme.colors.surface2,
//       borderRadius: 12,
//       marginVertical: moderateScale(tokens.spacing.md),
//     },
//     dateSeparatorText: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <SafeAreaView style={styles.container} edges={['left', 'right']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Pressable
//           style={styles.backButton}
//           onPress={() => {
//             h('selection');
//             navigate('CommunityShowcaseScreen');
//           }}>
//           <MaterialIcons
//             name="arrow-back"
//             size={24}
//             color={theme.colors.foreground}
//           />
//         </Pressable>

//         <Pressable style={styles.headerInfo} onPress={() => h('selection')}>
//           <Image source={{uri: recipientAvatar}} style={styles.headerAvatar} />
//           <View style={styles.headerTextContainer}>
//             <Text style={styles.headerName}>{recipientName}</Text>
//             <Text style={styles.headerStatus}>online</Text>
//           </View>
//         </Pressable>

//         <View style={styles.headerActions}>
//           <Pressable style={styles.headerAction} onPress={() => h('selection')}>
//             <MaterialIcons
//               name="more-vert"
//               size={20}
//               color={theme.colors.foreground}
//             />
//           </Pressable>
//         </View>
//       </View>

//       {/* Messages */}
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={0}>
//         <FlatList
//           ref={flatListRef}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={item => item.id}
//           style={styles.messagesList}
//           contentContainerStyle={styles.messagesContent}
//           showsVerticalScrollIndicator={false}
//           onContentSizeChange={() =>
//             flatListRef.current?.scrollToEnd({animated: false})
//           }
//         />

//         {/* Typing indicator */}
//         {isTyping && (
//           <View style={styles.typingIndicator}>
//             <Image source={{uri: recipientAvatar}} style={styles.typingAvatar} />
//             <Text style={[styles.typingText, {color: theme.colors.muted}]}>
//               {recipientName} is typing...
//             </Text>
//           </View>
//         )}

//         {/* Input */}
//         <View style={styles.inputContainer}>
//           <View style={styles.inputWrapper}>
//             <Pressable
//               style={styles.attachButton}
//               onPress={() => h('selection')}>
//               <MaterialIcons
//                 name="add"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </Pressable>
//             <TextInput
//               ref={inputRef}
//               style={styles.textInput}
//               placeholder="Message..."
//               placeholderTextColor={theme.colors.foreground}
//               value={inputText}
//               onChangeText={text => {
//                 setInputText(text);
//                 // Send typing indicator
//                 if (recipientId) {
//                   sendTyping(recipientId, text.length > 0);
//                 }
//               }}
//               onBlur={() => {
//                 // Stop typing indicator when input loses focus
//                 if (recipientId) {
//                   sendTyping(recipientId, false);
//                 }
//               }}
//               multiline
//               maxLength={1000}
//             />
//             <Pressable
//               style={styles.emojiButton}
//               onPress={() => h('selection')}>
//               <MaterialIcons
//                 name="emoji-emotions"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </Pressable>
//           </View>

//           <Pressable
//             style={[
//               styles.sendButton,
//               !inputText.trim() && styles.sendButtonDisabled,
//             ]}
//             onPress={sendMessage}
//             disabled={!inputText.trim()}>
//             <MaterialIcons
//               name={inputText.trim() ? 'send' : 'mic'}
//               size={22}
//               color={
//                 inputText.trim()
//                   ? theme.colors.buttonText1
//                   : theme.colors.foreground3
//               }
//             />
//           </Pressable>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

//////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   Image,
//   Pressable,
//   Animated,
//   Keyboard,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {BlurView} from '@react-native-community/blur';

// import {useAppTheme} from '../context/ThemeContext';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';

// type Message = {
//   id: string;
//   text: string;
//   senderId: string;
//   timestamp: Date;
//   status: 'sending' | 'sent' | 'delivered' | 'read';
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   route?: {
//     recipientId?: string;
//     recipientName?: string;
//     recipientAvatar?: string;
//   };
// };

// const h = (type: 'selection' | 'impactLight' | 'impactMedium') =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// // Mock current user
// const CURRENT_USER_ID = 'me';

// // Mock messages
// const MOCK_MESSAGES: Message[] = [
//   {
//     id: '1',
//     text: 'Love your outfit! Where did you get that jacket?',
//     senderId: 'other',
//     timestamp: new Date(Date.now() - 3600000),
//     status: 'read',
//   },
//   {
//     id: '2',
//     text: "Thanks! It's from Zara, got it last season",
//     senderId: CURRENT_USER_ID,
//     timestamp: new Date(Date.now() - 3500000),
//     status: 'read',
//   },
//   {
//     id: '3',
//     text: 'The fit is perfect on you',
//     senderId: 'other',
//     timestamp: new Date(Date.now() - 3400000),
//     status: 'read',
//   },
//   {
//     id: '4',
//     text: 'I styled it with some vintage pieces I found',
//     senderId: CURRENT_USER_ID,
//     timestamp: new Date(Date.now() - 3300000),
//     status: 'read',
//   },
//   {
//     id: '5',
//     text: 'Your style is so unique! Following you now',
//     senderId: 'other',
//     timestamp: new Date(Date.now() - 60000),
//     status: 'read',
//   },
// ];

// export default function ChatScreen({navigate, route}: Props) {
//   const {theme} = useAppTheme();
//   const insets = useSafeAreaInsets();
//   const flatListRef = useRef<FlatList>(null);
//   const inputRef = useRef<TextInput>(null);

//   const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
//   const [inputText, setInputText] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   const recipientName = route?.recipientName || 'StyleQueen';
//   const recipientAvatar =
//     route?.recipientAvatar || 'https://i.pravatar.cc/100?img=1';

//   // Simulate typing indicator
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setIsTyping(prev => !prev);
//     }, 3000);
//     return () => clearInterval(interval);
//   }, []);

//   const sendMessage = () => {
//     if (!inputText.trim()) return;

//     h('impactLight');
//     const newMessage: Message = {
//       id: Date.now().toString(),
//       text: inputText.trim(),
//       senderId: CURRENT_USER_ID,
//       timestamp: new Date(),
//       status: 'sending',
//     };

//     setMessages(prev => [...prev, newMessage]);
//     setInputText('');

//     // Simulate send
//     setTimeout(() => {
//       setMessages(prev =>
//         prev.map(m => (m.id === newMessage.id ? {...m, status: 'sent'} : m)),
//       );
//     }, 500);

//     setTimeout(() => {
//       setMessages(prev =>
//         prev.map(m =>
//           m.id === newMessage.id ? {...m, status: 'delivered'} : m,
//         ),
//       );
//     }, 1000);

//     // Scroll to bottom
//     setTimeout(() => {
//       flatListRef.current?.scrollToEnd({animated: true});
//     }, 100);
//   };

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
//   };

//   const renderMessage = ({item, index}: {item: Message; index: number}) => {
//     const isMe = item.senderId === CURRENT_USER_ID;
//     const showAvatar =
//       !isMe &&
//       (index === 0 || messages[index - 1]?.senderId === CURRENT_USER_ID);

//     return (
//       <Animated.View
//         style={[
//           styles.messageRow,
//           isMe ? styles.messageRowMe : styles.messageRowOther,
//         ]}>
//         {!isMe && (
//           <View style={styles.avatarContainer}>
//             {showAvatar ? (
//               <Image source={{uri: recipientAvatar}} style={styles.avatar} />
//             ) : (
//               <View style={styles.avatarSpacer} />
//             )}
//           </View>
//         )}

//         <View
//           style={[
//             styles.messageBubble,
//             isMe ? styles.bubbleMe : styles.bubbleOther,
//             {
//               backgroundColor: isMe
//                 ? theme.colors.button1
//                 : theme.colors.surface,
//             },
//           ]}>
//           <Text
//             style={[
//               styles.messageText,
//               {
//                 color: isMe
//                   ? theme.colors.buttonText1
//                   : theme.colors.foreground,
//               },
//             ]}>
//             {item.text}
//           </Text>
//           <View style={styles.messageFooter}>
//             <Text
//               style={[
//                 styles.messageTime,
//                 {
//                   color: isMe
//                     ? 'rgba(255,255,255,0.6)'
//                     : theme.colors.foreground3,
//                 },
//               ]}>
//               {formatTime(item.timestamp)}
//             </Text>
//             {isMe && (
//               <MaterialIcons
//                 name={
//                   item.status === 'read'
//                     ? 'done-all'
//                     : item.status === 'delivered'
//                     ? 'done-all'
//                     : item.status === 'sent'
//                     ? 'done'
//                     : 'schedule'
//                 }
//                 size={14}
//                 color={
//                   item.status === 'read' ? '#4FC3F7' : 'rgba(255,255,255,0.5)'
//                 }
//                 style={styles.statusIcon}
//               />
//             )}
//           </View>
//         </View>
//       </Animated.View>
//     );
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: insets.top + 70,
//       paddingBottom: moderateScale(tokens.spacing.sm),
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       borderBottomColor: theme.colors.surface,
//       backgroundColor: theme.colors.background,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     headerInfo: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     headerAvatar: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     headerTextContainer: {
//       flex: 1,
//     },
//     headerName: {
//       fontSize: fontScale(tokens.fontSize.base),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//     },
//     headerStatus: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground3,
//       marginTop: 1,
//     },
//     headerActions: {
//       flexDirection: 'row',
//       gap: moderateScale(tokens.spacing.xs),
//     },
//     headerAction: {
//       width: 36,
//       height: 36,
//       borderRadius: 18,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.surface2,
//     },
//     messagesList: {
//       flex: 1,
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//     },
//     messagesContent: {
//       paddingVertical: moderateScale(tokens.spacing.md),
//     },
//     messageRow: {
//       flexDirection: 'row',
//       marginBottom: moderateScale(tokens.spacing.xs),
//       maxWidth: '85%',
//     },
//     messageRowMe: {
//       alignSelf: 'flex-end',
//     },
//     messageRowOther: {
//       alignSelf: 'flex-start',
//     },
//     avatarContainer: {
//       width: 32,
//       marginRight: moderateScale(tokens.spacing.xs),
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//     },
//     avatar: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//     },
//     avatarSpacer: {
//       width: 28,
//     },
//     messageBubble: {
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//       borderRadius: 18,
//       maxWidth: '100%',
//     },
//     bubbleMe: {
//       borderBottomRightRadius: 4,
//     },
//     bubbleOther: {
//       borderBottomLeftRadius: 4,
//       backgroundColor: '#FF4D6D',
//     },
//     messageText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       lineHeight: 20,
//     },
//     messageFooter: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'flex-end',
//       marginTop: 4,
//       gap: 4,
//     },
//     messageTime: {
//       fontSize: 10,
//     },
//     statusIcon: {
//       marginLeft: 2,
//     },
//     typingIndicator: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: moderateScale(tokens.spacing.xs),
//     },
//     typingAvatar: {
//       width: 24,
//       height: 24,
//       borderRadius: 12,
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     typingText: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground3,
//       fontStyle: 'italic',
//     },
//     inputContainer: {
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: moderateScale(tokens.spacing.sm),
//       paddingBottom: insets.bottom + 60,
//       borderTopWidth: StyleSheet.hairlineWidth,
//       borderTopColor: theme.colors.surface,
//       backgroundColor: theme.colors.background,
//     },
//     inputWrapper: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'flex-end',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: Platform.OS === 'ios' ? 8 : 4,
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     attachButton: {
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     textInput: {
//       flex: 1,
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground,
//       maxHeight: 100,
//       paddingHorizontal: moderateScale(tokens.spacing.xs),
//       paddingTop: Platform.OS === 'ios' ? 0 : 8,
//       paddingBottom: Platform.OS === 'ios' ? 0 : 8,
//     },
//     emojiButton: {
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     sendButton: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     sendButtonDisabled: {
//       backgroundColor: theme.colors.surface2,
//     },
//     dateSeparator: {
//       alignSelf: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.sm),
//       paddingVertical: moderateScale(tokens.spacing.xxs),
//       backgroundColor: theme.colors.surface2,
//       borderRadius: 12,
//       marginVertical: moderateScale(tokens.spacing.md),
//     },
//     dateSeparatorText: {
//       fontSize: fontScale(tokens.fontSize.xs),
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <SafeAreaView style={styles.container} edges={['left', 'right']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Pressable
//           style={styles.backButton}
//           onPress={() => {
//             h('selection');
//             navigate('CommunityShowcaseScreen');
//           }}>
//           <MaterialIcons
//             name="arrow-back"
//             size={24}
//             color={theme.colors.foreground}
//           />
//         </Pressable>

//         <Pressable style={styles.headerInfo} onPress={() => h('selection')}>
//           <Image source={{uri: recipientAvatar}} style={styles.headerAvatar} />
//           <View style={styles.headerTextContainer}>
//             <Text style={styles.headerName}>{recipientName}</Text>
//             <Text style={styles.headerStatus}>
//               {isTyping ? 'typing...' : 'online'}
//             </Text>
//           </View>
//         </Pressable>

//         <View style={styles.headerActions}>
//           <Pressable style={styles.headerAction} onPress={() => h('selection')}>
//             <MaterialIcons
//               name="more-vert"
//               size={20}
//               color={theme.colors.foreground}
//             />
//           </Pressable>
//         </View>
//       </View>

//       {/* Messages */}
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={0}>
//         <FlatList
//           ref={flatListRef}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={item => item.id}
//           style={styles.messagesList}
//           contentContainerStyle={styles.messagesContent}
//           showsVerticalScrollIndicator={false}
//           onContentSizeChange={() =>
//             flatListRef.current?.scrollToEnd({animated: false})
//           }
//         />

//         {/* Typing indicator */}
//         {isTyping && (
//           <View style={styles.typingIndicator}>
//             <Image
//               source={{uri: recipientAvatar}}
//               style={styles.typingAvatar}
//             />
//             <Text style={styles.typingText}>{recipientName} is typing...</Text>
//           </View>
//         )}

//         {/* Input */}
//         <View style={styles.inputContainer}>
//           <View style={styles.inputWrapper}>
//             <Pressable
//               style={styles.attachButton}
//               onPress={() => h('selection')}>
//               <MaterialIcons
//                 name="add"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </Pressable>
//             <TextInput
//               ref={inputRef}
//               style={styles.textInput}
//               placeholder="Message..."
//               placeholderTextColor={theme.colors.foreground}
//               value={inputText}
//               onChangeText={setInputText}
//               multiline
//               maxLength={1000}
//             />
//             <Pressable
//               style={styles.emojiButton}
//               onPress={() => h('selection')}>
//               <MaterialIcons
//                 name="emoji-emotions"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </Pressable>
//           </View>

//           <Pressable
//             style={[
//               styles.sendButton,
//               !inputText.trim() && styles.sendButtonDisabled,
//             ]}
//             onPress={sendMessage}
//             disabled={!inputText.trim()}>
//             <MaterialIcons
//               name={inputText.trim() ? 'send' : 'mic'}
//               size={22}
//               color={
//                 inputText.trim()
//                   ? theme.colors.buttonText1
//                   : theme.colors.foreground3
//               }
//             />
//           </Pressable>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
