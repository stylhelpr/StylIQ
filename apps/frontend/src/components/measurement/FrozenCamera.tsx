// src/components/measurement/FrozenCamera.tsx
import React from 'react';
import {Camera} from 'react-native-vision-camera';

const FrozenCamera = React.memo(
  (props: any) => {
    return <Camera {...props} />;
  },
  () => true,
);

export default FrozenCamera;

///////////////////

// // src/components/measurement/FrozenCamera.tsx
// import React from 'react';
// import {Camera} from 'react-native-vision-camera';

// // Correct React.memo usage.
// // 1st arg: component
// // 2nd arg: propsAreEqual() → ALWAYS returns true.
// const FrozenCamera = React.memo(
//   (props: any) => {
//     return <Camera {...props} />;
//   },
//   () => true,
// );

// export default FrozenCamera;
