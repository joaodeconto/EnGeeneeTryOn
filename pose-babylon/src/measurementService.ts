// measurementService.ts

import { Pose } from "@geenee/bodyprocessors";

export interface BodyMeasurements {
  heightCm: number;  // altura em centímetros (via cadeia de articulações métricas)
  waistPx: number;   // largura da cintura em pixels
  waistCm: number;   // largura da cintura em centímetros
  cmPerPx: number;   // fator de escala atual (cm por pixel)
}

export type SizeLabel = "XS" | "S" | "M" | "L" | "XL" | "Fora de faixa";

/** Utility for Euclidean distance */
function dist3(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

export class MeasurementService {
  /**
   * Scan a single horizontal row of the cropped mask for red > 128.
   * box: normalized [x,y] top-left and [x2,y2] bottom-right.
   */
  static measureSilhouetteRow(
    maskPixels: Uint8Array,
    maskW: number,
    maskH: number,
    yNorm: number,
    box: [number, number][]
  ): { width: number; left: number; right: number } {
    const [[x0, y0], [x1, y1]] = box;
    const boxH = y1 - y0;
    const innerY = (yNorm - y0) / boxH;
    const clamped = Math.max(0, Math.min(1, innerY));
    const textureRow = Math.floor((1 - clamped) * maskH);

    let left = maskW, right = -1;
    for (let x = 0; x < maskW; x++) {
      const idx = (textureRow * maskW + x) * 4;
      if (maskPixels[idx] > 128) { // red > threshold
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    const width = right >= left ? right - left : 0;
    return { width, left, right };
  }

  /**
   * Measure waist width in pixels.
   */
  static measureWaistPx(
    pose: Pose,
    maskPixels: Uint8Array,
    maskW: number,
    maskH: number
  ): number {
    const yL = pose.points.hipL.pixel?.[1];
    const yR = pose.points.hipR.pixel?.[1];
    if (yL == null || yR == null) throw new Error("hip pixel missing");
    const yNorm = (yL + yR) / 2;
    const box = pose.maskTex!.box;
    const { width } = this.measureSilhouetteRow(
      maskPixels, maskW, maskH, yNorm, box
    );
    return width;
  }

  /**
   * Measure height in cm by summing metric distances along skeleton chain:
   * headTop -> shoulderMid -> hipMid -> ankleMid -> foot offset.
   */
  static measureHeightCm(pose: Pose): number {
    // headTop or approximate above nose
    const noseM = pose.points.nose.metric;
    if (!noseM) throw new Error("nose.metric missing");
    const headTop: [number, number, number] =  [noseM[0], noseM[1] + 0.12, noseM[2]];

    // shoulder midpoint
    const sL = pose.points.shoulderL.metric;
    const sR = pose.points.shoulderR.metric;
    if (!sL || !sR) throw new Error("shoulder.metric missing");
    const shoulderMid: [number, number, number] = [
      (sL[0] + sR[0]) / 2,
      (sL[1] + sR[1]) / 2,
      (sL[2] + sR[2]) / 2
    ];

    // hip midpoint
    const hL = pose.points.hipL.metric;
    const hR = pose.points.hipR.metric;
    if (!hL || !hR) throw new Error("hip.metric missing");
    const hipMid: [number, number, number] = [
      (hL[0] + hR[0]) / 2,
      (hL[1] + hR[1]) / 2,
      (hL[2] + hR[2]) / 2
    ];

    // ankle midpoint
    const aL = pose.points.ankleL.metric;
    const aR = pose.points.ankleR.metric;
    if (!aL || !aR) throw new Error("ankle.metric missing");
    const ankleMid: [number, number, number] = [
      (aL[0] + aR[0]) / 2,
      (aL[1] + aR[1]) / 2,
      (aL[2] + aR[2]) / 2
    ];

    // sum distances along chain
    let heightM = 0;
    heightM += dist3(headTop, shoulderMid);
    heightM += dist3(shoulderMid, hipMid);
    heightM += dist3(hipMid, ankleMid);
    // foot offset ~ 0.04m
    heightM += 0.04;

    return heightM * 100;
  }

  /**
   * Suggest a size label using only waistCm and heightCm.
   */
  static suggestSize(
    heightCm: number,
    waistCm: number
  ): SizeLabel {
    if (waistCm < 20) return "XS";
    if (waistCm < 30) return "S";
    if (waistCm < 40) return "M";
    if (waistCm < 50) return "L";
    return "XL";
  }

  /**
   * Master method: reads mask, measures waistPx & waistCm, heightCm, then suggests size.
   */
  static async measureAndSuggest(
    pose: Pose,
    gl: WebGLRenderingContext,
    cmPerPx: number
  ): Promise<{ measures: BodyMeasurements; size: SizeLabel }> {
    if (!pose.maskTex) throw new Error("maskTex missing");
    const { size: boxSize, texture, box } = pose.maskTex;
    const maskW = boxSize.width, maskH = boxSize.height;

    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    const pixels = new Uint8Array(maskW * maskH * 4);
    gl.readPixels(0, 0, maskW, maskH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);

    const waistPx = this.measureWaistPx(pose, pixels, maskW, maskH);
    const waistCm = waistPx;
    const heightCm = this.measureHeightCm(pose);
    const size = this.suggestSize(heightCm, waistCm);

    return {
      measures: { heightCm, waistPx, waistCm, cmPerPx },
      size
    };
  }
}
