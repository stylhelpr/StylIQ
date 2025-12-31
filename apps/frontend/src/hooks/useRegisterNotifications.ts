import {useEffect} from 'react';
import messaging from '@react-native-firebase/messaging';
import {Linking, Platform} from 'react-native';
import {addToInbox, AppNotification} from '../utils/notificationInbox';
import {useUUID} from '../context/UUIDContext';
import {isValidDeepLink} from '../utils/urlSanitizer';

// Helper to determine the correct category for community notifications
const getCommunityCategory = (
  data: Record<string, string> | undefined,
): AppNotification['category'] => {
  const notifType = data?.type;
  // Community notifications (like, comment, follow) should go to Community Messages
  if (
    notifType === 'like' ||
    notifType === 'comment' ||
    notifType === 'follow'
  ) {
    return 'message';
  }
  // Use the category from the payload, or default to 'other'
  return (data?.category as AppNotification['category']) ?? 'other';
};

export function useRegisterNotifications() {
  const userId = useUUID() ?? '';

  useEffect(() => {
    if (!userId) return;

    // Foreground message
    const unsubMsg = messaging().onMessage(async msg => {
      const data = msg.data as Record<string, string> | undefined;
      await addToInbox({
        user_id: userId,
        id: msg.messageId || `fcm-${Date.now()}`,
        title: msg.notification?.title ?? '',
        message: msg.notification?.body ?? '',
        timestamp: new Date().toISOString(),
        deeplink: data?.deeplink,
        category: getCommunityCategory(data),
        data: data ?? {},
        read: false,
      });
    });

    // Tapped from background
    const unsubOpened = messaging().onNotificationOpenedApp(async msg => {
      const data = msg.data as Record<string, string> | undefined;
      await addToInbox({
        user_id: userId,
        id: msg.messageId || `fcm-${Date.now()}`,
        title: msg.notification?.title ?? '',
        message: msg.notification?.body ?? '',
        timestamp: new Date().toISOString(),
        deeplink: data?.deeplink,
        category: getCommunityCategory(data),
        data: data ?? {},
        read: false,
      });
      // Validate deep-link before opening to prevent phishing attacks
      const link = data?.deeplink;
      if (link && isValidDeepLink(link)) Linking.openURL(link);
    });

    // Tapped from quit (cold start)
    messaging()
      .getInitialNotification()
      .then(async msg => {
        if (!msg) return;
        const data = msg.data as Record<string, string> | undefined;
        await addToInbox({
          user_id: userId,
          id: msg.messageId || `fcm-${Date.now()}`,
          title: msg.notification?.title ?? '',
          message: msg.notification?.body ?? '',
          timestamp: new Date().toISOString(),
          deeplink: data?.deeplink,
          category: getCommunityCategory(data),
          data: data ?? {},
          read: false,
        });
        // Validate deep-link before opening to prevent phishing attacks
        const link = data?.deeplink;
        if (link && isValidDeepLink(link)) Linking.openURL(link);
      });

    // iOS: ensure presentation while app in foreground (optional)
    if (Platform.OS === 'ios') {
      messaging().setAutoInitEnabled(true);
    }

    return () => {
      unsubMsg();
      unsubOpened();
    };
  }, [userId]);
}
