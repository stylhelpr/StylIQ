import {useEffect} from 'react';
import messaging from '@react-native-firebase/messaging';
import {Linking, Platform} from 'react-native';
import {addNotification} from '../storage/notifications';
import {useUUID} from '../context/UUIDContext';

export function useRegisterNotifications() {
  const userId = useUUID() ?? '';

  useEffect(() => {
    if (!userId) return;

    // Foreground message
    const unsubMsg = messaging().onMessage(async msg => {
      await addNotification(userId, {
        id: msg.messageId ?? undefined,
        title: msg.notification?.title ?? undefined,
        message: msg.notification?.body ?? '',
        deeplink: msg.data?.deeplink,
        category: (msg.data?.category as any) ?? 'other',
        data: msg.data ?? {},
      });
    });

    // Tapped from background
    const unsubOpened = messaging().onNotificationOpenedApp(async msg => {
      await addNotification(userId, {
        id: msg.messageId ?? undefined,
        title: msg.notification?.title ?? undefined,
        message: msg.notification?.body ?? '',
        deeplink: msg.data?.deeplink,
        category: (msg.data?.category as any) ?? 'other',
        data: msg.data ?? {},
      });
      const link = msg.data?.deeplink;
      if (link) Linking.openURL(link);
    });

    // Tapped from quit (cold start)
    messaging()
      .getInitialNotification()
      .then(async msg => {
        if (!msg) return;
        await addNotification(userId, {
          id: msg.messageId ?? undefined,
          title: msg.notification?.title ?? undefined,
          message: msg.notification?.body ?? '',
          deeplink: msg.data?.deeplink,
          category: (msg.data?.category as any) ?? 'other',
          data: msg.data ?? {},
        });
        const link = msg.data?.deeplink;
        if (link) Linking.openURL(link);
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
