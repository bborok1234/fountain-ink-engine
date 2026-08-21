import {
  assertDyeComponentRecipeCompatible,
  freezeDyeComponentRecipe,
} from "../dye-components/index.js";
import {
  assertOxidationComponentRecipeCompatible,
  freezeOxidationComponentRecipe,
  readOxidationObservation,
} from "../oxidation-components/index.js";
import {
  assertPigmentComponentRecipeCompatible,
  freezePigmentComponentRecipe,
} from "../pigment-components/index.js";
import {
  assertSheenComponentRecipeCompatible,
  freezeSheenComponentRecipe,
  readSheenObservation,
} from "../sheen-components/index.js";
import {
  assertShimmerComponentRecipeCompatible,
  freezeShimmerComponentRecipe,
  readShimmerObservation,
} from "../shimmer-components/index.js";
import { assertUint32 } from "./numeric.js";

const COMPONENT_KEYS = Object.freeze([
  "family",
  "recipe",
  "observation",
  "seed",
]);
const COMPONENT_FAMILIES = Object.freeze([
  "dye",
  "sheen",
  "shimmer",
  "pigment",
  "oxidation",
]);

function readDenseArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} must be a plain array.`);
  }
  const expectedKeys = new Set([
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ]);
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== expectedKeys.size
    || actualKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
  ) {
    throw new TypeError(`${path} must be a dense array without extra keys.`);
  }
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}[${index}] must be an enumerable data property.`);
    }
    return descriptor.value;
  });
}

function readComponentRecord(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
  const expected = new Set(COMPONENT_KEYS);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = COMPONENT_KEYS.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  return Object.fromEntries(COMPONENT_KEYS.map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    return [key, descriptor.value];
  }));
}

function requireNull(value, path) {
  if (value !== null) throw new TypeError(`${path} must be null.`);
  return null;
}

function readComponentInput(value, index) {
  const path = `componentInputs[${index}]`;
  const input = readComponentRecord(value, path);
  if (!COMPONENT_FAMILIES.includes(input.family)) {
    throw new TypeError(`${path}.family is not supported.`);
  }
  if (input.family === "dye") {
    assertDyeComponentRecipeCompatible(input.recipe);
    return {
      family: input.family,
      recipe: freezeDyeComponentRecipe(input.recipe),
      observation: requireNull(input.observation, `${path}.observation`),
      seed: requireNull(input.seed, `${path}.seed`),
    };
  }
  if (input.family === "pigment") {
    assertPigmentComponentRecipeCompatible(input.recipe);
    return {
      family: input.family,
      recipe: freezePigmentComponentRecipe(input.recipe),
      observation: requireNull(input.observation, `${path}.observation`),
      seed: requireNull(input.seed, `${path}.seed`),
    };
  }
  if (input.family === "sheen") {
    assertSheenComponentRecipeCompatible(input.recipe);
    return {
      family: input.family,
      recipe: freezeSheenComponentRecipe(input.recipe),
      observation: readSheenObservation(input.observation),
      seed: requireNull(input.seed, `${path}.seed`),
    };
  }
  if (input.family === "shimmer") {
    assertShimmerComponentRecipeCompatible(input.recipe);
    return {
      family: input.family,
      recipe: freezeShimmerComponentRecipe(input.recipe),
      observation: readShimmerObservation(input.observation),
      seed: assertUint32(input.seed, `${path}.seed`),
    };
  }
  assertOxidationComponentRecipeCompatible(input.recipe);
  const oxidationObservation = readOxidationObservation(input.observation);
  return {
    family: input.family,
    recipe: freezeOxidationComponentRecipe(input.recipe),
    observation: Object.freeze({
      committedAtMilliseconds: oxidationObservation.committedAtMilliseconds,
      observedAtMilliseconds: oxidationObservation.observedAtMilliseconds,
    }),
    seed: requireNull(input.seed, `${path}.seed`),
  };
}

function readComponentInputs(componentInputs) {
  const entries = readDenseArray(componentInputs, "componentInputs");
  if (entries.length > COMPONENT_FAMILIES.length) {
    throw new RangeError(`componentInputs cannot exceed ${COMPONENT_FAMILIES.length} entries.`);
  }
  const values = entries.map(readComponentInput);
  const families = new Set(values.map(({ family }) => family));
  if (families.size !== values.length) {
    throw new TypeError("componentInputs must not repeat a material family.");
  }
  if (
    families.has("dye")
    && families.has("pigment")
  ) {
    throw new TypeError(
      "componentInputs cannot combine dye and pigment while the solver has one transported slot.",
    );
  }
  return values;
}

export function validateComponentInputs(componentInputs) {
  readComponentInputs(componentInputs);
  return true;
}

export function freezeComponentInputs(componentInputs) {
  return Object.freeze(readComponentInputs(componentInputs).map((entry) =>
    Object.freeze(entry)));
}
