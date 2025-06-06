import { NormalizedLandmarkList } from '@mediapipe/face_mesh';

export interface SmileDetectorOptions {
  historySize?: number;
  smileHoldDuration?: number;       // milliseconds
  smileMergeWindow?: number;        // milliseconds
  smileCurveThreshold?: number;
  laughHeightThreshold?: number;
  laughWidthThreshold?: number;
}

export interface SmileLogEntry {
  timestamp: string;
  duration: number;
}

export class SmileDetector {
  private historySize: number;
  private smileHoldDuration: number;
  private smileMergeWindow: number;
  private smileCurveThreshold: number;
  private laughHeightThreshold: number;
  private laughWidthThreshold: number;

  private smileHistory: number[] = [];
  private smileLog: SmileLogEntry[] = [];

  private smiling: boolean = false;
  private smileStartTime: number = 0;
  private smileEndCandidateTime: number | null = null;

  constructor(options: SmileDetectorOptions = {}) {
    this.historySize = options.historySize ?? 5;
    this.smileHoldDuration = options.smileHoldDuration ?? 1500;
    this.smileMergeWindow = options.smileMergeWindow ?? 3000;
    this.smileCurveThreshold = options.smileCurveThreshold ?? 0.012;
    this.laughHeightThreshold = options.laughHeightThreshold ?? 0.35;
    this.laughWidthThreshold = options.laughWidthThreshold ?? 0.35;
  }

  /**
   * Process new landmarks frame. Returns true if a smile (or laugh) is detected this call.
   */
  public processLandmarks(landmarks: NormalizedLandmarkList): boolean {
    const now = Date.now();
    // Extract key points
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    // Face width proxy
    const templeLeft = landmarks[234];
    const templeRight = landmarks[454];
    const faceWidth = Math.hypot(
      templeRight.x - templeLeft.x,
      templeRight.y - templeLeft.y
    );

    // Mouth dimensions
    const mouthHeight = Math.hypot(
      lowerLip.x - upperLip.x,
      lowerLip.y - upperLip.y
    );
    const mouthWidth = Math.hypot(
      rightCorner.x - leftCorner.x,
      rightCorner.y - leftCorner.y
    );

    const normalizedHeight = mouthHeight / faceWidth;
    const normalizedWidth = mouthWidth / faceWidth;

    // Smile curvature
    const leftCurve = (upperLip.y - leftCorner.y) / faceWidth;
    const rightCurve = (upperLip.y - rightCorner.y) / faceWidth;
    const avgCurve = (leftCurve + rightCurve) / 2;

    // Update history
    this.smileHistory.push(avgCurve);
    if (this.smileHistory.length > this.historySize) {
      this.smileHistory.shift();
    }
    const meanCurve = this.smileHistory.reduce((sum, v) => sum + v, 0) / this.smileHistory.length;

    const isSmile = meanCurve > this.smileCurveThreshold;
    const isLaugh = normalizedHeight > this.laughHeightThreshold && normalizedWidth > this.laughWidthThreshold;
    const positive = isSmile || isLaugh;

    // Logging state
    if (positive) {
      if (!this.smiling) {
        this.smiling = true;
        this.smileStartTime = now;
        this.smileEndCandidateTime = null;
      } else if (this.smileEndCandidateTime) {
        const gap = now - this.smileEndCandidateTime;
        if (gap <= this.smileMergeWindow) {
          // merge, keep running
          this.smileEndCandidateTime = null;
        } else {
          // treat as new smile
          this.smileStartTime = now;
          this.smileEndCandidateTime = null;
        }
      }
    } else {
      if (this.smiling && this.smileEndCandidateTime === null) {
        this.smileEndCandidateTime = now;
      } else if (this.smiling && this.smileEndCandidateTime !== null) {
        const gap = now - this.smileEndCandidateTime;
        if (gap > this.smileMergeWindow) {
          const duration = this.smileEndCandidateTime - this.smileStartTime;
          if (duration >= this.smileHoldDuration) {
            this.smileLog.push({ timestamp: new Date(this.smileEndCandidateTime).toISOString(), duration });
            console.log(`Smile logged: Start=${new Date(this.smileStartTime).toISOString()}, End=${new Date(this.smileEndCandidateTime).toISOString()}, Duration=${duration}ms`);
          }
          // reset
          this.smiling = false;
          this.smileStartTime = 0;
          this.smileEndCandidateTime = null;
        }
      }
    }

    return positive;
  }

  /**
   * Get the array of logged smiles so far.
   */
  public getSmileLog(): SmileLogEntry[] {
    return [...this.smileLog];
  }

  /**
   * Export the smile log as a CSV download.
   */
  public exportSmileLogAsCSV(filename: string = `smile_log_${Date.now()}.csv`): void {
    if (this.smileLog.length === 0) {
      alert('No smiles to export!');
      return;
    }

    const headers = [
      'Smile Timestamp (ISO)',
      'Smile Duration (seconds)',
      'Smile Count'
    ];

    const rows = this.smileLog.map(entry => {
      const seconds = (entry.duration / 1000).toFixed(2);
      return [entry.timestamp, seconds, ''];
    });

    const totalSmiles = this.smileLog.length;
    const totalDuration = this.smileLog.reduce((sum, entry) => sum + entry.duration, 0);
    const totalDurationSeconds = (totalDuration / 1000).toFixed(2);

    const totalRow = ['TOTAL', totalDurationSeconds, totalSmiles.toString()];

    const csvContent = [headers, ...rows, totalRow].map(r => r.join(',')).join('\n');

    this.smileLog = [];
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
