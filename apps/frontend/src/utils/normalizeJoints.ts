// normalizeJoints.ts — StylIQ Measurement Utils
// Aligns front + side ARKit joint maps to a shared origin and scale for mesh generation.

export type JointMap = Record<string, number[]>;

interface NormalizedSet {
  joints: JointMap;
  center: [number, number, number];
  scale: number;
}

export interface NormalizedResult {
  front: NormalizedSet;
  side: NormalizedSet;
}

// Helper: get centroid of all joint positions
function getCentroid(joints: JointMap): [number, number, number] {
  const values = Object.values(joints);
  if (!values.length) return [0, 0, 0];
  const sum = values.reduce(
    (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
    [0, 0, 0],
  );
  return [
    sum[0] / values.length,
    sum[1] / values.length,
    sum[2] / values.length,
  ];
}

// Helper: estimate scale factor (body height inverse)
function getScale(joints: JointMap): number {
  const head = joints['head_joint'];
  const foot = joints['left_foot_joint'] || joints['right_foot_joint'];
  if (!head || !foot) return 1;
  const dy = Math.abs(head[1] - foot[1]);
  return dy > 0 ? 1 / dy : 1;
}

// Helper: rotate around Y axis by degrees
function rotateY(
  [x, y, z]: number[],
  degrees: number,
): [number, number, number] {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - z * sin, y, x * sin + z * cos];
}

export function normalizeJoints(
  front: JointMap,
  side: JointMap,
): NormalizedResult {
  const frontCenter = getCentroid(front);
  const sideCenter = getCentroid(side);
  const frontScale = getScale(front);
  const sideScale = getScale(side);

  // Use average scale so both sets match in proportion
  const unifiedScale = (frontScale + sideScale) / 2;

  const normalize = (
    joints: JointMap,
    center: number[],
    scale: number,
    rotateDegrees?: number,
  ): JointMap => {
    const out: JointMap = {};
    for (const [k, v] of Object.entries(joints)) {
      const shifted: [number, number, number] = [
        (v[0] - center[0]) * scale,
        (v[1] - center[1]) * scale,
        (v[2] - center[2]) * scale,
      ];
      out[k] = rotateDegrees ? rotateY(shifted, rotateDegrees) : shifted;
    }
    return out;
  };

  return {
    front: {
      joints: normalize(front, frontCenter, unifiedScale),
      center: frontCenter,
      scale: unifiedScale,
    },
    side: {
      // 🔁 rotate side capture −90° around Y so it faces same direction
      joints: normalize(side, sideCenter, unifiedScale, -90),
      center: sideCenter,
      scale: unifiedScale,
    },
  };
}

//////////////////////

// // normalizeJoints.ts — StylIQ Measurement Utils
// // Aligns front + side ARKit joint maps to a shared origin and scale for mesh generation.

// export type JointMap = Record<string, number[]>;

// interface NormalizedSet {
//   joints: JointMap;
//   center: [number, number, number];
//   scale: number;
// }

// export interface NormalizedResult {
//   front: NormalizedSet;
//   side: NormalizedSet;
// }

// // Helper: get centroid of all joint positions
// function getCentroid(joints: JointMap): [number, number, number] {
//   const values = Object.values(joints);
//   if (!values.length) return [0, 0, 0];
//   const sum = values.reduce(
//     (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
//     [0, 0, 0],
//   );
//   return [
//     sum[0] / values.length,
//     sum[1] / values.length,
//     sum[2] / values.length,
//   ];
// }

// // Helper: estimate scale factor (body height inverse)
// function getScale(joints: JointMap): number {
//   const head = joints['head_joint'];
//   const foot = joints['left_foot_joint'] || joints['right_foot_joint'];
//   if (!head || !foot) return 1;
//   const dy = Math.abs(head[1] - foot[1]);
//   return dy > 0 ? 1 / dy : 1;
// }

// // Helper: rotate around Y axis by degrees
// function rotateY(
//   [x, y, z]: number[],
//   degrees: number,
// ): [number, number, number] {
//   const rad = (degrees * Math.PI) / 180;
//   const cos = Math.cos(rad);
//   const sin = Math.sin(rad);
//   return [x * cos - z * sin, y, x * sin + z * cos];
// }

// export function normalizeJoints(
//   front: JointMap,
//   side: JointMap,
// ): NormalizedResult {
//   const frontCenter = getCentroid(front);
//   const sideCenter = getCentroid(side);
//   const frontScale = getScale(front);
//   const sideScale = getScale(side);

//   // Use average scale so both sets match in proportion
//   const unifiedScale = (frontScale + sideScale) / 2;

//   const normalize = (
//     joints: JointMap,
//     center: number[],
//     scale: number,
//     rotateDegrees?: number,
//   ): JointMap => {
//     const out: JointMap = {};
//     for (const [k, v] of Object.entries(joints)) {
//       const shifted: [number, number, number] = [
//         (v[0] - center[0]) * scale,
//         (v[1] - center[1]) * scale,
//         (v[2] - center[2]) * scale,
//       ];
//       out[k] = rotateDegrees ? rotateY(shifted, rotateDegrees) : shifted;
//     }
//     return out;
//   };

//   return {
//     front: {
//       joints: normalize(front, frontCenter, unifiedScale),
//       center: frontCenter,
//       scale: unifiedScale,
//     },
//     side: {
//       // 🔁 rotate side capture −90° around Y so it faces same direction
//       joints: normalize(side, sideCenter, unifiedScale, -90),
//       center: sideCenter,
//       scale: unifiedScale,
//     },
//   };
// }

/////////////////////

// // normalizeJoints.ts — StylIQ Measurement Utils
// // Aligns front + side ARKit joint maps to a shared origin and scale for mesh generation.

// export type JointMap = Record<string, number[]>;

// interface NormalizedSet {
//   joints: JointMap;
//   center: [number, number, number];
//   scale: number;
// }

// export interface NormalizedResult {
//   front: NormalizedSet;
//   side: NormalizedSet;
// }

// // Helper: get centroid of all joint positions
// function getCentroid(joints: JointMap): [number, number, number] {
//   const values = Object.values(joints);
//   if (!values.length) return [0, 0, 0];
//   const sum = values.reduce(
//     (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
//     [0, 0, 0],
//   );
//   return [
//     sum[0] / values.length,
//     sum[1] / values.length,
//     sum[2] / values.length,
//   ];
// }

// // Helper: scale factor (body height)
// function getScale(joints: JointMap): number {
//   const head = joints['head_joint'];
//   const foot = joints['left_foot_joint'] || joints['right_foot_joint'];
//   if (!head || !foot) return 1;
//   const dy = Math.abs(head[1] - foot[1]);
//   return dy > 0 ? 1 / dy : 1;
// }

// export function normalizeJoints(
//   front: JointMap,
//   side: JointMap,
// ): NormalizedResult {
//   const frontCenter = getCentroid(front);
//   const sideCenter = getCentroid(side);
//   const frontScale = getScale(front);
//   const sideScale = getScale(side);

//   const normalize = (
//     joints: JointMap,
//     center: number[],
//     scale: number,
//   ): JointMap => {
//     const out: JointMap = {};
//     for (const [k, v] of Object.entries(joints)) {
//       out[k] = [
//         (v[0] - center[0]) * scale,
//         (v[1] - center[1]) * scale,
//         (v[2] - center[2]) * scale,
//       ];
//     }
//     return out;
//   };

//   return {
//     front: {
//       joints: normalize(front, frontCenter, frontScale),
//       center: frontCenter,
//       scale: frontScale,
//     },
//     side: {
//       joints: normalize(side, sideCenter, sideScale),
//       center: sideCenter,
//       scale: sideScale,
//     },
//   };
// }
