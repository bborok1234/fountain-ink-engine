# A7-3 shared-vacancy autoresearch

This evaluator changes one hypothesis after the frozen capacity-free R14
search plateaued: both dyes compete for one cell-local adsorption capacity.

- The fixed baseline is `edge-dye-study@15` at total `Q=0.075`.
- A candidate may change only `sharedAdsorptionCapacity`.
- R14's six rates, palette, initial fraction, papers, fixtures, topology
  annotation, metrics, and finite-loading Optical remain fixed.
- Per-species capacities, rate retuning, palette/gain controls, paper changes,
  edge masks, and coffee-ring terms are outside this attempt.
- Automatic results never claim a nine-point perceptual score. Human review is
  still required after all hard gates pass.

The first and only planned batch brackets Q from one quarter to three times the
authored baseline. A second sweep requires a separately versioned plan and a
recorded reason based on the first batch; it must not silently expand this one.
