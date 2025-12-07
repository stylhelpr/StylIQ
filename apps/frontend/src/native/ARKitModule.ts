import {NativeModules} from 'react-native';

const {ARKitModule} = NativeModules;

export default ARKitModule as {
  startTracking(): void;
  stopTracking(): void;
};
