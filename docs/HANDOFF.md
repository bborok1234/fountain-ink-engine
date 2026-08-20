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
fountain-ink-engine/deterministic
fountain-ink-engine/contact
fountain-ink-engine/density
fountain-ink-engine/surface
fountain-ink-engine/canvas2d
```

Clients must never import `fountain-ink-engine/src/...`.

## Publication boundary

The umbrella repository tracks this as an ordinary top-level directory. The
public engine repository is produced from this subtree. Do not add a nested
`.git` directory or a submodule, and do not copy private product code into this
tree.

Before a public release, verify package contents with `npm pack --dry-run` and
review licenses for every newly bundled asset or dependency.
