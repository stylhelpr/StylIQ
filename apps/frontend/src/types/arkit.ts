// types/arkit.ts
// StylIQ

// Represents a single ARKit joint's 3D position
export type JointPosition = [number, number, number];

// Map of joint names → 3D coordinate
export interface SkeletonJoints {
  [jointName: string]: JointPosition;
}

// Event payload from native ARKitModule
export interface SkeletonUpdateEvent {
  timestamp: number;
  joints: SkeletonJoints;
}
