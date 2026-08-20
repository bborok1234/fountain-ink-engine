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
historical schema-1 plain-JSON recipes and current schema-2 strict recipes by
explicit dispatch; archival acceptance never implies render compatibility.

### Recipes

Owns immutable authored material parameters and canonical JSON serialization.
`ordinary-green-r3` contains the active density bounds, keyboard Surface load,
direct-input load curve, and optical coefficients. It preserves r1/r2's numeric
material fields while selecting the r4 calculation model. Runtime nib, flow,
absorption, layout, text, and seeds are not recipe fields.

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
the deterministic composite that applies recipe-owned optical alpha endpoints.
It accepts typed arrays and final Contact facts supplied by a client.

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

### Surface

Owns `WetInkSimulation`: water, mobile pigment, fixed pigment, deterministic
paper fibre direction, deposit, diffusion, fixing, and the currently accepted
ordinary optical projection. Its image arguments are structural objects with
`width`, `height`, and RGBA `data`; the class does not create browser objects.

## Keyboard renderer diagnostics

The public Canvas2D keyboard renderer returns a frozen `stages` record that
observes the buffers already used by the accepted render path:

- `contact.rgbaMask`: the full-resolution RGBA glyph mask;
- `density.accumulatedVariation` and `density.sampleCount`: the unnormalized
  signed sum and `Uint16Array` count planes on actual glyph Contact support;
- `surface.materialCoverageCandidate` and `surface.applied`: the resampled
  physical coverage candidate, or `null` with `applied: false` when the Surface
  branch is skipped;
- `optical.compositeRgba`: the final ordinary RGBA composite.

The older `imageData`, `densityField`, `densitySamples`, and `materialCoverage`
return fields remain same-reference aliases. Stage containers are immutable;
their typed-array/ImageData-compatible buffers are not copied or frozen. These
are observation outputs, not proof that all calculation ownership has already
moved into four independent operators. In particular, no normalized
concentration plane or final mixed-coverage plane is claimed yet.

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
