
import { SkeletonTransforms, PoseRenderer, PoseOutfitPlugin, PoseAlignPlugin} from "@geenee/bodyrenderers-three";
import { MaskUploadPlugin, MaskUpscalePlugin, MaskSmoothPlugin, MaskErosionPlugin, MaskMorphPlugin, VideoMergePlugin} from "@geenee/bodyrenderers-common";
import { BgReplacePlugin, BgBlurPlugin, BrightnessPlugin, BodyPatchPlugin, BilateralPlugin } from "@geenee/bodyrenderers-common";
import { PoseTuneParams, OutfitParams } from "@geenee/bodyrenderers-common";
import { ImageTexture } from "@geenee/armature";
import { PoseResult } from "@geenee/bodyprocessors";
import * as three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";


// Renderer
export class AvatarRenderer extends PoseRenderer {
    // Scene
    protected poseOutfitPlugin: PoseOutfitPlugin;
    protected poseAlignPlugin: PoseAlignPlugin;

    protected maskUpscalePlugin: MaskUpscalePlugin; // Add mask upscale plugin
    protected maskSmoothPlugin: MaskSmoothPlugin; // Add mask plugin
    protected maskUploadPlugin: MaskUploadPlugin; // Add mask upload plugin
    protected maskErosionPlugin: MaskErosionPlugin; // Add mask erosion plugin
    protected maskMorphPlugin: MaskMorphPlugin; // Add mask

    protected bgBlur: BgBlurPlugin; // Add blur plugin
    protected bgReplace: BgReplacePlugin; // Add background replace plugin
    protected bodyPatch: BodyPatchPlugin; // Add body patch plugin
    protected bilateral: BilateralPlugin; // Add bilateral plugin
    protected brightness: BrightnessPlugin; // Add brightness plugin

    protected bgImageTexture?: ImageTexture;

    protected hat?: three.Object3D;
    protected model?: three.Group;
    protected light?: three.PointLight;
    protected ambient?: three.AmbientLight;
    readonly lightInt: number = 30.75;
    readonly ambientInt: number = 1.0;

    // Constructor
    constructor(
        container: HTMLElement,
        mode?: "fit" | "crop",
        mirror?: boolean,
        protected outfitUrl = "./public/Models/polo.glb",
        protected outfit?: OutfitParams,
        protected bgUrl?: string,        
        protected tuneParams?: PoseTuneParams,        
        protected hatUrl?: string,
        protected hatModel?: three.Object3D)
        
    {
        super(container, mode, mirror);

        this.brightness = new BrightnessPlugin((brightness) => this.updateLighting(brightness));

        this.poseOutfitPlugin = new PoseOutfitPlugin(undefined, outfit);        
             
        this.maskUploadPlugin = new MaskUploadPlugin();
        
        this.poseAlignPlugin = new PoseAlignPlugin(undefined, {scaleLimbs: true, shoulderOffset: 0.2, spineCurve: 0});
        this.maskUpscalePlugin = new MaskUpscalePlugin(.99,4);        
        this.bgBlur = new BgBlurPlugin(10, .5);
        this.bodyPatch = new BodyPatchPlugin(.9,.1);        
        this.maskErosionPlugin = new MaskErosionPlugin(1);        
        this.maskMorphPlugin = new MaskMorphPlugin(1);        
        this.bgReplace = new BgReplacePlugin(.1, .2, mirror);
        this.bilateral = new BilateralPlugin(.8, .1);        
        this.maskSmoothPlugin = new MaskSmoothPlugin(1);
        
        this.addPlugin(this.brightness);
        this.addPlugin(this.poseOutfitPlugin);
        this.addPlugin(this.poseAlignPlugin);            
         
        this.addPlugin(this.maskUploadPlugin);         
        this.addPlugin(this.maskUpscalePlugin);    
        
        this.addPlugin(this.bgReplace);  
        
        
        //this.addPlugin(this.bodyPatch);        
        this.addPlugin(this.maskSmoothPlugin);
        this.addPlugin(this.maskErosionPlugin);
        this.addPlugin(this.maskMorphPlugin);
         
        //this.addPlugin(this.bgBlur);           
        //this.addPlugin(this.bilateral);        
                
         
        const textureLoader = new three.TextureLoader();      
    }

    // Load assets and setup scene
    async load() {
        if (this.loaded || !this.scene)
            return;
        await this.setupScene(this.scene);
        return super.load();
    }

    protected updateLighting(brightness: number) {
        if (this.ambient) {
            // Map brightness to a suitable intensity range (adjust scale factor as needed)
            this.ambient.intensity = Math.max(0, Math.min(brightness , 2));              
        }
        if (this.light) {
            // Map brightness to a suitable intensity range (adjust scale factor as needed)
            //this.light.intensity = Math.max(0.2, Math.min(brightness * 100, 100));            
        }
    }

    // Setup scene
    protected async setupScene(scene: three.Scene) {
        // Model
        await this.setModel(this.outfitUrl);
        await this.setHat(this.hatUrl);
        if (this.bgUrl) {
            await this.setBG(this.bgUrl);
        } else {
            console.warn("Background URL is undefined.");
        }
        // Lightning
        this.light = new three.PointLight(0xFFFFFF, this.lightInt, 150);
        this.light.position.set(0, 3, -1);
        this.light.castShadow = true;
        this.ambient = new three.AmbientLight(0xFFFFFF, this.ambientInt);
        scene.add(this.light);
        scene.add(this.ambient);
        // Environment
        const environment = await new RGBELoader().loadAsync("environment.hdr");
        scene.environment = environment;        
    }

    // Set model to render
    async setModel(url: string) {
        return this.setOutfit(url, this.outfit);
    }

    // Set outfit to render
    async setOutfit(url: string, outfit?: OutfitParams) {
        if (this.model)
            this.disposeObject(this.model);
        delete this.model;
        this.outfitUrl = url;
        this.outfit = outfit;
        const gltf = await new GLTFLoader().loadAsync(url);
        this.model = gltf.scene;
        this.scene?.add(this.model);
        this.poseOutfitPlugin.setOutfit(this.model, outfit);
        this.poseAlignPlugin.setNode(this.model);
        this.setHat(undefined, this.hat);
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
    
    async setHat(url?: string, hatModel?: three.Object3D) {
        if (this.hat) {
            this.disposeObject(this.hat);
        }
        delete this.hat;
        
        if(hatModel)
        {
            this.hat = hatModel;
        }
        else if (url) {
        // Load hat model
        const gltf = await new GLTFLoader().loadAsync(url);
        this.hat = gltf.scene;
        }
    
        if (!this.model) {
            console.warn("Character model not loaded yet.");
            return;
        }
    
         // Find the head bone
        const headBone = this.model.getObjectByName("Head") 
        
        if (!headBone) {
            console.error("Head bone not found!");
            return;
        }
        
        if(this.hat)
        {
        headBone.add(this.hat);
        this.hat.position.set(0, 0.1, .05); // Adjust as needed
        this.hat.scale.set(.9, .9, .9); // Adjust scale if needed
        }
    }

    // Update
    async update(result: PoseResult, stream: HTMLCanvasElement) {
        // Analyze pose keypoints to detect hands up
        const pose = result.poses[0];
        if (!pose) {
            return super.update(result, stream);
        }
        await super.update(result, stream);
    }
}
