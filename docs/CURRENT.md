# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r13`
> Ink recipe schema: `6`
> Dye component model/schema: `dye-component-js-r2 / 1`
> Surface model/schema: `paper-surface-js-r4 / 3` (absorbent r4), with historical r1/r2/r3 preserved
> Fixture manifest: `2`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The existing HTML study is a client and visual comparison harness.

The first extraction deliberately keeps the accepted ordinary-ink formulas:

- deterministic FNV-style text hash and seeded PRNG;
- UEF, EF, F, M, B, EB, SU, and CM contact profiles;
- signed glyph-local density variation bounded by calibrated alpha endpoints;
- water, mobile-pigment, fixed-pigment, and paper-fibre simulation.

Ink constants now live in the immutable active `ordinary-green-r12` control
recipe and the blue-black, burgundy, and teal r6 ordinary recipes. Paper
behavior lives separately in `paper-smooth-r1`, active `paper-balanced-r2`,
and active `paper-absorbent-r4`; earlier paper revisions remain historical
evidence. `ordinary-green-r1` through `ordinary-green-r11`
remain registered and structurally readable as archival `ordinary-js-r2`
through `ordinary-js-r12` checkpoints, but they are not calculation-compatible
with the active r13 model. Nib, flow, Surface recipe,
layout, and seeds remain explicit runtime inputs. Public
material paths reject a missing or schema-mismatched recipe instead of silently
inventing one. Structural parse/serialize APIs can preserve a supported schema
from a historical engine model, while calculation entry points additionally
require the active engine model/schema and a canonical registered definition
for built-in identities.

Fixture-manifest v2 records ink and Surface identities independently. The v1
reader and historical ink schemas remain archival and are never implicitly
migrated; only compatible schema-6 ink plus an explicitly supported schema-1
or schema-2/schema-3 Surface recipe enters the current material calculation.
All supported Surface schemas remain explicit;
there is no implicit conversion of `verticalUptake` into paper depth.

Paper Surface is an explicit eight-axis recipe. The historical r1 family keeps
`verticalUptake`; absorbent r2/r3/r4 replace that ambiguous page-plane axis with
`depthUptake`. Lateral mobility then controls both page X/Y diffusion, while
depth uptake transfers water and mobile pigment locally into a lazy subsurface
state. Dye affinity, surface retention, film preservation and roughness remain
independent. Particle catch and paper reflectance are versioned hooks for later
specialty/optical work and are neutral today. Balanced r2 keeps the historical
solver candidate and direct-input state but reduces that candidate's continuous
contribution during keyboard Surface resolution. Absorbent r4 preserves a
readable Contact core, reports pigment below the visible paper, and adds sparse
page-anchored fibre branches outside Contact without entering enclosed counters.
Historical smooth/balanced/absorbent revisions keep their registered bytes.

The absorbent fibre operator now walks only the deterministic Contact frontier
instead of rescanning the full local region at every reach step. Historical r3
output remains byte-identical. Active r4 keeps the accepted DPR2 result and
scales only first-branch alpha with raster scale, so DPR1/2/3 retain comparable
CSS-space reach and integrated coverage. On the 790×610 synthetic 28px
benchmark, p50 changed from 10.99/67.71/183.43ms before the sparse frontier to
2.37/8.98/20.95ms at DPR1/2/3. These are Node measurements, not a browser frame
budget.

Package `0.17.0-experimental.1` adds a byte-exact staged Canvas boundary around
the unchanged r12 renderer. `prepareOrdinaryInkCanvasInput` keeps the accepted
HTMLCanvas downsample path, `beginOrdinaryInkMaterial` runs Density/Surface work,
`upsampleKeyboardSurfaceCoverage` keeps the accepted HTMLCanvas upsample, and
`completeOrdinaryInkMaterial` resolves coverage, concentration and Optical.
The original high-level renderer calls those same stages and a regression proves
the staged and synchronous RGBA/concentration/coverage are exact. No engine,
recipe, Surface model or fixture version changed.

The HTML harness uses this boundary to draw a contact-colored glyph mask first,
then settle only the latest request in a Worker. A bounded LRU reuses existing
glyph Contact masks whose literal/font/geometry inputs are unchanged. In the
current in-app browser, the 23-grapheme 18/28/52px DPR1/2/3 Contact p95 matrix
stays at or below 28.5ms; rapid growth to 80 graphemes measured p95 21.0ms with
maximum pending frame and settle both 1. Typed-array work runs off-main, while
the exact host-Canvas bridge measured 3.1/11.8/22.3ms at DPR1/2/3. Total settle
latency was 80.6–196.7ms. E-021 now splits previously unseen cold-paste Contact
rasterization into 8ms animation-frame chunks. Distinct 80-grapheme DPR1/2/3
frame p95 measured 12.2/16.8/18.5ms, while the complete Contact took 107–122ms.
The textarea remains immediate and only the latest build may settle;
non-Chromium Worker/Canvas behavior remains unverified.

Package `0.18.0-experimental.1` adds the calculation-neutral
`createFieldSignature` checkpoint helper. It records domain, type, dimensions,
channels and a canonical little-endian FNV-1a-64 change detector without
changing engine, recipe, Surface or fixture versions. The active 18×14
ordinary checkpoint pins Contact, Density variation/count, resolved Surface,
normalized concentration and final Optical signatures. A translation fixture
also proves that the same explicit seed and phase-relative Contact preserve a
glyph-local Density signature while the page signature changes with placement.

Package `0.19.0-experimental.1` adds `fountain-nib-catalog-r2` and the fixed
`CM` Cross-Music-inspired Contact. Its x-axis target is F-like while its y-axis
target is EB-like, producing thin vertical and broad horizontal strokes—the
opposite orientation of SU—from one final glyph alpha mask. The operator does
not duplicate, shadow, or scale a glyph, and it does not claim live pressure,
angle, double-nib feed reserve, or exact Sailor product reproduction. Existing
seven nib results and all ordinary material coefficients remain unchanged.

Package `0.20.0-experimental.1` adds the independently versioned
`edge-dye-study@1` diagnostic component. It deposits a fraction of the base
pigment mass into separate mobile/fixed planes, follows the same water and
paper fibre field, applies its own mobility and retention multipliers, and
uses a separate depth plane on depth-uptake paper. The component has no Optical
color in A1. With the component absent, no component plane is allocated and
the ordinary solver bytes remain exact; with it present, ordinary water,
pigment, coverage, Density transport and final RGBA remain unchanged.

Package `0.21.0-experimental.1` keeps the A1 transport coefficients in
`edge-dye-study@2` and adds two bounded diagnostic planes: visible component
fraction and its signed delta from the authored initial mixture. Those fields
are independent from the ordinary normalized-concentration plane. Changing
flow or signed glyph Density changes ordinary concentration but leaves dye
enrichment exact. R1 remains serialized archival evidence.

The final calculation-independent P2 validity matrix renders all 8 active nibs,
4 ordinary inks, 3 active paper Surfaces and flow 0/58/100: 288 cases. Every
page plane has its exact declared length, Float32 fields are finite and bounded,
nonblank Contact remains nonblank through resolved coverage and Optical alpha,
signed Surface/depth numerators stay within their positive carriers, and the
retained diagnostic buffers remain below the explicit
`32 × pagePixels + 16 × surfaceGridCells` structural budget.

The engine contains no React component, text control, Vite configuration,
Sites worker, native code, product data model, font, or reference image.

The Canvas2D keyboard renderer now exposes the existing contact mask,
accumulated density variation and sample count, optional Surface coverage
candidate, Surface-resolved Float32 coverage, nullable solver-grid density
transport, nullable paper-depth pigment state, nullable diagnostic dye mass,
normalized concentration, and optical composite as a
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
- The r2/r3 paper-depth state is a local scalar depth bucket, not a layered
  paper cross-section or reverse-side bleed-through renderer. Absorbent r4 has
  a bounded high-resolution exterior fibre operator, but does not yet model a
  page-wide directional fibre network or reverse-side transport.
- The maximum 320×240 transport solve adds 921,600 bytes of lazy solver state,
  614,400 bytes of transient resampled input, and a 614,400-byte returned grid.
  No full-page Float32 transport output is retained. Absorbent r4 additionally
  creates one transient full-page Uint8 fibre-alpha plane. Browser frame budgets
  are not yet fixed; the E-007 Node benchmark is a comparison, not a device claim.
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
