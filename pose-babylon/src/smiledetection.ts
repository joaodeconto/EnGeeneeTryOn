import { NormalizedLandmarkList } from '@mediapipe/face_mesh';
export { isPositiveReaction };

let smileHistory: number[] = [];
const historySize = 5;

function isPositiveReaction(landmarks: NormalizedLandmarkList): boolean {
  const leftCorner = landmarks[61];
  const rightCorner = landmarks[291];
  const upperLip = landmarks[13];
  const lowerLip = landmarks[14];

  // Face size proxy (temples)
  const faceWidth = Math.hypot(
    landmarks[454].x - landmarks[234].x,
    landmarks[454].y - landmarks[234].y
  );

  const mouthHeight = Math.hypot(
    lowerLip.x - upperLip.x,
    lowerLip.y - upperLip.y
  );
  const mouthWidth = Math.hypot(
    rightCorner.x - leftCorner.x,
    rightCorner.y - leftCorner.y
  );

  const normalizedMouthHeight = mouthHeight / faceWidth;
  const normalizedMouthWidth = mouthWidth / faceWidth;

  // Normalize smile curvature by face width
  const leftSmileCurve = (upperLip.y - leftCorner.y) / faceWidth;
  const rightSmileCurve = (upperLip.y - rightCorner.y) / faceWidth;
  const smileCurveAvg = (leftSmileCurve + rightSmileCurve) / 2;

  smileHistory.push(smileCurveAvg);
  if (smileHistory.length > historySize) smileHistory.shift();

  const avgSmileCurve =
    smileHistory.reduce((a, b) => a + b, 0) / smileHistory.length;

  // Tweaked thresholds after normalization
  const smileCurveThreshold = 0.015;
  const laughHeightThreshold = 0.07;
  const laughWidthThreshold = 1.4;

  const isSmileOnly = avgSmileCurve > smileCurveThreshold;
  const isLaugh =
    isSmileOnly &&
    normalizedMouthHeight > laughHeightThreshold &&
    normalizedMouthWidth > laughWidthThreshold;

  return isSmileOnly || isLaugh;
}
