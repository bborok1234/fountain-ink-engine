# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r2`
> Recipe schema: `1`
> Fixture manifest: `1`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The existing HTML study is a client and visual comparison harness.

The first extraction deliberately keeps the accepted ordinary-ink formulas:

- deterministic FNV-style text hash and seeded PRNG;
- UEF, EF, F, M, B, EB, and SU contact profiles;
- signed glyph-local density variation bounded by calibrated alpha endpoints;
- water, mobile-pigment, fixed-pigment, and paper-fibre simulation.

The engine contains no React component, text control, Vite configuration,
Sites worker, native code, product data model, font, or reference image.

## Current limits

- Font selection, text wrapping, authored layout, input, and IME remain in the
  HTML client. The engine's optional Canvas2D adapter owns glyph-mask
  rasterization, Surface resizing, and ordinary material composition.
- The ordinary RGB/alpha optical curve is the only extracted composite.
- Browser visual equivalence is checked during the migration, but no single
  permanent pixel image is treated as the final artistic truth.
- Specialty color, edge ink, sheen, shimmer, pigment, and oxidation remain
  future versioned experiments.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing module ownership and
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md) before tuning a formula.
