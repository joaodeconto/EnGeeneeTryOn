import { NormalizedLandmarkList } from '@mediapipe/face_mesh';
export { isPositiveReaction, exportSmileLogAsCSV };

let smileHistory: number[] = [];

const smileLog: { timestamp: string, duration: number }[] = [];
let smileStartTime: number = 0;
let smileEndCandidateTime: number | null = null;
let smiling = false;
const SMILE_HOLD_DURATION = 1500; // ms
const SMILE_MERGE_WINDOW = 3000;  // ms
const totalSmiles = smileLog.length;
const firstSmile = smileLog[0]?.timestamp || "N/A";
const lastSmile = smileLog[smileLog.length - 1]?.timestamp || "N/A";

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
  const smileCurveThreshold = 0.012;
  const laughHeightThreshold = .8;
  const laughWidthThreshold = .8;

  const isSmileOnly = avgSmileCurve > smileCurveThreshold;
  const isLaugh =
    normalizedMouthHeight > laughHeightThreshold &&
    normalizedMouthWidth > laughWidthThreshold;   
    SmileLog(isSmileOnly || isLaugh);
  return isSmileOnly || isLaugh;
}
function SmileLog(isSmiling: boolean) {
  const now = Date.now();

  if (isSmiling) {
    if (!smiling) {
      // New smile started
      smiling = true;
      smileStartTime = now;
      smileEndCandidateTime = null;
    } else if (smileEndCandidateTime) {
      // Smile resumed within merge window
      const gap = now - smileEndCandidateTime;
      if (gap <= SMILE_MERGE_WINDOW) {
        console.log("🙂 Smile resumed, merging...");
        smileEndCandidateTime = null;
      } else {
        // Treat as new smile
        smileStartTime = now;
      }
    }
  } else {
    if (smiling && !smileEndCandidateTime) {
      // First frame we lose smile — start waiting
      smileEndCandidateTime = now;
      return;
    }

    if (smiling && smileEndCandidateTime && now - smileEndCandidateTime > SMILE_MERGE_WINDOW) {
      // Smile has definitely ended
      const duration = smileEndCandidateTime - smileStartTime;
      if (duration >= SMILE_HOLD_DURATION) {
        const timestamp = new Date(smileEndCandidateTime).toISOString();
        smileLog.push({ timestamp, duration });
        console.log(`✅ Smile confirmed and logged. Duration: ${duration}ms at ${timestamp}`);
      } else {
        console.log("😐 Smile too short, discarded.");
      }

      // Reset
      smiling = false;
      smileStartTime = 0;
      smileEndCandidateTime = null;
    }
  }
}

function exportSmileLogAsCSV() {
  if (smileLog.length === 0) {
    alert("No smiles to export yet!");
    return;
  }

  const headers = ["Timestamp", "Duration"];
  const rows = smileLog.map(entry => [entry.timestamp, entry.duration]);
  const csvContent =
    [headers, ...rows].map(e => e.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `smile_log_${Date.now()}.csv`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

