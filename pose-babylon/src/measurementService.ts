// measurementService.ts

import { Scene } from "@babylonjs/core/scene";
/**
 * Interface mínima para o que esperamos de um landmark vindo do Engeenee.
 * Ajuste conforme a API real que o SDK fornece.
 */
export interface Landmark {
  x?: number;           // coordenada X na tela (pixels ou normalizado)
  y?: number;           // coordenada Y na tela (pixels ou normalizado)
  metric?: [number, number, number]; // [X, Y, Z] em metros (quando disponível)
  pixel?: [number, number, number];          // [X, Y] normalizado (0..1) ou em pixels, conforme SDK
}

/**
 * Representa a pose detectada (landmarks) simplificada.
 */
export interface SimplePose {
  nose: Landmark;
  headTop?: Landmark;
  shoulderL: Landmark;
  shoulderR: Landmark;
  hipL: Landmark;
  hipR: Landmark;
  ankleL: Landmark;
  ankleR: Landmark;
  // … adicione outros pontos se precisar
  maskTex?: {
    size: { width: number; height: number };
    texture: WebGLTexture;
    };
}

/**
 * Resultado das medições em centímetros.
 */
export interface BodyMeasurements {
  heightCm: number;
  chestCm: number;
  waistCm: number;
  cmPerPx: number;      // fator de escala atual (cm por pixel)
}

/**
 * Labels disponíveis para tamanhos (pode ajustar à sua tabela real).
 */
export type SizeLabel = "XS" | "S" | "M" | "L" | "XL" | "Fora de faixa";

/**
 * Serviço estático (sem estado) para medição e sugestão de tamanho.
 */
export class MeasurementService {
  /**
   * 1) Calcula o fator de escala (cm por pixel) usando a distância
   *    3D entre ombro esquerdo e ombro direito (via metric).
   *
   * @param pose – conjunto de landmarks da pose
   * @returns cmPerPx – quantos centímetros equivale a 1 pixel (baseado em ombros)
   */
  static computeScaleCmPerPx(pose: SimplePose,
  canvasWidth: number,
  canvasHeight: number
): number {
    const sL = pose.shoulderL.metric;
    const sR = pose.shoulderR.metric;
    if (!sL || !sR) {
      throw new Error("Não foi possível obter metric de shoulderL ou shoulderR.");
    }

    // 1. Distância real entre ombros em metros → converter para cm
    const dx = sL[0] - sR[0];
    const dy = sL[1] - sR[1];
    const dz = sL[2] - sR[2];
    const distShouldersM = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distShouldersCm = distShouldersM * 100;

    // 2. Distância em pixels (tarefas de X,Y vindas da pose)
    //    Supondo que 'x' e 'y' sejam realmente pixels brutos. Se forem normalizados (0..1),
    //    multiplique por largura/altura da tela antes.
    const pxL = pose.shoulderL.pixel![0] * canvasWidth;
    const pyL = pose.shoulderL.pixel![1] * canvasHeight;
    const pxR = pose.shoulderR.pixel![0] * canvasWidth;
    const pyR = pose.shoulderR.pixel![1] * canvasHeight;
    const distShouldersPx = Math.hypot(pxL - pxR, pyL - pyR);

    if (distShouldersPx < 1) {
      throw new Error("Ombros muito próximos em pixels, possível detecção falha.");
    }

    return distShouldersCm / distShouldersPx;
  }

  /**
   * 2) Mede a largura da silhueta (em pixels) numa determinada linha Y da textura
   *    de segmentação, varrendo todo o span horizontal e retornando (right–left).
   *
   * @param maskPixels – Uint8Array com RGBA de toda a textura
   * @param maskW, maskH – dimensões da textura
   * @param textureY – coordenada Y na textura (pixel) onde medir
   * @returns largura em pixels; 0 significa “não detectado”
   */
  static measureSilhouetteWidth(
    maskPixels: Uint8Array,
    maskW: number,
    maskH: number,
    textureY: number
  ): number {
    let left = maskW;
    let right = -1;

    for (let x = 0; x < maskW; x++) {
      const idx = (textureY * maskW + x) * 4;
      const r = maskPixels[idx];
      const g = maskPixels[idx + 1];
      const b = maskPixels[idx + 2];
      const a = maskPixels[idx + 3];

      // Threshold: considere “parte do corpo” se alpha alto ou luma alta
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (a > 128 || luma > 128) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }

    return right >= left ? right - left : 0;
  }

  /**
   * 3) Converte coordenada Y em “pixel de tela” (por ex. normalizada 0..1) para
   *    coordenada Y da textura WebGL (origem no canto inferior).
   *
   * @param normalizedY – valor Y do landmark em [0..1], ou pixel / canvasHeight
   * @param maskH – altura da textura
   * @param canvasH – altura do elemento canvas visível
   * @returns Y em pixel na textura (invertida)
   */
  static canvasYToTextureY(
    normalizedY: number,
    maskH: number,
    canvasH: number
  ): number {
    // Se normalizedY for already em pixels (0..canvasH), então /canvasH retorna 0..1
    const yNorm = normalizedY; // assumindo 0..1
    const scaledY = yNorm * maskH;
    return Math.floor(maskH - scaledY - 1);
  }

  /**
   * 4) Mede a altura real do usuário em centímetros, usando headTop ↔ heel.
   *
   * @param pose – landmarks da pose (com metric)
   * @returns altura aproximada em cm
   */
  static measureHeightCm(pose: SimplePose, cmPerPx?: number): number {
    // 4.1) Determinar top of head
    let headY: number;
    if (pose.headTop && pose.headTop.metric) {
      headY = pose.headTop.metric[1];
    } else if (pose.nose && pose.nose.metric) {
      // Se não houver headTop, compense +15 cm acima do nariz
      headY = pose.nose.metric[1] + 0.15;
    } else {
      throw new Error("Não foi possível determinar headTop ou nose.metric.");
    }

    // 4.2) Determinar Y do calcanhar
    let heelY: number;
    const aL = pose.ankleL.metric;
    const aR = pose.ankleR.metric;
    if (aL && aR) {
      const ankleMinY = Math.min(aL[1], aR[1]);
      heelY = ankleMinY - 0.04; // aproximar +4 cm de compensação para o calcanhar
    } else {
      throw new Error("Não foi possível obter ankle.metric para cálculo de pé.");
    }

    const heightM = Math.max(0, headY - heelY);
    return heightM * 100; // converter para cm
  }

  /**
   * 5) Mede largura de peito ou cintura em centímetros:
   *    - Pede a largura em pixels da silhueta (no nível do landmark)
   *    - Converte para cm usando cmPerPx
   *
   * @param pose – landmarks (para obter pixel Y normalizado)
   * @param maskPixels – RGBA da textura
   * @param maskW, maskH – dimensões da textura
   * @param cmPerPx – fator de escala cm/px
   * @param level – "chest" ou "waist": define qual linha medir
   */
  static measureWidthCm(
    pose: SimplePose,
    maskPixels: Uint8Array,
    maskW: number,
    maskH: number,
    cmPerPx: number,
    level: "chest" | "waist",
    canvasHeight: number
  ): number {
    // 5.1) Escolher Y normalizado conforme nível
    let yNorm: number;
    if (level === "chest") {
      // use o ponto médio entre os ombros (normalizado 0..1)
      const yL = pose.shoulderL.pixel ? pose.shoulderL.pixel[1] : undefined;
      const yR = pose.shoulderR.pixel ? pose.shoulderR.pixel[1] : undefined;
      if (yL == null || yR == null) {
        throw new Error("pixel de shoulderL ou shoulderR não disponível.");
      }
      yNorm = (yL + yR) / 2;
    } else {
      // waist: ponto médio entre os quadris (normalizado)
      const yL = pose.hipL.pixel ? pose.hipL.pixel[1] : undefined;
      const yR = pose.hipR.pixel ? pose.hipR.pixel[1] : undefined;
      if (yL == null || yR == null) {
        throw new Error("pixel de hipL ou hipR não disponível.");
      }
      yNorm = (yL + yR) / 2;
    }

    // 5.2) Converter Y normalizado → pixel da textura
    const textureY = this.canvasYToTextureY(yNorm, maskH, canvasHeight);

    // 5.3) Medir largura em pixels
    const widthPx = this.measureSilhouetteWidth(maskPixels, maskW, maskH, textureY);

    // 5.4) Converter para centímetros
    return widthPx * cmPerPx;
  }

  /**
   * 6) Função que recebe as medições em cm e mapeia para um label de tamanho.
   *
   * Pode usar somente chestCm + heightCm, ou waistCm. Ajuste thresholds conforme tabela real.
   */
  static suggestSize(
    heightCm: number,
    chestCm: number,
    waistCm?: number
  ): SizeLabel {
    // Exemplo simplificado (você pode refinar usando a cintura ou tabela completa):
    if (heightCm < 150) {
      return chestCm < 80 ? "XS" : "S";
    } else if (heightCm < 170) {
      if (chestCm < 90) return "S";
      if (chestCm < 100) return "M";
      return "L";
    } else {
      if (chestCm < 100) return "M";
      if (chestCm < 110) return "L";
      return "XL";
    }
  }

  /**
   * 7) Combina tudo: recebe a pose, a máscara (via WebGL), o canvas de visualização
   *    e retorna um objeto com medidas em cm e label sugerido.
   *
   * @param pose – SimplePose (landmarks + maskTex obrigatório)
   * @param gl – contexto WebGL para ler a textura
   * @param canvasHeight – altura do canvas visível (pixels)
   * @returns BodyMeasurements + SizeLabel
   */
  static async measureAndSuggest(
    pose: SimplePose,
    gl: WebGLRenderingContext,
    canvasHeight: number,
    canvasWidth: number
  ): Promise<{ measures: BodyMeasurements; size: SizeLabel }> {
    // 7.1) Verificar se há máscara
    if (!pose.maskTex) {
      throw new Error("Mask texture não disponível para medição de silhueta.");
    }

    // 7.2) Ler pixels da máscara via WebGL
    
    const maskW = pose.maskTex.size.width;
    const maskH = pose.maskTex.size.height;

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      pose.maskTex.texture,
      0
    );

    const pixels = new Uint8Array(maskW * maskH * 4);
    gl.readPixels(0, 0, maskW, maskH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);

    // 7.3) Calcular cmPerPx (usar ombros)
    const cmPerPx = this.computeScaleCmPerPx(pose, canvasWidth, canvasHeight);

    // 7.4) Medir largura de peito e cintura em cm
    const chestCm = this.measureWidthCm(
      pose,
      pixels,
      maskW,
      maskH,
      cmPerPx,
      "chest",
      canvasHeight
    );
    const waistCm = this.measureWidthCm(
      pose,
      pixels,
      maskW,
      maskH,
      cmPerPx,
      "waist",
      canvasHeight
    );

    // 7.5) Medir altura em cm
    const heightCm = this.measureHeightCm(pose);

    // 7.6) Sugerir tamanho
    const size = this.suggestSize(heightCm, chestCm, waistCm);

    return {
      measures: { heightCm, chestCm, waistCm, cmPerPx },
      size
    };
  }
}
