# Experiment log

This is a learning ledger, not a gallery of permanent visual answers. Screenshots
and pixel captures may be attached to a versioned experiment for comparison, but
they are not automatically promoted to timeless pass/fail truth.

## Record template

```md
### E-000-short-name / A1

- Parent: none
- Engine model: ordinary-js-r5
- Recipe schema: 3
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
