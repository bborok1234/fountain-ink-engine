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
does not invent timestamps or seeds.

### Deterministic

Owns hash, seeded PRNG, and grapheme segmentation helpers. The caller stores the
actual segmentation/runtime context when it matters for replay.

### Contact

Owns nib geometry, physical contact profiles, signed morphology, and geometry
expansion. It has no font or Canvas dependency.

### Density

Owns ordinary-ink flow normalization, glyph-local signed density fields, the
calibrated direct-stroke alpha endpoints, and their deterministic composite.
It accepts typed arrays and layout facts supplied by a client.

### Surface

Owns `WetInkSimulation`: water, mobile pigment, fixed pigment, deterministic
paper fibre direction, deposit, diffusion, fixing, and the currently accepted
ordinary optical projection. Its image arguments are structural objects with
`width`, `height`, and RGBA `data`; the class does not create browser objects.

## Source distribution

The package publishes standards-based ESM source. There is no transpilation or
generated runtime tree. `npm run build` validates that every public export is
importable and that the source has no forbidden application dependency.

## Version axes

- `engineModelVersion`: changes when a calculation or its interpretation changes.
- `recipeSchemaVersion`: changes when serialized material inputs change shape.
- `fixtureManifestVersion`: changes when experiment/checkpoint metadata changes.

Package SemVer describes library/API compatibility. It does not replace any of
these replay and experiment contracts.
