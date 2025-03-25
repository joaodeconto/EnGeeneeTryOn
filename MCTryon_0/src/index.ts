import { PoseEngine } from "@geenee/bodyprocessors";
import { Recorder } from "@geenee/armature";
import { OutfitParams } from "@geenee/bodyrenderers-common";
import { AvatarRenderer } from "./avatarrenderer";
import { MaskEngine} from "@geenee/bodyprocessors";

// make a segmentation mask


// Engine
const engine = new PoseEngine();
const token = location.hostname === "localhost" ?
    "JWHEn64uKNrekP5S8HSUBYrg5JPzYN8y" : "prod.url_sdk_token";

// Parameters
const urlParams = new URLSearchParams(window.location.search);
let rear = urlParams.has("rear");
let transpose = true; // Added variable to track transpose state
// Model map
const modelMap: {
    [key: string]: {
        file: string, avatar: boolean,
        outfit?: OutfitParams
    }
} = {
    polo: {
        file: "./public/Models/polo.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    tee: {
        file: "./public/Models/tee.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    quarter: {
        file: "./public/Models/quarter.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    noCloth: {
        file: "onesie.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Headwear/]
        }
    }
    
}
let model = "polo";
let avatar = modelMap["polo"].avatar;

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
    const renderer = new AvatarRenderer(
        container, "crop", !rear, modelMap[model].file,
        avatar ? undefined : modelMap[model].outfit);
    // Camera switch
    const cameraSwitch = document.getElementById(
        "camera-switch") as HTMLButtonElement | null;
    if (cameraSwitch) {
        cameraSwitch.onclick = async () => {
            cameraSwitch.disabled = true;
            rear = !rear;
            await engine.setup({ size: { width: 1920, height: 1080 },transpose, rear });
            await engine.start();
            renderer.setMirror(!rear);
            cameraSwitch.disabled = false;
        }
    }
    // Transpose toggle button
    const transposeButton = document.getElementById(
        "orientation") as HTMLButtonElement | null;
    if (transposeButton)
        transposeButton.onclick = async () => {
        transpose = !transpose; // Toggle transpose state
        await engine.setup({ size: { width: 1920, height: 1080 }, transpose, rear });
        await engine.start();
        console.log(`Transpose set to: ${transpose}`);
    };

    // Outfit switch
    const outfitSwitch = document.getElementById(
        "outfit-switch") as HTMLInputElement;
    outfitSwitch.checked = avatar;
    outfitSwitch.onchange = async () => {
        modelBtns.forEach((btn) => { btn.disabled = true; })
        outfitSwitch.disabled = true;
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        avatar = outfitSwitch.checked;
        await renderer.setOutfit(
            modelMap[model].file,
            avatar ? undefined : modelMap[model].outfit);
        document.body.removeChild(spinner);
        modelBtns.forEach((btn) => { btn.disabled = false; });
        outfitSwitch.disabled = false;
    }
    // Recorder
    const safari = navigator.userAgent.indexOf('Safari') > -1 &&
                   navigator.userAgent.indexOf('Chrome') <= -1
    const ext = safari ? "mp4" : "webm";
    const recorder = new Recorder(renderer, "video/" + ext);
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
    // Model carousel
    const modelBtns = document.getElementsByName(
        "model") as NodeListOf<HTMLInputElement>;
    modelBtns.forEach((btn) => {
        btn.onchange = async () => {
            if (btn.checked && modelMap[btn.value]) {
                modelBtns.forEach((btn) => { btn.disabled = true; })
                outfitSwitch.disabled = true;
                const spinner = createSpinner();
                document.body.appendChild(spinner);
                model = btn.value;
                avatar = modelMap[model].avatar;
                await renderer.setOutfit(
                    modelMap[model].file,
                    avatar ? undefined : modelMap[model].outfit);
                outfitSwitch.checked = avatar;
                document.body.removeChild(spinner);
                modelBtns.forEach((btn) => { btn.disabled = false; });
                outfitSwitch.disabled = false;
            }
        };
    });
    
    // Initialization
    await Promise.all([
        engine.addRenderer(renderer),
        engine.init({ token: token })
    ]);
    await engine.setup({ size: { width: 1920, height: 1080 }, transpose, rear }); // Updated to use transpose variable
    await engine.start();
    document.getElementById("loadui")?.remove();
}
main();
