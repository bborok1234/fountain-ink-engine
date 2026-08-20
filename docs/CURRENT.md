# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r9`
> Ink recipe schema: `6`
> Surface model/schema: `paper-surface-js-r1 / 1`
> Fixture manifest: `2`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The existing HTML study is a client and visual comparison harness.

The first extraction deliberately keeps the accepted ordinary-ink formulas:

- deterministic FNV-style text hash and seeded PRNG;
- UEF, EF, F, M, B, EB, and SU contact profiles;
- signed glyph-local density variation bounded by calibrated alpha endpoints;
- water, mobile-pigment, fixed-pigment, and paper-fibre simulation.

Ink constants now live in the immutable active `ordinary-green-r8` control
recipe and the blue-black, burgundy, and teal r2 ordinary recipes. Paper
behavior lives separately in `paper-smooth-r1`, `paper-balanced-r1`, and
`paper-absorbent-r1`. `ordinary-green-r1` through `ordinary-green-r7`
remain registered and structurally readable as archival `ordinary-js-r2`
through `ordinary-js-r7` checkpoints, but they are not calculation-compatible
with the active r9 model. Nib, flow, Surface recipe,
layout, and seeds remain explicit runtime inputs. Public
material paths reject a missing or schema-mismatched recipe instead of silently
inventing one. Structural parse/serialize APIs can preserve a supported schema
from a historical engine model, while calculation entry points additionally
require the active engine model/schema and a canonical registered definition
for built-in identities.

Fixture-manifest v2 records ink and Surface identities independently. The v1
reader and historical ink schemas remain archival and are never implicitly
migrated; only compatible schema-6 ink plus schema-1 Surface recipes enter the
current material calculation.

Paper Surface is an explicit eight-axis recipe. Vertical uptake, lateral
mobility, dye affinity, surface retention, film preservation and roughness feed
the current solver independently. Particle catch and paper reflectance are
versioned hooks for later specialty/optical work and are neutral today. The
balanced paper reproduces the former absorption-42 coverage and direct solver
state byte-for-byte; absorbent paper uses stronger vertical than lateral motion
so its edge softens without becoming a generic blur.

The engine contains no React component, text control, Vite configuration,
Sites worker, native code, product data model, font, or reference image.

The Canvas2D keyboard renderer now exposes the existing contact mask,
accumulated density variation and sample count, optional Surface coverage
candidate, Surface-resolved Float32 coverage, nullable solver-grid density
transport, normalized concentration, and optical composite as a
frozen four-stage diagnostic record.
The former top-level return fields remain same-reference aliases.

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

Keyboard Surface now transports raw glyph Density through that same one-pass
wet solver instead of assigning the mean density to every spread-only pixel.
Contact contributes a separately area-resampled signed numerator and positive
mask weight. Deposit, diffusion, and fixing move the numerator with actual
positive pigment mass; the final grid exposes numerator and positive optical
carrier separately. Optical composition bilinear-samples both planes and only
then divides. Existing Contact pixels always keep their exact current Density;
only Surface-visible pixels without a Contact sample use transported variation.
Flow, mean density, color, and nib shaping do not enter transport, and nib
shaping still occurs exactly once in Optical.

At maximum keyboard absorption, Surface composition no longer replaces the
complete Contact with only the downsampled wet-grid candidate. Schema 4 authors
`minimumContactRetention = 0.54`: the previous Contact/Surface mixture remains
unchanged whenever it is stronger, while missing or weak grid coverage cannot
erase more than 46% of the original Contact. The absorption-42 reference keeps
its prior `0.549816...` Contact share and therefore remains numerically above
the new floor. The mean-density loss, narrowed shading range, outward fibre
spread, and transported halo remain separate effects.

Surface now also owns the final full-resolution coverage resolution. The public
`resolveKeyboardSurfaceCoverage` operator combines Contact alpha, the optional
physical candidate, the absorption mix exponent, and minimum Contact retention
into a Float32 plane. Optical consumes that plane and no longer reads or
reconstructs Surface mix/retention policy. The extraction preserves the prior
final RGBA equation at absorption 0/42/100. It adds one transient/returned
4-byte-per-page-pixel plane; its browser/device frame and memory budget remains
part of P6 hardening rather than a claim of zero cost.

Density now returns a separate full-resolution Float32 normalized concentration
plane. Optical consumes only that plane, Surface-resolved coverage, and the
recipe's Density-to-RGB curve plus alpha endpoints. It no longer receives Contact masks, glyph fields, flow,
absorption, or transported Surface density. The existing high-level composite
name remains a compatibility wrapper around the two explicit operators.

Absorption-dependent density-range preservation now comes from Surface through
`getSurfaceDensityRange`. Contact retains only nib geometry and its authored
shading multiplier; the final range and all ordinary pixels remain unchanged.

Ordinary Optical now samples a recipe-authored three-to-five-point
Density-to-RGB curve. The green r8 control authors the same `[29,55,40]` at low,
middle and high Density and therefore preserves the prior fixed-RGB output
exactly. Blue-black, burgundy and teal share the control's Contact, Density,
Surface and alpha fields while changing only their optical color curve and the
matching direct-pad color projection.

## Current limits

- Font selection, text wrapping, authored layout, input, and IME remain in the
  HTML client. The engine's optional Canvas2D adapter owns glyph-mask
  rasterization, Surface resizing, and ordinary material composition.
- The Contact-axis extraction covers keyboard/font glyphs only. The direct
  writing pad uses physical pointer contact and flow-dependent liquid deposit
  loads, and is explicitly outside E-005 rather than silently reinterpreted.
- Ordinary Density-to-RGB/alpha is the only extracted composite family.
- The Surface solver still operates on the current union mask, so nearby wet
  footprints may interact through diffusion, fixing, and signed-density mixing.
  Strict append-after-drying semantics would require incremental state and is
  not claimed here. A zero transported carrier intentionally has no ratio and
  retains the mean-density fallback.
- The maximum 320×240 transport solve adds 921,600 bytes of lazy solver state,
  614,400 bytes of transient resampled input, and a 614,400-byte returned grid.
  No full-page Float32 transport output is retained. Browser frame budgets are
  not yet fixed; the E-007 Node benchmark is a comparison, not a device claim.
- Stage diagnostics expose normalized concentration and final resolved
  coverage as observation buffers; callers still must not reinterpret them as
  a second calculation path.
- Browser visual equivalence is checked during the migration, but no single
  permanent pixel image is treated as the final artistic truth.
- Edge-separated color, sheen, shimmer, pigment, and oxidation remain future
  versioned experiments.
- Serialized keyboard Surface recipes are fail-closed above the bounded
  64-step synchronous calculation budget.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing module ownership and
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md) before tuning a formula.
