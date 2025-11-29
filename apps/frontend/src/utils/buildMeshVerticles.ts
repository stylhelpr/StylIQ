// buildMeshVertices.ts — StylIQ Mesh Utils
import {NormalizedResult} from '../utils/normalizeJoints';

export function buildMeshVertices(normalized: NormalizedResult) {
  const {front, side} = normalized;
  const vertices: number[] = [];

  // ⚙️ Tuned calibration for realistic proportions
  const depthScale = 0.55; // give a bit more torso thickness
  const zOffset = -0.12; // push mesh slightly back toward mirror
  const yOffset = -0.01; // minor center lift
  const spreadFactor = 1.28; // widen shoulders/hips more

  // ⬇️ Main loop with joint filtering
  const skip = ['finger', 'toe', 'eyeball']; // keep hand + eye center joints
  for (const [name, f] of Object.entries(front.joints)) {
    if (skip.some(k => name.includes(k))) continue; // skip micro joints
    const s = side.joints[name];
    if (!f || !s) continue;

    const x = f[0] * spreadFactor;
    const y = (f[1] + s[1]) / 2 + yOffset;
    const z = s[2] * depthScale + zOffset;

    vertices.push(x, y, z);
  }

  return new Float32Array(vertices);
}

/////////////////

// // buildMeshVertices.ts — StylIQ Mesh Utils
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // ⚙️ Tuned calibration for correct human thickness and placement
//   const depthScale = 0.35;
//   const zOffset = -0.1;
//   const yOffset = -0.015;

//   // ⬇️ Insert this loop (replaces your old one)
//   const skip = ['hand', 'finger', 'eye', 'toe', 'eyeball', 'thumb'];
//   for (const [name, f] of Object.entries(front.joints)) {
//     if (skip.some(k => name.includes(k))) continue; // filter tiny joints
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     const x = f[0];
//     const y = (f[1] + s[1]) / 2 + yOffset;
//     const z = s[2] * depthScale + zOffset;

//     vertices.push(x, y, z);
//   }

//   return new Float32Array(vertices);
// }

//////////////////

// // buildMeshVertices.ts — StylIQ Mesh Utils
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // ⚙️ Tuned calibration for correct human thickness and placement
//   const depthScale = 0.22; // realistic torso depth
//   const zOffset = -0.1; // push mesh slightly back
//   const yOffset = -0.02; // raise mesh slightly

//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Merge front + side, average height, compress depth
//     const x = f[0];
//     const y = (f[1] + s[1]) / 2 + yOffset;
//     const z = s[2] * depthScale + zOffset;

//     vertices.push(x, y, z);
//   }

//   return new Float32Array(vertices);
// }

////////////////////

// // buildMeshVertices.ts — StylIQ Mesh Utils
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // ⚙️ Tuned calibration for correct human thickness and placement
//   const depthScale = 0.18; // realistic torso depth
//   const zOffset = -0.07; // push mesh slightly farther back
//   const yOffset = -0.05; // lower mesh slightly for natural alignment

//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Merge front + side, average height, compress depth
//     const x = f[0];
//     const y = (f[1] + s[1]) / 2 + yOffset;
//     const z = s[2] * depthScale + zOffset;

//     vertices.push(x, y, z);
//   }

//   return new Float32Array(vertices);
// }

//////////////

// // buildMeshVertices.ts — StylIQ Mesh Utils
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // ⚙️ Tuned calibration for correct human thickness and placement
//   const depthScale = 0.18; // slightly tighter for realistic torso depth
//   const zOffset = -0.05; // shift backward (fixes forward-floating points)

//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Merge front + side, average height, compress depth
//     const x = f[0];
//     const y = (f[1] + s[1]) / 2;
//     const z = s[2] * depthScale + zOffset;

//     vertices.push(x, y, z);
//   }

//   return new Float32Array(vertices);
// }

//////////////////

// // buildMeshVertices.ts — StylIQ Mesh Utils
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // 👇 Adjust how much the side capture contributes to depth
//   const depthScale = 0.25; // 0.2–0.3 usually looks right for realistic human thickness

//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Merge positions with depth compression
//     const x = f[0];
//     const y = (f[1] + s[1]) / 2;
//     const z = s[2] * depthScale; // compress front-to-back

//     vertices.push(x, y, z);
//   }

//   return new Float32Array(vertices);
// }

/////////////////////

// // buildMeshVertices.ts – corrected body width/depth reconstruction
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Front: gives forward-facing height (Y) and horizontal spread (X)
//     // Side: gives depth (Z) and helps widen the body
//     const x = f[0]; // keep front's lateral position
//     const y = (f[1] + s[1]) / 2; // average vertical
//     const z = s[2]; // use side’s depth

//     vertices.push(x, y, z);
//   }

//   // Optional mirror to fill both sides of body
//   const mirrored: number[] = [];
//   for (let i = 0; i < vertices.length; i += 3) {
//     mirrored.push(-vertices[i], vertices[i + 1], vertices[i + 2]);
//   }
//   vertices.push(...mirrored);

//   return new Float32Array(vertices);
// }

///////////////

// // buildMeshVertices.ts — StylIQ Measurement Mesh Generator
// import {NormalizedResult} from '../utils/normalizeJoints';

// // Generate vertex array for front + side body reconstruction
// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   // For each joint, use front XY + side X for depth realism
//   // Front: captures forward-facing proportions
//   // Side: provides lateral depth
//   for (const [name, f] of Object.entries(front.joints)) {
//     const s = side.joints[name];
//     if (!f || !s) continue;

//     // Mix coordinate spaces:
//     // - Keep front.y (vertical)
//     // - Average front.x with side.z (depth)
//     // - Keep side.x as lateral offset
//     const x = (f[0] + s[2]) / 2; // lateral
//     const y = (f[1] + s[1]) / 2; // vertical
//     const z = (f[2] + s[0]) / 2; // depth

//     vertices.push(x, y, z);
//   }

//   // Add mirrored side to give fuller volume for visual preview
//   // (optional; improves 3D shape perception)
//   const mirrored: number[] = [];
//   for (let i = 0; i < vertices.length; i += 3) {
//     mirrored.push(-vertices[i], vertices[i + 1], vertices[i + 2]);
//   }
//   vertices.push(...mirrored);

//   return new Float32Array(vertices);
// }

///////////////////////

// // buildMeshVertices.ts — generates vertex array for native mesh render
// import {NormalizedResult} from '../utils/normalizeJoints';

// export function buildMeshVertices(normalized: NormalizedResult) {
//   const {front, side} = normalized;
//   const vertices: number[] = [];

//   Object.entries(front.joints).forEach(([name, f]) => {
//     const s = side.joints[name];
//     if (!f || !s) return;
//     // Combine X from side for depth realism
//     const avg = [(f[0] + s[0]) / 2, (f[1] + s[1]) / 2, (f[2] + s[2]) / 2];
//     vertices.push(...avg);
//   });

//   return new Float32Array(vertices);
// }
