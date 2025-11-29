// ARKitModule.ts
// TurboModule spec for RN New Architecture

import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface ARKitModuleSpec extends TurboModule {
  startTracking(): void;
  stopTracking(): void;
}

const ARKitModule =
  TurboModuleRegistry.getEnforcing<ARKitModuleSpec>('ARKitModule');

export default ARKitModule;
