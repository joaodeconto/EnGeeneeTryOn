import { FaceResult } from "@geenee/bodyprocessors";
import { FaceRenderer, HeadTrackPlugin, OccluderPlugin } from "@geenee/bodyrenderers-three";
import * as three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

export class HatRenderer extends FaceRenderer {
    // Scene
    protected hat?: three.Object3D;
    protected head?: three.Object3D;
    protected light?: three.PointLight;
    protected ambient?: three.AmbientLight;
    readonly lightInt = 1;
    readonly ambientInt = 3;
    // Mouth O-shape
    protected mouthOpenness = 0;
    protected mouthOpen = false;
    protected textModel?: three.Group;

    // Constructor
    constructor(container: HTMLElement, mode?: "fit" | "crop", mirror?: boolean) {
        super(container, mode, mirror);
    }

    // Load assets and setup scene
    async load() {
        if (this.loaded || !this.scene)
            return;
        await this.setupScene(this.scene);
        await super.load();
    }

    // Setup scene
    protected async setupScene(scene: three.Scene) {
        // Hat
        const hatGltf = await new GLTFLoader().loadAsync("hat.glb");
        scene.add(hatGltf.scene);
        this.hat = scene.getObjectByName("HeadTrack");
        if (this.hat)
            this.addPlugin(new HeadTrackPlugin(this.hat, true));
        // Occluder
        this.head = scene.getObjectByName("HeadOccluder");
        if (this.head)
            this.addPlugin(new OccluderPlugin(this.head));
        // Lightning
        this.light = new three.PointLight(0xFFFFFF, this.lightInt);
        this.ambient = new three.AmbientLight(0xFFFFFF, this.ambientInt);
        this.camera.add(this.light);
        scene.add(this.ambient);
        // Environment
        this.renderer.outputColorSpace = three.SRGBColorSpace;
        const environment = await new RGBELoader().loadAsync("environment.hdr");
        scene.environment = environment;
        // Text model
        const font = await new FontLoader().loadAsync("font.json");
        const geometry = new TextGeometry("WOW!!!", {
            font: font, size: 0.03, height: 0.01,
            bevelSize: 0.001, bevelThickness: 0.01,
            bevelSegments: 10, bevelEnabled: true
        });
        const mesh = new three.Mesh(geometry, [
            new three.MeshStandardMaterial({
                color: 0x3BDB9B, opacity: 0.85, flatShading: true }),
            new three.MeshStandardMaterial({
                color: 0x3BDB9B, opacity: 0.85 })
        ]);
        // Center model
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (box) {
            mesh.position.x = -0.5 * (box.max.x - box.min.x);
            mesh.position.y = -0.5 * (box.max.y - box.min.y) - 0.05;
            mesh.position.z = 0.05;
        }
        this.textModel = new three.Group();
        this.textModel.visible = false;
        this.textModel.add(mesh);
        this.scene?.add(this.textModel);
    }

    // Update
    async update(result: FaceResult, stream: HTMLCanvasElement) {
        // Analyze face keypoints to detect open mouth
        const { transform = undefined, metric = undefined } = result.faces[0] || {};
        if (!metric) {
            this.mouthOpenness = 0;
            this.mouthOpen = false;
            return super.update(result, stream);
        }
        const left = new three.Vector3(...metric[78]);
        const right = new three.Vector3(...metric[308]);
        const top = new three.Vector3(...metric[13]);
        const bottom = new three.Vector3(...metric[14]);
        // Openness is ratio between height and width
        // Add hysteresis when changing mouth state
        this.mouthOpenness = top.distanceTo(bottom) / left.distanceTo(right);
        if (this.mouthOpenness > 0.6)
            this.mouthOpen = true;
        if (this.mouthOpenness < 0.5)
            this.mouthOpen = false;
        // Position text model
        const { textModel } = this;
        if (textModel && transform) {
            // Align model with mesh
            textModel.setRotationFromQuaternion(
                new three.Quaternion(...transform.rotation));
            textModel.position.set(...transform.translation);
            textModel.scale.setScalar(transform.scale);
            textModel.visible = this.mouthOpen;
        }
        await super.update(result, stream);
    }
}
