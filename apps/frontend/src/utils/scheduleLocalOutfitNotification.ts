// apps/mobile/src/utils/scheduleLocalOutfitNotification.ts
import PushNotification from 'react-native-push-notification';

/**
 * Schedule a local notification for an upcoming outfit.
 */
export function scheduleLocalOutfitNotification(
  outfitName: string,
  scheduledForISO: string,
) {
  const fireDate = new Date(scheduledForISO);

  PushNotification.localNotificationSchedule({
    channelId: 'default', /// must match the channel you created at startup
    title: '📅 Outfit Reminder',
    message: `It's time to wear: ${outfitName}`,
    date: fireDate,
    allowWhileIdle: true,
    playSound: true,
    soundName: 'default',
    importance: 'high',
  });
}
