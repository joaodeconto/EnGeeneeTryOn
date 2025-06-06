
import { PoseRenderer, PoseAlignPlugin, OccluderMaterial } from "@geenee/bodyrenderers-babylon";
import { OutfitParams } from "@geenee/bodyrenderers-common";
import { PoseResult } from "@geenee/bodyprocessors";
import { CanvasMode } from "@geenee/armature";
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

    // Constructor
    constructor(
        container: HTMLElement,
        mode?: CanvasMode,
        mirror?: boolean,
        protected url = "onesie.glb",
        protected outfit?: OutfitParams) {
        super(container, mode, mirror);
        this.aligner = new PoseAlignPlugin();
        this.addPlugin(this.aligner);
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
        // Model
        await this.setModel(this.url);
        // Lightning
        const directUp = new DirectionalLight(
            "DirectLightUp", new Vector3(0.5, -1, -0.2), scene);
        directUp.position.set(0, 4, -10);
        directUp.intensity = 5;
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
    }

    // Set model to render
    async setModel(url: string) {
        return this.setOutfit(url, this.outfit);
    }

    // Set outfit to render
    async setOutfit(url: string, outfit?: OutfitParams) {
        if (this.model) {
            const model = this.model;
            this.aligner.setNode();
            this.shadowers.forEach((s) => s.removeShadowCaster(model))
            this.scene?.removeMesh(model, true);
            model.dispose(false, true);
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
    }

    // Update
    async update(result: PoseResult, stream: HTMLCanvasElement): Promise<void> {
        // Analyze pose keypoints to detect hands up
        const pose = result.poses[0];
        if (!pose) {
            this.handsUp = false;
            return super.update(result, stream);
        }
        // Keypoints
        const { points } = pose;
        const hipL = new Vector3(...points.hipL.metric);
        const hipR = new Vector3(...points.hipR.metric);
        const shoulderL = new Vector3(...points.shoulderL.metric);
        const shoulderR = new Vector3(...points.shoulderR.metric);
        const elbowL = new Vector3(...points.elbowL.metric);
        const elbowR = new Vector3(...points.elbowR.metric);
        const wristL = new Vector3(...points.wristL.metric);
        const wristR = new Vector3(...points.wristR.metric);
        // Arm vectors
        const torsoL = shoulderL.subtract(hipL).normalize();
        const torsoR = shoulderR.subtract(hipR).normalize();
        const armL = elbowL.subtract(shoulderL).normalize();
        const armR = elbowR.subtract(shoulderR).normalize();
        const foreArmL = wristL.subtract(elbowL).normalize();
        const foreArmR = wristR.subtract(elbowR).normalize();
        // Dot product of unit vectors gives cos of angle between
        // If vectors are parallel, angle is close to 0, cos to 1
        const armLCos = Vector3.Dot(torsoL, armL);
        const armRCos = Vector3.Dot(torsoR, armR);
        const foreArmLCos = Vector3.Dot(foreArmL, armL);
        const foreArmRCos = Vector3.Dot(foreArmR, armR);
        // Hands are up if all vectors have almost the same direction
        // Add hysteresis when changing mouth state to reduce noise
        const cosMin = Math.min(armLCos, armRCos, foreArmLCos, foreArmRCos);
        if (cosMin > 0.8)
            this.handsUp = true;
        if (cosMin < 0.7)
            this.handsUp = false;
        // Position text model
        const { textModel } = this;
        if (textModel) {
            const position = Vector3.Lerp(wristL, wristR, 0.5);
            textModel.position = position;
            textModel.setEnabled(this.handsUp);
        }
        await super.update(result, stream);
    }
}
