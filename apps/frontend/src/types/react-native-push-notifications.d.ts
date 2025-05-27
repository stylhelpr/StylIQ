declare module 'react-native-push-notification' {
  export interface Notification {
    title?: string;
    message?: string;
    userInfo?: any;
    data?: any;
  }

  export interface ChannelConfig {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface ConfigureOptions {
    onNotification: (notification: Notification) => void;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  const PushNotification: {
    configure: (options: ConfigureOptions) => void;
    localNotification: (notification: Notification) => void;
    createChannel: (
      config: ChannelConfig,
      cb?: (created: boolean) => void,
    ) => void;
  };

  export default PushNotification;
}
