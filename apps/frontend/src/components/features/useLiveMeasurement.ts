// useLiveMeasurement.ts
// StylIQ

import {useEffect, useState} from 'react';
import {NativeEventEmitter} from 'react-native';
import ARKitModule from './ARKitModuleNative';

// Required for New Architecture
const emitter = new NativeEventEmitter({
  addListener: () => {},
  removeListeners: () => {},
});

export default function useLiveMeasurement() {
  const [joints, setJoints] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (!ARKitModule) {
      console.error('❌ ARKitModule is NULL — TurboModule not registered');
      return;
    }

    // ❌ DO NOT startTracking() here — ARKitView does it
    // ❌ DO NOT stopTracking() here — ARKitView does it

    const subscription = emitter.addListener(
      'onSkeletonUpdate',
      (event: {joints: Record<string, number[]>}) => {
        if (!event || !event.joints) return;

        const clean: Record<string, number[]> = {};
        for (const key in event.joints) {
          const v = event.joints[key];
          if (
            Array.isArray(v) &&
            v.length === 3 &&
            v.every(n => typeof n === 'number' && !isNaN(n))
          ) {
            clean[key] = v;
          }
        }

        setJoints(clean);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return joints;
}

////////////////

// // useLiveMeasurement.ts
// // StylIQ

// import {useEffect, useState} from 'react';
// import {NativeEventEmitter} from 'react-native';
// import ARKitModule from './ARKitModuleNative';

// // Required for New Architecture
// const emitter = new NativeEventEmitter({
//   addListener: () => {},
//   removeListeners: () => {},
// });

// function useLiveMeasurement() {
//   const [joints, setJoints] = useState<Record<string, number[]>>({});

//   useEffect(() => {
//     if (!ARKitModule) {
//       console.error('❌ ARKitModule is NULL — TurboModule not registered');
//       return;
//     }

//     ARKitModule.startTracking();

//     const subscription = emitter.addListener('onSkeletonUpdate', event => {
//       if (!event || !event.joints || typeof event.joints !== 'object') {
//         // Ignore incomplete native events that cause NaN
//         return;
//       }

//       // Filter out any invalid joints
//       const clean: Record<string, number[]> = {};
//       for (const key in event.joints) {
//         const v = event.joints[key];
//         if (
//           Array.isArray(v) &&
//           v.length === 3 &&
//           v.every(n => typeof n === 'number' && !isNaN(n))
//         ) {
//           clean[key] = v;
//         }
//       }

//       setJoints(clean);
//     });

//     return () => {
//       ARKitModule.stopTracking();
//       subscription.remove();
//     };
//   }, []);

//   return joints;
// }

// export default useLiveMeasurement;

/////////////////

// // useLiveMeasurement.ts
// // StylIQ

// import {useEffect, useState} from 'react';
// import {NativeEventEmitter} from 'react-native';
// import ARKitModule from './ARKitModuleNative'; // TurboModule

// // NEW ARCH FIX — EventEmitter requires mocked listener methods
// const emitter = new NativeEventEmitter({
//   addListener: () => {},
//   removeListeners: () => {},
// });

// function useLiveMeasurement() {
//   const [joints, setJoints] = useState<Record<string, number[]>>({});

//   useEffect(() => {
//     if (!ARKitModule) {
//       console.error('❌ ARKitModule is NULL — TurboModule not registered');
//       return;
//     }

//     // Start ARKit body tracking
//     ARKitModule.startTracking();

//     const subscription = emitter.addListener(
//       'onSkeletonUpdate',
//       (event: {joints: Record<string, number[]>}) => {
//         setJoints(event.joints);
//       },
//     );

//     return () => {
//       ARKitModule.stopTracking();
//       subscription.remove();
//     };
//   }, []);

//   return joints;
// }

// export default useLiveMeasurement;
