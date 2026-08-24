import assert from "node:assert/strict";
import test from "node:test";
import {
  KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
  assertKeyboardDyeArealLoad,
  createKeyboardDyeArealLoad,
  getKeyboardDyeArealLoadScale,
} from "fountain-ink-engine/canvas2d";
import {
  EDGE_DYE_COMPONENT_RECIPE_R14,
  EDGE_DYE_COMPONENT_RECIPE_R15,
  EDGE_DYE_COMPONENT_RECIPE_R16,
} from "fountain-ink-engine/dye-components";
import { ORDINARY_GREEN_RECIPE_R12 } from "fountain-ink-engine/recipes";
import { PAPER_SURFACE_BALANCED_R2 } from "fountain-ink-engine/surface-recipes";
import { createKeyboardSurfaceState, WetInkSimulation } from "fountain-ink-engine/surface";

function mask(width, height, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4 + 3] = alpha;
  }
  return { width, height, data };
}

function contact({
  rgbaMask = mask(4, 4),
  destinationX = 0,
  destinationY = 0,
  seed = 1,
} = {}) {
  return {
    rgbaMask,
    destinationX,
    destinationY,
    x: 0,
    baseline: 4,
    seed,
  };
}

function build(overrides = {}) {
  return createKeyboardDyeArealLoad({
    pixelWidth: 4,
    pixelHeight: 4,
    targetWidth: 2,
    targetHeight: 2,
    scale: 1,
    fontSize: 12,
    glyphContacts: [contact()],
    nibId: "M",
    flow: 58,
    ...overrides,
  });
}

function depositImage(width = 2, height = 2) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  return { width, height, data };
}

function depositOptions(keyboardDyeArealLoad, dyeComponentRecipe) {
  return {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: 0x12345678,
    dyeComponentRecipe,
    ...(keyboardDyeArealLoad === null ? {} : { keyboardDyeArealLoad }),
  };
}

test("keyboard dye areal-load contract fails closed before malformed accessors", () => {
  const valid = build();
  assert.equal(valid.contractVersion, KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION);
  assert.equal(Object.isFrozen(valid), true);
  assert.deepEqual(assertKeyboardDyeArealLoad(valid), valid);
  for (const invalid of [
    { ...valid, contractVersion: "wrong" },
    { ...valid, width: 3 },
    { ...valid, data: new Float64Array(4) },
    { ...valid, data: new Float32Array([0, -1, 0, 0]) },
    { ...valid, data: new Float32Array([0, Number.NaN, 0, 0]) },
    { ...valid, extra: true },
  ]) {
    assert.throws(() => assertKeyboardDyeArealLoad(invalid), TypeError);
  }
  let reads = 0;
  const accessor = { ...valid };
  Object.defineProperty(accessor, "data", {
    enumerable: true,
    get() {
      reads += 1;
      return valid.data;
    },
  });
  assert.throws(
    () => assertKeyboardDyeArealLoad(accessor),
    /enumerable own data property/,
  );
  assert.equal(reads, 0);

  const finite = new Float32Array([1]);
  const nonfinite = new Float32Array([Number.POSITIVE_INFINITY]);
  let ordinaryGets = 0;
  const swapped = new Proxy({}, {
    ownKeys() {
      return ["contractVersion", "width", "height", "data"];
    },
    getOwnPropertyDescriptor(_target, key) {
      return {
        configurable: true,
        enumerable: true,
        value: key === "contractVersion"
          ? KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION
          : key === "width" || key === "height"
            ? 1
            : finite,
        writable: true,
      };
    },
    get(_target, key) {
      ordinaryGets += 1;
      return key === "data" ? nonfinite : undefined;
    },
  });
  const snapshot = assertKeyboardDyeArealLoad(swapped);
  assert.equal(snapshot.data, finite);
  assert.equal(snapshot.data[0], 1);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(ordinaryGets, 0);

  const proxiedPlane = new Proxy(new Float32Array([1]), {
    get(target, key) {
      if (key === "length") return 1;
      if (key === "0") return 1;
      return Reflect.get(target, key, target);
    },
  });
  assert.equal(proxiedPlane instanceof Float32Array, true);
  assert.equal(ArrayBuffer.isView(proxiedPlane), false);
  assert.throws(
    () => assertKeyboardDyeArealLoad({
      contractVersion: KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
      width: 1,
      height: 1,
      data: proxiedPlane,
    }),
    /exact native Float32Array view/,
  );
});

test("builder bounds target allocation and contact-grid work", () => {
  let contactReads = 0;
  const unreadableContacts = {};
  Object.defineProperty(unreadableContacts, "length", {
    get() {
      contactReads += 1;
      return 0;
    },
  });
  assert.throws(
    () => build({
      targetWidth: 320 * 240 + 1,
      targetHeight: 1,
      glyphContacts: unreadableContacts,
    }),
    /at most 76800 cells/,
  );
  assert.equal(contactReads, 0);

  const shared = contact({ rgbaMask: mask(1, 1) });
  assert.throws(
    () => build({
      targetWidth: 320,
      targetHeight: 240,
      glyphContacts: new Array(209).fill(shared),
    }),
    /glyphContacts.length \* target cells/,
  );
});

test("M58 full contact is one, repeats add, and outside support stays zero", () => {
  const once = build();
  assert.deepEqual([...once.data], [1, 1, 1, 1]);
  assert.deepEqual([...build().data], [...once.data]);
  const twice = build({ glyphContacts: [contact(), contact({ seed: 2 })] });
  for (const value of twice.data) assert.ok(Math.abs(value - 2) <= 2e-6);
  const partial = build({
    glyphContacts: [contact({ rgbaMask: mask(2, 2) })],
  });
  assert.deepEqual([...partial.data], [1, 0, 0, 0]);
});

test("crossing strokes retain additive junction and arm loads", () => {
  const vertical = contact({
    rgbaMask: mask(1, 4),
    destinationX: 1,
    seed: 3,
  });
  const horizontal = contact({
    rgbaMask: mask(4, 1),
    destinationY: 1,
    seed: 4,
  });
  const result = build({
    targetWidth: 4,
    targetHeight: 4,
    glyphContacts: [vertical, horizontal],
  });
  assert.ok(result.data[1 * 4 + 1] >= 1.9);
  assert.equal(result.data[0 * 4 + 1], 1);
  assert.equal(result.data[1 * 4 + 3], 1);
});

test("flow and supplied UEF/M/B-sized final Contact masks increase areal load", () => {
  assert.ok(
    getKeyboardDyeArealLoadScale("M", 25)
      < getKeyboardDyeArealLoadScale("M", 58),
  );
  assert.ok(
    getKeyboardDyeArealLoadScale("M", 58)
      < getKeyboardDyeArealLoadScale("M", 90),
  );
  const geometries = [
    ["UEF", mask(1, 4)],
    ["M", mask(2, 4)],
    ["B", mask(3, 4)],
  ].map(([nibId, rgbaMask]) => build({
    targetWidth: 4,
    targetHeight: 4,
    nibId,
    glyphContacts: [contact({ rgbaMask })],
  }).data.reduce((sum, value) => sum + value, 0));
  assert.ok(geometries[0] < geometries[1]);
  assert.ok(geometries[1] < geometries[2]);
});

test("schema 14 requires load and legacy/component-off/pigment reject it", () => {
  const image = depositImage();
  const load = build();
  assert.throws(
    () => new WetInkSimulation(2, 2, 1).depositMask(
      image,
      depositOptions(null, EDGE_DYE_COMPONENT_RECIPE_R16),
    ),
    /required/,
  );
  for (const dyeComponentRecipe of [
    null,
    EDGE_DYE_COMPONENT_RECIPE_R14,
    EDGE_DYE_COMPONENT_RECIPE_R15,
  ]) {
    assert.throws(
      () => new WetInkSimulation(2, 2, 1).depositMask(
        image,
        depositOptions(load, dyeComponentRecipe),
      ),
      /only valid/,
    );
  }
});

test("nested data-plane proxies fail before Surface or deposit mutation", () => {
  const image = depositImage(1, 1);
  const proxiedPlane = new Proxy(new Float32Array([1]), {
    get(target, key) {
      if (key === "length") return 1;
      if (key === "0") return Number.POSITIVE_INFINITY;
      return Reflect.get(target, key, target);
    },
  });
  const forgedLoad = {
    contractVersion: KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
    width: 1,
    height: 1,
    data: proxiedPlane,
  };
  const simulation = new WetInkSimulation(1, 1, 1);
  const waterBefore = new Float32Array(simulation.water);
  const mobileBefore = new Float32Array(simulation.mobile);
  assert.throws(
    () => simulation.depositMask(
      image,
      depositOptions(forgedLoad, EDGE_DYE_COMPONENT_RECIPE_R16),
    ),
    /exact native Float32Array view/,
  );
  assert.deepEqual(simulation.water, waterBefore);
  assert.deepEqual(simulation.mobile, mobileBefore);
  assert.equal(simulation.materialComponentMobile, null);
  assert.throws(
    () => createKeyboardSurfaceState(
      image,
      PAPER_SURFACE_BALANCED_R2,
      1,
      ORDINARY_GREEN_RECIPE_R12,
      null,
      EDGE_DYE_COMPONENT_RECIPE_R16,
      null,
      forgedLoad,
    ),
    /exact native Float32Array view/,
  );
});

test("R16 deposit keeps residual +0 and conserves species mass", () => {
  const image = depositImage();
  const load = build();
  const simulation = new WetInkSimulation(2, 2, 1);
  simulation.depositMask(
    image,
    depositOptions(load, EDGE_DYE_COMPONENT_RECIPE_R16),
  );
  assert.deepEqual(
    simulation.materialComponentMobile,
    simulation.mobile,
    "R16 component total must equal the accepted ordinary dye deposit",
  );
  const initial = simulation.createDyeComponentState();
  assert.ok(initial.mobileSecondaryResidualMass.every(Object.is.bind(null, 0)));
  const initialPrimary = (1 - initial.initialSecondaryFraction) * initial.totalMass;
  const initialSecondary = initial.initialSecondaryFraction * initial.totalMass;
  simulation.stepSurface(16, PAPER_SURFACE_BALANCED_R2);
  const after = simulation.createDyeComponentState();
  let primary = 0;
  let secondary = 0;
  for (const [total, residual] of [
    [after.mobileTotalMass, after.mobileSecondaryResidualMass],
    [after.adsorbedTotalMass, after.adsorbedSecondaryResidualMass],
    [after.depthTotalMass, after.depthSecondaryResidualMass],
  ]) {
    for (let index = 0; index < total.length; index += 1) {
      primary += (1 - after.initialSecondaryFraction) * total[index]
        - residual[index];
      secondary += after.initialSecondaryFraction * total[index]
        + residual[index];
    }
  }
  assert.ok(Math.abs(primary - initialPrimary) <= 2e-6);
  assert.ok(Math.abs(secondary - initialSecondary) <= 2e-6);
});

test("material-coverage boundary forwards R16 load and rejects missing load", () => {
  const image = depositImage();
  const load = build();
  assert.throws(
    () => createKeyboardSurfaceState(
      image,
      PAPER_SURFACE_BALANCED_R2,
      1,
      ORDINARY_GREEN_RECIPE_R12,
      null,
      EDGE_DYE_COMPONENT_RECIPE_R16,
    ),
    /required/,
  );
  const state = createKeyboardSurfaceState(
    image,
    PAPER_SURFACE_BALANCED_R2,
    1,
    ORDINARY_GREEN_RECIPE_R12,
    null,
    EDGE_DYE_COMPONENT_RECIPE_R16,
    null,
    load,
  );
  assert.equal(state.dyeComponent.revision, 16);
  assert.ok(state.dyeComponent.totalMass > 0);
});
