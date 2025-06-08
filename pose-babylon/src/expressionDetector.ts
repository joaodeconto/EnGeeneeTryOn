import * as faceapi from 'face-api.js';
import { UIController } from './uiController';

export class SmileExpressionDetector {
    private video: HTMLVideoElement;
    private threshold: number;
    private detectionInterval: number;
    private intervalId: number | null = null;
    public onSmileDetected?: (score: number) => void;

    constructor(video: HTMLVideoElement, threshold: number = 0.5, intervalMs: number = 200) {
        this.video = video;
        this.threshold = threshold;
        this.detectionInterval = intervalMs;
    }

    async loadModels(modelPath = '/Expressions') {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'),
            faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights')
        ]);
    }

    start() {

        //console.debug('Starting smile detection...');

        this.intervalId = window.setInterval(async () => {
            if (!this.video || this.video.readyState < 2) return;

            try {
                const result = await faceapi
                    .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceExpressions();

                const happy = result?.expressions?.happy ?? 0;
                if (happy > this.threshold) {
                    //console.debug(`😄 Smile detected! Score: ${happy.toFixed(2)}`);
                    this.onSmileDetected?.(happy);
                } else {
                    //console.debug(`😐 No smile. Score: ${happy.toFixed(2)}`);
                }
            } catch (err) {
                console.error("🧨 Detection error:", err);
            }
        }, this.detectionInterval);
    }

    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
