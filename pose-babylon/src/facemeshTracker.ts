import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { NormalizedLandmarkList } from '@mediapipe/face_mesh';
import { SmileDetector } from './smiledetection';

export class FaceMeshTracker {
  private faceMesh: FaceMesh;
  private camera: Camera;
  private cropCanvas: HTMLCanvasElement;
  private cropCtx: CanvasRenderingContext2D;
  private haveZoom = false;
  private lastCrop = { x: 0, y: 0, size: 0 };

  constructor(
    private video: HTMLVideoElement,
    private canvas: HTMLCanvasElement,
    private smileDetector: SmileDetector,
    private getNosePosition: () => { x: number; y: number; z: number } | null
  ) {
    this.faceMesh = new FaceMesh({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.1,
      minTrackingConfidence: 0.1
    });

    this.faceMesh.onResults(this.onResults);

    this.cropCanvas = document.createElement('canvas');
    this.cropCanvas.width = canvas.width;
    this.cropCanvas.height = canvas.height;
    this.cropCtx = this.cropCanvas.getContext('2d')!;
  }

  start() {
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.haveZoom) {
          this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
          this.cropCtx.drawImage(
            this.video,
            this.lastCrop.x, this.lastCrop.y, this.lastCrop.size, this.lastCrop.size,
            0, 0, this.cropCanvas.width, this.cropCanvas.height
          );
          await this.faceMesh.send({ image: this.cropCanvas });
        } else {
          await this.faceMesh.send({ image: this.video });
        }
      },
      width: 1920,
      height: 1080
    });

    this.camera.start();
  }

  private onResults = (results: { multiFaceLandmarks?: NormalizedLandmarkList[] }) => {
    const lm = results.multiFaceLandmarks?.[0] ?? null;
    if (!lm) {
      this.haveZoom = false;
      this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.smileDetector.processLandmarks(lm);

    const nose = this.getNosePosition();
    if (nose) {
      const vw = this.video.videoWidth;
      const vh = this.video.videoHeight;
      const cx = nose.x * vw;
      const cy = nose.y * vh;

      const base = vw * 0.8;
      const range = vw * 0.5;
      const dynamic = base + range * nose.z * -1;

      const x0 = Math.max(0, Math.min(cx - dynamic / 2, vw - dynamic));
      const y0 = Math.max(0, Math.min(cy - dynamic / 2, vh - dynamic));

      this.lastCrop = { x: x0, y: y0, size: dynamic };
      this.haveZoom = true;

      this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
      this.cropCtx.drawImage(
        this.video,
        x0, y0, dynamic, dynamic,
        0, 0, this.cropCanvas.width, this.cropCanvas.height
      );
    } else {
      this.haveZoom = false;
      this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };
}
