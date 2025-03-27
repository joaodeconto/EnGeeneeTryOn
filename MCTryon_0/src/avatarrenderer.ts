
import { PoseRenderer, PoseOutfitPlugin, PoseAlignPlugin} from "@geenee/bodyrenderers-three";
import { MaskUploadPlugin, MaskUpscalePlugin, MaskSmoothPlugin, MaskErosionPlugin} from "@geenee/bodyrenderers-common";
import { BgReplacePlugin, BgBlurPlugin, BrightnessPlugin } from "@geenee/bodyrenderers-common";
import { PoseTuneParams, OutfitParams } from "@geenee/bodyrenderers-common";
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

    protected bgBlur: BgBlurPlugin; // Add blur plugin
    protected bgReplace: BgReplacePlugin; // Add background replace plugin
    protected brightness: BrightnessPlugin; // Add brightness plugin

    protected model?: three.Group;
    protected light?: three.PointLight;
    protected ambient?: three.AmbientLight;
    readonly lightInt: number = 100.75;
    readonly ambientInt: number = 1.0;

    // Constructor
    constructor(
        container: HTMLElement,
        mode?: "fit" | "crop",
        mirror?: boolean,
        protected url = "./public/Models/polo.glb",
        protected outfit?: OutfitParams,
        protected tuneParams?: PoseTuneParams,
        ) 
        
        {
        super(container, mode, mirror);

        this.brightness = new BrightnessPlugin();
        this.addPlugin(this.brightness);

        this.poseOutfitPlugin = new PoseOutfitPlugin(undefined, outfit);        
        this.addPlugin(this.poseOutfitPlugin);

        this.poseAlignPlugin = new PoseAlignPlugin(undefined, {scaleLimbs: true, shoulderOffset: 0, spineCurve: 0});
        this.addPlugin(this.poseAlignPlugin);        

        this.maskUploadPlugin = new MaskUploadPlugin();
        this.addPlugin(this.maskUploadPlugin);        
        
        this.maskUpscalePlugin = new MaskUpscalePlugin(.01,4);
        //this.addPlugin(this.maskUpscalePlugin);
        
        this.maskErosionPlugin = new MaskErosionPlugin(15);
        //this.addPlugin(this.maskErosionPlugin);

        this.maskSmoothPlugin = new MaskSmoothPlugin(10);
        //this.addPlugin(this.maskSmoothPlugin);        

        this.bgBlur = new BgBlurPlugin(10, .6);
        this.addPlugin(this.bgBlur);
        
        this.bgReplace = new BgReplacePlugin();
        //this.addPlugin(this.bgReplace);
        


    }

    // Load assets and setup scene
    async load() {
        if (this.loaded || !this.scene)
            return;
        await this.setupScene(this.scene);
        return super.load();
    }

    // Setup scene
    protected async setupScene(scene: three.Scene) {
        // Model
        await this.setModel(this.url);
        
        // Lightning
        this.light = new three.PointLight(0xFFFFFF, this.lightInt, 100);
        this.light.position.set(0, 0, 3);
        //this.light.castShadow = true;
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
        this.url = url;
        this.outfit = outfit;
        const gltf = await new GLTFLoader().loadAsync(url);
        this.model = gltf.scene;
        this.scene?.add(this.model);
        this.poseOutfitPlugin.setOutfit(this.model, outfit);
        this.poseAlignPlugin.setNode(this.model);
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
