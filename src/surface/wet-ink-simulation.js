import { coordinateNoiseUnchecked as coordinateNoise } from "../deterministic/random.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

function assertSeed(value, path) {
  return assertUint32(value, path);
}

/**
 * Deterministic water/mobile-pigment/fixed-pigment grid from the accepted HTML
 * direct-input study. The formulas are intentionally unchanged in extraction.
 */
export class WetInkSimulation {
  constructor(width, height, seed) {
    assertSeed(seed, "seed");
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.length = width * height;
    this.water = new Float32Array(this.length);
    this.mobile = new Float32Array(this.length);
    this.fixed = new Float32Array(this.length);
    this.nextWater = new Float32Array(this.length);
    this.nextMobile = new Float32Array(this.length);
    this.fiberX = new Float32Array(this.length);
    this.fiberY = new Float32Array(this.length);
    this.activity = 0;
    this.makeFiberField();
  }

  makeFiberField() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        const broad = coordinateNoise(
          Math.floor(x / 17),
          Math.floor(y / 13),
          this.seed,
        );
        const tooth = coordinateNoise(x, y, this.seed ^ 0x9e3779b9);
        const angle = (broad * 0.72 + tooth * 0.28 - 0.5) * Math.PI;
        this.fiberX[index] = Math.cos(angle);
        this.fiberY[index] = Math.sin(angle);
      }
    }
  }

  clear() {
    this.water.fill(0);
    this.mobile.fill(0);
    this.fixed.fill(0);
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.activity = 0;
  }

  depositMask(imageData, options) {
    assertSeed(options?.seed, "options.seed");
    if (imageData.width !== this.width || imageData.height !== this.height) {
      throw new Error("Mask dimensions must match the simulation grid.");
    }

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        const alpha = imageData.data[index * 4 + 3] / 255;
        if (alpha <= 0.002) continue;
        const broad = coordinateNoise(
          Math.floor(x / 9),
          Math.floor(y / 8),
          this.seed ^ options.seed,
        );
        const tooth = coordinateNoise(
          x,
          y,
          this.seed ^ options.seed ^ 0x85ebca6b,
        );
        const contact = 0.82 + broad * 0.28 + (tooth - 0.5) * 0.12;
        this.water[index] = clamp(
          this.water[index] + alpha * options.waterLoad * contact,
          0,
          1.4,
        );
        this.mobile[index] = clamp(
          this.mobile[index] + alpha * options.pigmentLoad * contact,
          0,
          1.8,
        );
      }
    }
    this.activity = 1;
  }

  depositStroke(from, to, options) {
    assertSeed(options?.strokeSeed, "options.strokeSeed");
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const spacing = Math.max(0.55, options.radius * 0.22);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      this.depositDab(x, y, options);
    }
    this.activity = 1;
  }

  depositDab(centerX, centerY, options) {
    assertSeed(options?.strokeSeed, "options.strokeSeed");
    const nibAngle = -Math.PI * 0.22;
    const cosine = Math.cos(nibAngle);
    const sine = Math.sin(nibAngle);
    const pressure = clamp(options.pressure, 0.08, 1);
    const major = options.radius * (0.72 + pressure * 0.72);
    const minor = major * options.aspect;
    const reach = Math.ceil(major + 2);
    const minimumX = Math.max(1, Math.floor(centerX - reach));
    const maximumX = Math.min(this.width - 2, Math.ceil(centerX + reach));
    const minimumY = Math.max(1, Math.floor(centerY - reach));
    const maximumY = Math.min(this.height - 2, Math.ceil(centerY + reach));

    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * cosine + dy * sine;
        const localY = -dx * sine + dy * cosine;
        const normalized = (localX * localX) / (major * major)
          + (localY * localY) / (minor * minor);
        if (normalized > 1) continue;

        const index = y * this.width + x;
        const edge = Math.pow(1 - normalized, 0.38);
        const tooth = 0.82
          + coordinateNoise(x, y, this.seed ^ options.strokeSeed) * 0.26;
        const dwell = 0.7 + pressure * 0.74;
        const water = edge * tooth * options.waterLoad * dwell;
        const pigment = edge * tooth * options.pigmentLoad * dwell;
        this.water[index] = clamp(this.water[index] + water, 0, 1.4);
        this.mobile[index] = clamp(this.mobile[index] + pigment, 0, 1.8);
      }
    }
  }

  step(deltaMilliseconds, absorption) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    assertFiniteRange(absorption, "absorption", 0, 1);
    const frame = clamp(deltaMilliseconds / 16.667, 0.25, 2.5);
    const surface = clamp(absorption);
    const horizontalDiffusion = (0.038 + surface * 0.102) * frame;
    const verticalDiffusion = (0.034 + surface * 0.088) * frame;
    const pigmentMobility = (0.008 + surface * 0.032) * frame;
    const evaporation = (0.0028 + surface * 0.0032) * frame;
    let activeWater = 0;

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = y * this.width + x;
        const left = index - 1;
        const right = index + 1;
        const above = index - this.width;
        const below = index + this.width;
        const water = this.water[index];
        const mobile = this.mobile[index];
        const fiberHorizontal = 0.72 + Math.abs(this.fiberX[index]) * 0.7;
        const fiberVertical = 0.72 + Math.abs(this.fiberY[index]) * 0.7;
        const waterLaplacian =
          (this.water[left] + this.water[right] - water * 2)
            * horizontalDiffusion * fiberHorizontal
          + (this.water[above] + this.water[below] - water * 2)
            * verticalDiffusion * fiberVertical;
        const nextWater = clamp(water + waterLaplacian - evaporation, 0, 1.4);

        const mobileLaplacian =
          (this.mobile[left] + this.mobile[right]
            + this.mobile[above] + this.mobile[below] - mobile * 4)
          * pigmentMobility * clamp(water * 1.35, 0, 1);
        const edgeDryness = clamp(1 - nextWater * 1.15, 0, 1);
        const paperTooth = 0.72
          + coordinateNoise(x, y, this.seed ^ 0xa511e9b3) * 0.56;
        const fixing = Math.min(
          mobile + mobileLaplacian,
          (0.0035 + edgeDryness * 0.026 + surface * 0.004)
            * paperTooth * frame,
        );

        this.nextWater[index] = nextWater;
        this.nextMobile[index] = Math.max(0, mobile + mobileLaplacian - fixing);
        this.fixed[index] = clamp(this.fixed[index] + fixing, 0, 2.1);
        activeWater += nextWater;
      }
    }

    [this.water, this.nextWater] = [this.nextWater, this.water];
    [this.mobile, this.nextMobile] = [this.nextMobile, this.mobile];
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.activity = activeWater / this.length;
  }

  render(imageData, recipe, opticalGain = 1) {
    assertInkRecipeCompatible(recipe);
    const optical = recipe.surface.direct.optical;
    const pixels = imageData.data;
    for (let index = 0; index < this.length; index += 1) {
      const fixed = this.fixed[index];
      const mobile = this.mobile[index];
      const water = this.water[index];
      const pigment = clamp(
        fixed * optical.fixedWeight + mobile * optical.mobileWeight,
        0,
        optical.pigmentMaximum,
      );
      const density = 1 - Math.exp(-pigment * optical.densityExponent);
      const wetLift = clamp(water, 0, 1) * optical.wetLift;
      const offset = index * 4;
      pixels[offset] = Math.round(optical.redBase + wetLift * optical.redWetGain);
      pixels[offset + 1] = Math.round(
        optical.greenBase + wetLift * optical.greenWetGain
          - density * optical.greenDensityLoss,
      );
      pixels[offset + 2] = Math.round(
        optical.blueBase + wetLift * optical.blueWetGain
          - density * optical.blueDensityLoss,
      );
      pixels[offset + 3] = Math.round(
        clamp(
          density * optical.alphaGain * opticalGain,
          0,
          optical.maximumAlpha,
        ) * 255,
      );
    }
  }
}
