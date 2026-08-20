# Experiment log

This is a learning ledger, not a gallery of permanent visual answers. Screenshots
and pixel captures may be attached to a versioned experiment for comparison, but
they are not automatically promoted to timeless pass/fail truth.

## Record template

```md
### E-000-short-name / A1

- Parent: none
- Engine model: ordinary-js-r3
- Recipe schema: 2
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
