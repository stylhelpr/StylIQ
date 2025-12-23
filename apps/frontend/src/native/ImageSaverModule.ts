import {NativeModules} from 'react-native';

interface ImageSaverModuleType {
  saveImageFromUrl(url: string): Promise<boolean>;
}

const {ImageSaverModule} = NativeModules;

export default ImageSaverModule as ImageSaverModuleType;
