// utils/initializeNotifications.ts

import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const initializeNotifications = async () => {
  const enabled = await AsyncStorage.getItem('notificationsEnabled');
  if (enabled !== 'true') {
    console.log('🔕 Notifications disabled. Skipping initialization.');
    return;
  }

  PushNotification.configure({
    onNotification: notification => {
      console.log('🔔 Notification:', notification);
    },
    requestPermissions: true,
  });

  PushNotification.createChannel(
    {
      channelId: 'style-channel',
      channelName: 'Style Reminders',
      importance: 4,
      vibrate: true,
    },
    created =>
      console.log(
        `🔔 Notification channel ${created ? 'created' : 'already exists'}`,
      ),
  );
};
