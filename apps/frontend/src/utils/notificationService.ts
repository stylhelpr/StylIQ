import PushNotification from 'react-native-push-notification';

export const initializeNotifications = () => {
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
