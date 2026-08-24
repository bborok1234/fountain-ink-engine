# Handoff

## Continue from here

1. Run `npm run verify` in this directory.
2. Read the latest entry in [EXPERIMENT_LOG.md](EXPERIMENT_LOG.md).
3. Confirm a proposed change belongs to reusable material calculation rather
   than the HTML harness or a future product.
4. Give every experiment an explicit ID, parent, engine version, recipe schema,
   input recipe, and seed.
5. Change one hypothesis and record the observable result, including failures.

## Stable public entry points

```text
fountain-ink-engine
fountain-ink-engine/contracts
fountain-ink-engine/recipes
fountain-ink-engine/dye-components
fountain-ink-engine/sheen-components
fountain-ink-engine/shimmer-components
fountain-ink-engine/pigment-components
fountain-ink-engine/oxidation-components
fountain-ink-engine/surface-recipes
fountain-ink-engine/deterministic
fountain-ink-engine/contact
fountain-ink-engine/density
fountain-ink-engine/surface
fountain-ink-engine/optical
fountain-ink-engine/canvas2d
```

Clients must never import `fountain-ink-engine/src/...`.

The active calculation is `ordinary-js-r13` with immutable schema-6
`ordinary-green@12`, blue-black@6, burgundy@6 and teal@6 recipes. Their
`fountain-nib-catalog-r2` Contact catalog adds CM as a fixed
Cross-Music-inspired inverse anisotropy beside SU; historical catalog r1 and
r12 recipes remain archival. Active
absorbent paper is `paper-absorbent@4` under `paper-surface-js-r4`/schema 3;
historical Surface revisions remain registered. Keyboard Surface clients may use
`createKeyboardSurfaceState` for `{ coverage, densityTransport }`; the latter
is nullable and retains two separate Float32 planes, `signedNumerator` and
positive `pigmentWeight`. `createMaterialCoverage` remains the coverage-only
compatibility entry point and allocates no signed solver state.

The current dual-shading calculation is `edge-dye-study@16` under schema 14.
Keyboard clients do not construct a second material implementation: the
Canvas2D renderer uses public `createKeyboardDyeArealLoad` to integrate actual
glyph Contacts and forwards the validated `keyboard-dye-areal-load-v1` plane
into Surface. R13–R15 are exact historical checkpoints. R16's 99-case archive
is contract-pass but visual-falsified at `6.3/10`; preserve the load contract as
R17 input, but do not claim it closed the perceptual dual-shading gap.

## Publication boundary

The umbrella repository tracks this as an ordinary top-level directory. The
public engine repository is produced from this subtree. Do not add a nested
`.git` directory or a submodule, and do not copy private product code into this
tree.

Before a public release, verify package contents with `npm pack --dry-run` and
review licenses for every newly bundled asset or dependency.
