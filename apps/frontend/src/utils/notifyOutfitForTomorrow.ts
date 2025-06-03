// utils/notifyOutfitForTomorrow.ts

import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_KEY = 'calendarOutfits';

export const notifyOutfitForTomorrow = async () => {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    if (enabled !== 'true') {
      console.log('🔕 Skipping notification — user disabled it.');
      return;
    }

    const data = await AsyncStorage.getItem(CALENDAR_KEY);
    if (!data) return;

    const calendar = JSON.parse(data);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const key = tomorrow.toISOString().split('T')[0];

    if (calendar[key]) {
      PushNotification.localNotificationSchedule({
        channelId: 'style-channel',
        title: '🌟 Tomorrow’s Look',
        message: 'Your AI stylist has a look ready for tomorrow!',
        date: new Date(Date.now() + 10 * 1000), // 🔁 Adjust time later
        allowWhileIdle: true,
      });
    }
  } catch (err) {
    console.warn('❌ Failed to notify for tomorrow:', err);
  }
};

/////////////

// // utils/notifyOutfitForTomorrow.ts

// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const CALENDAR_KEY = 'calendarOutfits';

// export const notifyOutfitForTomorrow = async () => {
//   try {
//     const data = await AsyncStorage.getItem(CALENDAR_KEY);
//     if (!data) return;

//     const calendar = JSON.parse(data);
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     const key = tomorrow.toISOString().split('T')[0];

//     if (calendar[key]) {
//       // Schedule notification 5 seconds from now for testing
//       (PushNotification as any).localNotificationSchedule({
//         channelId: 'style-channel', // Must match created channelId
//         title: '📅 Outfit Reminder',
//         message: 'You planned an outfit for tomorrow!',
//         date: new Date(Date.now() + 5000), // 5 seconds from now
//         allowWhileIdle: true,
//         playSound: true,
//         soundName: 'default',
//         importance: 4, // optional but helpful
//         vibrate: true,
//       });
//     }
//   } catch (err) {
//     console.warn('❌ Failed to notify for tomorrow:', err);
//   }
// };
