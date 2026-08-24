export const KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION =
  "keyboard-dye-areal-load-v1";

const typedArrayLengthGetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Float32Array.prototype),
  "length",
).get;

function readExactDataRecord(value, expectedKeys, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object with a plain prototype.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be an object with a plain prototype.`);
  }
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) => (
    typeof key !== "string" || !expected.has(key)
  ));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  const result = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
  return value;
}

export function assertKeyboardDyeArealLoad(
  value,
  path = "keyboardDyeArealLoad",
) {
  const load = readExactDataRecord(value, [
    "contractVersion",
    "width",
    "height",
    "data",
  ], path);
  if (load.contractVersion !== KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION) {
    throw new TypeError(
      `${path}.contractVersion must be ${KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION}.`,
    );
  }
  const width = assertPositiveInteger(load.width, `${path}.width`);
  const height = assertPositiveInteger(load.height, `${path}.height`);
  const length = width * height;
  if (!Number.isSafeInteger(length)) {
    throw new TypeError(`${path}.width * height must be a safe integer.`);
  }
  if (
    !ArrayBuffer.isView(load.data)
    || !(load.data instanceof Float32Array)
    || Object.getPrototypeOf(load.data) !== Float32Array.prototype
  ) {
    throw new TypeError(`${path}.data must be an exact native Float32Array view.`);
  }
  const dataLength = typedArrayLengthGetter.call(load.data);
  if (dataLength !== length) {
    throw new TypeError(`${path}.data length must exactly match width * height.`);
  }
  for (let index = 0; index < length; index += 1) {
    const sample = load.data[index];
    if (!Number.isFinite(sample) || sample < 0) {
      throw new TypeError(`${path}.data[${index}] must be finite and nonnegative.`);
    }
  }
  return Object.freeze({
    contractVersion: load.contractVersion,
    width,
    height,
    data: load.data,
  });
}
