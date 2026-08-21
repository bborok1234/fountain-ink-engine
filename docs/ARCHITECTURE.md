# Architecture

## Dependency direction

```text
HTML comparison harness ──uses──▶ fountain-ink-engine
future products          ──use──▶ fountain-ink-engine

fountain-ink-engine ──must not import──▶ UI, product, platform, or harness
```

## Layers

```text
deterministic inputs
        │
        ▼
Contact ──▶ Density ──▶ Surface ──▶ Optical components
```

### Contracts

Owns model/schema/manifest versions and serializable experiment records. It
does not invent timestamps or seeds. Fixture-manifest v1 preserves both its
historical schema-1 plain-JSON recipes and schema-2 through schema-6 strict recipes by
explicit dispatch; archival acceptance never implies render compatibility or
implicit migration.

### Recipes

Owns immutable authored material parameters and canonical JSON serialization.
`ordinary-green-r11` is the active control and the blue-black, burgundy and teal
r5 recipes are its ordinary-color peers. They share density bounds, keyboard
Surface load, fixed normalization reference, minimum Contact retention and
alpha endpoints while owning separate Density-to-RGB curves and direct optical
color coefficients. They select the r12 calculation model and ink schema 6.
Paper policy is a separate versioned Surface recipe. Smooth r1 remains the
historical crisp endpoint; balanced r2 keeps `paper-surface-js-r1`/schema 1 so
the accepted candidate and direct-input solver stay exact while its keyboard
coverage mix is revised; absorbent r4 uses `paper-surface-js-r4`/schema 3 so
paper-depth uptake cannot be silently reinterpreted as page-plane diffusion.
Runtime nib, flow, layout, text, and seeds are not recipe fields.

Structural validation and archival round-trip are separate from calculation
compatibility. A supported historical model recipe can be parsed without being
silently run by the current model. Built-in `(id, revision)` pairs are registered
canonical identities; different parameters use a new revision or custom id.

### Deterministic

Owns hash, seeded PRNG, and grapheme segmentation helpers. The caller stores the
actual segmentation/runtime context when it matters for replay.

### Contact

Owns nib geometry, physical contact profiles, signed morphology, and geometry
expansion. It has no font or Canvas dependency.

For keyboard glyphs, `getGlyphContactGeometry(nibId, fontSize, glyphSeed)` is
the deterministic contact boundary. It hashes the existing `${nibId}:width`
salt, advances the existing seeded PRNG once, and applies the fixed `0.8824`
calibration gain before scaling the nib geometry. That gain is the exact former
flow-58 value, so r3 preserves the accepted baseline without accepting flow or
layout as contact inputs. Unknown nib IDs and invalid seeds fail closed.

This contract does not include the direct-writing pad. Direct pointer contact
and its flow-dependent water/pigment deposit loads remain a separate physical
path until a dedicated experiment addresses them.

### Density

Owns ordinary-ink flow normalization, glyph-local signed density fields, and
the normalized `0...1` concentration plane. It accepts typed arrays, final
Contact facts, Surface-resolved coverage, and optional transported signed mass.
It does not select RGB or apply optical alpha endpoints.

The r4 public contract is `createDensityField({ pixelWidth, pixelHeight, scale,
fontSize, glyphContacts })`. Each glyph Contact contains an RGBA mask snapshot,
integer device-pixel `destinationX`/`destinationY`, finite CSS-pixel `x` and
`baseline` phase anchors, and an explicit uint32 `seed`. Density reads only
alpha-greater-than-zero support. It accumulates multiple samples only where
final Contact masks physically overlap; nonoverlapping bounding boxes have no
effect. The complete list is validated before allocation, inputs are not
mutated, and the maximum of 65,535 contacts pairs with a `Uint16Array` count
plane to prevent wrap.

Font shaping, glyph-mask creation, line layout, and placement remain client
responsibilities. The Canvas2D adapter passes the structural Contact records to
Density; it does not reconstruct approximate glyph bounds. Moving a glyph or
changing its final mask is intentionally a new Contact input, not an append
stability case.

`createOrdinaryConcentrationField` resolves Contact-owned variation first,
falls back to Surface-transported variation only outside Contact, applies the
existing nib shaping, mean, density range and clamp, and returns a Float32
concentration plane. Pixels outside resolved coverage remain zero.

### Surface

Owns `WetInkSimulation`: water, mobile pigment, fixed pigment, deterministic
paper fibre direction, deposit, diffusion, fixing, and the currently accepted
ordinary optical projection. Its image arguments are structural objects with
`width`, `height`, and RGBA `data`; the class does not create browser objects.

Keyboard coverage runs the wet solver once on the union Contact mask, then maps
each raw alpha byte pointwise with the schema-3 recipe fields
`normalizationReferenceAlpha` and `normalizationScale`. The divisor does not
depend on an observed page maximum. Non-interacting content therefore cannot
change an existing coverage crop through normalization, while genuinely nearby
wet footprints may still interact through diffusion and fixing. The direct
writing pad continues to use the same direct load and optical coefficients; it
does not use this keyboard normalization field.

The r6 keyboard path also carries raw, unshaped signed Density as pigment mass.
The full-page Contact field is area-resampled to two separate solver-grid
planes: `maskAlpha * averageVariation` numerator and positive mask weight.
Ratios are never resampled by themselves. `WetInkSimulation` allocates three
additional Float32 state planes only when this validated payload is present:
mobile signed mass, fixed signed mass, and next mobile signed mass. Deposit uses
the actual positive mobile-mass delta after saturation. Diffusion uses the same
mobile stencil, and fixing transfers the corresponding signed fraction. The
direct/no-payload path allocates none of these planes and keeps its r5 bytes.

`createKeyboardSurfaceState` returns the existing RGBA `coverage` plus a
nullable grid-only `densityTransport` containing `signedNumerator` and
`pigmentWeight`. At the maximum 320×240 grid the lazy solver state is 921,600
bytes (three Float32 planes); the returned transport is 614,400 bytes (two
planes). The input resample is another transient 614,400 bytes, so the maximum
transport-specific typed-array peak while producing the returned grid is
2,150,400 bytes. Only the 614,400-byte returned grid survives for renderer or
diagnostic use; no full-page Float32 transport output is retained.

The r7 coverage resolve is owned by Surface. It keeps the existing linear
Contact/Surface mix when it is stronger, then applies the recipe-authored
Contact-retention floor and returns a full-resolution Float32 coverage plane.
This prevents high absorption from turning a small glyph into only a coarse
grid blur while preserving the outward Surface halo. It does not add a shifted
mask, shadow, duplicate pass, or font-size-dependent paper rule. Absorption 42
remains above the `0.54` floor, while maximum absorption retains at least that
fraction of the original Contact alpha. Optical consumes this resolved plane;
it no longer knows the Surface mix exponent or Contact-retention policy.

The r2/r3 paper path separates paper depth from page-plane spread. Both page
axes use the authored `lateralMobility`. A local `depthUptake` sink moves water
and mobile pigment into lazy subsurface pigment state without expanding its
screen-space footprint. Signed Density mass follows the same proportional
transfer so the depth diagnostic stays attributable to the deposited pigment.
`createKeyboardSurfaceState` and renderer diagnostics expose a copied,
nullable `paperDepth` grid; it does not feed Optical because it represents ink
below the visible surface. The legacy r1 solver path remains intact for smooth,
balanced and archived absorbent r1 recipes. Active balanced r2 preserves that
solver but authors a restrained continuous keyboard coverage mix. Active
absorbent r4 adds a full-resolution sparse
fibre plane after Contact and coarse Surface calculation; every fibre remains
connected to Contact, avoids enclosed counters, and is resolved as coverage by
Surface rather than reconstructed by Optical.
The operator advances from sparse Contact/frontier indices instead of scanning
the complete local region for every distance. R4 scales only the first branch
alpha by raster scale; archived r3 keeps its old device-pixel output exactly.

Surface also owns absorption-dependent Density preservation through
`getSurfaceDensityRange`. Contact supplies only the selected nib's shading
multiplier; Density combines the two and applies the existing maximum cap.
Contact no longer accepts absorption or a recipe to decide paper behavior.

Final Contact masks can be checked with `analyzeContactAlpha`. The analyzer
uses an explicit alpha threshold, a two-pass chamfer distance field for median
centerline thickness, four-connected components, and enclosed transparent
regions for counters. It has no font or Canvas dependency; the HTML harness
supplies actual bundled-font masks.

### Optical components

Owns concentration-to-color/alpha conversion only. The ordinary operator
`compositeOrdinaryOptical` accepts normalized concentration and resolved Surface
coverage, linearly samples the recipe's ordered Density-to-RGB points, then
applies calibrated alpha endpoints. It does not
read Contact masks, glyph seeds, absorption, flow, fibre state, or density
variation. `compositeOrdinaryInk` remains a public compatibility wrapper that
calls the Density and Optical operators in order.

### Optional dye components

Specialty dye state is a separate version axis from the ordinary ink recipe.
`edge-dye-study@1` shares the ordinary water footprint but owns lazy mobile,
fixed and optional subsurface mass planes. Its mobility multiplier changes
transport through the same water/fibre field; its retention multiplier changes
the fraction fixed from that mobile mass. It cannot change ordinary mass or
Optical output in A1, and an absent component allocates no component planes.

This is intentionally not an outline or color halo. Different dye interaction
with a porous matrix can create chromatographic separation, while fountain-pen
inks can contain multiple dye components. The first implementation therefore
establishes component state before authoring any visible edge operator. See the
primary evidence in the E-025 experiment record.

## Keyboard renderer diagnostics

The public Canvas2D keyboard renderer returns a frozen `stages` record that
observes the buffers already used by the accepted render path:

- `contact.rgbaMask`: the full-resolution RGBA glyph mask;
- `density.accumulatedVariation` and `density.sampleCount`: the unnormalized
  signed sum and `Uint16Array` count planes on actual glyph Contact support;
- `density.normalizedConcentration`: the final Float32 `0...1` Density plane
  consumed by Optical;
- `surface.materialCoverageCandidate` and `surface.applied`: the resampled
  physical coverage candidate, or `null` with `applied: false` when the Surface
  branch is skipped;
- `surface.resolvedCoverage`: the Surface-owned full-resolution Float32 plane
  after Contact/candidate mixing and the authored Contact-retention floor;
- `surface.densityTransport`: the nullable solver-grid signed numerator and
  positive pigment carrier. It is `null` when Surface is skipped;
- `surface.paperDepth`: the nullable solver-grid subsurface pigment and signed
  numerator copied from the r2 depth state. It is `null` for r1 recipes or when
  no depth state was created;
- `surface.dyeComponent`: nullable mobile/fixed/subsurface mass for one
  explicitly enabled dye component. It is diagnostic-only in A1;
- `optical.compositeRgba`: the final ordinary RGBA composite.

The older `imageData`, `densityField`, `densitySamples`, and `materialCoverage`
return fields remain same-reference aliases; `surfaceDensityTransport` is the
same-reference top-level alias for the new grid. Stage containers are immutable;
their typed-array/ImageData-compatible buffers are not copied or frozen. These
are observation outputs, not a second calculation path. The normalized
concentration and final resolved-coverage planes are now explicit outputs of
their owning operators.

### Staged browser execution

The Canvas2D adapter exposes a byte-exact staged form of the same renderer.
`prepareOrdinaryInkCanvasInput` owns host Canvas mask reading and Contact-to-grid
downsampling. `beginOrdinaryInkMaterial` owns deterministic Density, compact
Surface and fibre calculation. `upsampleKeyboardSurfaceCoverage` returns to the
same host Canvas presentation boundary, and `completeOrdinaryInkMaterial` owns
Surface resolution, concentration and final Optical output. The synchronous
`renderOrdinaryInkMaterial` composes those four calls.

This boundary lets a client keep browser-specific Canvas resampling on its main
presentation surface while moving typed-array material calculation to a Worker.
It does not make Worker scheduling, stale-result cancellation, font shaping or
input policy part of the engine. Those remain harness/product responsibilities.

## Source distribution

The package publishes standards-based ESM source. There is no transpilation or
generated runtime tree. `npm run build` validates that every public export is
importable and that the source has no forbidden application dependency.

## Version axes

- `engineModelVersion`: changes when a calculation or its interpretation changes.
- `recipeSchemaVersion`: changes when serialized material inputs change shape.
- `fixtureManifestVersion`: changes when experiment/checkpoint metadata changes.

An authored recipe additionally has an `id` and `revision`. Changing its result
requires a new revision; changing the serialized field shape requires a new
`recipeSchemaVersion`.

Package SemVer describes library/API compatibility. It does not replace any of
these replay and experiment contracts.

## Field signatures and spatial identity

`createFieldSignature` produces an observation-only signature from an explicit
domain, typed-array type, width, height, channel count and values. Multi-byte
values are encoded in little-endian order before the versioned `fnv1a64-le-v1`
change detector is applied. The signature is deterministic but is not a
cryptographic integrity primitive and does not replace the fixture manifest.

Spatial identity has two levels. A committed glyph keeps its literal grapheme
and explicit uint32 seed when layout, origin or font-size controls change.
Moving or resizing it intentionally creates a different page Contact field, so
the page signature may change. When the same final Contact support and phase
anchor are translated together, its glyph-local Density signature remains the
same while the page-field signature records the new placement. Clients must
record font and layout facts separately rather than treating a page hash as a
glyph ID.
