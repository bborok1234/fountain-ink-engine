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
  ORDINARY_GREEN_RECIPE_R6,
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

`ordinary-green-r6` is the active immutable, serializable r7/schema-4 recipe.
`ordinary-green-r1` through `ordinary-green-r5` remain exported as archival
r2/r3/r4/r5/r6 checkpoints:

```js
import {
  ORDINARY_GREEN_RECIPE_R6,
  parseInkRecipe,
  serializeInkRecipe,
} from "fountain-ink-engine/recipes";

const checkpoint = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R6);
const restoredRecipe = parseInkRecipe(checkpoint);
```

Structural recipe APIs preserve supported historical model records for archival
round trips. Material calculation additionally requires the active engine
model/schema. The reserved `ordinary-green@1` through `ordinary-green@6`
identities must match their registered canonical definitions;
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

## Surface normalization

As of package `0.5.0-experimental.1`, keyboard Surface coverage uses the
schema-3 recipe field `surface.keyboard.normalizationReferenceAlpha` instead of
the strongest alpha observed on the current page. The active ordinary recipe
authors raw byte `107`, calibrated from the previous default
M/28px/flow-58/absorption-42 result. This keeps that baseline while preventing a
far stronger suffix from rescaling an existing coverage crop. Nearby wet
footprints may still interact through diffusion and fixing.

Migration from `0.4.x`: use `ORDINARY_GREEN_RECIPE_R4`, or add an explicit
integer `normalizationReferenceAlpha` in `1...255` to a custom schema-3 recipe
and give that calculation a new recipe revision/model identity. Schema-2
recipes and experiment records remain parseable as history; they are not
silently upgraded or rendered by r5.

## Surface density transport

As of package `0.6.0-experimental.1`, Surface-only spread carries the raw signed
glyph Density that created its pigment instead of reverting every spread pixel
to mean density. The Canvas2D renderer exposes the compact result at
`stages.surface.densityTransport`:

```js
const { stages } = renderOrdinaryInkMaterial(options);
const transport = stages.surface.densityTransport;
// null when Surface is skipped, otherwise:
// { width, height, signedNumerator: Float32Array,
//   pigmentWeight: Float32Array }
```

The public `createKeyboardSurfaceState` Surface entry point returns the same
`{ coverage, densityTransport }` pair. Signed numerator and positive carrier
are always transported and resampled separately; callers must not resample a
pre-divided ratio or pack signed values through Canvas RGBA. Contact pixels keep
their current glyph-local Density, while only Surface-visible pixels without a
Contact sample use the transported ratio. A zero carrier has no ratio and uses
the existing mean fallback.

Migration from `0.5.x`: use `ORDINARY_GREEN_RECIPE_R5` and read `coverage` from
`createKeyboardSurfaceState`, or keep using the compatible
`createMaterialCoverage` coverage-only wrapper. No authored coefficient or
recipe field was added, so schema 3 remains current. `ordinary-green-r4` stays
parseable as an immutable r5 checkpoint but cannot be rendered by r6.

## High-absorption Contact retention

As of package `0.7.0-experimental.1`, maximum keyboard absorption no longer
replaces the complete glyph Contact with the coarse Surface-grid result. The
schema-4 field `surface.keyboard.minimumContactRetention` authors a lower bound
for pigment that remains at the original Contact while the existing Surface
coverage continues to spread outside it. The active recipe uses `0.54`.

This is a coverage floor, not a duplicate glyph, shadow, or blur pass. The
legacy mixed coverage remains authoritative whenever it is already stronger.
In particular, the accepted absorption-42 baseline has a crisp Contact share of
about `0.5498`, so it remains above the new floor and keeps the previous mix.
Mean density loss, narrowed shading, fibre diffusion, density transport, and
direct writing remain separate and unchanged.

Migration from `0.6.x`: use `ORDINARY_GREEN_RECIPE_R6`, or add an explicit
finite `minimumContactRetention` in `0...1` to a custom schema-4 recipe and give
that behavior a new model/revision identity. Schema-3 recipes remain archival;
they are not silently rendered by r7.

## Surface-resolved coverage

Package `0.8.0-experimental.1` moves final keyboard coverage policy out of the
Density/Optical loop. `resolveKeyboardSurfaceCoverage` combines the Contact
mask and optional physical Surface candidate with the recipe-authored absorption
mix and Contact-retention floor, returning a full-resolution Float32 plane.
`renderOrdinaryInkMaterial` exposes that plane at
`stages.surface.resolvedCoverage`; Optical consumes it directly.

This is an ownership/API extraction, not a material retune. Engine model r7,
`ordinary-green@6`, schema 4, solver state, density transport, RGB/alpha and the
direct-writing path are unchanged. Consumers calling `compositeOrdinaryInk`
directly must now pass `resolvedCoverage` instead of asking Density to interpret
`materialCoverage`.

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
