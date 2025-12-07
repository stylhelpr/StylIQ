import {NativeModules, Platform} from 'react-native';

const Native = NativeModules.StylIQDynamicIslandModule;

export const DynamicIsland = {
  async isEnabled() {
    if (Platform.OS !== 'ios') return false;
    return await Native.areActivitiesEnabled();
  },

  async start(title, message) {
    if (Platform.OS !== 'ios') return;
    return await Native.startActivity(title, message);
  },

  async update(message) {
    if (Platform.OS !== 'ios') return;
    return await Native.updateActivity(message);
  },

  async end() {
    if (Platform.OS !== 'ios') return;
    return await Native.endActivity();
  },

  async resetAll() {
    if (Platform.OS !== 'ios') return;
    return await Native.endAllActivities(); // <-- THIS is the missing piece
  },
};
