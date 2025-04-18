import { PoseEngine } from "@geenee/bodyprocessors";
import { Recorder } from "@geenee/armature";
import { AvatarRenderer } from "./avatarrenderer";
import { outfitMap, hatMap, bgMap } from "./modelMap";
import { exportSmileLogAsCSV, isPositiveReaction } from "./smiledetection";
import { FaceMesh, NormalizedLandmarkList } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { AudioManager } from "./audioManager";
import { UIController } from "./uiController";

const ui = UIController.getInstance();
const enginePose = new PoseEngine();
const audioManager = new AudioManager("MC_AudioMASTER_B2B_WanderingSkies.wav","Mastercard_Audio_ident.mp3");
const token = location.hostname === "localhost" ? "JWHEn64uKNrekP5S8HSUBYrg5JPzYN8y" : "prod.url_sdk_token";

const urlParams = new URLSearchParams(window.location.search);
let rear = urlParams.has("rear");
let transpose = true;

let outfitModel = "polo";
let hatModel = "dadA";
let bgModel = "BG_1";
let avatar = outfitMap[outfitModel].avatar;
let bgUrl = "./Neutral/BG_1.jpeg";

let lastLandmarks: NormalizedLandmarkList | null = null;

function createSpinner(): HTMLElement {
  const spinner = document.createElement("div");
  spinner.className = "boxes";
  spinner.id = "spinner";
  for (let i = 0; i < 4; i++) {
    const box = document.createElement("div");
    box.className = "box";
    for (let j = 0; j < 4; j++) box.appendChild(document.createElement("div"));
    spinner.appendChild(box);
  }
  return spinner;
}

// Sleep function to pause execution for a given duration
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: false });
  ui. video.srcObject = stream;
  return new Promise(resolve => {
    ui.video.onloadedmetadata = () => { ui.video.play(); resolve(stream); };
  });
}

function bindStartButton() {
  if (!ui.startButton || !ui.holdingScreen) return;
  (ui.startButton as HTMLButtonElement).onclick = () => {
    audioManager.playClickSfx();    
    ui.hideHoldingScreen();    
    setTimeout(async () => {
      ui.showWelcomeMessage();
      await sleep(5000);
      ui.hideWelcomeMessage();
    },0);
  };
}

function bindTransposeButton() {
  (ui.transposeButton as HTMLButtonElement).onclick = async () => {
    transpose = !transpose;
    audioManager.playClickSfx();
    await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
    await enginePose.start();
  };
}

function bindRecordButton(recorder: Recorder) {
  (ui.recordButton as HTMLButtonElement).onclick = () => {
    audioManager.playClickSfx();
    recorder.start();
    setTimeout(async () => {
      const blob = await recorder.stop();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `capture.${blob.type.split("/")[1]}`;
      link.click();
      URL.revokeObjectURL(url);
    }, 10000);
  };
}

function bindCarousel(buttons: NodeListOf<HTMLInputElement>, map: Record<string, any>, onChange: (value: string) => Promise<void>) {
  buttons.forEach(btn => {
    btn.onchange = async () => {
      if (!btn.checked || !map[btn.value]) return;
      audioManager.playClickSfx();
      buttons.forEach(b => b.disabled = true);
      const spinner = createSpinner();
      document.body.appendChild(spinner);
      await onChange(btn.value);
      document.body.removeChild(spinner);
      buttons.forEach(b => b.disabled = false);
    };
  });
}

function bindExportButton() {
  (ui.exportButton as HTMLButtonElement).onclick = () => {
    audioManager.playClickSfx();
    exportSmileLogAsCSV();
  };
}

async function main() {
  audioManager.playBgMusic();
  if (!ui.container) return;
  await setupCamera();
  const avatarRenderer = new AvatarRenderer(
      ui.container, "crop", 
      !rear, 
      outfitMap[outfitModel].file,
      avatar ? undefined : outfitMap[outfitModel].outfit,
      bgUrl,
      undefined,
        hatMap[hatModel].file
    );
  bindStartButton();
  bindTransposeButton();
  const safari = navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome");
  const ext = safari ? "mp4" : "webm";
  const recorder = new Recorder(avatarRenderer, `video/${ext}`);
  bindRecordButton(recorder);
  bindCarousel(ui.outfitButtons, outfitMap, async value => { outfitModel = value; avatar = outfitMap[value].avatar; await avatarRenderer.setOutfit(outfitMap[value].file, avatar ? undefined : outfitMap[value].outfit); });
  bindCarousel(ui.hatButtons, hatMap, async value => { hatModel = value; await avatarRenderer.setHat(hatMap[value].file); });
  bindCarousel(ui.bgButtons, bgMap, async value => {
    bgModel = value;
    if (value === "noBg") {
      await avatarRenderer.toggleBgMode(true);
      await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
      await enginePose.start();
    } else {
      await avatarRenderer.setBG(bgMap[value].file);
      await avatarRenderer.toggleBgMode(false);
    }
  });
  bindExportButton();
  await Promise.all([
    enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear }),
    enginePose.init({ token, mask: true }),
    enginePose.addRenderer(avatarRenderer)
  ]);
  transpose = false;
  await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
  await enginePose.start();
  const faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
  faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.1, minTrackingConfidence: 0.1 });
  new Camera(ui.video, { onFrame: async () => { await faceMesh.send({ image: ui.video }); }, width: 1920, height: 1080 }).start();
  faceMesh.onResults(results => {
    const landmarks = results.multiFaceLandmarks?.[0] ?? null;
    if (landmarks) {
      lastLandmarks = landmarks;
      isPositiveReaction(landmarks);
      const keypoints = [33, 263, 1, 61, 291, 199];
      const xs = keypoints.map(i => landmarks[i].x);
      const ys = keypoints.map(i => landmarks[i].y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const boxSize = Math.max(maxX - minX, maxY - minY) * 1.5;
      const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2 - boxSize * 0.5;
      const vidW = ui.video.videoWidth, vidH = ui.video.videoHeight;
      const cropX = (centerX - boxSize / 2) * vidW, cropY = (centerY - boxSize / 2) * vidH, cropSize = boxSize * vidW;
      if (!isNaN(cropX) && !isNaN(cropY) && !isNaN(cropSize) && cropSize > 0 && cropX >= 0 && cropY >= 0 && cropX + cropSize <= vidW && cropY + cropSize <= vidH) {
        ui.faceCtx.clearRect(0, 0, ui.faceCanvas.width, ui.faceCanvas.height);
        ui.faceCtx.drawImage(ui.video, cropX, cropY, cropSize, cropSize, 0, 0, ui.faceCanvas.width, ui.faceCanvas.height);
      }
    } else lastLandmarks = null;
  });
}

window.addEventListener("DOMContentLoaded", () => {
  main().catch(console.error);
});
