# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r5`
> Recipe schema: `3`
> Fixture manifest: `1`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The existing HTML study is a client and visual comparison harness.

The first extraction deliberately keeps the accepted ordinary-ink formulas:

- deterministic FNV-style text hash and seeded PRNG;
- UEF, EF, F, M, B, EB, and SU contact profiles;
- signed glyph-local density variation bounded by calibrated alpha endpoints;
- water, mobile-pigment, fixed-pigment, and paper-fibre simulation.

Those authored constants now live in the immutable active
`ordinary-green-r4` recipe. `ordinary-green-r1` through `ordinary-green-r3`
remain registered and structurally readable as archival `ordinary-js-r2`
through `ordinary-js-r4` checkpoints, but they are not calculation-compatible
with the active r5 model. Nib, flow, absorption,
layout, and seeds remain explicit runtime inputs. Public
material paths reject a missing or schema-mismatched recipe instead of silently
inventing one. Structural parse/serialize APIs can preserve a supported schema
from a historical engine model, while calculation entry points additionally
require the active engine model/schema and a canonical registered definition
for built-in identities such as `ordinary-green@1` through
`ordinary-green@4`.

Fixture-manifest v1 records dispatch by their recorded recipe schema: original
schema-1 recipes remain immutable archival JSON, while schema-2 and schema-3
records receive strict recipe and identity validation. Only compatible
schema-3 recipes can enter the current material calculation. Historical
schema-1 record seeds retain their original non-negative-integer rule; all live
schema-2/schema-3 and material seed domains are unsigned 32-bit. No historical
record is implicitly migrated.

The engine contains no React component, text control, Vite configuration,
Sites worker, native code, product data model, font, or reference image.

The Canvas2D keyboard renderer now exposes the existing contact mask,
accumulated density variation and sample count, optional Surface coverage
candidate, and optical composite as a frozen four-stage diagnostic record.
This adds observation names and tests without changing material arithmetic;
the former top-level return fields remain same-reference aliases.

The public Contact API now resolves each keyboard glyph through
`getGlyphContactGeometry(nibId, fontSize, glyphSeed)`. It uses the accepted
per-nib seed salt and PRNG with a fixed `0.8824` variation calibration, exactly
matching the former flow-58 footprint while accepting neither flow nor layout.
Flow therefore cannot change this keyboard contact geometry; it remains a
density input downstream.

Keyboard Density now consumes one structural RGBA snapshot per final glyph
Contact, along with its integer device-pixel destination, CSS-pixel x/baseline
phase anchors, and explicit uint32 seed. It accumulates variation only at mask
pixels whose alpha is greater than zero. A nearby glyph therefore cannot change
settled density merely because its former bounding box overlapped; actual
Contact overlap still averages the participating glyph samples. The sample
count plane is `Uint16Array`, and the input limit of 65,535 glyph Contacts makes
wrap impossible. In the measured structural append fixture, the old bbox model
changed 3 of 3 existing support pixels; r4 changes 0 of 3. At absorption 0, a
nonoverlapping suffix preserves the existing Contact, Density, and Optical crop
exactly.

Keyboard Surface coverage now divides each raw simulated alpha byte by the
recipe-authored `normalizationReferenceAlpha * normalizationScale`. It no
longer scans the current page for a strongest alpha and therefore cannot
renormalize an existing remote crop merely because a stronger suffix was added.
The active reference is `107`, measured from the existing default
M/28px/flow-58/absorption-42 harness result; that baseline keeps its previous
normalization exactly. A nearby still-wet footprint may continue to interact
locally through the water/pigment solver, which is physical interaction rather
than page-global normalization.

## Current limits

- Font selection, text wrapping, authored layout, input, and IME remain in the
  HTML client. The engine's optional Canvas2D adapter owns glyph-mask
  rasterization, Surface resizing, and ordinary material composition.
- The Contact-axis extraction covers keyboard/font glyphs only. The direct
  writing pad uses physical pointer contact and flow-dependent liquid deposit
  loads, and is explicitly outside E-005 rather than silently reinterpreted.
- The ordinary RGB/alpha optical curve is the only extracted composite.
- E-006/A2 removes the page-global strongest-alpha Surface divisor. The Surface
  solver still operates on the current union mask, so nearby wet footprints may
  interact through diffusion and fixing. Strict append-after-drying semantics
  would require incremental state and is not claimed here. Surface-only spread
  pixels also have no glyph Contact sample and currently fall back to mean
  density; transported glyph density remains a separate future hypothesis.
- Stage diagnostics do not yet claim a normalized concentration field or final
  mixed-coverage field, and they do not by themselves complete layer ownership
  extraction.
- Browser visual equivalence is checked during the migration, but no single
  permanent pixel image is treated as the final artistic truth.
- Specialty color, edge ink, sheen, shimmer, pigment, and oxidation remain
  future versioned experiments.
- Serialized keyboard Surface recipes are fail-closed above the bounded
  64-step synchronous calculation budget.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing module ownership and
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md) before tuning a formula.
