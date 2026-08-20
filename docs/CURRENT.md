# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r2`
> Recipe schema: `2`
> Fixture manifest: `1`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The existing HTML study is a client and visual comparison harness.

The first extraction deliberately keeps the accepted ordinary-ink formulas:

- deterministic FNV-style text hash and seeded PRNG;
- UEF, EF, F, M, B, EB, and SU contact profiles;
- signed glyph-local density variation bounded by calibrated alpha endpoints;
- water, mobile-pigment, fixed-pigment, and paper-fibre simulation.

Those authored constants now live in the immutable `ordinary-green-r1` recipe.
Nib, flow, absorption, layout, and seeds remain explicit runtime inputs. Public
material paths reject a missing or schema-mismatched recipe instead of silently
inventing one. Structural parse/serialize APIs can preserve a supported schema
from a historical engine model, while calculation entry points additionally
require the active engine model/schema and a canonical registered definition
for built-in identities such as `ordinary-green@1`.

Fixture-manifest v1 records dispatch by their recorded recipe schema: original
schema-1 recipes remain immutable archival JSON, while schema-2 records receive
the strict recipe and identity validation. Only compatible schema-2 recipes can
enter the current material calculation. Historical schema-1 record seeds retain
their original non-negative-integer rule; all live schema-2 and material seed
domains are unsigned 32-bit.

The engine contains no React component, text control, Vite configuration,
Sites worker, native code, product data model, font, or reference image.

The Canvas2D keyboard renderer now exposes the existing contact mask,
accumulated density variation and sample count, optional Surface coverage
candidate, and optical composite as a frozen four-stage diagnostic record.
This adds observation names and tests without changing material arithmetic;
the former top-level return fields remain same-reference aliases.

## Current limits

- Font selection, text wrapping, authored layout, input, and IME remain in the
  HTML client. The engine's optional Canvas2D adapter owns glyph-mask
  rasterization, Surface resizing, and ordinary material composition.
- The ordinary RGB/alpha optical curve is the only extracted composite.
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
