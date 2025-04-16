import { PoseEngine } from "@geenee/bodyprocessors";
import { Recorder } from "@geenee/armature";
import { AvatarRenderer } from "./avatarrenderer";
import { outfitMap, hatMap, bgMap } from "./modelMap";
import { isPositiveReaction } from "./smiledetection";
import { FaceMesh } from "@mediapipe/face_mesh";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { NormalizedLandmarkList } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const enginePose = new PoseEngine();

const token = location.hostname === "localhost" ?
    "JWHEn64uKNrekP5S8HSUBYrg5JPzYN8y" : "prod.url_sdk_token";

// Parameters
const urlParams = new URLSearchParams(window.location.search);
let rear = urlParams.has("rear");
let transpose = true; // Added variable to track transpose state

let outfitmodel = "polo";
let hatModel = "dadA";
let bgModel = "BG_1"; // or "noBg" for toggl
let avatar = outfitMap[outfitmodel].avatar;
let bgUrl =  "./Neutral/BG_1.jpeg";   

const smileLog: { timestamp: string }[] = [];
let smiling = false;
let smileStartTime: number | null = null;
const SMILE_HOLD_DURATION = 100; // ms

const faceCanvas = document.getElementById("faceCanvas") as HTMLCanvasElement | null;
if (!(faceCanvas instanceof HTMLCanvasElement)) {
    throw new Error("Element with id 'faceCanvas' is not a canvas element.");
}
let lastLandmarks: NormalizedLandmarkList | null = null;
const faceCtx = faceCanvas.getContext("2d");
    
// Create spinner element
function createSpinner() {
    const spinner = document.createElement("div");
    spinner.className = "boxes";
    spinner.id = "spinner";
    for (let i = 0; i < 4; i++) {
        const box = document.createElement("div");
        box.className = "box";
        for (let j = 0; j < 4; j++)
            box.appendChild(document.createElement("div"));
        spinner.appendChild(box);
    }
    return spinner;
}
const video = document.getElementById("video") as HTMLVideoElement;

async function setupCamera(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: false
    });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            video.play();
            resolve(stream);
        };
    });
}

async function main() {
    // Renderer
    const container = document.getElementById("root");
    if (!container)
        return;   

    const stream = await setupCamera(); // Get webcam stream
    const avatarRenderer = new AvatarRenderer(
        container,
        "crop",
        !rear,
        outfitMap[outfitmodel].file,
        avatar ? undefined : outfitMap[outfitmodel].outfit,    
        bgUrl,
        undefined,
        hatMap["dadA"].file    
    );

    // Portrait toggle button
    const transposeButton = document.getElementById(
        "orientation") as HTMLButtonElement | null;
    if (transposeButton)
        transposeButton.onclick = async () => { transpose = !transpose; // Toggle transpose state
        
        await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose: true, rear});
        await enginePose.start();

        console.log(`Transpose set to: ${transpose}`);
    };
    // Recorder
    const safari = navigator.userAgent.indexOf('Safari') > -1 &&
                   navigator.userAgent.indexOf('Chrome') <= -1
    const ext = safari ? "mp4" : "webm";
    const recorder = new Recorder(avatarRenderer, "video/" + ext);
    const recordButton = document.getElementById(
        "record") as HTMLButtonElement | null;
    if (recordButton)
        recordButton.onclick = () => {
            recorder?.start();
            setTimeout(async () => {
                const blob = await recorder?.stop();
                if (!blob)
                    return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.hidden = true;
                link.href = url;
                link.download = "capture." + ext;
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            }, 10000);
        };
        
    // Outift carousel
    const outfitlBtns = document.getElementsByName(
        "model") as NodeListOf<HTMLInputElement>;
    outfitlBtns.forEach((btn) => {
        btn.onchange = async () => {
            if (btn.checked && outfitMap[btn.value]) {
                outfitlBtns.forEach((btn) => { btn.disabled = true; })
                const spinner = createSpinner();
                document.body.appendChild(spinner);
                outfitmodel = btn.value;
                avatar = outfitMap[outfitmodel].avatar;
                await avatarRenderer.setOutfit(
                    outfitMap[outfitmodel].file,
                    avatar ? undefined : outfitMap[outfitmodel].outfit);
                document.body.removeChild(spinner);
                outfitlBtns.forEach((btn) => { btn.disabled = false; });
            }
        };
    });

    const hatBtns = document.getElementsByName(
        "hat") as NodeListOf<HTMLInputElement>;
        hatBtns.forEach((btn) => {
        btn.onchange = async () => {
            if (btn.checked && hatMap[btn.value]) {
                hatBtns.forEach((btn) => { btn.disabled = true; })
                const spinner = createSpinner();
                document.body.appendChild(spinner);
                hatModel = btn.value;
                await avatarRenderer.setHat(
                    hatMap[hatModel].file);
                document.body.removeChild(spinner);
                hatBtns.forEach((btn) => { btn.disabled = false; });
            }
        };
    });

    const bgBtns = document.getElementsByName(
        "bg") as NodeListOf<HTMLInputElement>;
    bgBtns.forEach((btn) => {
        btn.onchange = async () => {
            if (btn.checked && bgMap[btn.value]) {
                bgBtns.forEach((btn) => { btn.disabled = true; })
                const spinner = createSpinner();
                document.body.appendChild(spinner);
                bgModel = btn.value;
                if(bgModel === "noBg")
                {
                 console.log("nobg");
                  await avatarRenderer.toggleBgMode(true);
                  await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
                  await enginePose.start();
                }
                else
                {
                    await avatarRenderer.setBG(bgMap[bgModel].file);
                    await avatarRenderer.toggleBgMode(false);
                }
                document.body.removeChild(spinner);
                bgBtns.forEach((btn) => { btn.disabled = false; });
            }
        };
    });

    const exportBtn = document.getElementById("export-csv") as HTMLButtonElement | null;
    if (exportBtn) {
        exportBtn.onclick = () => {
            if (smileLog.length === 0) {
                alert("No smiles logged.");
                return;
            }

            const csvContent = "data:text/csv;charset=utf-8," +
                "Smile Timestamp\n" +
                smileLog.map(row => `${row.timestamp}`).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "smile_log.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
    
    // Initialization
    await Promise.all([

        enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear,}),
        enginePose.init({token: token, mask:  true}),
        enginePose.addRenderer(avatarRenderer),        
    ]);

    transpose = false; // Set transpose to false initially
    
    await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });     
    await enginePose.start();
    
   // Setup FaceMesh
   const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.1,
    minTrackingConfidence: 0.1,
});

const mpCamera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
  
      if (lastLandmarks && faceCtx) {
        const landmarks = lastLandmarks;
  
        // Estimate bounding box
        const keypoints = [33, 263, 1, 61, 291, 199];
        const xs = keypoints.map(i => landmarks[i].x);
        const ys = keypoints.map(i => landmarks[i].y);
  
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
  
        const boxSize = Math.max(maxX - minX, maxY - minY) * 1.5;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2 - (boxSize * 0.5);;
  
        const vidW = video.videoWidth;
        const vidH = video.videoHeight;
  
        const cropX = (centerX - boxSize / 2) * vidW;
        const cropY = (centerY - boxSize / 2) * vidH;
        const cropSize = boxSize * vidW;

        if (
        !isNaN(cropX) && !isNaN(cropY) && !isNaN(cropSize) &&
        cropSize > 0 &&
        cropX >= 0 && cropY >= 0 &&
        cropX + cropSize <= video.videoWidth &&
        cropY + cropSize <= video.videoHeight
        ) {
            faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
            faceCtx.drawImage(
                video,
                cropX, cropY, cropSize, cropSize,
                0, 0, faceCanvas.width, faceCanvas.height
            );
        } else {
        //console.warn("Invalid crop dimensions", { cropX, cropY, cropSize });
        }
  
        if (faceCanvas) {
            faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
            faceCtx.drawImage(
              video,
              cropX, cropY, cropSize, cropSize,
              0, 0, faceCanvas.width, faceCanvas.height
            );
        }
      }
    },
    width: 1920,
    height: 1080
  });
mpCamera.start();

faceMesh.onResults((results) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {

        lastLandmarks = results.multiFaceLandmarks[0];
        
        
        const isSmiling = isPositiveReaction(lastLandmarks);
        const now = Date.now();

        if (isSmiling) {
            if (!smiling) {
                smiling = true;
                smileStartTime = now;
            } else if (smileStartTime && now - smileStartTime >= SMILE_HOLD_DURATION) {
                const timestamp = new Date().toISOString();
                smileLog.push({ timestamp });
                console.log("✅ Smile confirmed and logged at", timestamp);
                smileStartTime = null; // reset so it doesn't keep logging
                smiling = false;
            }
        } else {
        
            smiling = false;
            smileStartTime = null;
        }
    }
    else    
        lastLandmarks = null;
});

document.getElementById("loadui")?.remove();
}
main();
