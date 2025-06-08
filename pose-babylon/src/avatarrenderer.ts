
import { PoseRenderer, PoseAlignPlugin, OccluderMaskPlugin, OccluderMaterial, BodypartPatchPlugin } from "@geenee/bodyrenderers-babylon";
import { OutfitParams, MaskMorphPlugin, MaskUploadPlugin, BgReplacePlugin, BgBlurPlugin, MaskSmoothPlugin, PoseTuneParams } from "@geenee/bodyrenderers-common";
import { Pose, PoseResult } from "@geenee/bodyprocessors";
import { CanvasMode, ImageTexture } from "@geenee/armature";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowLight } from "@babylonjs/core/Lights/shadowLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { UIController } from "./uiController";
import { detectArmsUp } from "./poseDetector";
import { MeasurementService, SimplePose } from "./measurementService";
import { outfitMap, hatMap, bgMap } from "./modelMap";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/loaders/glTF/2.0";

// Renderer
export class AvatarRenderer extends PoseRenderer {

    protected ui: UIController;
    // Scene
    protected aligner: PoseAlignPlugin;
    protected model?: AbstractMesh
    protected shadowers: ShadowGenerator[] = [];
    // Hands up
    protected isholdingScreen = true;
    protected textModel?: AbstractMesh;

    protected occluderPlugin: OccluderMaskPlugin = new OccluderMaskPlugin();
    protected maskPlugin: MaskUploadPlugin = new MaskUploadPlugin();
    protected bgPlugin: BgBlurPlugin = new BgBlurPlugin();
    protected patchPlugin: BodypartPatchPlugin;
    protected smoothMask: MaskSmoothPlugin;
    protected bgBlur: BgBlurPlugin; // Add blur plugin
    protected bgReplace: BgReplacePlugin; // Add background replace plugin
    protected morphPlugin: MaskMorphPlugin; // Add mask morph plugin

    protected bgImageTexture?: ImageTexture;
    protected hat?: AbstractMesh;
    protected isBlur?: boolean;

    public lastPose?: Pose;
    public topHead?: AbstractMesh;

    protected sizeTextEl = document.getElementById("size-text");
    protected hasPatchedHat = false;

    protected gl: WebGLRenderingContext;
    protected noPoseCounter = 0;
    protected noPoseDelay = 1000; // Number of frames to wait before showing holding screen

    private hasScanned = false;
    private handsUp = false;

    // Constructor
    constructor(
        container: HTMLElement,
        mode?: CanvasMode,
        mirror?: boolean,
        protected url = "onesie.glb",
        protected outfit?: OutfitParams,
        protected bgUrl?: string,
        protected tuneParams?: PoseTuneParams,
        protected hatUrl?: string,
        protected hatModel?: AbstractMesh) {
        super(container, mode, mirror);

        this.gl = this.renderer?._gl as WebGLRenderingContext;
        this.aligner = new PoseAlignPlugin(this.model, { scaleLimbs: true });
        this.patchPlugin = new BodypartPatchPlugin(.01, 256);
        this.bgBlur = new BgBlurPlugin(2, .4);
        this.bgReplace = new BgReplacePlugin(.1, .3, mirror);
        this.smoothMask = new MaskSmoothPlugin(3);
        this.morphPlugin = new MaskMorphPlugin(-2);
        this.ui = UIController.getInstance();

        this.addPlugin(this.aligner);
        this.addPlugin(this.maskPlugin);
        this.addPlugin(this.smoothMask);
        this.addPlugin(this.morphPlugin);
        this.addPlugin(this.patchPlugin);
        this.addPlugin(this.bgReplace);

    }

    async toggleBgMode(enable: boolean) {
        if (enable) {
            this.isBlur = true;
            this.addPlugin(this.bgBlur);
            this.removePlugin(this.bgReplace);
            this.removePlugin(this.patchPlugin);
        } else if (this.isBlur) {
            this.isBlur = false;
            this.addPlugin(this.patchPlugin);
            this.addPlugin(this.bgReplace);
            this.removePlugin(this.bgBlur);

        }
    }

    // Load assets and setup scene
    async load() {
        if (this.loaded || !this.scene)
            return;
        await this.setupScene(this.scene);
        return super.load();
    }

    // Setup scene
    protected async setupScene(scene: Scene) {

        // Lightning
        const directUp = new DirectionalLight(
            "DirectLightUp", new Vector3(0.5, -1, -0.2), scene);
        directUp.position.set(0, 4, -10);
        directUp.intensity = 3;
        scene.environmentTexture = new CubeTexture("environment.env", scene);
        // Shadows
        [directUp].forEach((light) => {
            if (!(light instanceof ShadowLight))
                return;
            const shadower = new ShadowGenerator(2048, light, true);
            shadower.useBlurCloseExponentialShadowMap = true;
            shadower.blurBoxOffset = 1;
            shadower.bias = 0.0001;
            shadower.normalBias = 0.0001;
            light.autoCalcShadowZBounds = true;
            this.shadowers.push(shadower);
        });

        // Text model
        const gltf = await SceneLoader.
            LoadAssetContainerAsync("./", "text.glb", scene);
        const textMesh = gltf.meshes.find((m) => m.id === "Text");
        if (textMesh) {
            textMesh.scaling.setAll(0.075);
            textMesh.rotate(Vector3.Up(), Math.PI);
            textMesh.rotate(Vector3.Right(), Math.PI / 2);
        }
        this.textModel = gltf.meshes.find((m) => m.id === "__root__");
        gltf.addAllToScene();

        // Model
        await this.setModel(this.url);
        if (this.hatUrl) {
            await this.setHat(this.hatUrl);
        }
        if (this.bgUrl) {
            await this.setBG(this.bgUrl);
        } else {
            console.warn("Background URL is undefined.");
        }
    }

    // Set model to render
    async setModel(url: string) {
        return this.setOutfit(url, this.outfit);
    }
    //PatchParts
    protected updatePatchParts(includeHat = true) {
        if (!this.patchPlugin || !this.model) return;

        const childMeshes = this.model.getChildMeshes();

        // Start with cloth patches
        const patchParts = childMeshes.filter((m) => /cloth/i.test(m.name));

        // Optionally patch the hat       
        if (includeHat && this.hat) {
            const hatMeshes = [this.hat, ...this.hat.getChildMeshes(true)];
            const capMesh = childMeshes.filter((m) => /cap/i.test(m.name));
            //const headMesh = childMeshes.filter((m) => /head/i.test(m.name));

            patchParts.push(...hatMeshes);
            patchParts.push(...capMesh);
            //patchParts.push(...headMesh);
        }

        const patchSet = new Set(patchParts);

        const keepParts = childMeshes.filter((m) =>
            !patchSet.has(m) && m.isEnabled()
        );

        if (keepParts.length === 0) {
            return;
        }

        // Debug: inspect which parts will be patched

        this.patchPlugin.setParts(patchParts, keepParts);

        if (includeHat)
            this.hasPatchedHat = true;
    }

    // Set outfit to render
    async setOutfit(url: string, outfit?: OutfitParams) {
        const { scene } = this;
        if (!scene)
            return;
        this.url = url;
        this.outfit = outfit;
        const gltf = await SceneLoader.
            LoadAssetContainerAsync("", url, scene, undefined, ".glb");

        if (this.model) {
            const model = this.model;
            this.patchPlugin.setParts([], []); // Clear old parts            
            this.aligner.setNode();
            this.shadowers.forEach((s) => s.removeShadowCaster(model))
            this.scene?.removeMesh(model, true);
            model.dispose(false, true);
        }
        let _hasHat = false;
        let _hatUrl = undefined;
        if (this.hat) {
            _hasHat = true;
            _hatUrl = this.hatUrl;
        }
        delete this.model;

        const model = gltf.meshes.find((m) => m.id === "__root__");
        if (!model)
            return;
        gltf.addAllToScene();
        this.aligner.setNode(model);
        const meshes = model.getChildMeshes();
        meshes.forEach((m) => {
            if (this.outfit?.occluders?.some((p) =>
                typeof p === "string" ? m.name === p : p.test(m.name))) {
                const material = m.material;
                m.material = new OccluderMaterial("OccluderMaterial", scene);
                if (material?.getBindedMeshes().length === 0)
                    material.dispose();
                return;
            }
            if (this.outfit?.hidden?.some((p) =>
                typeof p === "string" ? m.name === p : p.test(m.name))) {
                m.setEnabled(false);
                return;
            }
        });
        meshes.forEach((m) => m.receiveShadows = true);
        this.shadowers.forEach((s) => s.addShadowCaster(model));
        this.model = model;
        if (_hasHat && _hatUrl)
            await this.setHat(_hatUrl);

        if (this.patchPlugin && this.model) {
            this.updatePatchParts(_hasHat);
        }
    }

    async setBG(file: string) {
        if (!file) {
            console.error("Background file is undefined.");
            return;
        }

        const bg = document.getElementById("background");
        if (!bg) {
            console.warn("Background element not found.");
            return;
        }

        const layer1 = bg.querySelector<HTMLDivElement>(".layer1")!;
        const layer2 = bg.querySelector<HTMLDivElement>(".layer2")!;

        // 1. put the new image on the hidden layer
        layer2.style.backgroundImage = `url(${file})`;

        // 2. force a reflow so the transition will fire
        void layer2.offsetWidth;

        // 3. fade in layer2, fade out layer1
        layer2.style.opacity = "1";
        layer1.style.opacity = "0";

        // 4. wait for the transition to finish
        await new Promise<void>(resolve => {
            layer2.addEventListener(
                "transitionend",
                () => resolve(),
                { once: true }
            );
        });

        // 5. swap roles: move the new image to layer1, reset layer2
        layer1.style.backgroundImage = `url(${file})`;
        layer1.style.opacity = "1";
        layer2.style.opacity = "0";
    }

    async setHat(url: string) {

        const meshUrl = hatMap[url].file;
        const offset = hatMap[url].offset;
        const scale = hatMap[url].scale;

        const gltf = await SceneLoader.ImportMeshAsync("", meshUrl, "", this.scene);

        if (this.hat) {
            this.hat.dispose();
            delete this.hat;
        }

        this.hat = gltf.meshes.find((m) => m.id === "__root__");
        this.hatUrl = url;

        if (!this.hat) {
            console.error("Hat model not found in the loaded GLTF file.");
            return;
        }

        if (!this.model) {
            console.warn("Character model not loaded yet.");
            return;
        }

        // Find the head bone
        this.topHead = this.scene?.getNodeByName("Head") as AbstractMesh;

        if (!this.topHead) {
            console.error("Head bone not found!");
            return;
        }

        if (this.hat) {
            this.hat.parent = this.topHead;
            if (offset)
                this.hat.position.set(offset._x, offset._y, offset._z); // Adjust as needed
            if (scale)
                this.hat.scaling.set(scale._x, scale._y, scale._z); // Adjust scale if needed               
            this.hasPatchedHat = false;
        }

    }

    async update(result: PoseResult, stream: HTMLCanvasElement): Promise<void> {
        const pose = result.poses[0];


        if(this.lastPose){

            const simplePose: SimplePose = {
            nose: this.lastPose.points.nose,
            shoulderL: this.lastPose.points.shoulderL,
            shoulderR: this.lastPose.points.shoulderR,
            hipL: this.lastPose.points.hipL,
            hipR: this.lastPose.points.hipR,
            ankleL: this.lastPose.points.ankleL,      
            ankleR: this.lastPose.points.ankleR,
            maskTex: this.lastPose.maskTex            // assume que é { texture, size }
        };

        try {
            const { measures, size } = await MeasurementService.measureAndSuggest(
                simplePose,
                this.gl,
                stream.height,
                stream.width
            );

            // 4) Atualizar UI
            const sizeTextEl = document.getElementById("size-text");
            if (sizeTextEl) {
                sizeTextEl.textContent = `Tamanho sugerido: ${size}
          (Altura: ${measures.heightCm.toFixed(1)} cm;
           Peito: ${measures.chestCm.toFixed(1)} cm;
           Cintura: ${measures.waistCm.toFixed(1)} cm)`;
            }

            // 5) (Opcional) Desenhar debug overlay
            //this.drawDebugOverlay(simplePose, measures, size, stream);

        } catch (err) {
            console.warn("Não foi possível medir/sugerir tamanho:", err);
        }
        }

        if (!pose) {
            this.handsUp = false;
            if (!this.isBlur)
                this.ui.backgroundImg.style.zIndex = "1";
            this.hasScanned = false; // ← reset scan flag
            // Start a counter to track frames without a pose
            if (!this.noPoseCounter) this.noPoseCounter = 0;
            if (!this.ui.isHoldingScreen)
                this.noPoseCounter++;

            // If the counter reaches a threshold, activate holding-screen
            if (this.noPoseCounter > this.noPoseDelay) { // Adjust threshold as needed
                this.ui.showHoldingScreen();
                this.noPoseCounter = 0;
            }
            return super.update(result, stream);
        }

        //console.log(pose.points.hipL.visibility);
        this.noPoseCounter = 0;

        // Position text model
        this.handsUp = detectArmsUp(pose);
        const { textModel } = this;
        if (textModel) {
            const wristL = new Vector3(...pose.points.wristL.metric);
            const wristR = new Vector3(...pose.points.wristR.metric);
            const position = Vector3.Lerp(wristL, wristR, 0.5);
            textModel.position = position;
            textModel.rotation._y = Math.PI;
            textModel.setEnabled(this.handsUp);
        }

        this.lastPose = pose;
        if (!this.hasScanned && !this.ui.isHoldingScreen) {
            this.ui.showScanAnimation(2000); // 3 seconds
            this.hasScanned = true;
        }

        if (!this.hasPatchedHat && this.hat) {
            this.updatePatchParts(true);
        }

        this.ui.backgroundImg.style.zIndex = "-30";     

        await super.update(result, stream);
    }   
}

    
