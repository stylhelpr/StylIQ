import {NativeModules} from 'react-native';
const {VisionAlignment} = NativeModules;

export function detectAlignment(
  imagePath: string,
): Promise<{aligned: boolean}> {
  return VisionAlignment.detectAlignment(imagePath);
}
