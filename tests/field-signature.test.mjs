import assert from "node:assert/strict";
import test from "node:test";
import {
  FIELD_SIGNATURE_ALGORITHM,
  createFieldSignature,
} from "../src/contracts/index.js";

const makeField = (data = new Uint8ClampedArray([0, 64, 128, 255])) => ({
  domain: "optical.rgba",
  width: 1,
  height: 1,
  channels: 4,
  data,
});

test("field signatures are deterministic, immutable, and value-sensitive", () => {
  const first = createFieldSignature(makeField());
  const second = createFieldSignature(makeField());
  const changed = createFieldSignature(makeField(
    new Uint8ClampedArray([0, 64, 127, 255]),
  ));
  assert.deepEqual(first, second);
  assert.notEqual(first.hash, changed.hash);
  assert.equal(first.algorithm, FIELD_SIGNATURE_ALGORITHM);
  assert.ok(Object.isFrozen(first));
});

test("field signatures encode type, shape, domain, and canonical little-endian values", () => {
  const uint16 = createFieldSignature({
    domain: "density.samples",
    width: 2,
    height: 1,
    channels: 1,
    data: new Uint16Array([0x0102, 0x0304]),
  });
  const float32 = createFieldSignature({
    domain: "density.variation",
    width: 2,
    height: 1,
    channels: 1,
    data: new Float32Array([0.25, -0.5]),
  });
  assert.equal(uint16.dataType, "Uint16Array");
  assert.equal(float32.dataType, "Float32Array");
  assert.notEqual(uint16.hash, float32.hash);
  assert.match(uint16.hash, /^[0-9a-f]{16}$/);
  assert.match(float32.hash, /^[0-9a-f]{16}$/);
});

test("equivalent typed-array views have the same signature without mutation", () => {
  const backing = new Uint8Array([9, 0, 64, 128, 255, 9]);
  const view = new Uint8Array(backing.buffer, 1, 4);
  const before = new Uint8Array(backing);
  const viewed = createFieldSignature({
    ...makeField(),
    data: view,
  });
  const copied = createFieldSignature({
    ...makeField(),
    data: new Uint8Array([0, 64, 128, 255]),
  });
  assert.equal(viewed.hash, copied.hash);
  assert.deepEqual(backing, before);
});

test("field signatures fail closed before reading accessors or invalid planes", () => {
  let getterReads = 0;
  const accessor = makeField();
  Object.defineProperty(accessor, "width", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 1;
    },
  });
  assert.throws(() => createFieldSignature(accessor), /width must be an enumerable own data property/);
  assert.equal(getterReads, 0);
  assert.throws(() => createFieldSignature({
    ...makeField(),
    data: new Float32Array([0, Number.NaN, 0, 1]),
  }), /must be finite/);
  assert.throws(() => createFieldSignature({
    ...makeField(),
    width: 2,
  }), /length/);
  assert.throws(() => createFieldSignature({
    ...makeField(),
    extra: true,
  }), /exactly/);
  if (typeof SharedArrayBuffer === "function") {
    assert.throws(() => createFieldSignature({
      ...makeField(),
      data: new Uint8Array(new SharedArrayBuffer(4)),
    }), /shared mutable memory/);
  }
});
