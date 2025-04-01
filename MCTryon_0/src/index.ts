import { PoseEngine } from "@geenee/bodyprocessors";
import { Recorder } from "@geenee/armature";
import { AvatarRenderer } from "./avatarrenderer";
import { outfitMap, hatMap, bgMap } from "./modelMap";

const enginePose = new PoseEngine();

const token = location.hostname === "localhost" ?
    "JWHEn64uKNrekP5S8HSUBYrg5JPzYN8y" : "prod.url_sdk_token";

// Parameters
const urlParams = new URLSearchParams(window.location.search);
let rear = urlParams.has("rear");
let transpose = true; // Added variable to track transpose state

let model = "polo";
let avatar = outfitMap["polo"].avatar;
let bgUrl =  "./Neutral/BG_1.jpeg";   
    
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

async function main() {
    // Renderer
    const container = document.getElementById("root");
    if (!container)
        return;   
    const avatarRenderer = new AvatarRenderer(
        container,
        "crop",
        !rear,
        outfitMap[model].file,
        avatar ? undefined : outfitMap[model].outfit,    
        bgUrl,    
    );

    // Transpose toggle button
    const transposeButton = document.getElementById(
        "orientation") as HTMLButtonElement | null;
    if (transposeButton)
        transposeButton.onclick = async () => { transpose = !transpose; // Toggle transpose state
        
        await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
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
                model = btn.value;
                avatar = outfitMap[model].avatar;
                await avatarRenderer.setOutfit(
                    outfitMap[model].file,
                    avatar ? undefined : outfitMap[model].outfit);
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
                model = btn.value;
                await avatarRenderer.setHat(
                    hatMap[model].file);
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
                model = btn.value;
                if(model === "noBg")
                {
                 console.log("nobg");
                  await avatarRenderer.toggleBgMode(true);
                  await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
                  await enginePose.start();
                }
                else
                {
                    await avatarRenderer.setBG(bgMap[model].file);
                    await avatarRenderer.toggleBgMode(false);
                }
                document.body.removeChild(spinner);
                bgBtns.forEach((btn) => { btn.disabled = false; });
            }
        };
    });

    
    // Initialization
    await Promise.all([

        enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear,}),
        enginePose.init({token: token, mask: {smooth: true}}),
        enginePose.addRenderer(avatarRenderer),        
    ]);

    transpose = false; // Set transpose to false initially
    
    await enginePose.setup({ size: { width: 1920, height: 1080 }, transpose, rear });     
    await enginePose.start();
    
    document.getElementById("loadui")?.remove();
}
main();
