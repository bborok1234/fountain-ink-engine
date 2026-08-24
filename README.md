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
  ORDINARY_GREEN_RECIPE_R12,
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
- `fountain-ink-engine/sheen-components`
- `fountain-ink-engine/shimmer-components`
- `fountain-ink-engine/pigment-components`
- `fountain-ink-engine/oxidation-components`
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

Package `0.45.0-experimental.1` keeps the six-plane
`two-dye-total-residual-v2` state and advances the current shared-transport
operator to `dye-component-js-r15`, recipe schema 14 and
`edge-dye-study@16`:

```js
import {
  EDGE_DYE_COMPONENT_RECIPE_R16,
} from "fountain-ink-engine/dye-components";
import {
  createKeyboardDyeArealLoad,
} from "fountain-ink-engine/canvas2d";
import {
  createKeyboardSurfaceState,
} from "fountain-ink-engine/surface";

const keyboardDyeArealLoad = createKeyboardDyeArealLoad({
  pixelWidth,
  pixelHeight,
  targetWidth: deposit.width,
  targetHeight: deposit.height,
  scale,
  fontSize,
  glyphContacts,
  nibId,
  flow,
});

const state = createKeyboardSurfaceState(
  deposit,
  surfaceRecipe,
  surfaceSeed,
  inkRecipe,
  densityTransport,
  EDGE_DYE_COMPONENT_RECIPE_R16,
  null,
  keyboardDyeArealLoad,
);

// state.dyeComponent = {
//   id, revision, componentModelVersion, componentRecipeSchemaVersion,
//   stateModelVersion, width, height, initialSecondaryFraction,
//   mobileTotalMass, mobileSecondaryResidualMass,
//   adsorbedTotalMass, adsorbedSecondaryResidualMass,
//   depthTotalMass, depthSecondaryResidualMass,
//   mobileTotal, adsorbedTotal, depthTotal, totalMass
// }
```

R16 preserves R14's non-additive mass model, capacity-free reaction and
shared-water transport. The component state is a canonical view of the already
deposited ordinary total. For each `mobile`,
`adsorbed`, and `depth` phase it stores two Float32 planes:

```text
T = P + S
R = S - f0*T

P = (1-f0)*T - R
S = f0*T + R
```

Here `f0` is `initialSecondaryFraction`. `T` and signed `R` reconstruct the
primary (`P`) and secondary (`S`) species without treating Float32 rounding as
physical separation. The built-in R13 recipe uses `f0=8/33`, preserving the
nominal A6 composition without preserving its additive mass model. A non-depth
paper still exposes explicit zero-valued
depth total/residual planes, so the state shape is stable across paper
families.

A7-1/R12 established the neutral reference: deposit starts with `R=0`, and
equal species coefficients keep it exact. A7-2/R13 now computes one
conservative right/down water-face flux from the previous water state. Primary
and secondary share that flux through donor-limited upwind advection. A
harmonic-wetness dispersion term applies their separately authored aqueous
diffusivities; paper-fibre anisotropy belongs only to the shared water flux and
is not counted again in diffusion. Each primary/secondary face transfer is
equal-and-opposite and cannot exceed its donor.

After face transport, both species use the same local depth fraction. Water
evaporation removes no dye. Schema 14 uses R14's analytic capacity-free
reaction. Historical schema 13/R15 instead desorbs analytically, then lets both
species compete through one vacancy `max(0,Q-A_primary-A_secondary)` and one
shared limiting factor. Registered R13/R14/R15 checkpoints retain their exact
historical reactions. All reactions are
modulated by paper `dyeAffinity`, deterministic paper tooth, and
post-evaporation wetness. The
ghost ring has no face transport or reaction. Five private Float64 cell
scratch planes are allocated lazily, cleared and reused each step, and are
never exposed as public state or retained face-flux output.

Schema 12 added only `primaryDiffusivity`, `secondaryDiffusivity`,
`primaryAdsorptionRate`, `secondaryAdsorptionRate`,
`primaryDesorptionRate`, and `secondaryDesorptionRate` to the A7-1 composition
and palette. The built-in dimensionless pilot values are `.001/.003`,
`.02/.006`, and `.0002/.0003`, respectively. They preserve the published
relative timescale ordering of flow, adsorption/evaporation, diffusion, and
desorption; they are not SI-calibrated constants. R14 changes only those six
dimensionless rates to `.00005/.0008`, `.06/.001`, and `.000005/.00002`.
Palette, initial mixture and those six rates remain pinned in R16. Schema 14
adds only `arealLoadContractVersion="keyboard-dye-areal-load-v1"`; it does not
carry R15's `sharedAdsorptionCapacity`. The public builder integrates actual
glyph Contact alpha, flow and repeated/crossing contacts, with a full M/58 pass
normalized to one. There is still no hue/Optical gain, edge mask, per-species
capacity, surface residence or coffee-ring.

The current `npm run verify` gate builds 125 modules and 15 public entry points
and passes all 271 tests. Package dry-run contains 138 files and remains part
of the release gate.

Pass `null` or omit the dye-component argument, and omit the matching areal
load, to allocate no component state and preserve the ordinary path exactly.

Optical bilinear-samples the visible mobile and adsorbed `T/R` planes, then
recovers the transported secondary weight as `f0 + Rvisible/Tvisible`. The
well-mixed control uses `f0` with the same visible total. Depth mass is not read
by the current surface Optical path. R13 retains A6's three-band,
semi-infinite single-constant Kubelka–Munk endpoint approximation only as the
existing legacy presentation operator; it adds no new hue gain, edge mask,
outline, or coffee-ring. A separate A7-4 finite-loading comparison described
below is the current Workbench path.

This is explicitly an RGB three-band endpoint approximation, not a calibrated
spectral Kubelka–Munk model. It has no measured wavelength-dependent dye K/S,
paper scattering spectrum, finite-layer thickness, fluorescence, or camera/
display color-management calibration. The operator changes RGB only where
ordinary alpha already exists and copies every alpha byte exactly, so it cannot
add coverage, an outline, glow or a wider footprint. R1–R12 remain exported for
archival round-trip; registered R13/R14/R15 checkpoints are runtime-compatible
only through their exact fingerprints, while new authoring uses the active R16
model/schema.

For separation research, the Canvas2D renderer exposes the same state as an
opaque paper-backed A7-4 pair when asked with
`DYE_OPTICAL_COMPARISON_FINITE_LOADING_WELL_MIXED_VS_TRANSPORTED_V1`:

```js
import {
  DYE_OPTICAL_COMPARISON_FINITE_LOADING_WELL_MIXED_VS_TRANSPORTED_V1,
  renderOrdinaryInkMaterial,
} from "fountain-ink-engine/canvas2d";

const material = renderOrdinaryInkMaterial({
  ...input,
  dyeOpticalComparison:
    DYE_OPTICAL_COMPARISON_FINITE_LOADING_WELL_MIXED_VS_TRANSPORTED_V1,
});

material.dyeOpticalComparison.wellMixedRgba;
material.dyeOpticalComparison.transportedRgba === material.imageData;
material.dyeOpticalComparison.outputMetadata;
material.dyeOpticalComparison.paperOpticalProfile;
```

Both views come from one prepared Surface state and have identical total dye,
support, and opaque alpha. The well-mixed branch resets only the local species
fraction to `f0`; transported uses the local `T/R` result. A default render has
no comparison property, and a component-off render preserves prior ordinary
stages, RGBA, and stable signatures exactly.

The active metadata names `three-channel-effective-optical-density-v2`,
`paper-backed-rgba`, opaque sRGB, visible phases `mobile+adsorbed`, excluded
phase `depth`, and fixed `referenceVisibleMass=0.14`. The reference comes from
Workbench engine-unit visible-mass peaks `0.134` at M/28 balanced and `0.179`
at B/48 balanced. V1 used `1` and was too faint. This is a Beer-inspired
three-channel effective optical-density preview, not spectral Beer-Lambert or
Kubelka-Munk scattering.

The existing `imageData`/`optical.compositeRgba` contract is a legacy
straight-alpha presentation layer. The dye operator already conditions RGB on the
selected paper reflectance, while a browser client source-overs that alpha onto
its page background, so it is neither a substrate-independent physical ink
operator nor a complete opaque paper-resolved reflectance. A future calibrated
paper-resolved preview must be a separate opaque output.

R14 passes a bounded 27-case start/stop, junction, and double-pass matrix across
three papers and thin/medium/broad masks. The gate pins deterministic six-plane
state, finite non-negative reconstructed species, species/total/residual
conservation, signed connected porous M/B patches, a robust secondary outside
advantage, and rejection of global recolor/perfect-outline topology. Smooth/EF
strength is deliberately not forced. Across the 12 porous M/B cases, q05 is
`-0.0122...-0.00465`, q95 is `+0.02848...+0.03444`, connected patches contain
`75...481` cells, and outside advantage is `+0.0037...+0.0133`. The fixed state score `phys60` is not a
perceptual score.

V2 restores readable loading, but browser B/48 balanced same-state A/B remains
subtle: roughly 12k changed RGB pixels, mean channel delta `0.5`, maximum
`3–4`, and alpha delta `0`. The perceptual score therefore remains `6.3/10`.
The locked search also pins the complete engine source-tree and baseline
behavior digests, self-contained result rows, mass-weighted tail cutoff
`max(1e-8, 0.001*peak)`, a 30-second process timeout, saturating Pareto axes,
and non-tradable artifact gates. Both 24-candidate batches closed with
`48/48 reject-hard`, shortlist `0`, and `opticalAreaFidelity=0` for every row.
Global recolor affected 11 candidates in batch 1 and all 24 in batch 2. The
best `opticalDeltaFidelity`, `0.03639156`, came from extreme primary adsorption
`1` and still failed hard gates. Capacity-free R14 is therefore falsified and
plateaued under this evaluator.

A7-3 implemented one shared adsorption vacancy with authored `Q=0.075`, then
ran a locked Q-only bracket from `.01875` to `.225`. All eight candidates kept
capacity overflow at zero, but all eight were hard rejections with shortlist
zero and `opticalAreaFidelity=0`. Lower Q made the signed and optical separation
worse, while the authored baseline still produced a smaller broad-nib fraction
span (`0.0171`) than thin (`0.0393`). Shared vacancy alone is therefore a
recorded failed hypothesis, not a visual success. The next attempt first
isolates nib/wet areal loading or finite surface-film residence. It does not
resume rate, gain, or palette tuning; equal independent absolute capacities
remain forbidden. The score stays `6.3/10`; only blinded human review against
real ink photographs can raise it to 9.

The terminal A7-3 archive separately pins the one baseline row and eight
ordered Q batch rows together with their program, evaluator, lock, plan, and
candidate bytes. Its validator requires one lock, exact plan-to-row identities
and digests, eight hard rejections, zero optical-area fidelity, zero shortlist,
and no automatic nine-point claim. It is evidence for a closed failed
hypothesis, not a catalog preset or a visual-success snapshot.

The engine also accepts current-model, current-schema experiment recipes whose
`id` is not a registered built-in identity. This is the authoring boundary used
by visual workbenches: every numeric field remains explicit and canonical JSON
must be stored with the experiment. Registered ids such as `edge-dye-study`
remain reserved, so a client cannot silently retune or invent another revision
of a built-in recipe. An unregistered experiment recipe is not a catalog preset
and must never be replayed from `id` and `revision` alone.

## Optional sheen component

Package `0.26.0-experimental.1` adds a separate surface-film component:

```js
import {
  SHEEN_COMPONENT_RECIPE_R1,
  createSheenSurfaceFilm,
} from "fountain-ink-engine/sheen-components";
import { compositeSheenOptical } from "fountain-ink-engine/optical";
```

The film is derived from normalized concentration, resolved coverage, and the
selected paper Surface's film preservation and roughness. Optical receives the
view observation separately. A zero specular alignment returns the ordinary
RGBA exactly; an active alignment changes RGB only on existing ink alpha where
the high-concentration film is present. This is neither the static P5-A color
zone nor a shimmer-particle overlay.

## Optional shimmer component

Package `0.27.0-experimental.1` adds a finite particle component:

```js
import {
  SHIMMER_COMPONENT_RECIPE_R1,
  createShimmerParticleState,
} from "fountain-ink-engine/shimmer-components";
import { compositeShimmerOptical } from "fountain-ink-engine/optical";
```

Particle positions, radii, orientation and strength are selected from the
actual resolved wet footprint with an explicit uint32 seed and hard budget.
Density is not an input; the selected paper's `particleCatch` controls the
population and retained strength. Optical changes RGB only inside existing ink
alpha. Reduce Motion selects the recipe-authored static light phase and never
relocates particles. This is neither the P5-A color zone nor the P5-B Surface
film, and it does not allocate a page-sized particle plane.

## Optional pigment component state

Package `0.28.0-experimental.1` adds a non-optical solid-colorant state:

```js
import {
  PIGMENT_COMPONENT_RECIPE_R1,
} from "fountain-ink-engine/pigment-components";
```

The pigment component shares the ordinary water footprint but owns separate
mobile, fixed and optional paper-depth mass. Its recipe authors relative mass,
mobility and retention responses. A1 intentionally leaves ordinary mass,
coverage and final RGBA byte-exact; it establishes state before any pigment
color, opacity, permanence or elapsed-time claim. Dye and pigment currently
reuse one exclusive transported-component slot, so clients must not enable
both in the same solve.

## Optional explicit-age oxidation

Package `0.29.0-experimental.1` adds a calculation that never reads a clock:

```js
import {
  OXIDATION_COMPONENT_RECIPE_R1,
  createOxidationState,
} from "fountain-ink-engine/oxidation-components";

const oxidationState = createOxidationState({
  oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
  oxidationObservation: {
    committedAtMilliseconds: 0,
    observedAtMilliseconds: 90_000,
  },
});
```

The recipe authors fresh/settled RGB, a reaction half-life and bounded mixing.
The observation owns explicit commit and observation timestamps. Shifting both
timestamps by the same amount produces the same result; current wall-clock,
device state and animation time are not inputs. Optical changes RGB only inside
existing ink alpha and leaves Contact, Density, Surface coverage and alpha exact.
The built-in 90-second half-life is an authored digital study value, not a
measured claim about a commercial ink.

## Versioned experiment checkpoints

Package `0.30.0-experimental.1` makes fixture manifest v3 the current
checkpoint shape. Alongside the full ink and paper recipes, it stores strict
`componentInputs` and a `renderContext` containing literal text, the actual
host-produced grapheme list, every explicit glyph seed and derivation id,
Surface seed, nib/flow/size/origin, viewport/DPR/raster facts, font identity and
asset SHA-256, and dependency-lock SHA-256. The engine validates and freezes
these values but never invents browser, font, time, or seed facts.

Manifest v1 and v2 remain archival and do not receive fabricated v3 fields.
The checkpoint is a replay/handoff input contract, not a permanent artistic
pixel golden.

Package `0.31.0-experimental.1` can bind one fixture-v3 input manifest to exact
named stage signatures without retaining the large stage arrays:

```js
import {
  createStableOutputContract,
  validateStableOutputContract,
} from "fountain-ink-engine/contracts";
import { createOrdinaryStageSignatures } from "fountain-ink-engine/canvas2d";

const stableOutputContract = createStableOutputContract({
  checkpoint,
  stageSignatures: createOrdinaryStageSignatures(material.stages),
});

validateStableOutputContract(stableOutputContract);
```

The six fields are Contact RGBA, Density variation/count, resolved Surface,
normalized concentration, and final Optical RGBA. Exact comparison applies
only when the checkpoint's recorded runtime, font asset, dependency lock,
viewport and raster facts are the same. The FNV-1a-64 signatures are portable
change detectors, not cryptographic integrity proofs.

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
