import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {
  FilamentScene,
  FilamentView,
  DefaultLight,
  Camera,
  useModel,
  ModelRenderer,
  useFilamentContext,
  RenderCallback,
} from 'react-native-filament';
import Sneaker from '../screens/sneakers_seen.glb';

function SceneContent() {
  const model = useModel(Sneaker);
  const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;
  const {transformManager} = useFilamentContext();

  const renderCallback: RenderCallback = useCallback(() => {
    'worklet';
    if (!rootEntity) return;

    // Rotate around Y at a steady rate
    transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
  }, [rootEntity, transformManager]);

  return (
    <FilamentView style={styles.view} renderCallback={renderCallback}>
      {/* @ts-ignore */}
      <DefaultLight intensity={100000} color={[1, 1, 1]} />

      {/* ✅ Center the model manually before rotation */}
      <ModelRenderer
        model={model}
        translate={[0, -1, -0.2]} // move it down until the midpoint aligns with 0,0,0
        scale={[13, 13, 13]}
      />

      {/* ✅ Keep camera aimed at origin */}
      <Camera
        // @ts-ignore
        position={[0, 0, 0]}
        // @ts-ignore
        target={[0, 0, 0]}
      />
    </FilamentView>
  );
}

export default function MiniDronePreview() {
  return (
    <View style={styles.container}>
      <FilamentScene>
        <SceneContent />
      </FilamentScene>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 500,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#030000ff',
  },
  view: {flex: 1},
});

//////////////////

// import React, {useCallback} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Camera,
//   useModel,
//   ModelRenderer, // renders a model loaded via useModel()
//   useFilamentContext, // gives you transformManager, etc.
//   RenderCallback,
// } from 'react-native-filament';
// // import Sneaker from '../screens/DamagedHelmet.glb';
// import Sneaker from '../screens/sneakers_seen.glb';

// function SceneContent() {
//   // Load the model via hook (must be under FilamentScene)
//   const model = useModel(Sneaker);
//   const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;

//   // Access the TransformManager from the Filament context
//   const {transformManager} = useFilamentContext();

//   // Worklet called every frame on the render thread
//   const renderCallback: RenderCallback = useCallback(() => {
//     'worklet';
//     if (!rootEntity) return;

//     // Rotate a tiny bit around Y *every frame* and multiply with current transform
//     // This avoids having to track angle in JS.
//     transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
//   }, [rootEntity, transformManager]);

//   return (
//     <FilamentView style={styles.view} renderCallback={renderCallback}>
//       {/*
//   ✅ If DefaultLight supports props, they’ll apply.
//   ✅ If it doesn’t, TS will ignore them safely.
// */}
//       {/* @ts-ignore */}
//       <DefaultLight intensity={100000} color={[1, 1, 1]} />
//       {/* Use ModelRenderer when you loaded the model with useModel() */}
//       <ModelRenderer
//         model={model}
//         // Use Filament’s prop names: translate/rotate/scale (radians!)
//         translate={[-1, -1, -1]}
//         scale={[12, 12, 12]}
//       />
//       <Camera
//         // @ts-ignore
//         position={[0, 0, 1.8]}
//         // @ts-ignore
//         target={[0, 0, 0]}
//       />
//     </FilamentView>
//   );
// }

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <SceneContent />
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 300,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000000ff',
//   },
//   view: {flex: 1},
// });

//////////////////

// import React, {useCallback} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Camera,
//   useModel,
//   ModelRenderer, // renders a model loaded via useModel()
//   useFilamentContext, // gives you transformManager, etc.
//   RenderCallback,
// } from 'react-native-filament';
// // ⚠️ Make sure metro knows .glb (metro.config.js -> assetExts includes 'glb')
// import Sneaker from '../screens/morphtargets.glb';

// function SceneContent() {
//   // Load the model via hook (must be under FilamentScene)
//   const model = useModel(Sneaker);
//   const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;

//   // Access the TransformManager from the Filament context
//   const {transformManager} = useFilamentContext();

//   // Worklet called every frame on the render thread
//   const renderCallback: RenderCallback = useCallback(() => {
//     'worklet';
//     if (!rootEntity) return;

//     // Rotate a tiny bit around Y *every frame* and multiply with current transform
//     // This avoids having to track angle in JS.
//     transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
//   }, [rootEntity, transformManager]);

//   return (
//     <FilamentView style={styles.view} renderCallback={renderCallback}>
//       {/*
//   ✅ If DefaultLight supports props, they’ll apply.
//   ✅ If it doesn’t, TS will ignore them safely.
// */}
//       {/* @ts-ignore */}
//       <DefaultLight intensity={100000} color={[1, 1, 1]} />
//       {/* Use ModelRenderer when you loaded the model with useModel() */}
//       <ModelRenderer
//         model={model}
//         // Use Filament’s prop names: translate/rotate/scale (radians!)
//         translate={[0, -2.5, 0]}
//         scale={[3, 3, 3]}
//       />
//       <Camera
//         // @ts-ignore
//         position={[0, 0, 1.8]}
//         // @ts-ignore
//         target={[0, 0, 0]}
//       />
//     </FilamentView>
//   );
// }

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <SceneContent />
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 400,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000000ff',
//   },
//   view: {flex: 1},
// });

/////////////

// import React, {useCallback} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Camera,
//   useModel,
//   ModelRenderer, // renders a model loaded via useModel()
//   useFilamentContext, // gives you transformManager, etc.
//   RenderCallback,
// } from 'react-native-filament';
// // ⚠️ Make sure metro knows .glb (metro.config.js -> assetExts includes 'glb')
// import Sneaker from '../screens/morphtargets.glb';

// function SceneContent() {
//   // Load the model via hook (must be under FilamentScene)
//   const model = useModel(Sneaker);
//   const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;

//   // Access the TransformManager from the Filament context
//   const {transformManager} = useFilamentContext();

//   // Worklet called every frame on the render thread
//   const renderCallback: RenderCallback = useCallback(() => {
//     'worklet';
//     if (!rootEntity) return;

//     // Rotate a tiny bit around Y *every frame* and multiply with current transform
//     // This avoids having to track angle in JS.
//     transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
//   }, [rootEntity, transformManager]);

//   return (
//     <FilamentView style={styles.view} renderCallback={renderCallback}>
//       {/*
//   ✅ If DefaultLight supports props, they’ll apply.
//   ✅ If it doesn’t, TS will ignore them safely.
// */}
//       {/* @ts-ignore */}
//       <DefaultLight intensity={100000} color={[1, 1, 1]} />
//       {/* Use ModelRenderer when you loaded the model with useModel() */}
//       <ModelRenderer
//         model={model}
//         // Use Filament’s prop names: translate/rotate/scale (radians!)
//         translate={[0, -1.9, 0]}
//         scale={[3, 3, 3]}
//       />
//       <Camera
//         // @ts-ignore
//         position={[0, 0, 1.8]}
//         // @ts-ignore
//         target={[0, 0, 0]}
//       />
//     </FilamentView>
//   );
// }

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <SceneContent />
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 500,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   view: {flex: 1},
// });

//////////////////

// import React, {useCallback} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Camera,
//   useModel,
//   ModelRenderer, // renders a model loaded via useModel()
//   useFilamentContext, // gives you transformManager, etc.
//   RenderCallback,
// } from 'react-native-filament';
// // ⚠️ Make sure metro knows .glb (metro.config.js -> assetExts includes 'glb')
// import Sneaker from '../screens/sneakers_seen.glb';

// function SceneContent() {
//   // Load the model via hook (must be under FilamentScene)
//   const model = useModel(Sneaker);
//   const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;

//   // Access the TransformManager from the Filament context
//   const {transformManager} = useFilamentContext();

//   // Worklet called every frame on the render thread
//   const renderCallback: RenderCallback = useCallback(() => {
//     'worklet';
//     if (!rootEntity) return;

//     // Rotate a tiny bit around Y *every frame* and multiply with current transform
//     // This avoids having to track angle in JS.
//     transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
//   }, [rootEntity, transformManager]);

//   return (
//     <FilamentView style={styles.view} renderCallback={renderCallback}>
//       <DefaultLight intensity={100000} color={[1, 1, 1]} />
//       {/* Use ModelRenderer when you loaded the model with useModel() */}
//       <ModelRenderer
//         model={model}
//         // Use Filament’s prop names: translate/rotate/scale (radians!)
//         translate={[0, -0.1, 0]}
//         scale={[8, 8, 8]}
//       />
//       <Camera position={[0, 0, 1.8]} lookAt={[0, 0, 0]} />
//     </FilamentView>
//   );
// }

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <SceneContent />
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 500,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   view: {flex: 1},
// });

/////////////////

// import React, {useCallback} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Camera,
//   useModel,
//   ModelRenderer, // renders a model loaded via useModel()
//   useFilamentContext, // gives you transformManager, etc.
//   RenderCallback,
// } from 'react-native-filament';
// // ⚠️ Make sure metro knows .glb (metro.config.js -> assetExts includes 'glb')
// import Sneaker from '../screens/sneakers_seen.glb';

// function SceneContent() {
//   // Load the model via hook (must be under FilamentScene)
//   const model = useModel(Sneaker);
//   const rootEntity = model.state === 'loaded' ? model.rootEntity : undefined;

//   // Access the TransformManager from the Filament context
//   const {transformManager} = useFilamentContext();

//   // Worklet called every frame on the render thread
//   const renderCallback: RenderCallback = useCallback(() => {
//     'worklet';
//     if (!rootEntity) return;

//     // Rotate a tiny bit around Y *every frame* and multiply with current transform
//     // This avoids having to track angle in JS.
//     transformManager.setEntityRotation(rootEntity, 0.01, [0, 1, 0], true);
//   }, [rootEntity, transformManager]);

//   return (
//     <FilamentView style={styles.view} renderCallback={renderCallback}>
//       <DefaultLight intensity={100000} color={[1, 1, 1]} />
//       {/* Use ModelRenderer when you loaded the model with useModel() */}
//       <ModelRenderer
//         model={model}
//         // Use Filament’s prop names: translate/rotate/scale (radians!)
//         translate={[0, -0.1, 0]}
//         scale={[8, 8, 8]}
//       />
//       <Camera position={[0, 0, 1.8]} lookAt={[0, 0, 0]} />
//     </FilamentView>
//   );
// }

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <SceneContent />
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 500,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   view: {flex: 1},
// });

// //////////////////

// import React from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Model,
//   Animator,
//   Camera,
// } from 'react-native-filament';
// // import BusterDrone from '../screens/Seen_low_2K.glb'; // adjust path as needed
// import BusterDrone from '../screens/sneakers_seen.glb'; // adjust path as needed

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <FilamentView style={styles.view}>
//           {/* 💡 Lighting */}
//           <DefaultLight intensity={100000} color={[1, 1, 1]} />

//           {/* 🛸 Animated Model */}
//           <Model
//             source={BusterDrone}
//             scale={[8.0, 8.0, 8.0]} // ⬅️ Increase all axes equally
//             position={[0, -0.1, 0]} // optional slight adjustment
//           />

//           {/* 🎥 Camera */}
//           <Camera position={[0, 0, 1.8]} lookAt={[0, 0, 0]} />
//         </FilamentView>
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 500,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#050000ff',
//   },
//   view: {
//     flex: 1,
//   },
// });

/////////////////

// import React from 'react';
// import {View, StyleSheet} from 'react-native';
// import {
//   FilamentScene,
//   FilamentView,
//   DefaultLight,
//   Model,
//   Animator,
//   Camera,
// } from 'react-native-filament';
// import BusterDrone from '../screens/buster_drone.glb'; // adjust path as needed

// export default function MiniDronePreview() {
//   return (
//     <View style={styles.container}>
//       <FilamentScene>
//         <FilamentView style={styles.view}>
//           {/* 💡 Lighting */}
//           <DefaultLight intensity={100000} color={[1, 1, 1]} />

//           {/* 🛸 Animated Model */}
//           <Model
//             source={BusterDrone}
//             scale={[0.008, 0.008, 0.008]}
//             position={[0, -0.05, 0]}>
//             <Animator clipIndex={0} loop />
//           </Model>

//           {/* 🎥 Camera */}
//           <Camera position={[0, 0, 1.8]} lookAt={[0, 0, 0]} />
//         </FilamentView>
//       </FilamentScene>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: 500,
//     height: 500,
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   view: {
//     flex: 1,
//   },
// });
