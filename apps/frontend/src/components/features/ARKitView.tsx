// ARKitView.tsx — final stable version
import React, {useEffect} from 'react';
import {
  requireNativeComponent,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';

const {ARKitModule} = NativeModules;

const NativeARView = requireNativeComponent('ARKitView');

export default function ARKitView(props: any) {
  useEffect(() => {
    const emitter = new NativeEventEmitter(ARKitModule);
    const sub = emitter.addListener('ARKitViewReady', () => {
      ARKitModule.startTracking();
    });

    return () => {
      ARKitModule.stopTracking();
      sub.remove();
    };
  }, []);

  return <NativeARView {...props} />;
}

//////////////////

// // ARKitView.tsx
// import React, {useEffect} from 'react';
// import {
//   requireNativeComponent,
//   NativeModules,
//   NativeEventEmitter,
// } from 'react-native';

// const {ARKitModule} = NativeModules;

// export interface ARKitViewProps {
//   style?: any;
// }

// const NativeARView = requireNativeComponent<ARKitViewProps>('ARKitView');

// export default function ARKitView(props: ARKitViewProps) {
//   useEffect(() => {
//     const emitter = new NativeEventEmitter(ARKitModule);

//     // Wait for native view to be fully initialized
//     const sub = emitter.addListener('ARKitViewReady', () => {
//       console.log('📣 JS received ARKitViewReady → starting AR session');
//       ARKitModule.startTracking();
//     });

//     return () => {
//       console.log('📌 ARKitView unmounted → stopping AR session');
//       ARKitModule.stopTracking();
//       sub.remove();
//     };
//   }, []);

//   return <NativeARView {...props} />;
// }
