import { coordinateNoiseUnchecked as coordinateNoise } from "../deterministic/random.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";
import { assertSurfaceDensityTransportGrid } from "./density-transport.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";
import { assertDyeComponentRecipeCompatible } from "../dye-components/index.js";
import { assertPigmentComponentRecipeCompatible } from "../pigment-components/index.js";

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

function assertSeed(value, path) {
  return assertUint32(value, path);
}

function readOptionalOwnDataProperty(value, name, path) {
  if (value === null || typeof value !== "object") return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (descriptor === undefined) {
    if (name in value) {
      throw new TypeError(`${path} must be an own property.`);
    }
    return undefined;
  }
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path} must be an enumerable own data property.`);
  }
  return descriptor.value;
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
    // Keyboard-only signed density mass. Direct writing never allocates these
    // planes, preserving its existing state, arithmetic, and memory path.
    this.mobileSignedMass = null;
    this.fixedSignedMass = null;
    this.nextMobileSignedMass = null;
    // R2 paper-depth state is allocated only for an explicit depth-uptake
    // Surface. Legacy R1 surfaces and the scalar direct-input compatibility
    // path keep their exact seven-plane allocation and arithmetic.
    this.subsurfacePigment = null;
    this.subsurfaceSignedMass = null;
    // One optional transported P5 material component. These planes are absent
    // from ordinary/direct paths. Dye and pigment reuse the same slot because
    // A1 workbench modes are exclusive; public state snapshots stay distinct.
    this.materialComponentRecipe = null;
    this.materialComponentKind = null;
    this.materialComponentMobile = null;
    this.materialComponentFixed = null;
    this.nextMaterialComponentMobile = null;
    this.materialComponentSubsurface = null;
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
    this.mobileSignedMass?.fill(0);
    this.fixedSignedMass?.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.subsurfacePigment?.fill(0);
    this.subsurfaceSignedMass?.fill(0);
    this.materialComponentMobile?.fill(0);
    this.materialComponentFixed?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.materialComponentSubsurface?.fill(0);
    this.activity = 0;
  }

  depositMask(imageData, options) {
    assertSeed(options?.seed, "options.seed");
    if (imageData.width !== this.width || imageData.height !== this.height) {
      throw new Error("Mask dimensions must match the simulation grid.");
    }
    const densityTransportValue = readOptionalOwnDataProperty(
      options,
      "densityTransport",
      "options.densityTransport",
    );
    const densityTransport = densityTransportValue === undefined
      ? null
      : assertSurfaceDensityTransportGrid(
        densityTransportValue,
        "options.densityTransport",
      );
    if (
      densityTransport !== null
      && (
        densityTransport.width !== this.width
        || densityTransport.height !== this.height
      )
    ) {
      throw new TypeError(
        "options.densityTransport dimensions must match the simulation grid.",
      );
    }
    const dyeComponentRecipe = readOptionalOwnDataProperty(
      options,
      "dyeComponentRecipe",
      "options.dyeComponentRecipe",
    ) ?? null;
    const pigmentComponentRecipe = readOptionalOwnDataProperty(
      options,
      "pigmentComponentRecipe",
      "options.pigmentComponentRecipe",
    ) ?? null;
    if (dyeComponentRecipe !== null && pigmentComponentRecipe !== null) {
      throw new TypeError(
        "Only one transported dye or pigment component may be active per solve.",
      );
    }
    if (dyeComponentRecipe !== null) {
      assertDyeComponentRecipeCompatible(dyeComponentRecipe);
    }
    if (pigmentComponentRecipe !== null) {
      assertPigmentComponentRecipeCompatible(pigmentComponentRecipe);
    }
    const materialComponentRecipe = dyeComponentRecipe ?? pigmentComponentRecipe;
    const materialComponentKind = dyeComponentRecipe !== null
      ? "dye"
      : pigmentComponentRecipe !== null
        ? "pigment"
        : null;
    if (materialComponentRecipe !== null) {
      if (
        this.materialComponentRecipe !== null
        && (
          this.materialComponentKind !== materialComponentKind
          || this.materialComponentRecipe.id !== materialComponentRecipe.id
          || this.materialComponentRecipe.revision !== materialComponentRecipe.revision
        )
      ) {
        throw new TypeError(
          "A WetInkSimulation cannot mix different material component recipes.",
        );
      }
    }
    // Allocate only after the complete payload has been validated and before
    // the first scalar deposit mutation.
    if (densityTransport !== null && this.mobileSignedMass === null) {
      this.mobileSignedMass = new Float32Array(this.length);
      this.fixedSignedMass = new Float32Array(this.length);
      this.nextMobileSignedMass = new Float32Array(this.length);
    }
    if (materialComponentRecipe !== null && this.materialComponentMobile === null) {
      this.materialComponentKind = materialComponentKind;
      this.materialComponentRecipe = materialComponentRecipe;
      this.materialComponentMobile = new Float32Array(this.length);
      this.materialComponentFixed = new Float32Array(this.length);
      this.nextMaterialComponentMobile = new Float32Array(this.length);
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
        const previousMobile = this.mobile[index];
        if (densityTransport === null) {
          this.mobile[index] = clamp(
            previousMobile + alpha * options.pigmentLoad * contact,
            0,
            1.8,
          );
        } else {
          const nextMobile = clamp(
            previousMobile + alpha * options.pigmentLoad * contact,
            0,
            1.8,
          );
          this.mobile[index] = nextMobile;
          const carrier = densityTransport.pigmentWeight[index];
          const ratio = carrier > 0
            ? clamp(densityTransport.signedNumerator[index] / carrier, -1, 1)
            : 0;
          const nextSigned = this.mobileSignedMass[index]
            + (nextMobile - previousMobile) * ratio;
          this.mobileSignedMass[index] = clamp(
            nextSigned,
            -nextMobile,
            nextMobile,
          );
        }
        if (materialComponentRecipe !== null) {
          const depositedBaseMass = this.mobile[index] - previousMobile;
          this.materialComponentMobile[index] = clamp(
            this.materialComponentMobile[index]
              + depositedBaseMass * materialComponentRecipe.massFraction,
            0,
            1.8,
          );
        }
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
    const nibAngle = options.nibAngle === undefined
      ? -Math.PI * 0.22
      : options.nibAngle;
    if (!Number.isFinite(nibAngle)) {
      throw new TypeError("options.nibAngle must be a finite number when provided.");
    }
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
    return this.#stepWithSurface(deltaMilliseconds, {
      verticalUptake: absorption,
      lateralMobility: absorption,
      dyeAffinity: absorption,
      roughness: 1,
    });
  }

  stepSurface(deltaMilliseconds, surfaceRecipe) {
    assertSurfaceRecipeCompatible(surfaceRecipe);
    if (surfaceRecipe.surfaceRecipeSchemaVersion >= 2) {
      return this.#stepDepthSurface(deltaMilliseconds, surfaceRecipe.axes);
    }
    return this.#stepWithSurface(deltaMilliseconds, surfaceRecipe.axes);
  }

  #stepDepthSurface(deltaMilliseconds, axes) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    const frame = clamp(deltaMilliseconds / 16.667, 0.25, 2.5);
    const depthUptake = clamp(axes.depthUptake);
    const lateralMobility = clamp(axes.lateralMobility);
    const dyeAffinity = clamp(axes.dyeAffinity);
    const roughness = clamp(axes.roughness);
    const horizontalDiffusion = (0.038 + lateralMobility * 0.102) * frame;
    const verticalDiffusion = (0.034 + lateralMobility * 0.088) * frame;
    const pigmentMobility = (0.008 + lateralMobility * 0.032) * frame;
    const evaporation = (0.0028 + depthUptake * 0.0032) * frame;
    if (this.subsurfacePigment === null) {
      this.subsurfacePigment = new Float32Array(this.length);
    }
    if (
      this.mobileSignedMass !== null
      && this.subsurfaceSignedMass === null
    ) {
      this.subsurfaceSignedMass = new Float32Array(this.length);
    }
    if (
      this.materialComponentMobile !== null
      && this.materialComponentSubsurface === null
    ) {
      this.materialComponentSubsurface = new Float32Array(this.length);
    }
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
        const fiberHorizontal = 1 - roughness * 0.28
          + Math.abs(this.fiberX[index]) * 0.7 * roughness;
        const fiberVertical = 1 - roughness * 0.28
          + Math.abs(this.fiberY[index]) * 0.7 * roughness;
        const waterLaplacian =
          (this.water[left] + this.water[right] - water * 2)
            * horizontalDiffusion * fiberHorizontal
          + (this.water[above] + this.water[below] - water * 2)
            * verticalDiffusion * fiberVertical;
        const paperTooth = 1 - roughness * 0.28
          + coordinateNoise(x, y, this.seed ^ 0xa511e9b3)
            * 0.56 * roughness;
        const waterAfterSpread = clamp(water + waterLaplacian, 0, 1.4);
        const depthWaterSink = Math.min(
          waterAfterSpread,
          (0.002 + depthUptake * 0.009) * paperTooth * frame,
        );
        const nextWater = clamp(
          waterAfterSpread - depthWaterSink - evaporation,
          0,
          1.4,
        );

        const mobileLaplacian =
          (this.mobile[left] + this.mobile[right]
            + this.mobile[above] + this.mobile[below] - mobile * 4)
          * pigmentMobility * clamp(water * 1.35, 0, 1);
        const mobileAfterSpread = Math.max(0, mobile + mobileLaplacian);
        const depthFraction = clamp(
          depthUptake * 0.018 * paperTooth * frame,
          0,
          0.2,
        );
        const depthPigment = mobileAfterSpread * depthFraction;
        const surfaceMobile = Math.max(0, mobileAfterSpread - depthPigment);
        const edgeDryness = clamp(1 - nextWater * 1.15, 0, 1);
        const fixing = Math.min(
          surfaceMobile,
          (0.0035 + edgeDryness * 0.026 + dyeAffinity * 0.004)
            * paperTooth * frame,
        );
        const nextMobile = Math.max(0, surfaceMobile - fixing);
        const previousFixed = this.fixed[index];
        const nextFixed = clamp(previousFixed + fixing, 0, 2.1);
        const previousSubsurface = this.subsurfacePigment[index];
        const nextSubsurface = clamp(
          previousSubsurface + depthPigment,
          0,
          2.1,
        );

        this.nextWater[index] = nextWater;
        this.nextMobile[index] = nextMobile;
        this.fixed[index] = nextFixed;
        this.subsurfacePigment[index] = nextSubsurface;

        if (this.mobileSignedMass !== null) {
          const signedMobile = this.mobileSignedMass[index];
          const signedMobileLaplacian =
            (this.mobileSignedMass[left] + this.mobileSignedMass[right]
              + this.mobileSignedMass[above]
              + this.mobileSignedMass[below] - signedMobile * 4)
            * pigmentMobility * clamp(water * 1.35, 0, 1);
          const signedAfterSpread = clamp(
            signedMobile + signedMobileLaplacian,
            -mobileAfterSpread,
            mobileAfterSpread,
          );
          const signedDepth = signedAfterSpread * depthFraction;
          const signedSurface = signedAfterSpread - signedDepth;
          const removedFraction = surfaceMobile > 0
            ? clamp(fixing / surfaceMobile)
            : 0;
          const storedFixedFraction = surfaceMobile > 0
            ? clamp((nextFixed - previousFixed) / surfaceMobile)
            : 0;
          this.nextMobileSignedMass[index] = clamp(
            signedSurface * (1 - removedFraction),
            -nextMobile,
            nextMobile,
          );
          this.fixedSignedMass[index] = clamp(
            this.fixedSignedMass[index]
              + signedSurface * storedFixedFraction,
            -nextFixed,
            nextFixed,
          );
          this.subsurfaceSignedMass[index] = clamp(
            this.subsurfaceSignedMass[index] + signedDepth,
            -nextSubsurface,
            nextSubsurface,
          );
        }
        if (this.materialComponentMobile !== null) {
          const componentMobile = this.materialComponentMobile[index];
          const componentMobility = pigmentMobility
            * this.materialComponentRecipe.mobilityMultiplier;
          const componentLaplacian =
            (this.materialComponentMobile[left] + this.materialComponentMobile[right]
              + this.materialComponentMobile[above]
              + this.materialComponentMobile[below] - componentMobile * 4)
            * componentMobility * clamp(water * 1.35, 0, 1);
          const componentAfterSpread = Math.max(
            0,
            componentMobile + componentLaplacian,
          );
          const componentDepth = componentAfterSpread * depthFraction;
          const componentSurface = componentAfterSpread - componentDepth;
          const baseFixingFraction = surfaceMobile > 0
            ? clamp(fixing / surfaceMobile)
            : 0;
          const componentFixingFraction = clamp(
            baseFixingFraction
              * this.materialComponentRecipe.retentionMultiplier,
          );
          const componentFixing = componentSurface
            * componentFixingFraction;
          const componentNextMobile = Math.max(
            0,
            componentSurface - componentFixing,
          );
          const componentNextFixed = clamp(
            this.materialComponentFixed[index] + componentFixing,
            0,
            2.1,
          );
          const componentNextSubsurface = clamp(
            this.materialComponentSubsurface[index] + componentDepth,
            0,
            2.1,
          );
          this.nextMaterialComponentMobile[index] = componentNextMobile;
          this.materialComponentFixed[index] = componentNextFixed;
          this.materialComponentSubsurface[index] = componentNextSubsurface;
        }
        activeWater += nextWater;
      }
    }

    [this.water, this.nextWater] = [this.nextWater, this.water];
    [this.mobile, this.nextMobile] = [this.nextMobile, this.mobile];
    if (this.mobileSignedMass !== null) {
      [this.mobileSignedMass, this.nextMobileSignedMass] = [
        this.nextMobileSignedMass,
        this.mobileSignedMass,
      ];
    }
    if (this.materialComponentMobile !== null) {
      [this.materialComponentMobile, this.nextMaterialComponentMobile] = [
        this.nextMaterialComponentMobile,
        this.materialComponentMobile,
      ];
    }
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.activity = activeWater / this.length;
  }

  #stepWithSurface(deltaMilliseconds, axes) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    const frame = clamp(deltaMilliseconds / 16.667, 0.25, 2.5);
    const verticalUptake = clamp(axes.verticalUptake);
    const lateralMobility = clamp(axes.lateralMobility);
    const dyeAffinity = clamp(axes.dyeAffinity);
    const roughness = clamp(axes.roughness);
    const horizontalDiffusion = (0.038 + lateralMobility * 0.102) * frame;
    const verticalDiffusion = (0.034 + verticalUptake * 0.088) * frame;
    const pigmentMobility = (0.008 + lateralMobility * 0.032) * frame;
    const evaporation = (0.0028 + verticalUptake * 0.0032) * frame;
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
        const fiberHorizontal = 1 - roughness * 0.28
          + Math.abs(this.fiberX[index]) * 0.7 * roughness;
        const fiberVertical = 1 - roughness * 0.28
          + Math.abs(this.fiberY[index]) * 0.7 * roughness;
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
        const paperTooth = 1 - roughness * 0.28
          + coordinateNoise(x, y, this.seed ^ 0xa511e9b3)
            * 0.56 * roughness;
        const fixing = Math.min(
          mobile + mobileLaplacian,
          (0.0035 + edgeDryness * 0.026 + dyeAffinity * 0.004)
            * paperTooth * frame,
        );

        this.nextWater[index] = nextWater;
        if (this.mobileSignedMass === null) {
          this.nextMobile[index] = Math.max(0, mobile + mobileLaplacian - fixing);
          this.fixed[index] = clamp(this.fixed[index] + fixing, 0, 2.1);
        } else {
          const signedMobile = this.mobileSignedMass[index];
          const signedMobileLaplacian =
            (this.mobileSignedMass[left] + this.mobileSignedMass[right]
              + this.mobileSignedMass[above] + this.mobileSignedMass[below]
              - signedMobile * 4)
            * pigmentMobility * clamp(water * 1.35, 0, 1);
          const mobileAfterDiffusion = mobile + mobileLaplacian;
          const mobileBeforeFixing = Math.max(0, mobileAfterDiffusion);
          const signedBeforeFixing = clamp(
            signedMobile + signedMobileLaplacian,
            -mobileBeforeFixing,
            mobileBeforeFixing,
          );
          const nextMobile = Math.max(0, mobileAfterDiffusion - fixing);
          const previousFixed = this.fixed[index];
          const nextFixed = clamp(previousFixed + fixing, 0, 2.1);
          const removedFraction = mobileBeforeFixing > 0
            ? clamp(fixing / mobileBeforeFixing)
            : 0;
          const storedFixedFraction = mobileBeforeFixing > 0
            ? clamp((nextFixed - previousFixed) / mobileBeforeFixing)
            : 0;
          const nextMobileSigned = signedBeforeFixing * (1 - removedFraction);
          const nextFixedSigned = this.fixedSignedMass[index]
            + signedBeforeFixing * storedFixedFraction;
          this.nextMobile[index] = nextMobile;
          this.fixed[index] = nextFixed;
          this.nextMobileSignedMass[index] = clamp(
            nextMobileSigned,
            -nextMobile,
            nextMobile,
          );
          this.fixedSignedMass[index] = clamp(
            nextFixedSigned,
            -nextFixed,
            nextFixed,
          );
        }
        if (this.materialComponentMobile !== null) {
          const componentMobile = this.materialComponentMobile[index];
          const componentMobility = pigmentMobility
            * this.materialComponentRecipe.mobilityMultiplier;
          const componentLaplacian =
            (this.materialComponentMobile[left] + this.materialComponentMobile[right]
              + this.materialComponentMobile[above]
              + this.materialComponentMobile[below] - componentMobile * 4)
            * componentMobility * clamp(water * 1.35, 0, 1);
          const componentAfterDiffusion = Math.max(
            0,
            componentMobile + componentLaplacian,
          );
          const mobileBeforeFixing = Math.max(0, mobile + mobileLaplacian);
          const baseFixingFraction = mobileBeforeFixing > 0
            ? clamp(fixing / mobileBeforeFixing)
            : 0;
          const componentFixingFraction = clamp(
            baseFixingFraction
              * this.materialComponentRecipe.retentionMultiplier,
          );
          const componentFixing = componentAfterDiffusion
            * componentFixingFraction;
          this.nextMaterialComponentMobile[index] = Math.max(
            0,
            componentAfterDiffusion - componentFixing,
          );
          this.materialComponentFixed[index] = clamp(
            this.materialComponentFixed[index] + componentFixing,
            0,
            2.1,
          );
        }
        activeWater += nextWater;
      }
    }

    [this.water, this.nextWater] = [this.nextWater, this.water];
    [this.mobile, this.nextMobile] = [this.nextMobile, this.mobile];
    if (this.mobileSignedMass !== null) {
      [this.mobileSignedMass, this.nextMobileSignedMass] = [
        this.nextMobileSignedMass,
        this.mobileSignedMass,
      ];
    }
    if (this.materialComponentMobile !== null) {
      [this.materialComponentMobile, this.nextMaterialComponentMobile] = [
        this.nextMaterialComponentMobile,
        this.materialComponentMobile,
      ];
    }
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.activity = activeWater / this.length;
  }

  /**
   * Project transported raw density mass with the same positive optical
   * weights as ordinary pigment. Color, mean density, flow, and nib shaping do
   * not enter this transport field.
   */
  createDensityTransport(recipe) {
    assertInkRecipeCompatible(recipe);
    if (this.mobileSignedMass === null) return null;
    const signedNumerator = new Float32Array(this.length);
    const pigmentWeight = new Float32Array(this.length);
    const optical = recipe.direct.optical;
    for (let index = 0; index < this.length; index += 1) {
      const weight = Math.fround(
        this.fixed[index] * optical.fixedWeight
          + this.mobile[index] * optical.mobileWeight,
      );
      const numerator = Math.fround(
        this.fixedSignedMass[index] * optical.fixedWeight
          + this.mobileSignedMass[index] * optical.mobileWeight,
      );
      pigmentWeight[index] = weight;
      signedNumerator[index] = clamp(numerator, -weight, weight);
    }
    return Object.freeze({
      width: this.width,
      height: this.height,
      signedNumerator,
      pigmentWeight,
    });
  }

  createPaperDepthState() {
    if (this.subsurfacePigment === null) return null;
    return Object.freeze({
      width: this.width,
      height: this.height,
      pigment: new Float32Array(this.subsurfacePigment),
      signedNumerator: this.subsurfaceSignedMass === null
        ? null
        : new Float32Array(this.subsurfaceSignedMass),
    });
  }

  createDyeComponentState() {
    if (
      this.materialComponentMobile === null
      || this.materialComponentKind !== "dye"
    ) return null;
    const expectedFraction = this.materialComponentRecipe.massFraction
      / (1 + this.materialComponentRecipe.massFraction);
    const visibleFraction = new Float32Array(this.length);
    const fractionDelta = new Float32Array(this.length);
    for (let index = 0; index < this.length; index += 1) {
      const baseMass = this.mobile[index] + this.fixed[index];
      const componentMass = this.materialComponentMobile[index]
        + this.materialComponentFixed[index];
      const totalMass = baseMass + componentMass;
      if (!(totalMass > 0)) continue;
      const fraction = clamp(componentMass / totalMass);
      visibleFraction[index] = Math.fround(fraction);
      fractionDelta[index] = Math.fround(fraction - expectedFraction);
    }
    const edgeAccumulation = new Float32Array(this.length);
    const enrichmentMaximum = 1 - expectedFraction;
    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = y * this.width + x;
        const delta = fractionDelta[index];
        const componentMass = this.materialComponentMobile[index]
          + this.materialComponentFixed[index];
        if (!(delta > 0) || !(componentMass > 0)) continue;
        const localBaseMaximum = Math.max(
          this.mobile[index] + this.fixed[index],
          this.mobile[index - 1] + this.fixed[index - 1],
          this.mobile[index + 1] + this.fixed[index + 1],
          this.mobile[index - this.width] + this.fixed[index - this.width],
          this.mobile[index + this.width] + this.fixed[index + this.width],
        );
        const baseMass = this.mobile[index] + this.fixed[index];
        const exposure = localBaseMaximum > 0
          ? 1 - clamp(baseMass / localBaseMaximum)
          : 1;
        const enrichmentStrength = enrichmentMaximum > 0
          ? clamp(delta / enrichmentMaximum)
          : 0;
        const massVisibility = 1 - Math.exp(
          -componentMass * this.materialComponentRecipe.edgeMassGain,
        );
        const candidate = enrichmentStrength
          * (0.25 + exposure * 0.75)
          * massVisibility;
        if (candidate >= this.materialComponentRecipe.edgeEnrichmentThreshold) {
          edgeAccumulation[index] = Math.fround(candidate);
        }
      }
    }
    // Smooth, film-preserving paper has little page-plane Surface response, so
    // the exposure-based candidate above can legitimately be empty. Preserve
    // discontinuity by adding only strict local maxima of positive component
    // enrichment as film-separation seeds; never turn the whole boundary on.
    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = y * this.width + x;
        const delta = fractionDelta[index];
        if (!(delta >= this.materialComponentRecipe.edgeZonePeakThreshold)) continue;
        const isLocalPeak = delta >= fractionDelta[index - 1]
          && delta >= fractionDelta[index + 1]
          && delta >= fractionDelta[index - this.width]
          && delta >= fractionDelta[index + this.width]
          && (
            delta > fractionDelta[index - 1]
            || delta > fractionDelta[index + 1]
            || delta > fractionDelta[index - this.width]
            || delta > fractionDelta[index + this.width]
          );
        if (!isLocalPeak) continue;
        const enrichmentStrength = enrichmentMaximum > 0
          ? clamp(delta / enrichmentMaximum)
          : 0;
        edgeAccumulation[index] = Math.max(
          edgeAccumulation[index],
          Math.fround(enrichmentStrength),
        );
      }
    }
    const colorZone = new Float32Array(this.length);
    const zoneRadius = this.materialComponentRecipe.edgeZoneRadius;
    const zoneMinimum = this.materialComponentRecipe.edgeZoneMinimumStrength;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        const delta = fractionDelta[index];
        const componentMass = this.materialComponentMobile[index]
          + this.materialComponentFixed[index];
        if (!(delta > 0) || !(componentMass > 0)) continue;
        let hasCandidateSeed = false;
        for (
          let offsetY = -zoneRadius;
          offsetY <= zoneRadius && !hasCandidateSeed;
          offsetY += 1
        ) {
          const sampleY = y + offsetY;
          if (sampleY < 0 || sampleY >= this.height) continue;
          for (let offsetX = -zoneRadius; offsetX <= zoneRadius; offsetX += 1) {
            const sampleX = x + offsetX;
            if (sampleX < 0 || sampleX >= this.width) continue;
            if (edgeAccumulation[sampleY * this.width + sampleX] > 0) {
              hasCandidateSeed = true;
              break;
            }
          }
        }
        if (!hasCandidateSeed) continue;
        const enrichmentStrength = enrichmentMaximum > 0
          ? clamp(delta / enrichmentMaximum)
          : 0;
        colorZone[index] = Math.fround(
          zoneMinimum
            + (1 - zoneMinimum) * Math.sqrt(enrichmentStrength),
        );
      }
    }
    return Object.freeze({
      id: this.materialComponentRecipe.id,
      revision: this.materialComponentRecipe.revision,
      width: this.width,
      height: this.height,
      mobileMass: new Float32Array(this.materialComponentMobile),
      fixedMass: new Float32Array(this.materialComponentFixed),
      subsurfaceMass: this.materialComponentSubsurface === null
        ? null
        : new Float32Array(this.materialComponentSubsurface),
      expectedFraction,
      visibleFraction,
      fractionDelta,
      edgeAccumulation,
      colorZone,
    });
  }

  createPigmentComponentState() {
    if (
      this.materialComponentMobile === null
      || this.materialComponentKind !== "pigment"
    ) return null;
    const mobileMass = new Float32Array(this.materialComponentMobile);
    const fixedMass = new Float32Array(this.materialComponentFixed);
    const subsurfaceMass = this.materialComponentSubsurface === null
      ? null
      : new Float32Array(this.materialComponentSubsurface);
    let mobileTotal = 0;
    let fixedTotal = 0;
    let subsurfaceTotal = 0;
    for (let index = 0; index < this.length; index += 1) {
      mobileTotal += mobileMass[index];
      fixedTotal += fixedMass[index];
      subsurfaceTotal += subsurfaceMass?.[index] ?? 0;
    }
    const visibleTotal = mobileTotal + fixedTotal;
    return Object.freeze({
      id: this.materialComponentRecipe.id,
      revision: this.materialComponentRecipe.revision,
      width: this.width,
      height: this.height,
      mobileMass,
      fixedMass,
      subsurfaceMass,
      mobileTotal,
      fixedTotal,
      subsurfaceTotal,
      fixedFraction: visibleTotal > 0 ? fixedTotal / visibleTotal : 0,
    });
  }

  // Compatibility views for callers that inspected the earlier dye-specific
  // solver fields. Pigment has separate names and never appears as dye state.
  get dyeComponentRecipe() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentRecipe
      : null;
  }

  get dyeComponentMobile() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentMobile
      : null;
  }

  get dyeComponentFixed() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentFixed
      : null;
  }

  get nextDyeComponentMobile() {
    return this.materialComponentKind === "dye"
      ? this.nextMaterialComponentMobile
      : null;
  }

  get dyeComponentSubsurface() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentSubsurface
      : null;
  }

  get pigmentComponentRecipe() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentRecipe
      : null;
  }

  get pigmentComponentMobile() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentMobile
      : null;
  }

  get pigmentComponentFixed() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentFixed
      : null;
  }

  get nextPigmentComponentMobile() {
    return this.materialComponentKind === "pigment"
      ? this.nextMaterialComponentMobile
      : null;
  }

  get pigmentComponentSubsurface() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentSubsurface
      : null;
  }

  render(imageData, recipe, opticalGain = 1) {
    assertInkRecipeCompatible(recipe);
    const optical = recipe.direct.optical;
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
