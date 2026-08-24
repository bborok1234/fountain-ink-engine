# Dual-shading autoresearch program

This is a deliberately small adaptation of
[karpathy/autoresearch](https://github.com/karpathy/autoresearch) for Fountain's
R14 two-dye transport experiment. It makes the experiment loop repeatable; it
does not replace material research or human visual judgement.

## The immutable experiment

The evaluator is locked by SHA-256 and always runs the same 45 cases:

- five marks: constant, start/stop, loop, cross, and double pass;
- three widths: thin, medium, and broad;
- three papers: smooth, balanced, and absorbent;
- the same R14 palette and initial secondary fraction;
- the same engine-owned finite-loading Optical v2 and warm paper profile;
- a byte-exact second execution of every candidate;
- a fixed `0.43.0-experimental.1`, `edge-dye-study@14` comparison.

`evaluator-lock.json` pins the evaluator, fixture generator, metrics, package
manifests, the complete engine `src/` tree, the real-photo topology annotation,
and the fixed baseline matrix digest. File and source-tree mismatches stop
before simulation; the independent baseline behavior digest is checked before
classification. Updating that lock is a new evaluator revision, not a candidate.

The locked v2 digests are `engineSourceTreeDigest`
`a32c23557b0d470eef6d33764f95f183bb4433f8b8e73db9d0f85aaa0567c38f` and
`baselineMatrixDigest`
`7cf1892f667975658cd536342c4bc9d4b650802a391093fa9cad996a216810d9`.
Each recorded row is self-contained: it embeds candidate prose, all six rates,
lock and matrix digests, fixed baseline identity, sorted hard failures, Pareto
vector, and disposition.

## The only hypothesis surface

During a search run, edit only `candidate.json`. Its exact schema contains:

- an ID, one falsifiable hypothesis, and one note;
- primary and secondary diffusivity;
- primary and secondary adsorption rate;
- primary and secondary desorption rate.

Do not tune colors, the initial mixture, paper recipes, Optical, fixtures,
thresholds, metrics, or engine source while comparing candidates. A need to
change one of those is a new research program and a new evaluator lock.

## One bounded loop

1. Write one hypothesis in `candidate.json` and change the smallest useful set
   of its six rates.
2. Run `npm run research:dual-shading` from `fountain-ink-engine/`.
3. Keep the deterministic summary and append its row with
   `npm run research:dual-shading -- --record --format ndjson`.
4. Read the named hard-gate failures. Do not rescue a failed candidate with a
   weighted average.
5. Compare every surviving candidate's Pareto vector with the fixed baseline.
6. Stop after 24 candidates or 30 minutes, whichever comes first. The batch
   runner owns a process-level 30-second kill deadline for each candidate;
   evaluator timing checks are only a cooperative second guard.

The automated statuses are:

- `reject-hard`: conservation, signed-patch, artifact, readability, Optical
  A/B, determinism, paper topology, or nib topology gate failed;
- `reject-dominated`: all gates passed, but the fixed baseline is no worse on
  every Pareto axis and better on at least one;
- `shortlist`: gates passed and the candidate is non-dominated;
- `plateau`: the run used its 24-candidate or 30-minute budget without a new
  human-review candidate.

`human-reject` and `accepted` are review dispositions, never automatic
evaluator output. Record them only after a blinded, normal-size review against
the pinned Ayame, Hinoki, Haha, and Koke photo topology. An accepted rate set
still does not prove a universal physical model.

## What the Pareto vector means

There is intentionally no scalar quality score. The vector separately reports
saturating fidelity for signed fraction span, Optical changed area, Optical
channel delta, paper response and broad-to-thin response, plus connected patch
coherence, minimum readability, and artifact integrity. Saturation prevents
unbounded separation or recoloring from looking better merely because it is
stronger. Raw ratios remain in `topology` and each case record. Improving one
axis while damaging another remains visible.

The evaluator can reject obvious non-ink signatures: global recolor, a perfect
outline, speckle, loss of readability, non-finite or negative species, mass
drift, and missing paper/nib response. It cannot decide that an image feels
like a real fountain-pen ink, and it cannot award or advertise “9/10”.

Physical tails use mass-weighted q05/q50/q95 after excluding cells below
`max(1e-8, 0.001 * peak visible mass)`. This prevents numerous negligible tail
cells from manufacturing separation. Pareto fidelity axes saturate at their
pinned targets; values cannot improve without bound. Conservation, signed
patch, readability, global-recolor, outline, fragmentation and speckle remain
non-tradable hard artifact gates. Every child evaluator has a process-owned
30-second kill deadline in addition to its cooperative timing check.

## Result formats

- default: deterministic full JSON summary;
- `--format ndjson`: one compact deterministic result row;
- `--format tsv`: a header plus one deterministic TSV row;
- `--record [path]`: append the self-contained NDJSON row once (same `resultId`
  is idempotent). Every row embeds the exact candidate prose and six rates.

Commit a candidate and its result row together only when it represents a
meaningful hypothesis. Keep failed rows: they are the memory that prevents the
next agent from repeating a gain-only search.

## Closed R14 rate-search batches

- Batch 1: `24/24 reject-hard`, shortlist `0`, `opticalAreaFidelity=0` for all;
  11 candidates triggered global recolor.
- Batch 2: `24/24 reject-hard`, shortlist `0`, `opticalAreaFidelity=0` for all;
  all 24 candidates triggered global recolor.
- The best `opticalDeltaFidelity` across both batches was `0.03639156`, from
  `dual-shading-b1-23-pads-upper-bound` with the extreme
  `primaryAdsorptionRate=1`. It still failed hard gates and is not a candidate.

The exact outcome is therefore `48/48 reject-hard`, shortlist `0`: capacity-free
R14 six-rate search is falsified for this locked evaluator and has plateaued.
The perceptual score remains `6.3/10`; no automatic result claims 9.

## Next different hypothesis

A7-3 tests one shared-vacancy adsorption capacity, motivated by the competitive
Langmuir adsorption treatment in
[Venditti, Murali, and Darhuber](https://doi.org/10.1021/acs.langmuir.1c01624).
Start with fixed total capacity `Q=0.075` in engine mass units and one common
free-site term `max(0, Q - A_primary - A_secondary)`. Do not add independent
per-species absolute capacities, change palette/Optical, or resume R14 gain/rate
tuning in the same attempt. This is a falsifiable A7-3 hypothesis, not a claim
of perceptual success.
