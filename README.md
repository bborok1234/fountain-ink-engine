# Fountain Ink Engine

`fountain-ink-engine` is a zero-runtime-dependency, framework-free ESM library
for deterministic digital fountain-pen material experiments.

The package separates reusable calculation from the current HTML comparison
view. It does **not** provide a note application, input UI, font, storage model,
or mobile integration.

## Install locally

```json
{
  "dependencies": {
    "fountain-ink-engine": "file:../../fountain-ink-engine"
  }
}
```

## Public API

```js
import {
  ORDINARY_GREEN_RECIPE_R3,
  WetInkSimulation,
  createDensityField,
  getGlyphContactGeometry,
  getNibGeometry,
  engineModelVersion,
} from "fountain-ink-engine";
```

Focused entry points are also available:

- `fountain-ink-engine/contracts`
- `fountain-ink-engine/recipes`
- `fountain-ink-engine/deterministic`
- `fountain-ink-engine/contact`
- `fountain-ink-engine/density`
- `fountain-ink-engine/surface`
- `fountain-ink-engine/canvas2d`

All material inputs and seeds must be explicit; seeds use the unsigned 32-bit
domain. The same engine version, recipe, dimensions, inputs, and seed are
expected to produce the same typed-array state.
Browser text shaping and authored layout remain client responsibilities. The
optional `canvas2d` adapter owns glyph-mask rasterization and presentation-time
material composition without adding a React dependency.

`ordinary-green-r3` is the active immutable, serializable r4 recipe.
`ordinary-green-r1` and `ordinary-green-r2` remain exported as archival r2/r3
checkpoints:

```js
import {
  ORDINARY_GREEN_RECIPE_R3,
  parseInkRecipe,
  serializeInkRecipe,
} from "fountain-ink-engine/recipes";

const checkpoint = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R3);
const restoredRecipe = parseInkRecipe(checkpoint);
```

Structural recipe APIs preserve supported historical model records for archival
round trips. Material calculation additionally requires the active engine
model/schema. The reserved `ordinary-green@1`, `ordinary-green@2`, and
`ordinary-green@3` identities must match their registered canonical definitions;
changed parameters require a new revision or custom id.

## Glyph-local Density input

As of package `0.4.0-experimental.1`, keyboard Density is calculated only where
each final glyph Contact mask has alpha support. A client shapes and places text,
then passes immutable structural mask snapshots to `createDensityField` or the
Canvas2D renderer:

```js
const glyphContacts = [{
  rgbaMask: { width, height, data: new Uint8ClampedArray(width * height * 4) },
  destinationX: 120, // integer device-pixel placement
  destinationY: 84,
  x: 63.5,           // CSS-pixel density phase anchor
  baseline: 47.25,
  seed: 0x1234abcd,  // explicit uint32
}];

const density = createDensityField({
  pixelWidth,
  pixelHeight,
  scale,
  fontSize,
  glyphContacts,
});
```

All contacts are validated before density planes are allocated. Mask data must
be an exact-length `Uint8ClampedArray`; placement must be integer device pixels;
anchors must be finite; seeds must be explicit unsigned 32-bit integers. At most
65,535 contacts are accepted, so the returned `Uint16Array` sample-count plane
cannot wrap. Actual overlapping Contact pixels are averaged; nearby but
nonoverlapping glyphs do not share density samples.

Migration from `0.3.x`: `createDensityField` and
`renderOrdinaryInkMaterial` no longer accept `lineLayouts`. Capture each final
glyph mask and pass `glyphContacts` with the exact same rounded placement used
to draw the page mask. The Canvas2D package remains a presentation adapter; text
shaping, font selection, wrapping, and placement stay with the client.

## Development

```bash
npm ci
npm run verify
npm pack --dry-run
```

This is source-distributed ESM, so `npm run build` validates the public module
graph and package boundary rather than transpiling it.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for ownership and
[docs/EXPERIMENT_LOG.md](docs/EXPERIMENT_LOG.md) for the versioned learning loop.
