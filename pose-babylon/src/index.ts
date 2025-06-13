import { PoseEngine} from "@geenee/bodyprocessors";
import { AvatarRenderer } from "./avatarrenderer";
import { outfitMap, hatMap, bgMap } from "./modelMap";
import { SmileDetector } from "./smiledetection";
import { FaceMesh, NormalizedLandmarkList } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { AudioManager } from "./audioManager";
import { UIController } from "./uiController";
import { FmodManager } from "./fmodManager";
import { MeasurementService } from "./measurementService";

const fmod = new FmodManager();
const ui = UIController.getInstance();
const smileDetector = new SmileDetector();
const enginePose = new PoseEngine();
const audioManager = new AudioManager("/Audio/MC_AudioMASTER_B2B_WanderingSkies.wav", "/Audio/Pop_UI.wav", "/Audio/Pop_UI.wav");
const token = location.hostname === "localhost" ? "JWHEn64uKNrekP5S8HSUBYrg5JPzYN8y" : "prod.url_sdk_token";

const urlParams = new URLSearchParams(window.location.search);

let rear = urlParams.has("rear");
let currentStream: MediaStream | null = null;
let transpose = true;
let userHeightCm = 170;
let savedCmPerPx: number | null = (() => {
  const v = localStorage.getItem("cmPerPx");
  const num = v ? parseFloat(v) : NaN;
  return Number.isFinite(num) ? num : null;
})();

let outfitModel = "polo";
let hatModel = "dadA";
let avatar = outfitMap[outfitModel].avatar;
let bgUrl = "./UI/BG/Baseball_Background.png";

let lastLandmarks: NormalizedLandmarkList | null = null;

let debugCanvas: HTMLCanvasElement | null = null;
let debugCtx: CanvasRenderingContext2D | null = null;
let debugLogEl: HTMLElement | null = null;

const avatarRenderer = new AvatarRenderer(
  ui.container, "crop",
  !transpose,
  outfitMap[outfitModel].file,
  avatar ? undefined : outfitMap[outfitModel].outfit,
  bgUrl,
  undefined,
  hatModel,
);

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupCamera(): Promise<MediaStream> {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
  }
  const facing = rear ? "environment" : "user";
  const constraints = { video: { width: 1920, height: 1080, facingMode: facing }, audio: false };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  ui.video.srcObject = stream;
  currentStream = stream;
  return new Promise(resolve => {
    ui.video.onloadedmetadata = () => { ui.video.play(); resolve(stream); };
  });
}

function bindStartButton() {
  if (!ui.startButton || !ui.holdingScreen) return;
  (ui.startButton as HTMLButtonElement).onclick = () => {
    audioManager.playLongClickSfx();
    //fmod.playOneShot("event:/Interactions/MasterClick");
    ui.hideHoldingScreen();
    setTimeout(async () => {
      ui.showWelcomeMessage();
      await sleep(5000);
      ui.hideWelcomeMessage();
      await sleep(1000);
    }, 0);
  };
}

function bindTransposeButton() {
  (ui.transposeButton as HTMLButtonElement).onclick = async () => {
    transpose = !transpose;
    audioManager.playClickSfx();
    avatarRenderer.setMirror(!transpose);
    ui.updateOrientationLabel(transpose);
    await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
    await enginePose.start();
  };
}


function bindCarousel(buttons: NodeListOf<HTMLInputElement>, map: Record<string, any>, onChange: (value: string) => Promise<void>) {
  buttons.forEach(btn => {
    btn.onchange = async () => {
      if (!btn.checked || !map[btn.value]) return;
      ui.updateCarouselTextures(buttons);
      audioManager.playClickSfx();
      buttons.forEach(b => b.disabled = true);
      const spinner = createSpinner();
      document.body.appendChild(spinner);
      await onChange(btn.value);
      document.body.removeChild(spinner);
      buttons.forEach(b => b.disabled = false);
    };
  });
  ui.updateCarouselTextures(buttons);
}

function bindExportButton() {
  (ui.exportButton as HTMLButtonElement).onclick = () => {
    audioManager.playLongClickSfx();
    smileDetector.exportSmileLogAsCSV();
  };
}

function bindOptionsToggle() {
  ui.optionsToggle.onclick = () => ui.toggleOptions();
}

function bindOptionsClose() {
  ui.optionsClose.onclick = () => ui.toggleOptions();
}

function bindMusicToggle() {
  ui.musicToggle.onclick = () => {
    audioManager.playClickSfx();
    audioManager.toggleMute();
  };
}

function bindNoPoseDelay() {
  ui.noPoseDelayInput.onchange = () => {
    const sec = parseFloat(ui.noPoseDelayInput.value);
    if (!isNaN(sec) && sec > 0) {
      avatarRenderer.noPoseDelay = sec * 1000;
    }
  };
  // set initial value from renderer
  ui.noPoseDelayInput.value = String(avatarRenderer.noPoseDelay / 1000);
}


async function main() {

  if (!ui.container) return;
  await setupCamera();

  ui.updateOrientationLabel(transpose);

  //ui.bindButtonTextureToggle();
  bindStartButton();
  bindTransposeButton();
  bindOptionsToggle();
  bindOptionsClose();
  bindMusicToggle();
  bindNoPoseDelay();
  bindExportButton();
  bindCarousel(
    ui.outfitButtons,
    outfitMap,
    async value => {
      outfitModel = value;
      avatar = outfitMap[value].avatar;
      await avatarRenderer.setOutfit(outfitMap[value].file, avatar ? undefined : outfitMap[value].outfit);
    });
  bindCarousel(
    ui.hatButtons,
    hatMap,
    async value => {
      hatModel = value; 
      await avatarRenderer.setHat(value);
    });
  bindCarousel(
    ui.bgButtons,
    bgMap,
    async value => {
      if (value === "noBg") {
        await avatarRenderer.toggleBgMode(true);
      } else {
        await avatarRenderer.setBG(bgMap[value].file);
        await avatarRenderer.toggleBgMode(false);
      }
    });

  await Promise.all([
    enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear: true }),
    enginePose.init({ token, mask: true }),
    enginePose.addRenderer(avatarRenderer)
  ]);

  await enginePose.start();  
  audioManager.playBgMusic();

  // 1) One FaceMesh instance
  const faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.1,
    minTrackingConfidence: 0.1
  });

  // 2) Off‑screen canvas for cropping
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = ui.faceCanvas.width;
  cropCanvas.height = ui.faceCanvas.height;
  const cropCtx = cropCanvas.getContext('2d')!;

  // 3) State for zoom vs full frame
  let haveZoom = false;
  let lastCrop = { x: 0, y: 0, size: 0 };

  // 4) Camera loop uses nose‑driven crop when available
  new Camera(ui.video, {
    onFrame: async () => {
      if (haveZoom) {
        // use the lastCrop region
        cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        cropCtx.drawImage(
          ui.video,
          lastCrop.x, lastCrop.y, lastCrop.size, lastCrop.size,
          0, 0, cropCanvas.width, cropCanvas.height
        );
        await faceMesh.send({ image: cropCanvas });
      } else {
        await faceMesh.send({ image: ui.video });
      }
    },
    width: 1920,
    height: 1080
  }).start();

  // 5) onResults: process landmarks & draw preview; NO more keypoint‑based box
  faceMesh.onResults(results => {
    const lm = results.multiFaceLandmarks?.[0] ?? null;
    if (!lm) {
      // lost face → clear zoom
      haveZoom = false;
      ui.faceCtx.clearRect(0, 0, ui.faceCanvas.width, ui.faceCanvas.height);
      return;
    }
    // always run smile detection
    smileDetector.processLandmarks(lm);

    // check your pose‑engine nose point
    const nosePt = (avatarRenderer as any).lastPose?.points?.nose?.pixel;
    if (nosePt) {
      const vw = ui.video.videoWidth;
      const vh = ui.video.videoHeight;

      // center in pixels
      const cx = nosePt[0] * vw;
      const cy = nosePt[1] * vh;

      // dynamic zoom: base 30% of width + up to +20% more as the user backs away
      const base = vw * 0.80;
      const range = vw * 0.50;
      const dynamic = base + range * nosePt[2] * -1;    // farther → larger box
      //console.log(nosePt[2]);

      // clamp so we don’t run off the edge
      const x0 = Math.max(0, Math.min(cx - dynamic / 2, vw - dynamic));
      const y0 = Math.max(0, Math.min(cy - dynamic / 2, vh - dynamic));

      lastCrop = { x: x0, y: y0, size: dynamic };
      haveZoom = true;

      // draw into your offscreen canvas
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropCtx.drawImage(
        ui.video,
        x0, y0, dynamic, dynamic,
        0, 0, cropCanvas.width, cropCanvas.height
      );
    } else {
      // no nose → disable zoom preview
      haveZoom = false;
      ui.faceCtx.clearRect(0, 0, ui.faceCanvas.width, ui.faceCanvas.height);
    }
  });

  const loader = document.getElementById('loading-screen');
  if (!loader) return;
  loader.classList.add('fade-out');
  loader.addEventListener('animationend', () => {
    loader.remove();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  main().catch(console.error);
});
