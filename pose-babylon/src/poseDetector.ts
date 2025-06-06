import { Vector3 } from "@babylonjs/core/Maths/math.vector";


export function detectArmsUp(pose: any): boolean {

    // Keypoints
    const { points } = pose;
    const hipL = new Vector3(...points.hipL.metric);
    const hipR = new Vector3(...points.hipR.metric);
    const shoulderL = new Vector3(...points.shoulderL.metric);
    const shoulderR = new Vector3(...points.shoulderR.metric);
    const elbowL = new Vector3(...points.elbowL.metric);
    const elbowR = new Vector3(...points.elbowR.metric);
    const wristL = new Vector3(...points.wristL.metric);
    const wristR = new Vector3(...points.wristR.metric);
    // Arm vectors
    const torsoL = shoulderL.subtract(hipL).normalize();
    const torsoR = shoulderR.subtract(hipR).normalize();
    const armL = elbowL.subtract(shoulderL).normalize();
    const armR = elbowR.subtract(shoulderR).normalize();
    const foreArmL = wristL.subtract(elbowL).normalize();
    const foreArmR = wristR.subtract(elbowR).normalize();
    // Dot product of unit vectors gives cos of angle between
    // If vectors are parallel, angle is close to 0, cos to 1
    const armLCos = Vector3.Dot(torsoL, armL);
    const armRCos = Vector3.Dot(torsoR, armR);
    const foreArmLCos = Vector3.Dot(foreArmL, armL);
    const foreArmRCos = Vector3.Dot(foreArmR, armR);
    // Hands are up if all vectors have almost the same direction
    // Add hysteresis when changing mouth state to reduce noise
    const cosMin = Math.min(armLCos, armRCos, foreArmLCos, foreArmRCos);
    if (cosMin > 0.8)
        return true;
    if (cosMin < 0.7)
        return false;
    // Process the pose parameter here
    console.log("Received pose:", pose);

    // Return a boolean value based on some condition
    return pose !== null && pose !== undefined;
}