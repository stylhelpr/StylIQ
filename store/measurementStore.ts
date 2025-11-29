// measurementStore.ts — StylIQ (final calibrated version)
import {create} from 'zustand';
import {normalizeJoints} from '../apps/frontend/src/utils/normalizeJoints';
import {buildMeshVertices} from '../apps/frontend/src/utils/buildMeshVerticles';
import {NativeModules} from 'react-native';
const {ARKitModule} = NativeModules;

// ---------------------------------------------------
// ⚙️ Adjustable calibration multipliers
// ---------------------------------------------------
const CALIBRATION_MULTIPLIERS = {
  shoulders: 1.0, // already correct
  chest: 2.05, // converts half-width (~52cm) → full circumference (~107cm)
  waist: 2.0,
  hips: 2.1,
  inseam: 1.0, // vertical scale accurate from ARKit
};

// ---------------------------------------------------
// 📏 Zustand store definition
// ---------------------------------------------------
interface MeasurementState {
  frontJoints: Record<string, number[]> | null;
  sideJoints: Record<string, number[]> | null;
  frontCaptured: boolean;
  sideCaptured: boolean;
  computedResults: Record<string, number> | null;

  captureFront: (joints: Record<string, number[]>) => void;
  captureSide: (joints: Record<string, number[]>) => void;
  computeResults: (heightMeters: number) => void;
  reset: () => void;
}

// ---------------------------------------------------
// 🧩 Store implementation
// ---------------------------------------------------
export const useMeasurementStore = create<MeasurementState>((set, get) => ({
  frontJoints: null,
  sideJoints: null,
  frontCaptured: false,
  sideCaptured: false,
  computedResults: null,

  // ---------------------------------------------------
  // Capture front pose joints
  // ---------------------------------------------------
  captureFront: joints =>
    set({
      frontJoints: joints,
      frontCaptured: true,
    }),

  // ---------------------------------------------------
  // Capture side pose joints
  // ---------------------------------------------------
  captureSide: joints =>
    set({
      sideJoints: joints,
      sideCaptured: true,
    }),

  // ---------------------------------------------------
  // Compute normalized measurements
  // ---------------------------------------------------
  computeResults: heightMeters => {
    const {frontJoints: front, sideJoints: side} = get();
    if (!front || !side) {
      console.warn('⚠️ Missing front or side joints');
      return;
    }

    // 🧭 Normalize and rebuild mesh
    const normalized = normalizeJoints(front, side);
    const vertices = buildMeshVertices(normalized);
    ARKitModule.renderMesh(Array.from(vertices));

    const f = normalized.front.joints;
    const s = normalized.side.joints;

    // Simple Euclidean distance
    const dist = (a?: number[], b?: number[]) =>
      a && b
        ? Math.sqrt(
            (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
          )
        : 0;

    // Derive scaling factor based on true height
    const headY = f.head_joint?.[1] ?? 0;
    const footY = f.left_foot_joint?.[1] ?? 1;
    const scaleFactor = heightMeters / Math.abs(headY - footY);

    const getCm = (a: string, b: string) =>
      dist(f[a], f[b]) * scaleFactor * 100;

    // ---------------------------------------------------
    // 🧮 Compute & calibrate measurement set
    // ---------------------------------------------------
    const results = {
      shoulders:
        getCm('left_shoulder_1_joint', 'right_shoulder_1_joint') *
        CALIBRATION_MULTIPLIERS.shoulders,
      chest:
        getCm('left_arm_joint', 'right_arm_joint') *
        CALIBRATION_MULTIPLIERS.chest,
      waist:
        getCm('left_upLeg_joint', 'right_upLeg_joint') *
        CALIBRATION_MULTIPLIERS.waist,
      hips:
        getCm('left_leg_joint', 'right_leg_joint') *
        CALIBRATION_MULTIPLIERS.hips,
      inseam:
        dist(s.left_upLeg_joint, s.left_foot_joint) *
        scaleFactor *
        100 *
        CALIBRATION_MULTIPLIERS.inseam,
    };

    set({computedResults: results});
    console.log('✅ Final calibrated measurement results:', results);
  },

  // ---------------------------------------------------
  // Reset session
  // ---------------------------------------------------
  reset: () =>
    set({
      frontJoints: null,
      sideJoints: null,
      frontCaptured: false,
      sideCaptured: false,
      computedResults: null,
    }),
}));

//////////////////

// import {create} from 'zustand';
// import {normalizeJoints} from '../apps/frontend/src/utils/normalizeJoints';
// import {buildMeshVertices} from '../apps/frontend/src/utils/buildMeshVerticles';
// import {NativeModules} from 'react-native';
// const {ARKitModule} = NativeModules;

// interface MeasurementState {
//   frontJoints: Record<string, number[]> | null;
//   sideJoints: Record<string, number[]> | null;
//   frontCaptured: boolean;
//   sideCaptured: boolean;
//   computedResults: Record<string, number> | null;

//   captureFront: (joints: Record<string, number[]>) => void;
//   captureSide: (joints: Record<string, number[]>) => void;
//   computeResults: (heightMeters: number) => void;
//   reset: () => void;
// }

// export const useMeasurementStore = create<MeasurementState>((set, get) => ({
//   frontJoints: null,
//   sideJoints: null,
//   frontCaptured: false,
//   sideCaptured: false,
//   computedResults: null,

//   captureFront: joints =>
//     set({
//       frontJoints: joints,
//       frontCaptured: true,
//     }),

//   captureSide: joints =>
//     set({
//       sideJoints: joints,
//       sideCaptured: true,
//     }),

//   computeResults: heightMeters => {
//     const {frontJoints: front, sideJoints: side} = get();
//     if (!front || !side) return;

//     const normalized = normalizeJoints(front, side);
//     const vertices = buildMeshVertices(normalized);
//     ARKitModule.renderMesh(Array.from(vertices));

//     const f = normalized.front.joints;
//     const s = normalized.side.joints;
//     const dist = (a?: number[], b?: number[]) =>
//       a && b
//         ? Math.sqrt(
//             (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
//           )
//         : 0;

//     const headY = f.head_joint?.[1] ?? 0;
//     const footY = f.left_foot_joint?.[1] ?? 1;
//     const scaleFactor = heightMeters / Math.abs(headY - footY);

//     const getCm = (a: string, b: string) =>
//       dist(f[a], f[b]) * scaleFactor * 100;

//     const results = {
//       shoulders: getCm('left_shoulder_1_joint', 'right_shoulder_1_joint'),
//       chest: getCm('left_arm_joint', 'right_arm_joint'),
//       waist: getCm('left_upLeg_joint', 'right_upLeg_joint'),
//       hips: getCm('left_leg_joint', 'right_leg_joint'),
//       inseam: dist(s.left_upLeg_joint, s.left_foot_joint) * scaleFactor * 100,
//     };

//     set({computedResults: results});
//     console.log('✅ Computed measurement results:', results);
//   },

//   reset: () =>
//     set({
//       frontJoints: null,
//       sideJoints: null,
//       frontCaptured: false,
//       sideCaptured: false,
//       computedResults: null,
//     }),
// }));

///////////////////

// import {create} from 'zustand';

// interface MeasurementState {
//   frontJoints: Record<string, number[]> | null;
//   sideJoints: Record<string, number[]> | null;
//   frontCaptured: boolean;
//   sideCaptured: boolean;

//   captureFront: (joints: Record<string, number[]>) => void;
//   captureSide: (joints: Record<string, number[]>) => void;
//   reset: () => void;
// }

// export const useMeasurementStore = create<MeasurementState>(set => ({
//   frontJoints: null,
//   sideJoints: null,
//   frontCaptured: false,
//   sideCaptured: false,

//   captureFront: joints =>
//     set({
//       frontJoints: joints,
//       frontCaptured: true,
//     }),

//   captureSide: joints =>
//     set({
//       sideJoints: joints,
//       sideCaptured: true,
//     }),

//   reset: () =>
//     set({
//       frontJoints: null,
//       sideJoints: null,
//       frontCaptured: false,
//       sideCaptured: false,
//     }),
// }));

/////////////////

// import {create} from 'zustand';

// interface MeasurementState {
//   frontJoints: Record<string, number[]> | null;
//   frontCaptured: boolean;

//   captureFront: (joints: Record<string, number[]>) => void;
//   reset: () => void;
// }

// export const useMeasurementStore = create<MeasurementState>(set => ({
//   frontJoints: null,
//   frontCaptured: false,

//   captureFront: joints =>
//     set({
//       frontJoints: joints,
//       frontCaptured: true,
//     }),

//   reset: () =>
//     set({
//       frontJoints: null,
//       frontCaptured: false,
//     }),
// }));
