import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface Pose {
  points: Record<string, { metric: [number, number, number] }>;
}

let prevTpose = false;

/**
 * Detects if the user is raising both arms straight up.
 */
export function detectArmsUp(pose: Pose): boolean {
  const { points } = pose;
  const hipL = new Vector3(...points.hipL.metric);
  const hipR = new Vector3(...points.hipR.metric);
  const shoulderL = new Vector3(...points.shoulderL.metric);
  const shoulderR = new Vector3(...points.shoulderR.metric);
  const elbowL = new Vector3(...points.elbowL.metric);
  const elbowR = new Vector3(...points.elbowR.metric);
  const wristL = new Vector3(...points.wristL.metric);
  const wristR = new Vector3(...points.wristR.metric);

  const torsoL = shoulderL.subtract(hipL).normalize();
  const torsoR = shoulderR.subtract(hipR).normalize();
  const armL = elbowL.subtract(shoulderL).normalize();
  const armR = elbowR.subtract(shoulderR).normalize();
  const foreArmL = wristL.subtract(elbowL).normalize();
  const foreArmR = wristR.subtract(elbowR).normalize();

  const armLCos = Vector3.Dot(torsoL, armL);
  const armRCos = Vector3.Dot(torsoR, armR);
  const foreArmLCos = Vector3.Dot(foreArmL, armL);
  const foreArmRCos = Vector3.Dot(foreArmR, armR);

  const cosMin = Math.min(armLCos, armRCos, foreArmLCos, foreArmRCos);
  if (cosMin > 0.8) return true;
  if (cosMin < 0.7) return false;
  return false;
}

/**
 * Detects if the user is in a T-pose (arms extended horizontally).
 */
export function detectTPose(pose: Pose): boolean {
  const { points } = pose;
  const shoulderL = new Vector3(...points.shoulderL.metric);
  const shoulderR = new Vector3(...points.shoulderR.metric);
  const elbowL = new Vector3(...points.elbowL.metric);
  const elbowR = new Vector3(...points.elbowR.metric);

  const armL = elbowL.subtract(shoulderL).normalize();
  const armR = elbowR.subtract(shoulderR).normalize();

  // Check horizontal alignment: dot with world X axis close to ±1
  const horizontalAxis = new Vector3(1, 0, 0);
  const dotL = Math.abs(Vector3.Dot(armL, horizontalAxis));
  const dotR = Math.abs(Vector3.Dot(armR, horizontalAxis));

  // Allow small vertical tilt: cos threshold around 0.8
  return dotL > 0.8 && dotR > 0.8;
}
