# Current engine state

> Status: Active experimental library
> Engine model: `ordinary-js-r13`
> Ink recipe schema: `6`
> Dye component model/schema: `dye-component-js-r13 / 12`
> Surface model/schema: `paper-surface-js-r4 / 3` (absorbent r4), with historical r1/r2/r3 preserved
> Fixture manifest: `3`

## Now

This directory is the single reusable calculation source for the Fountain ink
engine. The HTML Workbench is a client for public recipe authoring, normal-size
visual comparison and stage diagnostics; it is not another material engine.

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

Package `0.22.0-experimental.1` adds schema-2 `edge-dye-study@3` and derives a
bounded `edgeAccumulation` plane from positive component enrichment, visible
component mass and the local base-mass gradient. A fixed threshold leaves
discontinuous occupied segments instead of repainting the complete Contact
boundary. The candidate changes with the Surface solve but remains independent
from flow and signed glyph Density. It is diagnostic-only; the ordinary
Optical RGBA still contains no second color. R1 and R2 remain archival.

Package `0.23.0-experimental.1` adds schema-3 `edge-dye-study@4` and an Optical
second-dye operator. Positive component fraction delta determines the authored
burgundy color mixture while the discontinuous R3 candidate only gates where
that mixture may appear. The operator changes RGB only inside existing ordinary
alpha; Contact, Density, Surface coverage, glyph geometry and every alpha byte
remain unchanged. Candidate-only cells without positive enrichment remain the
base color, so the result cannot fall back to a uniform outline. Sailor
Yurameku/Ink Studio examples and Troublemaker Abalone writing samples establish
the visual target of irregular color zones that vary with paper and broadness;
angle-dependent metallic sheen remains a separate P5-B layer.

E-028/A1 did not pass perception: the changed bytes were hidden in ordinary
shading, and smooth paper skipped the component along with its inactive
physical Surface candidate. Package `0.24.0-experimental.1` adds schema-4
`edge-dye-study@5`. Discontinuous accumulation and local enrichment maxima seed
one-grid-cell `colorZone` regions clipped to positive component support. Smooth
paper calculates this surface-film component while leaving ordinary coverage,
density transport and paper depth inactive. The diagnostics client hides
unavailable fields and compares ordinary base with second-dye final directly.
Alpha, coverage and geometry remain exact.

Package `0.25.0-experimental.1` adds an explicit visual-authoring boundary for
that component. A current-model/schema recipe with a nonregistered id can be
rendered and canonically serialized, so a workbench can change component mass,
mobility, retention, color and bounded-zone parameters without copying engine
math. Registered ids remain reserved and fingerprinted; `edge-dye-study@5`
cannot be retuned or extended without a new built-in revision. Experiment
clients must checkpoint the full canonical recipe because an unregistered
`id@revision` pair is not a catalog identity.

Package `0.26.0-experimental.1` adds `sheen-component-js-r1` and the independent
`sheen-study@1` recipe. A Surface-owned Float32 film appears only above the
authored high-concentration threshold and is reduced by paper roughness and
poor film preservation. Optical receives a separate scalar specular-view input:
zero preserves ordinary RGBA exactly, while the active view changes RGB only
inside existing alpha where film exists. The Workbench exposes base/specular
views and the film diagnostic from the same solve. This is not the P5-A edge
zone, an outline, or a shimmer-particle state.

Package `0.27.0-experimental.1` adds `shimmer-component-js-r1` and the
independent `shimmer-study@1` recipe. Surface selects a finite particle list
only from the resolved wet footprint and applies the paper recipe's
`particleCatch`; Density is deliberately absent from particle placement.
Optical uses an explicit light observation to mix particle RGB inside existing
alpha without changing coverage. Reduce Motion chooses the authored static
phase and never changes particle positions. The built-in list is capped at 512
particles and occupies 10,240 bytes of typed-array attributes rather than a
full-page particle field.

Package `0.28.0-experimental.1` adds `pigment-component-js-r1` and the
independent `pigment-study@1` recipe. It shares the ordinary water footprint
but owns mobile, fixed and optional paper-depth mass with authored mobility and
retention multipliers. The A1 renderer exposes this state under Surface while
ordinary water, carrier mass, coverage and RGBA remain exact. The current
solver has one exclusive optional transported-component slot, so edge dye and
pigment cannot coexist yet. Pigment Optical color is not part of this checkpoint.

Package `0.29.0-experimental.1` adds `oxidation-component-js-r1` and
`classic-forest-oxidation-study@1`. The recipe owns fresh/settled RGB, reaction
half-life and bounded concentration-aware mixing. Its observation owns explicit
`committedAtMilliseconds` and `observedAtMilliseconds`; the engine derives
elapsed time and never reads the current clock, animation time or device state.
At one half-life deterministic progress is exactly `0.5`. Optical changes RGB
only and keeps Contact, Density, Surface coverage and alpha exact. The Workbench
currently treats its preview text as one material commit; persisted product
strokes and per-commit replay remain future integration work.

Package `0.30.0-experimental.1` advances only the independent checkpoint axis:
fixture manifest v3 requires complete specialty `componentInputs` and a strict
`renderContext`. The context records literal text, actual grapheme segmentation,
all glyph seeds and derivation ids, Surface seed, geometry/layout/raster facts,
font file SHA-256 and dependency-lock SHA-256. It changes no engine model,
recipe schema or rendered byte. Manifest v1/v2 records remain readable without
inventing the fields they never stored.

Package `0.31.0-experimental.1` adds stable-output contract v1 without changing
the engine model, recipe schema, fixture manifest, or any rendered value. A
fixture-v3 checkpoint's calculation-relevant ink, paper, component, seed,
layout, raster, font and dependency facts are canonicalized into one replay
input signature. Six exact named fields bind that input to Contact RGBA,
Density variation/count, resolved Surface coverage, normalized concentration
and final Optical RGBA. The scope is deliberately
`recorded-environment-exact-stage-bytes-v1`: different host/font/raster facts
change the input signature before byte equality is considered. This is a
versioned change detector, not a screenshot golden or cryptographic proof.

The final calculation-independent P2 validity matrix renders all 8 active nibs,
4 ordinary inks, 3 active paper Surfaces and flow 0/58/100: 288 cases. Every
page plane has its exact declared length, Float32 fields are finite and bounded,
nonblank Contact remains nonblank through resolved coverage and Optical alpha,
signed Surface/depth numerators stay within their positive carriers, and the
retained diagnostic buffers remain below the explicit
`32 × pagePixels + 16 × surfaceGridCells` structural budget.

Package `0.33.0-experimental.1` adds `dye-component-js-r7`, schema 6 and
`edge-dye-study@7`. The transported second-dye mass, mobility, retention,
discontinuous positive-support zones and R6 low/middle/high base curve remain
intact. R7 intersects the coarse component zone with a 1 CSS px high-resolution
Contact inner band, then applies the green-teal secondary color only inside that
partial intersection. Optical changes RGB only: ordinary/component state,
Contact, Density, Surface coverage, geometry and every alpha byte remain
unchanged. The HTML Workbench exposes base-only/edge-on A/B and authors the
colors, base mix, transport, zone and band through the public recipe.

Package `0.34.0-experimental.1` adds `dye-component-js-r8`, schema 7 and
`edge-dye-study@8`. R8 preserves R7 transport, palette, base curve and mix
values while replacing both the seeded/radius zone and fixed Contact band with
one Surface-owned `secondaryColorField`. At each interior Surface cell, positive
second-dye enrichment, visible second-dye mass and the maximum four-neighbor
relative total-mass gradient form a bounded square-root product strength. Boundary
cells remain zero and no seed growth is applied. Optical bilinear-samples this
field directly and changes RGB only; it no longer accepts Contact RGBA or raster
scale for dual shading, and every alpha byte remains exact. Deprecated
`edgeAccumulation` and `colorZone` state properties temporarily alias the same
canonical typed array without allocating extra planes. Revisions 1–7 retain
their canonical serializations as archival evidence.

Package `0.35.0-experimental.1` adds `dye-component-js-r9`, schema 8 and
`edge-dye-study@9`. R9 keeps the complete R8 palette, component base curve,
continuous `secondaryColorField` formula and Optical compositor unchanged. Its
single new hypothesis is dye-specific paper retardation: a local component
concentration and the Surface `dyeAffinity` axis determine an unsaturated-site
response, bounded retardation, reduced lateral mobility and reduced paper-depth
uptake. Retardation also increases the component's fixing exponent. Symmetric
four-neighbor dye flux is algebraically conservative despite position-dependent
mobility; Float32 plane totals are bounded by a scale-aware relative ULP budget
rather than asserted byte-exact. Local depth/fixed storage returns any capacity
excess to mobile mass instead of
discarding it. The legacy solver's unstepped outer ring is treated explicitly
as dye-free ghost padding at deposit and as a no-flux boundary during R9
transport, preventing component mass from surviving after its carrier is
cleared there. Both step variants explicitly zero that ring in their next dye
plane, so even an internally polluted ring cannot freeze. Immediate public dye
snapshots also leave fraction and delta neutral on the unsolved ring while the
legacy ordinary deposit is still present before its first step. Ordinary water/base
mass, optional pigment transport, component-
off behavior, coverage and alpha retain their existing paths. R1–R8 canonical
serializations remain archival. Normal-size photo comparison is still pending;
this engine checkpoint makes no perceptual-acceptance claim.

Package `0.36.0-experimental.1` adds `dye-component-js-r10`, schema 9 and
`edge-dye-study@10`. R10 keeps every R9 transport coefficient and Surface step
byte-exact, including concentration-dependent retardation, ghost-boundary
handling and the component base palette. The retained page-sized
`primaryVisibleMass` plane replaces R9's `secondaryColorField`, so the active
state has no deprecated field aliases and retains the same memory total.
Optical bilinear-samples visible primary mass and visible secondary mobile/fixed
mass separately, computes their ratio after interpolation, suppresses low-mass
color with an exponential visibility term, and maps enriched presence through
relative absorptivity. Positive mixtures use standard linear-sRGB optical-
density interpolation toward `[15,145,104]`; zero mixture copies the A4/R9 base
RGB exactly. Subsurface mass, Contact, Density, coverage and geometry are not
read by this color operator, and every existing alpha byte is copied exactly.
Deterministic B/48 tests cover nonuniform synthetic stroke support on active
smooth, balanced and absorbent papers, including continuous intermediate
mixtures, a bounded maximum plateau, monotonic presence, non-outline interior
support and absence of isolated near-secondary specks. This is an engine
mechanism checkpoint. Normal-size browser/photo comparison and a new perceptual
score remain pending; no `>=9/10` claim is made by package 0.36 alone.

Package `0.37.0-experimental.1` adds `dye-component-js-r11`, schema 10 and
`edge-dye-study@11`. R11 preserves R10 transport, mass planes, base curve and
RGB endpoints. Schema 10 removes `componentMassVisibilityScale` and
`secondaryRelativeAbsorptivity`; there is no replacement gain. Optical
bilinear-samples visible `P` and `S` separately, then uses the direct mass share
`S/(P+S)` to mix endpoint K/S values in a three-band, semi-infinite
single-constant Kubelka–Munk approximation. Endpoint reflectances are standard
linear sRGB normalized by the Surface recipe's scalar `paperReflectance`, which
the renderer passes explicitly as `paperDiffuseReflectance`. Absent secondary
mass preserves the R10/A4 base bytes exactly, and all paths preserve existing
alpha. Focused tests pin mass-scale invariance, ratio-after-interpolation,
endpoint and intermediate equations, finite input validation before mutation,
and renderer propagation of paper reflectance without changing Contact,
Density, Surface state or alpha. This is an RGB endpoint approximation rather
than a calibrated spectral K/S model: it has no measured dye spectra, paper
scattering spectrum or finite-layer thickness. The repeated B/48·M/28·M/20
browser matrix was byte-deterministic, but the initial `92.3/100` conclusion is
withdrawn. A stricter spatial comparison with Ayame, Hinoki, Haha and Koke
scores A6 `6.3/10`: the nominal `24.24%` second-dye mixture recolors almost the
whole stroke while actual transported ratios remain near `24.2...24.9%`.
`first dye only` versus `two dyes` measured composition change, not separation.
The next family is specified in
`../../docs/research/dual-shading-nine-point-plan-2026-08-24.md` at the umbrella
repository level. A7-0 first fixes a same-state well-mixed versus transported
comparison and defines whether Optical returns a substrate-independent layer or
a paper-resolved preview. A7-1 then gives both dyes an explicit neutral
mobile/adsorbed/depth total-residual state while holding total deposited dye
constant; both boundaries are now implemented. A7-2 next connects both
species to the same conservative water-face advection and gives them independent
diffusion and linear adsorption/desorption. Capacity is deferred and, if
needed, must use fraction-scaled storage or one shared vacancy rather than equal
independent absolute capacities. Surface spectral Beer finite-loading and a
measured-scattering paper-depth finite K–M are separate later attempts. No hue
gain, edge mask or coffee-ring may
stand in for missing state separation.

Package `0.38.0-experimental.1` completes A7-0 without changing the dye model,
recipe schema, default stage shape, stable-output contract, or visible
transported RGBA. `compositeDyeWellMixedControlOptical` samples the same
bilinear `P` and `S` state as the transported operator but uses the authored
uniform fraction `f0=massFraction/(1+massFraction)` wherever `T=P+S>0`.
The versioned Canvas2D opt-in
`DYE_OPTICAL_COMPARISON_WELL_MIXED_VS_TRANSPORTED_V1` returns
`{ wellMixedRgba, transportedRgba }` from one prepared Surface solve;
`transportedRgba` is the existing `imageData` reference. A default call has no
comparison property. Both branches preserve exact alpha and pass later active
oxidation, sheen, and shimmer Optical operators identically. The output is
documented as the existing straight-alpha legacy presentation layer, not a
substrate-independent physical ink layer or an opaque paper-resolved preview.
A future paper-resolved spectral path must have a separate opaque contract.
This correction changes the validity of the A/B experiment, not the A6
perceptual score; dual shading remains `6.3/10`.

Package `0.39.0-experimental.1` completes the A7-1 neutral two-dye mass
contract with `dye-component-js-r12`, schema 11, `edge-dye-study@12`, and state
model `neutral-two-dye-total-residual-v1`. Each mobile, adsorbed, and paper-depth
phase owns a total plane `T=P+S` and a signed secondary-residual plane
`R=S-f0T`, so `P=(1-f0)T-R` and `S=f0T+R` reconstruct both species. R12
partitions the actual ordinary deposit delta instead of adding a second-dye
mass on top. Schema 11 removes every A6 asymmetric transport input, including
`massFraction`, mobility, retention, paper affinity, and retardation; the only
composition input is `initialSecondaryFraction`.

A7-1 performs no lateral species transport. It applies each ordinary local
mobile-to-adsorbed or mobile-to-depth fraction equally to `T` and `R`. Neutral
deposition starts with exact `R=0`, remains exact through every phase transfer,
and makes transported Optical byte-identical to the same-state well-mixed
control. Non-depth papers expose explicit zero depth total/residual planes for
a stable state shape. Component-off ordinary state, stages, RGBA, and stable
signatures remain exact. This is an engine invariant checkpoint, not visible
separation, so the perceptual score remains `6.3/10`.

Package `0.40.0-experimental.1` completes the first A7-2 operator baseline with
`dye-component-js-r13`, schema 12, `edge-dye-study@13`, and state
`two-dye-total-residual-v2`. One old-water right/down face flux uses the
arithmetic mean of the existing fibre factors and is donor-limited before both
species consume it through upwind advection. Harmonic-wetness species
dispersion uses separately authored aqueous diffusivities without applying the
fibre factor twice. Primary and secondary transfers are accumulated
equal-and-opposite and separately donor-limited, then converted back to the
same public six-plane `T/R` basis.

Both species next share the local paper-depth transfer. Evaporation changes
water only. An analytic capacity-free mobile/adsorbed reaction is modulated by
paper `dyeAffinity`, deterministic paper tooth, and post-evaporation wetness;
the numerical ghost ring has neither face transport nor reaction. The five
private Float64 cell scratch planes are allocated lazily, cleared and reused
per step, and never appear in public state. Schema 12 adds only primary/
secondary diffusivity and linear adsorption/desorption rates. The built-in
`.001/.003`, `.02/.006`, and `.0002/.0003` values are dimensionless pilots that
preserve the published ordering of flow, adsorption/evaporation, diffusion,
and desorption timescales; they are not SI calibration. R13 adds no finite
capacity, Optical gain, edge mask, or coffee-ring.

The hard gates pin exact neutral behavior for equal coefficients, algebraic
equal/opposite face updates, positive donors, no-flux/no-reaction ghost cells,
dye conservation under water evaporation, both signs of residual, separate
primary/secondary mass conservation, exact component-off ordinary output, and
bounded scratch reuse. `npm run verify` passes with 119 built modules, 15 public
entry points, and all 206 tests. `npm pack --dry-run` passes with 132 files,
159.6 kB packed and 674.9 kB unpacked.

The operator separates state but the first calibration does not close the
visual gap. B/48 on smooth paper measured 1,459 positive and 907 negative
visible residual cells with fraction peaks `+0.0023/-0.0019`; transported
versus well-mixed Optical changed 502 pixels with mean channel delta `0.3`,
maximum `1`, and exact alpha. The browser console had zero warnings or errors. The
perceptual score remains `6.3/10`.

Package `0.43.0-experimental.1` makes `edge-dye-study@14` the current
calibration without changing the R13 operator, schema, state, palette, or
initial fraction. R14 changes only the six diffusivity/adsorption/desorption
rates. A bounded 27-case start-stop, junction, and double-pass matrix across
three papers and thin/medium/broad masks pins six-plane determinism,
finite/non-negative reconstructed species, species/total/residual conservation,
signed connected porous M/B patches, a secondary outside advantage, and
rejection of global-recolor/perfect-outline topology. Smooth/EF separation
strength is not forced. The 12 porous M/B cases record q05
`-0.0122...-0.00465`, q95 `+0.02848...+0.03444`, connected patches of
`75...481` cells, and outside advantage `+0.0037...+0.0133`. The fixed physical-state evaluator label `phys60` is
not a perceptual score.

A7-4 v1 used `three-channel-effective-optical-density-v1` with
`referenceVisibleMass=1` and was too faint for the engine's actual loading
units. V2 uses `three-channel-effective-optical-density-v2` and fixed
`referenceVisibleMass=0.14`, selected from Workbench visible-mass peaks `0.134`
at M/28 balanced and `0.179` at B/48 balanced. It returns a warm-white
paper-backed opaque sRGB pair from the same state. The three-channel effective
optical density is Beer-inspired but is neither spectral Beer-Lambert nor
Kubelka-Munk scattering. B/48 balanced still changes only about 12k pixels at
mean channel delta `0.5`, maximum `3–4`, and alpha delta `0`; the perceptual
score remains `6.3/10`.

The bounded search adapted
[Karpathy autoresearch](https://github.com/karpathy/autoresearch) and its
[program.md](https://github.com/karpathy/autoresearch/blob/master/program.md?plain=1)
discipline. It locked engine source-tree and baseline digests, self-contained
rows, mass-weighted tail cutoff `max(1e-8,0.001*peak)`, 30-second child timeout,
saturating Pareto axes, and artifact hard gates while mutating only six rates.
Both batches ended `48/48 reject-hard`, shortlist `0`, with
`opticalAreaFidelity=0` for all; global recolor affected 11 then 24 candidates.
Extreme primary adsorption `1` produced the best `opticalDeltaFidelity`
`0.03639156` but still failed hard. Capacity-free R14 is falsified/plateaued.

The next A7-3 attempt tests one literature-motivated shared vacancy at total
`Q=0.075`, with `max(0,Q-A_primary-A_secondary)` free sites. It does not resume
gain, palette, or R14 rate tuning. Blinded human comparison with real ink
photographs remains the only route to 9; the current score is `6.3/10`.

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
- Ordinary Density-to-RGB/alpha, the opt-in r5 second-dye color zone, sheen,
  shimmer and explicit-age oxidation are extracted Optical families. Pigment A1
  is state-only; dedicated pigment color remains unimplemented.
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
- Pigment transport state now exists; pigment Optical color remains a future
  versioned experiment. Edge-separated color, sheen, shimmer, pigment state
  and explicit-age oxidation are independent optional components.
- Serialized keyboard Surface recipes are fail-closed above the bounded
  64-step synchronous calculation budget.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing module ownership and
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md) before tuning a formula.
