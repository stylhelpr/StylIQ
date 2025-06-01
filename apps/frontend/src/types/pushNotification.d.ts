// pushNotification.d.ts
import 'react-native-push-notification';

declare module 'react-native-push-notification' {
  interface PushNotification {
    localNotificationSchedule(notification: any): void;
  }
}
