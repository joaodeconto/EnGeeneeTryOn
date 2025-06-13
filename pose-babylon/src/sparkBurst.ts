import { Scene, Vector3, Texture } from "@babylonjs/core";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Color4 } from "@babylonjs/core/Maths/math.color";

export class SparkBurst {
  private ps: ParticleSystem;

  /**
   * @param scene The Babylon.js scene
   * @param textureUrl Path or URL to your spark texture
   *                    Ensure the texture loads successfully (watch console).
   */
  constructor(private scene: Scene, textureUrl: string = "https://playground.babylonjs.com/textures/flare.png") {
    // Load texture with callbacks to verify transparency
    const sparkTexture = new Texture(
      textureUrl,
      scene,
      false,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => console.log("[SparkBurst] Texture loaded:" , textureUrl),
      (msg) => console.error("[SparkBurst] Texture load error:", msg)
    );

    // Use CPU-based ParticleSystem for simplicity and broader compatibility
    this.ps = new ParticleSystem("sparkPS", 200, scene);
    this.ps.particleTexture = sparkTexture;

    // No continuous emission; bursts only
    this.ps.emitRate = 0;

    // Visual tweak: make color fade from warm to transparent
    this.ps.color1 = new Color4(1, 0.8, 0.2, 1);
    this.ps.color2 = new Color4(1, 0.6, 0.1, 1);
    this.ps.colorDead = new Color4(1, 0.6, 0.1, 0);

    // Size and speed: smaller, 50% faster
    this.ps.minSize = 0.005;
    this.ps.maxSize = 0.085;
    this.ps.minLifeTime = 0.1;
    this.ps.maxLifeTime = 0.6;
    this.ps.minEmitPower = 2;
    this.ps.maxEmitPower = 6;
    this.ps.updateSpeed = 0.2;

    // Stronger gravity
    this.ps.gravity = new Vector3(0, -20.62, 0);

    // Additive glow
    this.ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;

    // Start so manualEmitCount works
    this.ps.start();
  }

  /**
   * Emit a one‐time burst of particles between two points.
   */
  public burst(left: Vector3, right: Vector3, count: number = 50): void {
    const pos = left.add(right).scale(0.5);
    this.ps.emitter = pos;

    console.log(`[SparkBurst] manualEmitCount = ${count} at`, pos);
    // Assign manualEmitCount for CPU ParticleSystem
    this.ps.manualEmitCount = count;
  }
}
