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
  ORDINARY_GREEN_RECIPE_R9,
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
- `fountain-ink-engine/dye-components`
- `fountain-ink-engine/deterministic`
- `fountain-ink-engine/contact`
- `fountain-ink-engine/density`
- `fountain-ink-engine/surface`
- `fountain-ink-engine/optical`
- `fountain-ink-engine/canvas2d`

All material inputs and seeds must be explicit; seeds use the unsigned 32-bit
domain. The same engine version, recipe, dimensions, inputs, and seed are
expected to produce the same typed-array state.
Browser text shaping and authored layout remain client responsibilities. The
optional `canvas2d` adapter owns glyph-mask rasterization and presentation-time
material composition without adding a React dependency.

## Optional dye component state

Package `0.20.0-experimental.1` introduces a diagnostic-only second dye:

```js
import { EDGE_DYE_COMPONENT_RECIPE_R1 } from "fountain-ink-engine/dye-components";

const state = createKeyboardSurfaceState(
  deposit,
  surfaceRecipe,
  surfaceSeed,
  inkRecipe,
  densityTransport,
  EDGE_DYE_COMPONENT_RECIPE_R1,
);

// state.dyeComponent = { width, height, mobileMass, fixedMass, subsurfaceMass }
```

It shares the ordinary wet footprint while keeping its own mass, mobility and
retention. A1 does not composite a second color: ordinary coverage and RGBA are
unchanged. Pass `null` or omit the final argument to allocate no component
state and preserve the ordinary path exactly.

`ordinary-green-r12` is the active immutable, serializable r13/schema-6 control.
Blue-black, burgundy and teal r5 are active ordinary-color peers. Paper behavior
is selected independently from `./surface-recipes`: smooth, balanced, or
absorbent. Earlier ink revisions remain exported as archival checkpoints:

```js
import {
  ORDINARY_GREEN_RECIPE_R9,
  parseInkRecipe,
  serializeInkRecipe,
} from "fountain-ink-engine/recipes";

const checkpoint = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R8);
const restoredRecipe = parseInkRecipe(checkpoint);
```

Structural recipe APIs preserve supported historical model records for archival
round trips. Material calculation additionally requires the active engine
model/schema. Reserved built-in identities must match their registered canonical definitions;
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

## Staged Canvas/Worker boundary

Package `0.17.0-experimental.1` exposes the unchanged keyboard renderer as four
callable stages for clients that need Contact-first presentation:

```js
const canvasInput = prepareOrdinaryInkCanvasInput(canvasOptions);
const prepared = beginOrdinaryInkMaterial({ ...materialInputs, ...canvasInput });
const materialCoverageCandidate = prepared.surfaceCoverageGrid === null
  ? null
  : upsampleKeyboardSurfaceCoverage({
      coverage: prepared.surfaceCoverageGrid,
      pixelWidth,
      pixelHeight,
    });
const result = completeOrdinaryInkMaterial({
  prepared,
  materialCoverageCandidate,
});
```

Canvas mask reading and down/up-sampling remain in the Canvas2D adapter;
`beginOrdinaryInkMaterial` and `completeOrdinaryInkMaterial` are deterministic
typed-array stages suitable for a Worker. `renderOrdinaryInkMaterial` calls the
same stages synchronously. Tests require identical final RGBA, resolved coverage,
and normalized concentration between the two paths. The split changes package
API and scheduling only, not the engine model, recipes, seeds, or pixels.

## Deterministic field signatures

Package `0.18.0-experimental.1` adds an observation-only checkpoint helper:

```js
import { createFieldSignature } from "fountain-ink-engine/contracts";

const signature = createFieldSignature({
  domain: "optical.composite-rgba",
  width: image.width,
  height: image.height,
  channels: 4,
  data: image.data,
});
```

The returned frozen record includes the domain, typed-array kind, dimensions,
channel count and a canonical little-endian `fnv1a64-le-v1` hash. It is a
portable regression/change detector, not a cryptographic authenticity proof.
Use it for explicit experiment checkpoints rather than on every live frame.
The helper rejects accessors, unsupported arrays, invalid dimensions and
non-finite Float32 values without changing the material calculation.

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

## Density and Optical ownership

Package `0.9.0-experimental.1` exposes `createOrdinaryConcentrationField` from
`./density` and `compositeOrdinaryOptical` from the new `./optical` entry point.
Density resolves glyph and transported variation into normalized `0...1`
concentration. Optical receives only that concentration, resolved coverage and
the recipe's RGB/alpha endpoints. The root `compositeOrdinaryInk` export remains
as a compatibility wrapper; it is no longer a Density export.

This extraction keeps engine model r7, `ordinary-green@6`, schema 4 and the
accepted final RGBA unchanged. Direct subpath consumers should move
`compositeOrdinaryInk` imports from `fountain-ink-engine/density` to
`fountain-ink-engine/optical`.

Package `0.10.0-experimental.1` additionally moves absorption-dependent shading
preservation to `getSurfaceDensityRange` in `./surface`. The final
`getNibDensityRange` helper now belongs to `./density`; it combines the Surface
base range with Contact's nib multiplier without changing the accepted values.

Package `0.11.0-experimental.1` adds `analyzeContactAlpha` for final-mask
contracts. It thresholds antialiasing, measures stroke width from a chamfer
distance field, counts connected components and enclosed counters, and reports
filled pixels plus empty aperture inside the thresholded ink bounds. The HTML
harness applies it to the bundled Korean font at 18/28/52px; small-size raster
ties are allowed, width reversals, empty glyphs and collapsed aperture are not.
The aperture ratio is used because handwritten Korean openings are not always
topologically closed counters.

## Ordinary Density-to-color curves

Package `0.12.0-experimental.1` adds schema-5 ordinary optical recipes. Their
`optical.densityColorCurve` contains three to five strictly increasing points
from Density `0` to `1`; RGB channels interpolate linearly while the calibrated
alpha endpoints remain independent.

The active catalog exports:

```js
import {
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_TEAL_RECIPE_R6,
} from "fountain-ink-engine/recipes";
```

All four share the same Contact, Density and keyboard Surface coefficients.
For identical inputs they therefore produce identical geometry, concentration,
coverage and alpha; only Optical RGB differs. The green control repeats
`[29,55,40]` at every curve point and is byte-identical to the previous fixed
green projection. These are ordinary dyes, not dual shading, sheen, shimmer or
edge-outline recipes.

Package `0.19.0-experimental.1` adds `fountain-nib-catalog-r2` and the `CM`
Cross-Music-inspired fixed Contact. CM uses the opposite anisotropic axes from
SU—thin vertical strokes and broad horizontal strokes—from one glyph alpha
mask. It does not emulate live pressure, writing angle, or a double-nib feed.

Migration from `0.18.x`: select a schema-6 r13 recipe explicitly. Historical
schema-2 through schema-6 recipes still parse and round-trip but do not enter
the r13 calculation without a new authored revision. Existing nib results and
ordinary material coefficients are unchanged; only the active Contact catalog
adds CM.

## Independent paper Surface recipes

Package `0.13.0-experimental.1` removes paper policy from active ink recipes.
Callers pass ink and Surface recipes separately. Smooth paper keeps crisp
Contact and broad shading; balanced paper preserves the accepted absorption-42
calculation exactly; absorbent paper increases vertical uptake while keeping
lateral mobility bounded. This prevents “more absorption” from being
synonymous with “more blur.” Fixture manifest v2 records both identities.

Package `0.14.0-experimental.1` corrects that first absorbent model without
retuning smooth or balanced paper. `paper-absorbent@1` is retained as a learned
checkpoint: its `verticalUptake` increased page-Y diffusion and made small text
look uniformly blurred. The active `paper-absorbent@2` uses Surface model r2
and schema 2. `depthUptake` transfers water and mobile pigment into a local
subsurface state, while `lateralMobility` alone controls page-plane spread.

Package `0.15.0-experimental.1` closes the remaining paper-order inversion.
The active `paper-balanced@2` keeps the accepted r1 candidate and direct-input
state exact but reduces how strongly that continuous candidate enters keyboard
coverage. `paper-absorbent@3` keeps a strong readable Contact core and adds a
deterministic, Contact-connected, counter-safe sparse fibre edge at full raster
resolution. Absorbent paper now has more visible exterior feathering than
balanced paper without dilating or blurring the complete glyph.

Package `0.16.0-experimental.1` makes that fibre edge scale-aware without
retuning paper coefficients. `paper-absorbent@4` keeps the accepted DPR2 look,
preserves historical r3 bytes, and keeps comparable CSS-space fibre reach and
integrated alpha at DPR1/2/3. The operator now follows only the active Contact
frontier instead of rescanning the complete local region at each step. Run
`npm run bench:fiber` for the 18/28/52px scale matrix.

The Canvas2D diagnostic record exposes this state at
`stages.surface.paperDepth`; its `pigment` and optional `signedNumerator` are
solver-grid Float32 arrays. The state describes ink stored below the visible
paper surface, so Optical does not composite it as an extra shadow or blur.
At B/20px and the absorbent preset, the authored Contact floor remains legible
and the coarse Surface halo is bounded. Smooth r1, balanced r1 and absorbent
r1/r2/r3 remain registered historical checkpoints.

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
