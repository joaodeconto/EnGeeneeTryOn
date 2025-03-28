import {FaceRenderer, FacePlugin, FaceTrackPlugin} from  "@geenee/bodyrenderers-three";
import {FaceResult} from "@geenee/bodyprocessors";
import * as three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


export class faceHatRenderer extends FaceRenderer {

    protected faceTrackPlugin: FaceTrackPlugin;
    //protected facePlugin: FacePlugin;
    protected node: three.Object3D = new three.Object3D();
    protected shapeScale: boolean = false;
    protected model?: three.Group;
    protected faceresult?: FaceResult;
        
    constructor(
        container: HTMLElement,
        mode?: "fit" | "crop",
        mirror?: boolean,
        protected url = "./public/Models/base.glb",    )
    {
        
        super(container, mode, mirror);

        this.faceTrackPlugin = new FaceTrackPlugin(this.node);
        this.addPlugin(this.faceTrackPlugin)
    }
    // Set model to render
    async setModel(url: string) {
        return this.setHat(url, url);
    }

    // Set outfit to render
    async setHat(url: string, outfit?: string) {
        if (this.model)
            this.disposeObject(this.model);
        delete this.model;
        this.url = url;
        const gltf = await new GLTFLoader().loadAsync(url);
        this.model = gltf.scene;
        this.scene?.add(this.model);
        this.node.add(this.model);
    }
    async update(result: FaceResult, stream: HTMLCanvasElement) {
        if (!this.loaded)
            return;
        const { transform } = result;
        if (!transform) {
            this.node.visible = false;
            return super.update(result, stream);
        }
        
        console.log("face detected");
            // Mesh transformation
            const translation = new three.Vector3(...transform.translation)
            const uniformScale = new three.Vector3().setScalar(transform.scale);
            const shapeScale = new three.Vector3(
                ...transform.shapeScale).multiplyScalar(transform.scale)
            const rotation = new three.Quaternion(...transform.rotation);
            // Align node with the face
            this.node.visible = true;
            this.node.setRotationFromQuaternion(rotation);
            this.node.position.copy(translation);
            this.node.scale.copy(this.shapeScale ? shapeScale : uniformScale);
            // Render
            return super.update(result, stream);
    }
}