export interface WindData {
  width: number;
  height: number;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  image: HTMLImageElement;
}

type WebGlProgramWrapper = {
  program: WebGLProgram,
} & {
  [attributeName: string]: GLint
} & {
  [uniformName: string]: WebGLUniformLocation
};

export default class WindGL {

  gl: WebGLRenderingContext;

  /**
   * How fast the particle trails fade on each frame.
   */
  fadeOpacity: number;
  /**
   * How fast the particles move.
   */
  speedFactor: number;
  /**
   * How often the particles move to a random place.
   */
  dropRate: number;
  /**
   * Drop rate increase relative to individual speed.
   */
  dropRateBump: number;

  drawProgram: WebGlProgramWrapper;
  screenProgram: WebGlProgramWrapper;
  updateProgram: WebGlProgramWrapper;

  quadBuffer: WebGLBuffer;
  frameBuffer: WebGLFramebuffer;

  windData: WindData;
  windTexture: WebGLTexture;

  backgroundTexture: WebGLTexture;
  screenTexture: WebGLTexture;
  colorRampTexture: WebGLTexture;
  particleStateTexture0: WebGLTexture;
  particleStateTexture1: WebGLTexture;
  particleIndexBuffer: WebGLBuffer;
  particleStateResolution: number;

  constructor(gl: WebGLRenderingContext);

  set numParticles(numParticles: number);
  get numParticles(): number;

  resize(): void;
  setColorRamp(colors: { [key: string]: string }): void;
  setWind(windData: WindData): void;
  draw(): void;
  drawScreen(): void;
  drawTexture(texture: WebGLTexture, opacity: GLfloat): void;
  drawParticles(): void;
  updateParticles(): void;

}
