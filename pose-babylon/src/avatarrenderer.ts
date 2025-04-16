
import { PoseRenderer, PoseAlignPlugin, OccluderMaskPlugin, OccluderMaterial, BodypartPatchPlugin} from "@geenee/bodyrenderers-babylon";
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
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/loaders/glTF/2.0";

// Renderer
export class AvatarRenderer extends PoseRenderer {
    // Scene
    protected aligner: PoseAlignPlugin;
    protected model?: AbstractMesh
    protected shadowers: ShadowGenerator[] = [];
    // Hands up
    protected handsUp = false;
    protected textModel?: AbstractMesh;

    protected occluderPlugin: OccluderMaskPlugin = new OccluderMaskPlugin();
    protected maskPlugin: MaskUploadPlugin = new MaskUploadPlugin();
    protected bgPlugin: BgBlurPlugin = new BgBlurPlugin();
    protected patchPlugin: BodypartPatchPlugin ;
    protected smoothMask: MaskSmoothPlugin;
    protected bgBlur: BgBlurPlugin; // Add blur plugin
    protected bgReplace: BgReplacePlugin; // Add background replace plugin
    protected morphPlugin: MaskMorphPlugin; // Add mask morph plugin

    protected bgImageTexture?: ImageTexture;
    protected hat?: AbstractMesh;
    protected isBlur?: boolean;

    protected lastPose?: Pose;
    protected topHead?: AbstractMesh;
    
    protected sizeTextEl = document.getElementById("size-text");
    protected hasPatchedHat = false;

    protected gl?: WebGLRenderingContext;

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
        this.aligner = new PoseAlignPlugin(this.model, {scaleLimbs: true});
        this.patchPlugin = new BodypartPatchPlugin(.01,256);
        this.bgBlur = new BgBlurPlugin(6,.4);         
        this.bgReplace = new BgReplacePlugin(.1, .3, mirror);
        this.smoothMask = new MaskSmoothPlugin(3);
        this.morphPlugin = new MaskMorphPlugin(-2);
        
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
            this.removePlugin(this.bgReplace);
            this.addPlugin(this.bgBlur);
        } else if (this.isBlur) {            
            this.isBlur = false;
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
        // Model
        await this.setModel(this.url);
        if(this.hatUrl) {
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
        
        console.log("keep parts:", keepParts.map(p => p.name));        
        console.log("Patch parts:", patchParts.map(p => p.name));

        this.patchPlugin.setParts(patchParts, keepParts);
        
        if (includeHat)
            this.hasPatchedHat = true;
    }
    
    // Set outfit to render
    async setOutfit(url: string, outfit?: OutfitParams) {
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
        if(this.hat)
        {
            _hasHat = true;
            _hatUrl = this.hatUrl;
        }
        delete this.model;
        const { scene } = this;
        if (!scene)
            return;
        this.url = url;
        this.outfit = outfit;
        const gltf = await SceneLoader.
            LoadAssetContainerAsync("", url, scene, undefined, ".glb");
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
        if(_hasHat)
            await this.setHat(_hatUrl);

        if (this.patchPlugin && this.model) {
            this.updatePatchParts(_hasHat);
        }        
    }

    async setBG(file?: string) {
        if (!file) {
            console.error("Background file is undefined.");
            return;
        }
        // Example: update a background image element
        const bgElement = document.getElementById("background");
        if (bgElement) {
            bgElement.style.backgroundImage = `url(${file})`;
        } else {
            console.warn("Background element not found.");
        }
        // Additional logic to update the scene if needed.
    }

    async setHat(url?: string, hatModel?: AbstractMesh) {
        if (this.hat) {
            this.hat.dispose();
        }
        delete this.hat;
        
        if(hatModel)
        {
            this.hat = hatModel;
        }
        
        else if (url) {
            // Load hat model using Babylon.js
            const gltf = await SceneLoader.ImportMeshAsync("", url, "", this.scene);
            this.hat = gltf.meshes.find((m) => m.id === "__root__");
            this.hatUrl = url;
            if (!this.hat) {
                console.error("Hat model not found in the loaded GLTF file.");
                return;
            }
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
        
        if(this.hat)
        {
            this.hat.parent = this.topHead;
            this.hat.position.set(0, 0.106, 0.041); // Adjust as needed
            this.hat.scaling.set(.88, .88, .88); // Adjust scale if needed               
            this.hasPatchedHat = false;
        }

    }
    async suggestSize(height: number, chestWidth: number): Promise<string> {
        if (height < 300) return chestWidth < 60 ? "XS" : "S";
        if (height < 400) return chestWidth < 70 ? "M" : "L";
        return "XL";
    }    
    
    // Update
    async update(result: PoseResult, stream: HTMLCanvasElement): Promise<void> {
        const pose = result.poses[0];
        if (!pose) {
            return super.update(result, stream);
        }      

        this.lastPose = pose;
          // Patch only once after pose is detected and hat is present
        if (!this.hasPatchedHat && this.hat) {
            this.updatePatchParts(true);
        }        

    await super.update(result, stream);

    if (this.lastPose?.maskTex) {
        const maskTex = this.lastPose.maskTex;
        if (!this.gl) throw new Error('WebGL context not available');
    
        const maskTexture = maskTex.texture as WebGLTexture;
        const maskWidth = maskTex.size.width;
        const maskHeight = maskTex.size.height;
    
        const canvasHeight = stream.height;
    
        // Set up framebuffer to read from texture
        const framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            maskTexture,
            0
        );
        const sizeTextEl = document.getElementById("size-text");

        function updateSuggestedSize(size: string) {
        if (sizeTextEl) {
            sizeTextEl.textContent = `Suggested Size: ${size}`;
        }
        }

    
        const pixels = new Uint8Array(maskWidth * maskHeight * 4);
        this.gl.readPixels(0, 0, maskWidth, maskHeight, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    
        this.gl.deleteFramebuffer(framebuffer);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
        const toTextureY = (canvasY: number) => {
            const aspectRatio = maskWidth / maskHeight;
            const scaledY = canvasY * (maskHeight / canvasHeight);
            return Math.floor(maskHeight - scaledY - 1);
        };
    
        // Scan a row of pixels and measure width where R > 128
        const measureWidthAt = (textureY: number) => {
            let left = maskWidth, right = 0;

            for (let x = 0; x < maskWidth; x++) {
                const idx = (textureY * maskWidth + x) * 4;
                const r = pixels[idx];
                if (r > 128) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                }
            }

            const visible = right > left;
            return visible ? right - left : 0;
        };    

        try {

            const pose = this.lastPose;    
            const waistYNormalized = pose.points.hipL.pixel?.[1];    
            const noseYNormalized = pose.points.nose.pixel?.[1];

            const noseYmetric = pose.points.nose.metric?.[1];
            const waistYmetric = pose.points.hipL.metric?.[1];

            const waistYTex = (waistYNormalized * maskHeight);
            const noseYTex =  noseYNormalized*maskHeight;

            const waistWidth = measureWidthAt(toTextureY(waistYTex));

            const metricHeight =  pose.points.ankleL?.metric[1] - pose.points.nose.metric[1] ;
    
            if(waistWidth > 10)
            {
                //this.topHead?.getAbsolutePosition()
                console.log('Body Measurements:');
                console.log(waistYNormalized, waistYTex, metricHeight, );
                console.log(`Waist: ${waistWidth}px (${(waistWidth).toFixed(1)} cm)`);
                let suggestedSize = "M";

                if (waistWidth < 20) suggestedSize = "XS";
                else if (waistWidth < 30) suggestedSize = "S";
                else if (waistWidth < 50) suggestedSize = "M";
                else if (waistWidth < 60) suggestedSize = "L";
                else suggestedSize = "XL";
                updateSuggestedSize(suggestedSize);
            }
            // Create a canvas for visualization
            const debugCanvas = (() => {
                const element = document.getElementById('debug-canvas');
                if (element instanceof HTMLCanvasElement) {
                    return element;
                }
                const c = document.createElement('canvas');
                c.id = 'debug-canvas';
                c.style.position = 'absolute';
                c.style.top = '0';
                c.style.left = '0';
                c.style.zIndex = '999';
                c.style.border = '1px solid red';
                document.body.appendChild(c);
                return c;
            })();

            debugCanvas.width = maskWidth;
            debugCanvas.height = maskHeight;

            const ctx = debugCanvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas 2D context');

                // Convert raw RGBA pixel data to ImageData and put on canvas
                const imgData = new ImageData(new Uint8ClampedArray(pixels), maskWidth, maskHeight);
                ctx.putImageData(imgData, 0, 0);

                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(0, waistYTex);
                ctx.lineTo(maskWidth, waistYTex);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, noseYTex);
                ctx.lineTo(maskWidth, noseYTex);
                ctx.stroke();

                ctx.fillStyle = 'lime';
                ctx.font = '16px sans-serif';
                ctx.fillText('Waist', 10, waistYTex - 5);                
                ctx.fillText(metricHeight.toFixed(2), 10, noseYTex - 5);            
            } 
            
            catch (error) {
                console.error('Measurement error:', error);
            }
        }
    
    }
}

