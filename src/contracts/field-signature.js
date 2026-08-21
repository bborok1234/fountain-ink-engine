const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const FNV_MASK_64 = 0xffffffffffffffffn;

export const FIELD_SIGNATURE_ALGORITHM = "fnv1a64-le-v1";

const TYPE_INFO = new Map([
  [Uint8Array.prototype, Object.freeze({ name: "Uint8Array", bytes: 1 })],
  [Uint8ClampedArray.prototype, Object.freeze({ name: "Uint8ClampedArray", bytes: 1 })],
  [Uint16Array.prototype, Object.freeze({ name: "Uint16Array", bytes: 2 })],
  [Float32Array.prototype, Object.freeze({ name: "Float32Array", bytes: 4 })],
]);

function readOwnData(record, key, path) {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function assertPlainRecord(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const expected = new Set(["domain", "width", "height", "channels", "data"]);
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== expected.size
    || actual.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`${path} must contain exactly domain, width, height, channels, and data.`);
  }
}

function positiveSafeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
  return value;
}

function updateByte(hash, byte) {
  return ((hash ^ BigInt(byte)) * FNV_PRIME_64) & FNV_MASK_64;
}

function updateBytes(hash, bytes) {
  let next = hash;
  for (let index = 0; index < bytes.length; index += 1) {
    next = updateByte(next, bytes[index]);
  }
  return next;
}

function updateTypedArray(hash, data, typeInfo) {
  if (typeInfo.bytes === 1) {
    let next = hash;
    for (let index = 0; index < data.length; index += 1) {
      next = updateByte(next, data[index]);
    }
    return next;
  }
  const scratch = new DataView(new ArrayBuffer(typeInfo.bytes));
  let next = hash;
  for (let index = 0; index < data.length; index += 1) {
    if (data instanceof Uint16Array) {
      scratch.setUint16(0, data[index], true);
    } else {
      if (!Number.isFinite(data[index])) {
        throw new TypeError(`field.data[${index}] must be finite.`);
      }
      scratch.setFloat32(0, data[index], true);
    }
    for (let byteIndex = 0; byteIndex < typeInfo.bytes; byteIndex += 1) {
      next = updateByte(next, scratch.getUint8(byteIndex));
    }
  }
  return next;
}

/**
 * Create a portable regression signature for one exact scalar or RGBA plane.
 * This is a deterministic change detector, not a cryptographic authenticity
 * primitive. Numeric values are encoded in explicit little-endian order.
 *
 * @param {{
 *   domain:string,
 *   width:number,
 *   height:number,
 *   channels:number,
 *   data:Uint8Array|Uint8ClampedArray|Uint16Array|Float32Array,
 * }} field
 */
export function createFieldSignature(field) {
  assertPlainRecord(field, "field");
  const domain = readOwnData(field, "domain", "field");
  const width = positiveSafeInteger(readOwnData(field, "width", "field"), "field.width");
  const height = positiveSafeInteger(readOwnData(field, "height", "field"), "field.height");
  const channels = positiveSafeInteger(
    readOwnData(field, "channels", "field"),
    "field.channels",
  );
  const data = readOwnData(field, "data", "field");
  if (
    typeof domain !== "string"
    || domain.trim() === ""
    || domain.includes("\u0000")
  ) {
    throw new TypeError("field.domain must be a non-empty string.");
  }
  const typeInfo = data && typeof data === "object"
    ? TYPE_INFO.get(Object.getPrototypeOf(data))
    : null;
  if (!typeInfo) {
    throw new TypeError("field.data must be a supported typed array.");
  }
  if (
    typeof SharedArrayBuffer === "function"
    && data.buffer instanceof SharedArrayBuffer
  ) {
    throw new TypeError("field.data must not use shared mutable memory.");
  }
  const expectedLength = width * height * channels;
  if (!Number.isSafeInteger(expectedLength) || data.length !== expectedLength) {
    throw new TypeError(
      `field.data length ${data.length} must equal width × height × channels ${expectedLength}.`,
    );
  }

  const metadata = new TextEncoder().encode([
    FIELD_SIGNATURE_ALGORITHM,
    domain,
    typeInfo.name,
    width,
    height,
    channels,
    data.length,
  ].join("\u0000"));
  let hash = updateBytes(FNV_OFFSET_64, metadata);
  hash = updateTypedArray(hash, data, typeInfo);
  return Object.freeze({
    algorithm: FIELD_SIGNATURE_ALGORITHM,
    domain,
    dataType: typeInfo.name,
    width,
    height,
    channels,
    length: data.length,
    hash: hash.toString(16).padStart(16, "0"),
  });
}
