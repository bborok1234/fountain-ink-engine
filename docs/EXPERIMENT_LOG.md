# Experiment log

This is a learning ledger, not a gallery of permanent visual answers. Screenshots
and pixel captures may be attached to a versioned experiment for comparison, but
they are not automatically promoted to timeless pass/fail truth.

## Record template

```md
### E-000-short-name / A1

- Parent: none
- Engine model: ordinary-js-r8
- Recipe schema: 5
- Fixture manifest: 1
- Status: running | passed | learned | abandoned
- Hypothesis:
- Explicit inputs and seed:
- Expected at normal size:
- Observed:
- Why it failed, if applicable:
- Discarded assumption:
- Preserved evidence:
- Next different method:
```

## E-001-library-extraction / A1

- Parent: none
- Engine model: `ordinary-js-r1`
- Recipe schema: `1`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: the accepted ordinary calculation can become a framework-free
  library without changing its numeric formulas.
- Explicit inputs and seed: existing nib profile constants, calibrated ordinary
  endpoints, and `WetInkSimulation` defaults copied from the HTML study.
- Expected at normal size: no intentional visual difference after the HTML
  harness switches to public package imports.
- Observed: Node contract tests preserve nib ladders, deterministic helpers,
  density endpoints, morphology behavior, and repeated simulation state. The
  HTML harness now consumes only public package exports; desktop and 390×844
  browser checks remained nonblank and interactive without console errors.
- Preserved evidence: the pre-extraction implementation remains in repository
  history and the HTML harness owns migration-time visual comparison.
- Next different method: keep visual changes in new recipe revisions and begin
  the next focused color-ink or Surface experiment without changing this
  extraction record.

## E-002-explicit-seed-domain / A1

- Parent: `E-001-library-extraction`
- Engine model: `ordinary-js-r2`
- Recipe schema: `1`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: seed `0` must remain a distinct valid input, and no public
  material path may invent an implicit Surface seed.
- Explicit inputs and seed: PRNG seeds `0` and `1`; density cadence seed `0`
  versus missing; Surface seeds `0x13579bdf` and `0x8d60e266`.
- Expected at normal size: the existing nonzero ordinary checkpoint is
  unchanged while zero and missing seeds no longer alias.
- Observed: seed `0` now produces its own deterministic PRNG and density field;
  Canvas and direct-stroke Surface paths require an explicit non-negative seed.
- Preserved evidence: E-001 and the ordinary recipe constants remain unchanged.
- Next different method: begin a versioned color-ink or Surface experiment.

## E-003-ordinary-green-recipe / A1

- Parent: `E-002-explicit-seed-domain`
- Engine model: `ordinary-js-r2`
- Recipe schema: `2`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: the accepted ordinary green constants can become one immutable,
  serializable `ordinary-green-r1` recipe without changing their numeric or
  normal-size visual meaning.
- Explicit inputs and seed: default M/flow 58/absorption 42, Surface seed
  `0x13579bdf`; EB/flow 58/absorption 70 interaction; direct-input M stroke.
- Expected at normal size: the same green hue, alpha endpoints, glyph shading,
  Surface coverage, and direct-input appearance as E-002.
- Observed: the one-pixel reference composite remains `[29,55,40,213]`; engine
  and harness gates pass with the recipe required on every material path. Fresh
  desktop, 390×844, and direct-input browser loads remained nonblank and
  interactive with no console warnings or errors.
- Preserved evidence: E-002 remains the pre-recipe checkpoint. Browser captures
  are comparison evidence, not a permanent artistic golden.
- Next different method: expose and test the four stage diagnostics before
  adding a new color or Surface revision.

## E-004-keyboard-stage-diagnostics / A1

- Parent: `E-003-ordinary-green-recipe`
- Engine model: `ordinary-js-r2`
- Recipe schema: `2`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: the keyboard renderer can expose its existing intermediate
  buffers under honest four-stage diagnostic names without changing arithmetic
  or creating a second material path.
- Explicit inputs and seed: M/flow 58/absorption 42 and absorption 0, Surface
  seed `0x13579bdf`, glyph cadence seed `0x1234abcd`, structural 18×14 Canvas
  fixture.
- Expected at normal size: the ordinary composite and all compatibility return
  fields keep their existing meaning and references; zero absorption records an
  explicit skipped Surface state.
- Observed: `npm run verify` passed all 42 engine tests. The diagnostic record
  exposes the contact RGBA mask, unnormalized density sum/count planes, optional
  Surface candidate, and final RGBA composite. Compatibility aliases are the
  same references, repeated inputs are deterministic, inputs remain unchanged,
  and tested fields are correctly sized, finite, bounded, and nonblank.
- Preserved evidence: E-003 formulas, recipe/model/schema versions, Canvas
  rendering order, and direct-input solver remain unchanged.
- Next different method: use these observation fields to extract one ownership
  boundary at a time; do not infer normalized concentration or final coverage
  fields that the current renderer does not calculate independently.

## E-005-keyboard-flow-axis-independence / A1

- Parent: `E-004-keyboard-stage-diagnostics`
- Engine model: `ordinary-js-r3`
- Recipe schema: `2`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: keyboard glyph contact geometry can stop accepting ink flow while
  preserving the accepted flow-58 footprint exactly; flow then changes mean
  density without changing the contact footprint.
- Explicit inputs and seed: every UEF/EF/F/M/B/EB/SU nib at 18, 28, and 52px;
  glyph seeds `0`, `0x1234abcd`, and `0xffffffff`; fixed contact calibration
  `0.8824`, which exactly equals the former `0.72 + 0.58 * 0.28` gain.
- Expected at normal size: r3 contact geometry is bit-exact with r2 at flow 58
  for the complete matrix, while the public Contact function has no flow or
  layout input. Existing density mean/range baselines remain unchanged.
- Observed: the complete 63-case geometry matrix deep-equals the legacy flow-58
  formula, repeated calls are deterministic, unknown nib IDs and invalid seeds
  fail closed, and the accepted per-nib mean/range values remain exact.
  `ordinary-green@1` keeps its original canonical fingerprint as an archival r2
  recipe; independently pinned `ordinary-green@2` selects r3 with all material
  coefficient fields unchanged.
- Why it failed, if applicable: not applicable.
- Discarded assumption: keyboard flow is not a justified input to font-contact
  width variation merely because the original view computed them together.
- Preserved evidence: `ordinary-green@1`, its canonical serialization and
  fingerprint, r2's legacy geometry formula in the equivalence test, recipe
  schema 2, and fixture manifest 1.
- Next different method: test append stability as its own keyboard experiment.
  Preserve prior glyph identity while measuring the current Density overlap and
  page-global Surface normalization separately. The direct-writing pad remains
  excluded because it intentionally uses flow-dependent liquid deposit loads.

## E-006-glyph-local-density-append-stability / A1

- Parent: `E-005-keyboard-flow-axis-independence`
- Engine model: `ordinary-js-r4`
- Recipe schema: `2`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: signed keyboard density belongs only to each final glyph Contact
  mask's real alpha support, so appending a nonoverlapping glyph cannot
  reinterpret settled Density pixels merely because two approximate bounding
  boxes overlap.
- Explicit inputs and seed: structural 14×8 density fixture with a three-pixel
  base Contact at `(2,2)`, a separate two-pixel suffix Contact at `(7,2)`, seeds
  `1` and `2`, scale `1`, font size `10`; structural Canvas2D absorption-0
  fixture with two-pixel base and suffix masks; explicit actual-overlap case;
  legacy single-glyph seed `0x1234abcd`.
- Expected at normal size: a nonoverlapping suffix leaves the existing Contact,
  Density, and absorption-0 Optical crop exact. Actual Contact overlap averages
  only the intersecting pixel. The active single-glyph result stays exact on
  every visible Contact pixel and keeps the calibrated optical endpoints.
- Observed: the r3 bbox±5 calculation changed 3 of 3 pre-existing support pixels
  in the measured nonoverlapping append fixture. The r4 support-local calculation
  changes 0 of 3. The Canvas2D append fixture preserves the existing Contact,
  accumulated variation, count, and Optical RGBA bytes exactly at absorption 0;
  repeated inputs are deterministic; the actual-overlap fixture increments only
  the intersecting count from 1 to 2. Single-glyph visible Float32 values are
  exact with r3, and the one-pixel ordinary endpoint remains `[29,55,40,213]`.
- Why it failed, if applicable: not applicable for A1. The old failure came from
  treating `glyph.x/width` plus an arbitrary five-pixel margin as density
  ownership rather than using the final morphed Contact mask.
- Discarded assumption: nearby glyph layout bounds are a valid proxy for actual
  ink contact or overlap.
- Preserved evidence: immutable `ordinary-green@1` and `ordinary-green@2`
  canonical pins, the test-local r3 bbox reference calculation, unchanged
  material coefficients, recipe schema 2, fixture manifest 1, and the existing
  `getGlyphContactGeometry` contract.
- Next different method: E-006/A2 must measure and isolate the remaining
  nonzero-absorption append instability in Surface. Its page-global downsample,
  wet simulation, and strongest-alpha normalization can still change an earlier
  crop when a suffix is appended, while Surface-only spread pixels currently
  fall back to mean density without transported glyph density. Do not claim
  Surface stability from the A1 absorption-0 result or tune Density gains to
  hide that separate ownership problem.

## E-006-glyph-local-density-append-stability / A2

- Parent: `E-006-glyph-local-density-append-stability / A1`
- Engine model: `ordinary-js-r5`
- Recipe schema: `3`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: keyboard Surface normalization must be a pointwise mapping from
  raw simulated alpha to coverage using an authored recipe reference. A remote,
  non-interacting suffix must not reinterpret already calculated prefix
  coverage merely because it raises the page's observed strongest alpha.
- Explicit inputs and seed: active `ordinary-green-r4`; Surface seed
  `0x13579bdf`; reference harness M/28px/flow 58/absorption 42, CSS 788×608
  resampled to the existing 320×240 grid; low-level 80×36 fixture with alpha-90
  base at x 6–13 and alpha-255 suffix at x 66–73; renderer 80×36 far-suffix
  fixture; adjacent-footprint exception fixture; direct-load coefficients from
  r3 preserved exactly.
- Expected at normal size: the liked absorption-42 default keeps its existing
  normalized candidate, while a remote suffix leaves the prior Contact,
  Density, Surface, and Optical crop byte-exact. Nearby wet footprints may still
  interact locally through the solver. The direct-writing pad is unchanged.
- Observed: one-time font-loaded harness calibration measured raw Surface alpha
  maximum `107` (p99 `102`, p95 `99`, p90 `95`, 604 nonzero grid pixels) at the
  default 11 steps, so schema 3 authors
  `surface.keyboard.normalizationReferenceAlpha = 107`. At absorption 0.05 the
  same mask measured maximum `99` after 7 steps; at absorption 1 it measured
  `105` after 18 steps. A scalar reference was sufficient: a three-point curve
  would add a second hypothesis, and the low-absorption candidate scale change
  is mixed into only about 6.3% Surface coverage.
- Observed locality: in the sensitive low-level fixture, raw prefix bytes were
  already exact but the removed strongest-alpha mapping changed the divisor
  from `45` to `105` and changed 64 prefix alpha bytes (maximum delta 144). The
  r5 pointwise mapping changed zero. The Canvas2D renderer keeps the complete
  far prefix crop exact across Contact RGBA, Density sum/count, Surface RGBA,
  and Optical RGBA at absorption 42. An adjacent wet suffix changed 8 pixels in
  the base-side neighborhood while a remote crop stayed exact, recording the
  intentional diffusion/fixing exception rather than hiding it.
- Why it failed, if applicable: not applicable for A2. The old failure came
  solely from using the current page's strongest rendered alpha as every
  pixel's normalization divisor; it was not wet-solver diffusion in the remote
  fixture.
- Discarded assumption: page-observed maximum pigment is a stable material
  calibration reference.
- Preserved evidence: `ordinary-green@1/@2/@3` source, canonical serializations,
  schema-2 fingerprints, all pre-existing wet-solver, direct-load, density,
  coverage-mix, color, and alpha coefficients; recipe schema 2 remains
  parseable for historical records without migration. No raster was promoted
  to a permanent golden.
- Next different method: keep Surface-only spread pixels' mean-density fallback
  explicit. Transporting glyph Density through wet paper, incremental drying,
  and strict append-after-dry state are separate future experiments; do not
  fold them into normalization tuning.

## E-007-surface-density-transport / A1

- Parent: `E-006-glyph-local-density-append-stability / A2`
- Engine model: `ordinary-js-r6`
- Recipe schema: `3`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: Surface-only pigment should carry the raw signed Density of the
  Contact pigment that spread into it. Numerator must move only with positive
  pigment mass; Contact pixels must keep their exact current Density, and the
  direct/no-payload solver must remain byte-exact.
- Explicit inputs and seed: immutable `ordinary-green-r5`, whose authored
  coefficients exactly equal r4; Surface seed `0x13579bdf`; direct 24×18
  deposit with seed `0x10203040`, deposit seed `0x55667788`, absorption `0.42`
  and nine steps; A2 24×18 coverage fixture; signed ratios `-1`, `0`, `0.25`,
  `0.5`, `0.75`, and `1`; 80×36 far/near append fixtures; M/flow 58/absorption
  42 Canvas fixture. Performance comparison used Node's monotonic timer after
  three warmups and nine samples, the existing maximum 320×240 solver grid,
  absorption 42, and synthetic 1576×1216 DPR2 Contact pages with 18 and 80
  glyph-like masks.
- Expected at normal size: spread-only pixels continue the glyph's light/dark
  character instead of jumping to the mean. Positive and negative variation
  mix by pigment mass, not by averaging pre-divided ratios. Flow does not alter
  transport. A remote suffix stays exact; adjacent wet footprints may mix only
  in their shared physical halo.
- Observed: Contact alpha/RGBA remain exact because Contact samples have
  priority in Optical. Surface-only pixels use the bilinear-sampled numerator
  divided by a separately sampled positive carrier, followed by the existing
  single nib-shaping operation. Equal positive/negative mass resolves to zero;
  same-sign mixtures stay convex; zero carrier has no ratio and keeps the mean
  fallback. Mobile/fixed signed mass remains finite and bounded by its positive
  carrier after deposit, diffusion, and fixing. Flow 0/58/100 leaves both grid
  planes exact. The far suffix preserves Contact, Density, coverage, transport,
  and Optical prefix crops; the near fixture changes only the shared halo.
- Preserved evidence: direct-path SHA-256 remains
  `rgba ffb679936a6bc7efb30ea6df56536219cfd6ac62640c5a12f234b0b026292b72`,
  `water feaac4eec1eebf4f4d66dcb5befc904a0c614e4a5ccf4c8d318815634afe661b`,
  `mobile 03d0ba7de6e2a2a8713a5856cb7aeddd989bfa8ee9f2ae3f68e36f66c6c15b91`,
  and `fixed 971778c77a6b1291a33996c78fb37542318b83b9a51eb6aaaeebee964d614e5c`.
  The A2 coverage SHA-256 remains
  `2bee8374e17bb59d48e0b34ab2d74637ad83d1594ff0888303f3e67bb42adc41`.
  Revisions 1–4 and their canonical pins remain immutable; schema 3 and fixture
  manifest 1 are unchanged.
- Performance and memory: median coverage-only solve was `6.32ms` for the
  18-mask fixture and `6.37ms` for 80 masks. The transport solver was `9.81ms`
  and `9.74ms`; separate DPR2 numerator/carrier resampling was `7.45ms` and
  `7.78ms`. Thus measured incremental medians were `10.94ms` and `11.15ms` in
  this synthetic Node comparison; these are not browser/device budgets. At the
  maximum grid, three lazy solver planes add 921,600 bytes, the transient input
  grid adds 614,400 bytes, and the returned transport adds 614,400 bytes, for a
  2,150,400-byte transport-specific production peak. Only the returned 614,400
  bytes survive for renderer/diagnostics; no full-page Float32 transport plane
  is retained. The keyboard adapter invokes one union-mask solver, never one
  solver per glyph.
- Why it failed, if applicable: not applicable. The previous discontinuity was
  an ownership gap: Surface coverage spread pigment but discarded its Density,
  so gain tuning could not preserve the glyph's character outside Contact.
- Discarded assumption: every Surface-only pixel should use the page's mean
  density, or a signed ratio can be safely resized without its positive mass.
- Next different method: browser and normal-size perceptual comparison may
  select a future Surface recipe, but do not tune transport gains—A1 introduces
  none. Strict append-after-dry immutability remains a separate incremental
  state experiment rather than a per-glyph solver or a change to this mass
  transport operator.

## E-008-high-absorption-contact-retention / A1

- Parent: `E-007-surface-density-transport / A1`
- Engine model: `ordinary-js-r7`
- Recipe schema: `4`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: highly absorbent paper may spread pigment outside the written
  Contact and lower surface density, but it must not replace the complete glyph
  core with only a coarse wet-grid raster. A recipe-authored minimum Contact
  retention can preserve legibility without removing fibre diffusion or adding
  a duplicate glyph effect.
- Explicit inputs and seed: immutable `ordinary-green-r6`; Surface seed
  `0x13579bdf`; M nib, flow 58, absorption 100 at font sizes 18/28/52px;
  absorption-42 default-mix scalar fixture; one-pixel missing-grid-coverage
  fixture; desktop 1280×720 and mobile 390×844 HTML harness views with the
  bundled Nanum Pen Script font loaded.
- Expected at normal size: 18px Korean remains readable at absorption 100;
  28px and 52px keep a visibly soft/fibrous halo without reading as a uniformly
  blurred glyph. Absorption 42 keeps its accepted mix. Direct writing,
  transported Density, mean-density loss, and shading narrowing are unchanged.
- Observed: the previous coverage equation used `materialMix = 1` at absorption
  100, so original Contact contribution became exactly zero. The only remaining
  shape was the page mask downsampled to at most 320×240, advanced for 18 Surface
  steps, and smoothed back to the page; the user-supplied 18px example was nearly
  illegible and the 52px example still looked like blur. Schema 4 now authors
  `minimumContactRetention = 0.54` and resolves coverage as the maximum of the
  previous mix and `Contact alpha × retention`. Fresh desktop and mobile
  browser checks kept the 18px text readable with zero console warnings/errors;
  28px/52px preserved outward softness. The absorption-42 crisp share is
  `0.5498167344`, which is already above the floor, so its prior equation and
  byte result remain authoritative.
- Physical evidence: writing on porous paper is capillary spreading whose front
  and line width depend on paper/ink properties, not a Gaussian replacement of
  the deposited line ([Kim et al., 2011](https://doi.org/10.1103/PhysRevLett.107.264501)).
  Deeper penetration can reduce surface optical density and saturation
  ([Li et al., 2015](https://bioresources.cnr.ncsu.edu/resources/ink-penetration-of-uncoated-inkjet-paper-and-impact-on-printing-quality/));
  that remains modeled by the independent mean-density loss rather than by
  erasing Contact geometry.
- Why it failed, if applicable: the former linear mix treated Surface coverage
  as a replacement for Contact coverage at its maximum instead of an outward
  material response with retained deposited pigment. Fixed solver resolution
  made that ownership error catastrophic at small font sizes.
- Discarded assumption: absorption 100 should mean 100% of Optical coverage
  comes from the wet-grid candidate.
- Preserved evidence: `ordinary-green@1` through `ordinary-green@5` and their
  canonical pins, all r6 signed-mass transport and direct-state hashes, the A2
  fixed normalization reference, fibre diffusion coefficients, RGB/alpha
  endpoints, and the absorption-42 baseline mix.
- Next different method: resume Surface layer-ownership extraction and define
  distinct smooth/middle/absorbent recipes. Do not add blur, shifted glyphs, or
  font-size-dependent paper rules; revisit the `0.54` floor only as an A2 if a
  normal-size comparison demonstrates a concrete retention defect.

## E-009-surface-coverage-ownership / A1

- Parent: `E-008-high-absorption-contact-retention / A1`
- Engine model: `ordinary-js-r7`
- Recipe schema: `4`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: Contact/candidate mixing and minimum Contact retention are Surface
  policy, not Density or Optical policy. Moving the accepted equation into one
  Surface operator should preserve final ordinary RGBA while exposing the
  candidate and resolved coverage as different diagnostic facts.
- Explicit inputs and seed: immutable `ordinary-green-r6`; existing renderer
  fixtures at absorption 0/42/100; explicit Surface seed `0x13579bdf`; HTML
  diagnostics at the current bundled font and desktop/mobile viewports.
- Expected at normal size: default, smooth, and maximum-absorption writing look
  unchanged. Surface diagnostics show physical candidate separately from final
  resolved coverage. Optical receives a ready Float32 coverage plane and no
  longer reconstructs Surface mix or retention.
- Observed: the Surface operator now returns a full-resolution Float32 coverage
  plane and Optical receives it as a required input. A regression recomputes the
  previous inline equation at absorption 0/42/100 and obtains byte-identical
  final RGBA. Engine 80/80, package/build and the HTML harness gate pass. A fresh
  diagnostics browser view showed physical candidate, resolved coverage, and
  transported ratio separately; M/18px/absorption-100 remained readable with
  no console warnings or errors.
- Why it failed, if applicable: not applicable yet.
- Discarded assumption: Density/Optical must know how an absorbent Surface
  combines deposited Contact with its fibre-spread candidate.
- Preserved evidence or code: r7 formula order and recipe values; no new visual
  tuning, solver step, transport rule, RGB, alpha endpoint, or direct-pad change.
- Next different method: keep the equation fixed and finish the remaining layer
  boundaries: Density should expose normalized concentration, then Optical
  should own only concentration-to-color/alpha. Measure the added full-page
  Float32 plane in the P6 browser/DPR performance matrix before r1.

## E-010-density-optical-ownership / A1

- Parent: `E-009-surface-coverage-ownership / A1`
- Engine model: `ordinary-js-r7`
- Recipe schema: `4`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: Density can end at a normalized concentration plane and Optical
  can map only concentration plus resolved coverage to recipe RGB/alpha without
  changing the accepted ordinary result.
- Explicit inputs and seed: immutable `ordinary-green-r6`; existing renderer
  fixtures at absorption 0/42/100; Contact and Surface seeds recorded by their
  parent experiments; HTML diagnostics at the bundled font.
- Expected at normal size: the paper result remains unchanged. Diagnostics add
  normalized concentration beside signed variation. Optical accepts no glyph,
  flow, absorption, Surface candidate, or transport input.
- Observed: Density returns a full-resolution Float32 normalized concentration
  plane and Optical receives only that plane, resolved coverage, and recipe
  RGB/alpha. The absorption 0/42/100 legacy-equation regression remains
  byte-identical. Engine 83/83, 36 modules, 9 public entry points, 49-file pack,
  and the HTML harness gate pass. Fresh diagnostics displayed signed variation
  beside normalized concentration; M/18px/Surface-100 and the final Optical card
  rendered with zero console warnings or errors.
- Why it failed, if applicable: not applicable yet.
- Discarded assumption: the operator that computes glyph variation must also
  own color, calibrated alpha endpoints, and RGBA scratch-buffer behavior.
- Preserved evidence or code: r7 calculation order, all recipe values, Surface
  coverage/transport, Contact geometry, direct writing and final RGBA.
- Next different method: remove the remaining absorption-owned density-range
  response from Contact so Surface owns density preservation completely. Then
  finish GlyphContact aperture/ratio contracts before introducing new colors.

## E-011-surface-density-preservation-ownership / A1

- Parent: `E-010-density-optical-ownership / A1`
- Engine model: `ordinary-js-r7`
- Recipe schema: `4`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: absorption-dependent density preservation is Surface policy;
  Contact should provide only nib shading multiplier and geometry.
- Expected at normal size: no visual change and exact existing nib/Surface
  density ranges.
- Observed: `getSurfaceDensityRange` owns the absorption curve; Density combines
  it with Contact's multiplier and existing cap. Engine 84/84 and the complete
  HTML harness gate pass, including the prior RGBA equation regression.
- Discarded assumption: Contact needs a recipe and paper absorption to describe
  a nib.
- Preserved evidence or code: all r7 values, recipes, Surface coverage and
  transport, normalized concentration, Optical RGBA, and direct writing.
- Next different method: finish GlyphContact mask-ratio and counter-aperture
  contracts, then start ordinary color recipes.

## E-012-glyph-contact-mask-contract / A1-A2

- Parent: `E-011-surface-density-preservation-ownership / A1`
- Engine model: `ordinary-js-r7`
- Recipe schema: `4`
- Fixture manifest: `1`
- Status: passed after learned A1
- Hypothesis: final raster masks can prove nib-width order, counter survival and
  SU anisotropy without freezing a pixel golden.
- A1 observed: row/column run length confused long stroke length with stroke
  thickness, and alpha-greater-than-zero treated antialiasing tails as ink.
- Discarded assumption: a contiguous run is a stroke-width measurement.
- A2 method: alpha threshold 128, chamfer distance transform and centerline
  maxima for thickness; four-connected enclosed transparent regions for
  counters. The HTML harness rasterized `미음용품뿌리` with the bundled Nanum
  Pen Script at 18/28/52px and DPR2 using explicit glyph seeds.
- A2 observed: UEF→EB median widths were nondecreasing at all sizes, all round
  nibs retained at least nine reference counters, and SU had greater horizontal
  expansion without excess vertical growth. The smallest 18px EB counter was
  one device pixel, so it passes but remains an explicit safety edge.
- Preserved evidence or code: no glyph geometry, font, recipe, Surface, Density,
  Optical or final pixels changed. Only measurement and fail-closed contracts
  were added.
- Next different method: ordinary color recipes may now begin; punctuation and
  DPR1/3 extend this Contact matrix during P4/P6 hardening.

## E-013-ordinary-density-color-curves / A1

- Parent: `E-012-glyph-contact-mask-contract / A2`
- Engine model: `ordinary-js-r8`
- Recipe schema: `5`
- Fixture manifest: `1`
- Status: passed
- Hypothesis: ordinary dye inks can share one Contact, Density, Surface and
  alpha calculation while an authored low/middle/high Density-to-RGB curve
  gives each ink a recognisable color character. This should read as dilute
  versus concentrated dye, not as a flat hue rotation or a specialty effect.
- Explicit inputs and seed: `ordinary-green@7` control plus
  `ordinary-blue-black@1`, `ordinary-burgundy@1`, and `ordinary-teal@1`; the
  existing deterministic glyph and Surface seeds; Korean reference sentence;
  M/28px/flow-58/absorption-42, M/18px/absorption-100, and
  EB/52px/absorption-0 in the bundled-font HTML harness.
- Expected at normal size: green stays byte-identical to the accepted fixed-RGB
  control. Blue-black moves slate-blue to navy-black, burgundy dusty mauve to
  plum-wine, and teal sea-glass to dark teal as Density rises. Geometry,
  normalized concentration, Surface coverage and alpha remain identical for
  the same material input.
- Observed: all four recipes retain identical Contact, signed Density,
  normalized concentration, Surface candidate/resolved coverage and Optical
  alpha. Their final RGB differs, with exact authored colors at concentration
  0/0.5/1 and linear channel interpolation between points. Green r8 output is
  byte-identical to the prior r7 fixed-RGB equation. Normal M/28 and broad
  EB/52 made the intended within-stroke color change visible; all three new
  inks remained readable at 18px/maximum absorption. The HTML selector exposes
  a text name and non-color description, and the direct-input pad uses matching
  ordinary color coefficients without changing water/mobile/fixed state or
  alpha. Browser console warnings/errors were zero.
- Why it failed, if applicable: not applicable in A1.
- Discarded assumption: an ordinary ink recipe needs one fixed RGB triplet, or
  that additional ink colors should be made by rotating every pixel's hue.
- Preserved evidence or code: all green r1-r6 canonical pins, all Contact,
  Density and Surface equations, green direct-state hashes, alpha endpoints,
  glyph seeds, layout, IME ownership, and specialty-ink exclusions.
- Next different method: author independent smooth/middle/absorbent Surface
  recipes. Color curves remain an Optical axis; future dual shading, sheen and
  shimmer require separate material component state rather than more curve
  points.

## E-014-independent-paper-surface-recipes / A1

- Parent: `E-013-ordinary-density-color-curves / A1`
- Engine model: `ordinary-js-r9`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r1 / 1`
- Fixture manifest: `2`
- Status: passed
- Hypothesis: paper is not one blur-like absorption scalar. Independent
  vertical uptake, lateral mobility, dye affinity, surface retention, film
  preservation and roughness axes can produce smooth, balanced and absorbent
  papers while ink color and nib geometry remain independent.
- Research basis: Li et al. distinguish sizing, porosity, penetration depth and
  surface optical density in uncoated paper
  (<https://bioresources.cnr.ncsu.edu/resources/ink-penetration-of-uncoated-inkjet-paper-and-impact-on-printing-quality/>);
  Daniel and Berg separate lateral spreading from penetration
  (<https://pubmed.ncbi.nlm.nih.gov/16814240/>); Kim et al. show that written
  line width couples motion with ink and paper properties
  (<https://pubmed.ncbi.nlm.nih.gov/22243158/>).
- Expected at normal size: smooth keeps crisp Contact and the widest shading;
  balanced is byte-identical to the accepted absorption-42 result; absorbent
  lowers mean density and shading while limiting lateral spread so 18px text
  remains readable instead of becoming an isotropic blur.
- Observed: balanced Surface coverage keeps the prior
  `2bee8374...adc41` SHA and direct water/mobile/fixed state byte-exact. The
  harness sends the same explicit Surface recipe to keyboard and direct-input
  paths. Engine 98/98, harness, package and browser checks pass. Desktop M/28
  and mobile M/18 absorbent text remained legible with no console warnings.
- Preserved evidence or code: Contact geometry, glyph Density accidents,
  Surface seed, ordinary RGB curves, alpha endpoints and all historical ink
  recipe pins. Ink schema 6 removes paper policy; fixture manifest 2 records
  ink and Surface identities independently while v1 remains archival.
- Next different method: measure the three papers across nib/size/DPR and tune
  only a new Surface revision if a concrete normal-size defect appears. Do not
  restore a scalar absorption slider or add blur/shadow passes.

## E-015-absorbent-paper-visual-audit / A1

- Parent: `E-014-independent-paper-surface-recipes / A1`
- Engine model: `ordinary-js-r9` (observation only; no calculation change)
- Surface model/schema: `paper-surface-js-r1 / 1`
- Status: learned
- Hypothesis: separating `verticalUptake` from `lateralMobility` and retaining
  60% of Contact is sufficient for `paper-absorbent@1` to read as real
  absorbent paper instead of a blurred glyph at normal text sizes.
- Evidence: real fountain-pen examples show a wider core plus uneven woolly
  edges or sparse fibre-connected feathers, while depth penetration separately
  lowers surface optical density and may bleed through. The 20px B harness
  result instead reads as a uniformly defocused small glyph.
- Observed calculation: a 40-device-pixel glyph becomes about 8.1 cells on the
  capped 320-wide Surface grid, runs 16 steps, then is enlarged about 4.93x.
  `verticalUptake=0.86` also raises page-Y water diffusion rather than moving
  liquid into a paper-depth state. Surface mix is about 87.0% before the 60%
  retained-Contact floor.
- Why it failed: depth absorption and page-plane diffusion are not independent
  states in r1. Coarse downsample/diffuse/upsample produces low-frequency blur
  before the page-anchored fibre field can read as a sparse edge phenomenon.
- Discarded assumption: a different scalar on page-X versus page-Y diffusion
  is enough to represent lateral mobility versus vertical paper uptake.
- Preserved evidence or code: `paper-smooth@1`, byte-equivalent
  `paper-balanced@1`, all registered pins, ink recipes, nib geometry, literal
  text and the explicit ink/Surface identity split remain valid.
- Next different method: do not gain-tune r1. Add a versioned paper-depth sink
  or subsurface state, keep page-plane mobility in both screen axes, and derive
  bounded sparse connected feathering at Contact edges. Gate core acutance,
  line-width gain, feather reach and counter survival separately at
  18/20/28/52px.

## E-016-absorbent-paper-depth-uptake / A1

- Parent: `E-015-absorbent-paper-visual-audit / A1`
- Engine model: `ordinary-js-r10`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r2 / 2`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: high paper uptake should remove water and mobile pigment into a
  local paper-depth state, while a separate low lateral mobility controls both
  page-plane axes. That separation should preserve a readable Contact core at
  B/20px without making depth uptake look like a whole-glyph blur.
- Explicit inputs and seed: `ordinary-green@9`, `paper-absorbent@2`, B/20px and
  B/48px, flow 58, Surface seed `0x13579bdf`, bundled Nanum Pen Script and DPR2;
  desktop and 390×844 mobile harness; direct-input M/flow58 absorbent smoke.
- Expected at normal size: the 20px Korean sentence remains legible; the 48px
  result keeps a solid center and only restrained edge softness. Increasing
  depth uptake without changing lateral mobility must not enlarge page-plane
  geometry. Smooth and balanced r1 recipes must retain their legacy path.
- Observed: Surface r2 replaces `verticalUptake` with `depthUptake` and stores
  removed pigment in a lazy subsurface Float32 plane. Both screen axes now use
  `lateralMobility`; coverage resolution uses lateral mobility rather than depth.
  The renderer exposes 414 occupied depth-grid pixels and total subsurface
  pigment 3.05 for the B/20 fixture. At normal desktop and 390px mobile size,
  the sentence stays readable and no longer appears uniformly defocused; B/48
  retains a firm core. Direct writing accepted the same r2 recipe and produced a
  nonblank stroke with zero browser warnings/errors.
- Automated evidence: r2 geometry is invariant when only depth changes; local
  depth uptake creates no extra page spread; paper-depth state is finite and
  bounded; the renderer keeps Contact and confines the coarse Surface candidate.
  Engine 104/104, 59 source modules, 10 public entry points, 72-file package and
  the complete HTML harness gate pass.
- Why it failed, if applicable: not applicable for A1. The prior r1 failure was
  caused by treating depth uptake as page-Y diffusion on an approximately
  eight-cell-small glyph.
- Discarded assumption: high absorption must be represented by stronger 2D
  diffusion or a softer whole-glyph coverage field.
- Preserved evidence or code: `paper-smooth@1`, `paper-balanced@1`, historical
  `paper-absorbent@1`, all their pins, ink r1-r8 recipes, Contact geometry,
  Density/Optical equations, Surface seed, fixed normalization, minimum Contact
  retention and literal text ownership. No blur, shadow or duplicate pass was
  added.
- Next different method: keep this checkpoint unless normal-size evidence shows
  the remaining edge is too uniform. If it does, add a high-resolution sparse
  fibre-edge operator whose reach and occupancy are measured separately; do not
  increase r2 coarse-grid diffusion. Reverse-side bleed-through and layered
  paper depth remain separate future states.

## E-017-paper-feather-order-and-fibre-edge / A1

- Parent: `E-016-absorbent-paper-depth-uptake / A1`
- Engine model: `ordinary-js-r11`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r3 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: the visible paper ladder should not show balanced paper as more
  laterally spread than absorbent paper. Balanced may keep a restrained,
  continuous settling edge; absorbent must keep a readable core while exposing
  a larger but sparse, fibre-connected exterior response rather than whole-glyph
  blur.
- Explicit inputs and seed: active four ordinary inks, `paper-balanced@2`,
  `paper-absorbent@3`, the existing explicit glyph and Surface seeds, bundled
  Nanum Pen Script; M/48 desktop and B/20 at 390×844 mobile, flow 58.
- Observed defect: balanced r1 reused `verticalUptake=0.42` as its page-plane
  geometry response, producing a material mix of about 45%. Absorbent r2 used
  the separated `lateralMobility=0.20`, producing about 23% mix plus an 82%
  Contact floor. The resulting visual order was inverted: balanced looked more
  continuously blurred while absorbent looked sharper.
- Change: `paper-balanced@2` preserves the r1 axes, step schedule, physical
  candidate and direct-input state, but changes keyboard coverage resolution
  from exponent 0.92 to 2.15 with a 72% Contact floor. `paper-absorbent@3`
  preserves r2 depth and coarse mobility, then adds a full-resolution
  deterministic fibre alpha plane with 1.75 CSS-pixel reach, 45% sparse edge
  occupancy and 62%
  first-branch strength. Fibres start from real Contact, remain connected,
  cannot enter enclosed counters, and are composed by Surface as coverage—not
  blur, shadow, outline, or a duplicate glyph.
- Automated evidence: active absorbent material mix is greater than active
  balanced mix; at the same Contact fixture absorbent has strictly more visible
  exterior coverage; Contact and Density planes remain exact; fibre output is
  deterministic, seed-sensitive, sparse, bounded and counter-safe. Balanced r2
  direct-input water/mobile/fixed state remains exact with balanced r1. All 112
  engine tests and the complete HTML harness gate pass.
- Browser evidence: fresh-cache M/48 desktop and B/20 390px mobile comparisons
  show a calmer balanced edge and a readable absorbent core with irregular
  exterior fibres. Console warnings/errors are zero.
- Why it failed, if applicable: the first comparison mixed a legacy r1 balanced
  recipe with a separated r2 absorbent recipe, so the labels did not share the
  same depth-versus-lateral interpretation.
- Preserved evidence or code: all historical Surface and ink recipe pins,
  direct-input equations, Contact geometry, Density transport, optical color
  curves, explicit seeds, literal text and IME ownership.
- Next different method: quantify the sparse edge at DPR1/2/3 and profile its
  full-resolution one-byte plane. Do not increase coarse-grid diffusion if the
  fibres need later visual tuning.

## E-018-fibre-edge-dpr-and-frontier-cost / A1

- Parent: `E-017-paper-feather-order-and-fibre-edge / A1`
- Engine model: `ordinary-js-r12`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: the absorbent fibre edge can keep the accepted DPR2 appearance,
  comparable CSS-space reach and coverage at DPR1/3, and lower cost if it
  follows only active Contact/frontier pixels instead of scanning the complete
  local region once for every reach step.
- Explicit inputs and seed: `ordinary-green@11`, `paper-absorbent@4`, Surface
  seed `0x13579bdf`; synthetic 790×610 CSS paper at 18/28/52px and raster scales
  1/2/3; a counter fixture at all three scales. The HTML diagnostics route
  accepts an explicit `dpr=1|2|3` only when `diagnostics=1`; normal UI remains
  capped at its previous DPR2 behavior.
- Expected: DPR2 is unchanged; DPR1/3 fibre reach remains 1.5–2.1 CSS pixels and
  integrated alpha area stays within 12% of DPR2. Archived
  `paper-absorbent@3` remains byte-identical. A 28px synthetic render should be
  materially faster at every scale without another full-page retained plane.
- Observed: the scaled counter fixture measured CSS reach 2.0/2.0/1.67 and
  integrated alpha area 10.11/9.46/9.90 at DPR1/2/3. Historical r3 output was
  byte-identical to the pre-change implementation at all three scales. The
  one-byte fibre output remains exactly width×height: 481,900 / 1,927,600 /
  4,337,100 bytes for the 790×610 benchmark.
- Performance evidence: before the sparse frontier, 28px p50 was
  10.99/67.71/183.43ms at DPR1/2/3. After it, the same benchmark measured
  2.37/8.98/20.95ms. The complete 18/28/52 matrix is reproducible with
  `npm run bench:fiber`. These are warm Node measurements, not a committed
  browser/device frame budget.
- Automated evidence: active r4 DPR reach/coverage, r3 exact historical sums,
  counter exclusion, deterministic connectivity, direct solver r3/r4 equality,
  active recipe coefficient equality, public export/version/identity pins,
  and diagnostics-only raster override all pass. Engine 117/117 and the full
  HTML harness gate pass.
- Browser evidence: desktop M/18, M/28 and M/52 absorbent previews were checked
  at forced raster DPR1/2/3. The main canvas measured 788×608, 1576×1216 and
  2364×1824 while retaining the same CSS size. A 390×844 B/18 absorbent fixture
  at DPR3 measured 1047×1164 for a 349×388 CSS canvas and remained readable.
  Diagnostic fibre counts were nonzero at every scale and console warnings and
  errors were zero.
- Why it failed, if applicable: not applicable. The prior implementation was
  correct at DPR2 but paid for many pixels that could not become frontier and
  authored fibre alpha in device-pixel rather than CSS-space units.
- Discarded assumption: a small nominal CSS reach makes repeated full-region
  scans cheap at DPR3, or one device-pixel alpha calibration represents the
  same visible fibre on every raster scale.
- Preserved evidence or code: all r1-r3 Surface pins, r3 pixels, DPR2 r4 pixels,
  paper axes, reach/occupancy/strength, Contact/counter rules, coarse Surface
  solver, Density transport, Optical projection, direct-input state, text/IME
  ownership and default production raster cap.
- Next different method: perform the real bundled-font/browser matrix at
  DPR1/2/3, 18/28/52px and 320–1440px viewports, then set a browser frame and
  rapid-append backlog budget. Do not tune fibre gains unless normal-size
  evidence shows a concrete visual defect.

## E-019-synchronous-preview-frame-budget / A1

- Parent: `E-018-fibre-edge-dpr-and-frontier-cost / A1`
- Engine model: `ordinary-js-r12` (observation only; no material change)
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: learned
- Hypothesis: the existing synchronous full-material preview can keep the
  native textarea responsive if redraw requests are coalesced to one latest
  rAF, even at the current DPR2 production cap.
- Measurement operator: the HTML harness adds `perf=1`, independent from the
  four-stage diagnostics UI. It times from preview paint entry through final
  `putImageData`, excludes diagnostic-card drawing, keeps a bounded 32-sample
  nearest-rank window, and reports requested/painted/coalesced frames, maximum
  pending frames, final text length and raster dimensions. The default route
  passes no timing callback and performs no second solve.
- Explicit inputs: bundled Nanum Pen Script; ordinary-green@11;
  paper-absorbent@4; M/18, M/28 and M/52; flow toggled 57/58 for ten settled
  samples; 788×608 CSS paper; forced DPR1/2/3; current Codex in-app browser.
- Expected: maximum pending frame is 1, final text/raster reflects the latest
  input, and main-thread preview p95 is at most 33ms. A one-shot 80-grapheme
  DPR2 replacement should complete the latest paint without stale output.
- Observed p50/p95 milliseconds:
  - 18px: DPR1 44.2/74.4, DPR2 68.9/129.7, DPR3 137.1/175.3.
  - 28px: DPR1 48.8/84.2, DPR2 79.3/110.0, DPR3 138.7/178.1.
  - 52px: DPR1 53.9/92.4, DPR2 91.4/147.4, DPR3 157.0/210.1.
  - 80-grapheme DPR2 replacement: latest paint 164.8ms, final textarea and
    render length 80, maximum pending frame 1.
- Why it failed: rAF coalescing prevents an unbounded queue but does not reduce
  the cost of the one surviving frame. Every committed edit still rebuilds the
  full-page Contact masks, Density planes, wet Surface solve, resolved coverage,
  concentration and Optical RGBA synchronously on the main thread. DPR2 p95 is
  up to 147.4ms, far above the 33ms interactive target.
- Passed sub-contract: all observed scenarios kept `maximumPendingFrames=1`,
  the last frame described the latest literal text and dimensions, the
  performance observer did not create a second solve or React state loop, and
  browser console warnings/errors were zero.
- Discarded assumption: latest-only scheduling alone makes a heavy synchronous
  settled-material renderer interactive, or the final settled image must block
  the same frame that accepts literal text.
- Preserved evidence or code: all engine pixels, recipes, seeds, Surface
  operators, default DPR cap, native textarea/IME ownership, diagnostics, and
  historical performance measurements. No material version changes.
- Next different method: split temporal presentation. Render immediate Contact
  feedback inside a 16.7–33ms main-thread budget, send settled Surface work to a
  worker/off-main path with latest-result cancellation, and replace the preview
  only when the result signature still matches. Cache flow-only Optical changes
  separately because they must not recompute Contact, Density or Surface.

## E-020-contact-first-worker-settle / A1

- Parent: `E-019-synchronous-preview-frame-budget / A1`
- Engine model: `ordinary-js-r12` (presentation experiment; no numeric change)
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: learned
- Hypothesis: drawing Contact immediately and running the unchanged high-level
  renderer in one OffscreenCanvas Worker can preserve the final result while
  moving settled material work off the input thread.
- Observed: DPR2 M/28 Contact p95 fell to 30.7ms and only one settle remained
  pending, but the OffscreenCanvas worker path used a different Canvas
  downsample/upsample implementation boundary from the accepted HTMLCanvas
  renderer. Its first settle latency was 339.6ms with 296.5ms reported inside
  the Worker, and browser-region bytes could not be accepted as exact evidence.
- Why it failed: moving Canvas raster resampling into a Worker also moved a
  host-dependent presentation operator. That changed more than scheduling and
  made the liked final pixels harder to prove equivalent.
- Discarded assumption: HTMLCanvas and OffscreenCanvas resampling are an
  interchangeable deterministic material operator across the supported browser
  boundary.
- Preserved evidence or code: the contact-colored immediate frame, latest-only
  cancellation, telemetry fields, native textarea/IME ownership, all material
  recipes and the synchronous renderer.
- Next different method: keep Canvas downsample and upsample on the main browser
  surface, expose a staged engine API, and move only deterministic typed-array
  Density/Surface/Optical calculations into the Worker.

## E-020-contact-first-worker-settle / A2

- Parent: `E-020-contact-first-worker-settle / A1`
- Engine model: `ordinary-js-r12` (API/scheduling only; no numeric change)
- Package: `0.17.0-experimental.1`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: the existing renderer can be split at its Canvas/pure-calculation
  boundaries so Contact appears within 33ms for normal text, the final result is
  byte-exact, and only the newest settle may replace the preview.
- Change: `prepareOrdinaryInkCanvasInput` performs the accepted HTMLCanvas mask
  read/downsample; `beginOrdinaryInkMaterial` computes glyph Density, compact wet
  Surface state and fibre coverage in the Worker; the main thread performs only
  the accepted coverage upsample; `completeOrdinaryInkMaterial` resolves Surface,
  concentration and Optical back in the same Worker. The high-level synchronous
  renderer calls these same stages. New input terminates the active Worker, and
  a 192-entry LRU reuses unchanged literal/font/scale/geometry Contact masks.
- Automated evidence: the staged and synchronous renderer have exact final RGBA,
  resolved coverage and normalized concentration; all historical material tests
  remain unchanged. Worker source imports only public package exports, has no
  OffscreenCanvas/material equation copy, and telemetry proves at most one
  pending frame and settle. Engine 119/119 and the complete harness gate pass.
- Browser evidence, 23 graphemes on a 788×608 CSS paper:
  - 18px Contact p95: 15.7 / 23.7 / 28.5ms at DPR1 / DPR2 / DPR3.
  - 28px Contact p95: 15.8 / 16.9 / 21.1ms.
  - 52px Contact p95: 14.6 / 18.9 / 22.9ms.
  - settle latency across the measured runs: 80.6–196.7ms. Typed-array work ran
    in the Worker; the exact host-Canvas bridge was 3.1/11.8/22.3ms at DPR1/2/3.
    Maximum pending frame and settle were both 1.
  - rapid 20→40→60→80 grapheme growth at DPR3 ended on literal length 80 with
    Contact p95 21.0ms, one final settle, four cancelled stale settles and no
    stale result. A cold one-shot 80-grapheme replacement remains 58.7ms.
- Preserved evidence or code: every r12/ink/Surface recipe and seed, Canvas
  smoothing order, Contact/Density/Surface/Optical equations, final pixel result,
  diagnostics sync route, direct-input path and default DPR cap.
- Known limit: the immediate frame is intentionally contact-colored rather than
  fully shaded; Chromium is the only Worker/Canvas runtime checked here. A cold
  maximum-length paste misses 33ms, and the 80–197ms visual settle is not a
  completed device/browser latency budget.
- Next different method: validate WebKit/Firefox and cold-paste behavior. If cold
  paste must meet 33ms, chunk only new Contact rasterization across frames while
  the native textarea remains immediate; do not weaken material physics or
  reduce final raster scale to hide the cost.

## E-021-cold-paste-contact-budget / A1

- Parent: `E-020-contact-first-worker-settle / A2`
- Engine model: `ordinary-js-r12` (presentation experiment; no numeric change)
- Package: `0.17.0-experimental.1`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: cold maximum-length paste can keep every main-thread Contact frame
  below 33ms by yielding only new glyph rasterization across animation frames,
  while preserving the same final Contact order and the one latest-only Worker
  settle.
- Measurement before change: for 80 distinct bundled-font Hangul graphemes at
  DPR1/2/3, one synchronous Contact build took 50.8/54.0/126.0ms. New glyph
  rasterization alone took 45.6/46.1/112.3ms; layout was at most 1.4ms. A
  14-grapheme repeating 80-character input already took only 12.2/16.3/21.2ms
  because the accepted Contact cache reused 66 masks.
- Change: the HTML client keeps layout, literal textarea ownership and the same
  glyph order, but processes uncached Contact entries until an authored 8ms
  frame budget is reached. It paints the accumulated Contact mask, yields with
  `requestAnimationFrame`, and starts the existing staged Worker settle only
  after every glyph Contact is present. A new input cancels the pending chunk
  generation before it can start a stale settle. No engine equation, recipe,
  seed, raster scale or Worker material stage changed.
- Browser evidence: 80 distinct graphemes produced DPR1/2/3 Contact frame p95
  12.2/16.8/18.5ms. Full Contact completion took 116.6/107.4/121.6ms, after
  which the unchanged settle completed. A DPR3 A→B 80-grapheme replacement
  kept frame p95 at 20.0ms, completed only B, reported one pending frame/build/
  settle maximum, cancelled the stale work and produced one final settle. The
  native textarea and accessible canvas description held the final literal 80
  graphemes. Chromium visual inspection showed a readable settled result.
- Known limit: the page Contact appears progressively during a cold paste; full
  completion is not a 33ms promise. WebKit, Firefox and physical-device timing
  remain unmeasured because those runtimes are not installed in this workspace.
- Roadmap correction: E-019–E-021 were cross-cutting input blockers discovered
  during the HTML benchmark, not evidence that P5 was completed or that P6 may
  continue out of order.
- Next different method: stop browser-performance expansion here and return to
  the unchecked P2 layer/version invariants before P4/P5 work. Preserve the
  WebKit/Firefox/device matrix as an explicit later P6 backlog.

## E-022-deterministic-field-signatures / A1

- Parent: `E-021-cold-paste-contact-budget / A1`
- Engine model: `ordinary-js-r12` (observation API only; no numeric change)
- Package: `0.18.0-experimental.1`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2` (shape unchanged)
- Status: passed checkpoint
- Hypothesis: identical versioned material inputs can produce portable named
  field signatures without pretending that a translated page field is the same
  thing as a glyph identity.
- Change: `createFieldSignature` accepts one exact plain field record with a
  domain, typed-array type, dimensions and channel count. It streams canonical
  little-endian bytes into the versioned `fnv1a64-le-v1` change detector and
  returns immutable JSON-safe metadata. The helper rejects accessors,
  unsupported arrays, invalid lengths and non-finite Float32 values. It is not
  a cryptographic authenticity hash and is not called on the live render path.
- Automated evidence: two independent active r12 renders pin identical hashes
  for Contact `992bda01b1d165b2`, Density variation `838bf8cd73b9a7ff`, sample
  count `a59a04e5edb1e707`, resolved Surface `27e893b169caec6f`, normalized
  concentration `73c9ab35c0b5decf` and Optical RGBA `bdeadcc44a08086a`. Type,
  shape, domain or one changed value changes the signature. Equivalent
  typed-array views match without input mutation.
- Spatial contract: translating the same Contact support, seed and CSS phase
  anchor together preserves the glyph-local Density signature. Its full page
  signature intentionally changes because placement is a material input.
  Font-size changes may alter Contact geometry but must not invent a new
  committed cadence seed.
- Preserved evidence or code: all r12 calculations, ink/Surface recipes,
  renderer order, harness presentation and fixture-manifest shape. No visual or
  numeric output changed.
- Known limit: fixture-manifest v2 still does not structurally require font
  identity, segmented graphemes, per-glyph seeds, layout facts or these
  signatures; that broader replay manifest remains a later hardening item.
- Next different method: finish the last reachable P2 invariant with a bounded
  nib/ink/Surface matrix for finite fields, valid RGBA, nonblank output and
  explicit allocation lengths. Optional specialty components remain dependent
  on P5 and are not falsely marked complete.

## E-023-active-material-validity-matrix / A1

- Parent: `E-022-deterministic-field-signatures / A1`
- Engine model: `ordinary-js-r12` (test expansion; no numeric change)
- Package: `0.18.0-experimental.1`
- Ink recipe schema: `6`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: every currently selectable ordinary material combination can
  satisfy the same finite/range/nonblank/retained-memory contract instead of
  relying on one default M/green/balanced fixture.
- Matrix: UEF/EF/F/M/B/EB/SU × green/blue-black/burgundy/teal ×
  smooth/balanced/absorbent × flow 0/58/100, for 252 deterministic renders of
  one nonblank Contact mask and explicit seeds.
- Automated evidence: Contact and Optical RGBA, Density variation/count and
  concentration, resolved Surface coverage, optional candidate/fibre planes,
  density transport and paper-depth fields all have exact declared lengths.
  Numeric planes stay finite and within their authored units. Signed numerator
  magnitude never exceeds its positive pigment carrier. Every case retains
  visible Contact, resolved coverage and final alpha.
- Memory boundary: unique buffers retained by the four diagnostic stages must
  stay within `32 × pagePixels + 16 × maximumSurfaceGridCells`. Existing
  allocation-before-validation and maximum-grid tests continue to cover peak
  solver allocation separately.
- Preserved evidence or code: no runtime source, recipe, version, renderer,
  harness or pixel changed; this experiment adds a cross-product regression
  only.
- P2 status: every calculation-independent invariant is now closed. The one
  remaining optional-component-off item cannot be evaluated honestly before
  P5 introduces independent specialty components, so it remains unchecked as
  an explicit dependency rather than a skipped task.
- Next different method: return to the unchecked P4 specialty contact work,
  choose one real Italic/Stub/Music/Architect operator with measurable geometry,
  then begin P5 specialty ink components in order.

## E-024-cross-music-contact / A1

- Parent: `E-023-active-material-validity-matrix / A1`
- Engine model: `ordinary-js-r13`
- Package: `0.19.0-experimental.1`
- Ink recipe schema: `6`
- Contact catalog: `fountain-nib-catalog-r2`
- Surface model/schema: `paper-surface-js-r4 / 3`
- Fixture manifest: `2`
- Status: passed checkpoint
- Hypothesis: one fixed inverse-anisotropic Contact can create a recognizably
  different special-nib signature for typed Korean without duplicating a glyph,
  inventing pressure, or calling ordinary blur a nib effect.
- Physical direction evidence: Sailor describes its official
  [Cross Music](https://sailor.co.jp/product/10-7721/) as a broad double-layer
  nib that writes thin vertical and broad horizontal lines. Montblanc's
  [Curved nib service description](https://www.montblanc.com/en-us/customer-service-rna/care-services/writing-instruments.html?ecid=sem_G_Writing+Instruments_+montblanc+pens)
  independently documents the same horizontal-broad/vertical-thin direction
  at one held angle. Fountain uses only that causal direction, not either
  product's identity or full mechanics.
- Authored operator: `CM` is explicitly Cross-Music-inspired. Its fixed
  keyboard Contact uses an F-like x-axis target and EB-like y-axis target, the
  inverse of SU. Both run signed anisotropic morphology over one final glyph
  alpha mask. There is no shifted pass, duplicate shadow, glyph scaling,
  inferred stroke order, pressure, or live hold angle. The direct physics lab
  uses one fixed virtual contact angle perpendicular to SU; it does not model
  the real double nib or feed reserve.
- Version boundary: catalog r1 and every r12 recipe remain registered archival
  bytes. Active green@12, blue-black@6, burgundy@6 and teal@6 preserve all
  material coefficients while selecting catalog r2. Existing seven nib
  geometries and the default M field signatures remain unchanged.
- Automated evidence: the bundled-font Contact contract includes CM at
  18/28/52px; its vertical-run gain over M must exceed its horizontal-run gain.
  All six reference glyphs must remain nonblank and retain at least 12% empty
  aperture inside their thresholded ink bounds. This replaces the invalid old
  assumption that every handwritten Korean aperture is a topologically closed
  counter. Synthetic tests prove CM and SU have opposite
  anisotropic signatures, and a Canvas adapter fixture proves both special nibs
  call `fillText` exactly once and never call the round-nib `strokeText` pass.
  CM joins the full 8 nib × 4 ink × 3 Surface × 3 flow
  matrix for 288 finite, bounded, nonblank renders. Recipe fingerprints,
  historical compatibility, flow independence, endpoint bounds and the
  existing direct no-angle fallback remain gated.
- Browser evidence: the HTML harness exposes CM as an eighth 44px-minimum
  control with an explicit inspired label. Desktop 48px SU/CM and mobile
  390×844 at 28px showed distinct axis character, readable Korean, a nonblank
  Canvas and zero console warnings/errors. This is named normal-size visual
  evidence, not a claim of exact real-pen reproduction or a permanent pixel
  golden.
- Learned: SU already covered ordinary stub-like vertical emphasis; adding a
  second stub or generic Music label would not add a new causal signature.
  Cross Music supplied a documented opposite direction that the current
  single-mask Contact layer can express honestly. Angle-dependent Zoom/Fude,
  pressure-dependent Flex and feed-reserve behavior remain separate future
  operators rather than hidden CM effects.
- Next different method: begin P5-A with one independent dye-component state
  for color separation/edge concentration. First prove that disabling the new
  component preserves the selected ordinary recipe exactly; then close the
  remaining P2 optional-component-off invariant.

## E-025-independent-dye-component-state / A1

- Parent: `E-024-cross-music-contact / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r1 / 1`
- Package: `0.20.0-experimental.1`
- Ink recipe schema: `6` (unchanged)
- Fixture manifest: `2`
- Status: passed structural checkpoint
- Hypothesis: visible dual shading should begin with separately conserved dye
  state, not an outline filter. A second dye can share the ordinary wet
  footprint while owning different mass, mobility and retention, and disabling
  it must preserve the chosen ordinary calculation exactly.
- Research evidence: a porous-paper study reports evaporation,
  chromatographic and filtration effects in liquid stains
  ([Chemical Engineering Science, 2015](https://www.sciencedirect.com/science/article/pii/S0009250915001232),
  DOI 10.1016/j.ces.2015.02.017). A primary inkjet study shows that different
  dye interactions with a porous matrix cause component separation
  ([ACS/PMC, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8515847/)).
  Fountain-pen ink analysis by HPLC identifies multiple main/minor dye
  components
  ([Forensic Science International, 2008](https://www.sciencedirect.com/science/article/pii/S0379073808002855),
  DOI 10.1016/j.forsciint.2008.06.008). These sources support separate state;
  they do not prescribe Fountain's authored coefficients.
- Authored state: `edge-dye-study@1` deposits `0.32` of the accepted base mass
  into its own mobile plane, applies `1.45×` mobility and `0.62×` retention,
  and transfers the same local share into a separate subsurface plane on
  depth-uptake paper. It reads the existing deterministic water/fibre field but
  never writes ordinary water, mobile pigment or fixed pigment.
- Automated evidence: component off allocates zero dedicated planes and keeps
  ordinary water/mobile/fixed/depth bytes exact. Component on is deterministic,
  finite and nonnegative; it reaches more solver cells and fixes a smaller mass
  share than the base pigment. Coverage, Density transport, paper depth and
  final ordinary RGBA stay exact. Invalid/accessor recipes fail before deposit
  mutation or component allocation. The component identity has an independent
  canonical serialization and rejects same-revision retuning.
- Harness boundary: `?diagnostics=1&dye-component=1` passes the public component
  recipe into the one synchronous material solve and shows mobile/fixed/depth
  totals inside the Surface card. The default page and direct-writing lab do
  not enable it.
- Learned: a physically plausible state exists, but its existence alone is not
  a visible color edge. No Optical color, outline, edge threshold or page-relative
  normalization was added, so P5-A's internal-vs-edge diagnostic and
  discontinuous edge accumulation remain open.
- Next different method: derive separate interior concentration and boundary
  enrichment diagnostics from base/component mass ratios. Only after those
  fields are stable should an Optical color curve be authored; never color the
  complete glyph boundary as a uniform outline.

## E-026-dye-enrichment-diagnostics / A1

- Parent: `E-025-independent-dye-component-state / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r2 / 1`
- Package: `0.21.0-experimental.1`
- Fixture manifest: `2`
- Status: passed diagnostic checkpoint
- Hypothesis: internal ink Density and chromatographic component enrichment
  must be inspectable as different fields before any second color is authored.
  Edge character should arise from a changed component share, not from
  repainting the geometric glyph boundary.
- Operator: for every solver cell with visible base or component mass,
  `visibleFraction = component / (base + component)`. The authored initial
  mixture is `massFraction / (1 + massFraction)`, and `fractionDelta` stores the
  signed difference. The fraction is bounded 0...1, the delta is bounded by
  that initial fraction, and unsupported empty cells remain zero. No page
  maximum, threshold, glyph outline or Optical RGB enters this calculation.
- Automated evidence: deterministic balanced and absorbent fixtures contain
  both enriched and depleted cells after transport. Every fraction/delta is
  finite and bounded. Reversing the complete signed glyph Density payload from
  +0.8 to -0.8 changes transported ordinary Density but leaves both enrichment
  planes exact. Flow 0 versus 100 changes normalized concentration and final
  ordinary alpha while the component fraction/delta remain exact. R1 canonical
  bytes remain archival; r2 has an independent registered identity.
- Harness evidence: the opt-in Surface card now displays mobile/fixed mass and
  relative enrichment on separate canvases, while the Density card continues
  to display normalized concentration. Both are passive views of one solve.
- Memory boundary: at the maximum 320×240 compact grid, four lazy component
  solver planes occupy 1,228,800 bytes. The copied mobile/fixed/depth plus two
  enrichment planes retain 1,536,000 bytes, for a component-specific peak of
  2,764,800 bytes while the state is created. Component off remains zero.
- Preserved result: ordinary water/pigment/coverage/concentration/RGBA, Surface
  recipes, contact geometry and direct writing are unchanged. There is still no
  second Optical color.
- Next different method: define an edge-accumulation candidate from positive
  fraction delta plus actual Surface support and local mass. The gate must
  reject a continuous glyph outline and require discontinuous, material-driven
  occupied segments before Optical color is attempted.

## E-027-discontinuous-edge-accumulation / A1

- Parent: `E-026-dye-enrichment-diagnostics / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r3 / 2`
- Package: `0.22.0-experimental.1`
- Fixture manifest: `2`
- Status: passed diagnostic checkpoint
- Hypothesis: a color-edge candidate should occupy only material-supported
  segments where the second dye is both enriched and visibly present. It must
  not repaint the complete geometric glyph boundary.
- Operator: `edge-dye-study@3` first keeps positive `fractionDelta`, then
  multiplies its bounded enrichment strength by a visible-mass response and a
  local exposure term derived from the center plus four-neighbor base-pigment
  maximum. Values below the authored fixed threshold are set to zero. The
  resulting Float32 plane remains bounded 0...1 and has no RGB/alpha meaning.
- Automated evidence: every occupied candidate cell is positively enriched
  and contains visible component mass. The compact balanced fixture has a
  nonzero candidate that is less than half of positive-enrichment support,
  reaches outside the original Contact, and covers less than half of the
  original Contact boundary. The absorbent fixture produces a different plane.
  Flow 0/100 and reversing signed glyph Density leave the candidate exact.
  Component on still leaves ordinary water, pigment, coverage, concentration
  and final RGBA exact; component off still allocates zero dedicated planes.
- Memory boundary: the maximum 320×240 component solver still owns four lazy
  planes (1,228,800 bytes). The returned mobile/fixed/depth/fraction/delta plus
  edge-candidate planes retain 1,843,200 bytes, for a component-specific peak
  of 3,072,000 bytes while the diagnostic state is created.
- Normal-size browser evidence: M/28, flow 58 on the balanced paper recorded
  1,358 enriched and 536 depleted cells, with 599 edge candidates and peak
  0.132. The absorbent paper recorded 354 enriched and 319 depleted cells,
  with 63 candidates and peak 0.093. The ordinary Optical preview remained the
  existing green result and the browser reported no new warning/error.
- Learned: the engine now has a material-driven discontinuous support plane,
  but a candidate is not yet visible color 테. Calling P5-A complete here would
  confuse Surface state with Optical expression.
- Next different method: author a separate second-dye Density-to-color/alpha
  Optical operator that consumes only this candidate, preserves the base ink
  and remains readable at normal size. Do not fall back to a full outline,
  shifted duplicate glyph or page-normalized halo.

## E-028-second-dye-optical-color / A1

- Parent: `E-027-discontinuous-edge-accumulation / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r4 / 3`
- Package: `0.23.0-experimental.1`
- Fixture manifest: `2`
- Status: learned; perceptual checkpoint failed
- Hypothesis: a separately transported dye can become a visible second color
  without turning the material candidate into a geometric outline. The
  component fraction should own color amount; the discontinuous candidate
  should only gate where that amount is visible.
- Real-ink evidence: Sailor describes
  [Yurameku](https://en.sailor.co.jp/topics/yurameku-ink-2nd-edition/) as showing
  different colors in shades and streaks that change with paper and time. Its
  [Ink Studio 123 comparison](https://withink.sailor.co.jp/report/1885/) shows
  purple, green and pink proportions changing across four papers, including
  green that is easier to see at some painted edges. Independent
  [Troublemaker Abalone samples](https://mountainofink.com/blog/troublemaker-abalone)
  show dark blue shading to purple and additional green in large swabs. These
  establish irregular color regions and paper/nib dependence, not Fountain's
  authored exact RGB values.
- Operator: `edge-dye-study@4` authors second-dye RGB `[138,46,78]`. At each
  existing ordinary-alpha pixel, positive `fractionDelta` is normalized by the
  remaining possible component fraction and multiplied by `edgeMixGain = 12`,
  capped at `0.72`. The R3 `edgeAccumulation` candidate contributes only a
  bounded activation gate. Candidate-only or depleted cells keep the base RGB.
  Existing alpha is copied exactly.
- Automated evidence: the public Optical operator validates complete RGBA and
  component state before mutation. It changes RGB only inside nonzero ordinary
  alpha, preserves every alpha byte, leaves Contact/Density/Surface states
  exact, and is deterministic. The component-off renderer remains the accepted
  ordinary path. R1–R3 canonical recipes remain archival and r4 has its own
  registered schema-3 identity.
- Observed at normal size: the final writing remained indistinguishable from
  ordinary green even when diagnostics reported changed RGB bytes. On smooth
  paper it was worse: `prepareOrdinaryInkCanvasInput` skipped the Surface
  deposit and therefore skipped the dye component entirely, so the final was
  genuinely identical. The diagnostics panel also kept large unavailable
  paper-depth/fibre canvases visible, obscuring the one comparison that mattered.
- Separation boundary: Sailor defines sheen as metallic reflection at edges or
  pooled ink that changes with viewing angle. E-028 is static front-view dye
  color only and deliberately contains no view vector, film reflection,
  sparkle or particle state.
- Why it failed: a sparse candidate and a small fraction delta were multiplied
  together, leaving the authored second color buried inside ordinary shading.
  The automated `changedRgb > 0` check proved arithmetic, not perception.
- Discarded assumption: a few changed channels or an enlarged candidate
  diagnostic are sufficient evidence that a normal-size color zone exists.
- Preserved fixture or code: the separate component mass/fraction planes,
  discontinuous accumulation candidate, exact alpha/coverage invariants and
  archival `edge-dye-study@4` recipe remain useful evidence.
- Next different method: grow a bounded color zone from real discontinuous
  accumulation seeds and local film-enrichment peaks, but only through positive
  second-dye support. Compute the component on smooth paper without enabling
  physical Surface coverage. Compare ordinary base and final side by side.

## E-029-visible-second-dye-zones / A1

- Parent: `E-028-second-dye-optical-color / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r5 / 4`
- Package: `0.24.0-experimental.1`
- Fixture manifest: `2`
- Status: passed normal-size checkpoint
- Hypothesis: discontinuous material seeds can produce readable static
  second-dye zones without becoming a full outline if expansion is bounded in
  Surface-grid space and clipped to positive component enrichment.
- Operator: `edge-dye-study@5` keeps r4 transport coefficients but adds local
  enrichment maxima as film-separation seeds when exposure-driven Surface
  accumulation is absent. Each seed may reach one grid cell and only cells with
  positive `fractionDelta` and visible component mass become a `colorZone`.
  Zone strength starts at `0.38`, follows bounded enrichment and maps to RGB
  `[152,26,116]` with gain `2`, capped at `0.86`. Optical still copies every
  ordinary alpha byte exactly.
- Smooth-paper boundary: an enabled component now requests the compact deposit
  even when ordinary Surface coverage is inactive. The solver may return a dye
  state, but `materialCoverageCandidate`, density transport and paper depth stay
  `null`; resolved coverage remains ordinary Contact. Thus a preserved surface
  ink film is not confused with paper-plane blur.
- Automated evidence: component-off output is exact; smooth component-on
  preserves resolved coverage and alpha while changing RGB inside the ordinary
  footprint; balanced coverage/Contact/Density/Surface remain exact; r1-r4
  canonical recipes stay archival. The color zone is deterministic, bounded
  to 0...1 and is less occupied on the active absorbent paper than balanced.
- Diagnostics evidence: unavailable Surface fields are hidden instead of
  rendered as large empty canvases. Optical retains an optional ordinary-base
  RGBA only while the component is active and displays it beside the final,
  reporting changed pixels plus mean/maximum channel delta. No second solve is
  performed.
- Memory boundary: the maximum 320×240 Surface component keeps the existing
  1,228,800-byte lazy solver state and retains 2,150,400 bytes including the new
  `colorZone`, for 3,379,200 bytes during diagnostic-state creation. The
  component-on Optical comparison additionally retains one ordinary page RGBA
  (`4 × pagePixels` bytes); component off allocates neither addition.
- Normal-size browser evidence: M/28 balanced produced a distinct burgundy
  zone while ordinary green remained the main color. B/48 smooth produced
  18,856 changed RGB pixels in the full-resolution render with mean changed
  channel delta 27.3 and maximum 106; the side-by-side card made the authored
  color difference visible without alpha or geometry growth. These numbers are
  diagnostics, not a pixel golden or a claim of measured real-ink chemistry.
- Separation boundary: this is static dual-dye color. It has no view vector,
  Fresnel response, metallic film or particle state; P5-B sheen remains a
  separate experiment.
- Learned: the primary visual gate must inspect final writing at normal size.
  Intermediate planes and numeric deltas explain the result but cannot promote
  an effect that the final comparison does not reveal.
- Next different method: after review/merge, resume P5-B with a separate
  concentration-thresholded surface film and view-dependent Optical layer.

## E-030-engine-workbench-component-authoring / A1

- Parent: `E-029-visible-second-dye-zones / A1`
- Ordinary engine model: `ordinary-js-r13` (unchanged)
- Dye component model/schema: `dye-component-js-r5 / 4` (unchanged)
- Package: `0.25.0-experimental.1`
- Fixture manifest: `2`
- Status: passed engine/harness contract; browser visual QA passed
- Problem: the HTML client still presented itself as an ordinary-ink demo.
  The edge-dye component was reachable only through query parameters, and its
  actual mass, mobility, retention, color and visible-zone inputs could not be
  changed from the UI. Intermediate diagnostics existed, but they were not a
  usable engine workbench.
- Engine boundary: registered built-in ids remain canonical and reserved. A
  recipe on the current model/schema with a nonregistered id is accepted as an
  explicit experiment recipe. Its complete canonical JSON—not only local
  `id@revision`—is the portable input. A forged or unknown revision of
  `edge-dye-study` still fails closed.
- Harness operator: the default `색 테` workspace authors
  `workbench-edge-dye@1` through the public `freezeDyeComponentRecipe` API. The
  controls map directly to mass fraction, mobility, retention, second RGB,
  mixture response/cap, bounded-zone radius and the four advanced accumulation
  thresholds. Component off passes `null` and restores the ordinary byte path.
- Information architecture: the visible pipeline is Input → Contact → Density
  → Surface → Material component → Optical. Ordinary dye and color edge are
  selectable; sheen, shimmer and pigment/oxidation are visible disabled backlog
  families rather than hidden query flags or fake controls. The exact current
  public component recipe JSON is inspectable beside its controls. Optical A/B
  appears first in the one-solve diagnostic panel, followed by Contact, Density
  and Surface fields. Collapsing diagnostics unmounts their full-resolution
  canvases and stops requesting diagnostic stage delivery instead of merely
  hiding those buffers.
- Automated evidence: engine compatibility accepts a frozen nonregistered
  current recipe while preserving built-in forgery rejection. Harness tests
  prove color and all exposed numeric controls author a compatible recipe, the
  preview receives that exact recipe, diagnostics reuse the single material
  solve, and invalid colors fail before authoring.
- Browser evidence: default color-edge mode rendered with no console warning or
  error. Changing the second color to `#2468AC` and maximum mixture to `25%`
  changed the final workbench readout and produced 17,095 changed RGB pixels in
  the ordinary/final comparison (mean channel delta 14.3, maximum 33). Switching
  to ordinary mode removed the component panel and reported Component `없음`.
- Next different method: use the same workbench family boundary for P5-B only
  after its concentration-thresholded surface-film state and view-dependent
  Optical contract exist in the public engine.

## E-031-bundled-font-contact-scale-contract / A2

- Parent: P4 nib catalog / actual bundled-font matrix
- Engine/contact model: unchanged (`ordinary-js-r13`, `fountain-nib-catalog-r2`)
- Package: unchanged (`0.25.0-experimental.1`)
- Status: passed browser contract after one learned attempt
- Hypothesis: the authored em geometry and the actual bundled-font raster can
  be verified without opening nine preview tabs or freezing one browser pixel
  image as permanent truth.
- A1 learned: requiring identical CSS stroke width across DPR failed first on
  18px UEF because one thresholded device pixel becomes 1, 0.5 or 0.333 CSS px.
  Replacing broad round-nib `strokeText` with separable alpha dilation made the
  result worse: 28px EB grew to 8.83 CSS px at DPR1 and minimum aperture fell
  to 14.7%. That operator was discarded and the accepted Contact renderer was
  restored exactly.
- A2 contract: the engine unit fixture continues to own the exact em geometry
  formula. The browser matrix owns final-mask evidence: UEF→EB order inside
  every cell, nondecreasing stroke width across 18/28/52px, all six reference
  glyphs present, minimum aperture at least 12%, and SU/CM directionality with
  one device-pixel raster uncertainty. DPR stroke/aperture differences remain
  reported observations rather than false pixel-equality gates.
- Browser evidence: all 9 cells passed. The observed UEF/M/EB widths were
  DPR1 `2/2/4.83`, `2/2/6.83`, `2/4/8`; DPR2 `1/2/3.83`, `1/2/5`,
  `2/4/8`; DPR3 `0.67/1.33/3.5`, `0.67/2/4.67`, `1.33/4/8` CSS px for
  18/28/52px respectively. Minimum aperture was 22.2%. Maximum raw DPR stroke
  drift was 2.16 CSS px and one-device-pixel-adjusted residual was 0.83 CSS px.
  Browser console warning/error remained empty.
- Workbench boundary: one visible button runs the matrix sequentially. Each
  temporary glyph Canvas becomes unreachable after its cell is summarized;
  only the numeric table remains. No extra tabs or persistent matrix canvases
  are created.
- Next different method: P5-B sheen begins with a separate concentrated
  surface-film state and view-dependent Optical contract. It must not reuse
  this Contact metric or the P5-A static color-zone operator.

## E-032-concentration-thresholded-sheen-film / A1

- Parent: P5-B sheen / surface-film optical view
- Ordinary engine/recipe: unchanged (`ordinary-js-r13`, `ordinary-green@12`)
- Sheen component model/schema: `sheen-component-js-r1` / `1`
- Package: `0.26.0-experimental.1`
- Fixture manifest: unchanged (`2`)
- Status: passed engine contract and normal-size browser observation
- Hypothesis: sheen can be represented as a concentration-thresholded Surface
  film plus a separate explicit view response, without reusing the P5-A edge
  zone, adding particles, widening glyph alpha, or permanently tinting the
  ordinary base.
- Primary evidence: Sailor's official green example appears deep green from
  above and metallic emerald at an angle. Octopus describes sheen as a
  high-dye-content effect favored by generous flow and smooth coated paper and
  suppressed by rough absorbent copy paper. Hébert et al. describe bronzing as
  wavelength-dependent specular color at the ink-air interface and report that
  roughness spreads and attenuates it. Fritz records changing-light sheen as an
  ink/paper interaction while deposited amount remains a material variable.
- Operator: `surface.sheenFilm` activates only above normalized concentration
  `0.72`. Activation uses exponent `1.4`, authored gain `4`, cap `1`, and paper
  retention `filmPreservation / (1 + roughness × 0.7)`. Optical receives a
  separate `specularAlignment` observation. Above view threshold `0.45`, it
  raises the view response to exponent `1.8`, mixes toward copper-red
  `[186,77,52]`, and caps the mixture at `0.9`.
- Contract: `specularAlignment = 0` is byte-exact ordinary RGBA. The active
  view changes RGB only where film and existing ordinary alpha are both
  positive; every alpha byte, Contact, Density, Surface coverage, and glyph
  geometry remains exact. Smooth paper retains at least as much film as
  balanced paper, which retains at least as much as absorbent paper for the
  same concentration fixture.
- Workbench evidence: the Sheen family authors the public component recipe and
  passes the observation separately. Its base/specular buttons expose the two
  views, diagnostics display the film before Optical, and the ordinary/final
  A/B uses the same single material solve. Default M/28 balanced-paper output
  changed 2,166 RGB pixels in the specular view (mean changed-channel delta
  9.6, maximum 112) while the static fallback changed zero pixels.
- Memory boundary: disabled sheen allocates no film plane. An active render adds
  one page-sized Float32 film plane and one transient page-sized base RGBA copy;
  collapsed diagnostics unmount their canvases and retain no stage buffers.
- A1 limit: `specularAlignment` is a scalar observation, not a claimed 3D
  Fresnel model, device-tilt sensor, or replayable light rig. It establishes the
  material/view separation first. P5-A color separation and future P5-C
  particles remain different components.
- Next different method: after merge, begin P5-C with footprint-bound particle
  state and a hard particle budget; do not turn this film into sparkle noise.

## E-033-seeded-wet-footprint-shimmer-particles / A1

- Parent: P5-C shimmer / bounded particulate optical view
- Ordinary engine/recipe: unchanged (`ordinary-js-r13`, `ordinary-green@12`)
- Shimmer component model/schema: `shimmer-component-js-r1` / `1`
- Package: `0.27.0-experimental.1`
- Fixture manifest: unchanged (`2`)
- Status: passed engine contract and normal-size/mobile browser observation
- Hypothesis: fountain-pen shimmer can begin as a finite seeded particle list
  caught inside the actual resolved wet footprint, with paper-owned catch and
  a separate light observation, without a page-wide noise plane, glyph halo,
  alpha change, or reuse of the P5-A/P5-B operators.
- Primary evidence: Pelikan describes golden shimmering elements flowing
  randomly in Golden Lapis and separately instructs users to shake the bottle
  and clean the feeder. Jacques Herbin describes silver flakes illuminating a
  deep dye color. Diamine distributes shimmer as a distinct ink family. These
  support particulate state rather than another concentration-color curve.
- Operator: `surface.shimmerParticles` uses explicit resolved coverage,
  `particleSeed`, recipe load/threshold/size/budget and the paper recipe's
  `particleCatch`. The built-in recipe authors gold `[222,184,72]`, load `0.8`,
  threshold `0.18`, 0.50–1.20 CSS px radii, reflectivity `1`, static phase
  `0.17`, exponent `2.4`, and a 512-particle cap. Optical renders crisp facets
  with a small antialias taper and clips every RGB change to existing alpha.
- Contract: the same inputs and seed reproduce the same five particle arrays;
  another seed changes the list. Density is not an input. The same structural
  fixture gives nondecreasing populations from smooth to balanced to absorbent
  paper. Alpha is byte-exact, component-off ordinary output is unchanged, and
  malformed inputs fail before output mutation. Reduce Motion ignores runtime
  light phase and uses the authored static phase without moving particles.
- Workbench evidence: M/28 balanced paper produced 124 particles with 1.00–2.39
  device-pixel radii. The static view changed 712 RGB pixels (mean changed
  channel delta 22.5, maximum 145). B/48 produced 107/195/344 particles on
  smooth/balanced/absorbent paper. At 390×844 the controls and single-solve A/B
  remained usable with no console warning/error. Dynamic 270° observation
  changed the reflected RGB while keeping the same seed and particle list.
- Memory boundary: the built-in particle arrays occupy at most
  `5 × 512 × 4 = 10,240` bytes. No full-page particle field is allocated. The
  active A/B path may retain one base RGBA copy; collapsing diagnostics unmounts
  its canvases and reduces the Workbench from 17 canvases to the final output
  canvas only.
- A1 learning: the first soft radial mix changed bytes but looked too much like
  a weak glow at normal size. It was discarded in favor of a crisp facet with
  only an edge taper; the particle footprint and alpha contract did not widen.
- A1 limit: the scalar light phase is not device tilt, 3D flake geometry,
  settling through a pen feed, or a product-ready shimmer catalog. It proves a
  deterministic particulate/material boundary. Chameleon color-shifting
  particles and long-term settling remain separate future experiments.
- Next different method: return to the next unchecked roadmap boundary rather
  than combining P5-D pigment/oxidation into this particle state.

## E-034-separate-pigment-mobility-and-retention-state / A1

- Parent: P5-D pigment and oxidation / transported solid colorant state
- Ordinary engine/recipe: unchanged (`ordinary-js-r13`, `ordinary-green@12`)
- Pigment component model/schema: `pigment-component-js-r1` / `1`
- Package: `0.28.0-experimental.1`
- Fixture manifest: unchanged (`2`)
- Status: passed engine contract and normal-size browser observation
- Hypothesis: fountain-pen pigment can begin as a separate mobile/fixed/depth
  mass carried by the same water footprint, with lower lateral mobility and
  higher fixing retention than the ordinary carrier, before claiming any
  pigment color, opacity, waterproofness, permanence or oxidation behavior.
- Primary evidence: Rohrer & Klingner describes nano-pigmented sketchINK as
  waterproof and lightfast while warning about clotting and cleaning. Platinum
  Chou Kuro instructs users to redisperse pigment by shaking and to clean with
  purified water. Hagan & Maitland's 111-ink light-ageing study found the
  document/pigmented group notably lightfast. These support a separate solid
  colorant state, not a retuned ordinary RGB curve.
- Operator: `pigment-study@1` shares the ordinary deposit water and authors
  `massFraction 0.85`, `mobilityMultiplier 0.35` and
  `retentionMultiplier 1.8`. It owns lazy mobile, fixed, next-mobile and
  paper-depth Float32 planes. The current generic transported-component slot
  is exclusive: a dye and pigment recipe in one solve fail before mutation or
  component allocation.
- Contract: enabling pigment leaves ordinary water, mobile/fixed carrier,
  paper-depth state, resolved coverage and final RGBA exact. More mobility
  moves more component mass outside Contact; more retention raises the fixed
  share; absorbent paper produces deterministic component depth. Registered
  identity is independently pinned and custom workbench recipes remain
  explicit.
- Workbench evidence: M/28 balanced paper at the built-in values reported
  mobile `0.47`, fixed `122.27`, depth `0.00` and fixed share rounded to 100%.
  Raising mobility to `1.2` and lowering retention to `0.5` changed that state
  to mobile `8.55`, fixed `49.92` and fixed share `85%`. Absorbent paper at the
  built-in values reported depth `3.29`. All three views reported zero changed
  final RGB pixels, which is the intended A1 boundary rather than a missing
  render path.
- Memory boundary: disabled and direct-writing paths allocate no component
  planes. At the maximum 320×240 keyboard grid, four internal Float32 planes
  occupy `1,228,800` bytes and the three copied diagnostic planes retain
  `921,600` bytes; peak component-specific typed-array storage is
  `2,150,400` bytes. There is no full-resolution pigment plane.
- A1 limit: the exclusive transported slot is not enough for a combined
  dye-plus-pigment ink. It must become a bounded multi-component registry
  before such recipes. The RGB remains ordinary and no digital waterproofness
  is claimed.
- Next different method: the remaining P5-D boundary is explicit commit-age
  oxidation. It must use authored elapsed time and a versioned curve, never the
  current wall clock or device state.

## E-035-explicit-commit-age-oxidation / A1

- Parent: P5-D pigment and oxidation / deterministic chemistry-time response
- Ordinary engine/recipe: unchanged (`ordinary-js-r13`, `ordinary-green@12`)
- Oxidation component model/schema: `oxidation-component-js-r1` / `1`
- Package: `0.29.0-experimental.1`
- Fixture manifest: unchanged (`2`)
- Status: passed engine contract and normal-size/mobile browser observation
- Hypothesis: an iron-gall/classic-ink-inspired color change can be modeled as
  a versioned recipe plus explicit commit and observation timestamps, without
  reading the current clock, animating a stored record, widening alpha, or
  changing Contact, Density and Surface.
- Primary evidence: Platinum describes ferrous ions oxidizing to ferric ions
  and the handwriting color changing and darkening over time in its Classic
  Ink explanation. Its blue-black FAQ separately describes air oxidation,
  fading blue dye and remaining iron color. These support a time-dependent
  chemistry/color state. They do not establish the digital study's 90-second
  half-life, which is an authored comparison value rather than a measured
  commercial-ink kinetic claim.
- Operator: `classic-forest-oxidation-study@1` authors fresh RGB `[86,111,62]`,
  settled RGB `[28,36,31]`, reaction half-life `90000ms`, progress exponent
  `1`, maximum mix `0.88` and concentration influence `0.55`. Progress is
  `(1 - 2^(-elapsed / halfLife))^exponent`; Optical applies a bounded,
  concentration-aware RGB mix inside existing alpha.
- Time contract: observation is the strict pair
  `{committedAtMilliseconds, observedAtMilliseconds}` with non-negative safe
  integers and observation not earlier than commit. A 0ms observation gives
  0% progress, one half-life gives exactly 50%, and 600000ms gives 99% at the
  displayed precision. Shifting both timestamps by the same amount produces
  exact state and RGBA. Engine and Workbench oxidation authoring paths contain
  no `Date.now` or `performance.now` input.
- Rendering contract: an active oxidation component retains the ordinary base
  RGBA for A/B observation, then changes RGB only. Every alpha byte, Contact,
  Density and Surface result remains exact. Invalid recipes, timestamps and
  output shapes fail before output mutation. The built-in identity is pinned
  independently with SHA-256
  `7e3fd320b046aa089f11ad37d328ef106816bbfcf8844b834abc6296cc9d51a8`.
- Workbench evidence: the fresh/half-life/10-minute controls displayed
  progress `0% / 50% / 99%`. The same 16,813 ink pixels changed RGB at each
  observation; mean changed-channel deltas relative to the ordinary base were
  `29.8 / 11.7 / 6.0`, with maxima `48 / 24 / 15`. The direction is not a
  monotonic distance-from-ordinary claim because the ordinary control color
  lies between portions of the authored fresh-to-settled curve; the explicit
  state and final RGB are the contract.
- UI/memory boundary: the Surface diagnostic adds one immutable scalar state
  record and no page plane. Expanded diagnostics used 18 canvases; collapsing
  them left only the final-output canvas. At 390×844 the controls and final
  output remained usable. A fresh QA interval reported no console warning or
  error, and only one in-app browser tab was used.
- A1 limit: the Workbench treats the complete preview text as one commit. This
  is not a persisted per-stroke age model, a claimed reproduction of one
  commercial ink, or a live animation. A future product data model must store
  each material commit time explicitly and pass the observation time chosen by
  replay/export policy.
- Next different method: P5 is now complete at its current checklist boundary.
  Return to the first unchecked P6 checkpoint/version and stable-output work
  rather than adding another visual material family.
