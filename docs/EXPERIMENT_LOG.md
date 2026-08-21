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
