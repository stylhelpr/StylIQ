// types/react-native-push-notification.d.ts
declare module 'react-native-push-notification' {
  interface PushNotificationObject {
    message: string;
    date?: Date;
    title?: string;
    playSound?: boolean;
    soundName?: string;
    channelId?: string;
    allowWhileIdle?: boolean;
  }

  export function configure(options: any): void;
  export function localNotification(notification: PushNotificationObject): void;
  export function localNotificationSchedule(
    notification: PushNotificationObject,
  ): void;
  export function createChannel(
    config: {channelId: string; channelName: string},
    cb?: (created: boolean) => void,
  ): void;
}
