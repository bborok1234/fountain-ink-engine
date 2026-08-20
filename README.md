# Fountain Ink Engine

`fountain-ink-engine` is a zero-runtime-dependency, framework-free ESM library
for deterministic digital fountain-pen material experiments.

The package separates reusable calculation from the current HTML comparison
view. It does **not** provide a note application, input UI, font, storage model,
or mobile integration.

## Install locally

```json
{
  "dependencies": {
    "fountain-ink-engine": "file:../../fountain-ink-engine"
  }
}
```

## Public API

```js
import {
  ORDINARY_GREEN_RECIPE_R1,
  WetInkSimulation,
  createDensityField,
  getNibGeometry,
  engineModelVersion,
} from "fountain-ink-engine";
```

Focused entry points are also available:

- `fountain-ink-engine/contracts`
- `fountain-ink-engine/recipes`
- `fountain-ink-engine/deterministic`
- `fountain-ink-engine/contact`
- `fountain-ink-engine/density`
- `fountain-ink-engine/surface`
- `fountain-ink-engine/canvas2d`

All material inputs and seeds must be explicit; seeds use the unsigned 32-bit
domain. The same engine version, recipe, dimensions, inputs, and seed are
expected to produce the same typed-array state.
Browser text shaping and authored layout remain client responsibilities. The
optional `canvas2d` adapter owns glyph-mask rasterization and presentation-time
material composition without adding a React dependency.

`ordinary-green-r1` is available as an immutable, serializable recipe:

```js
import {
  ORDINARY_GREEN_RECIPE_R1,
  parseInkRecipe,
  serializeInkRecipe,
} from "fountain-ink-engine/recipes";

const checkpoint = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R1);
const restoredRecipe = parseInkRecipe(checkpoint);
```

Structural recipe APIs preserve supported historical model records for archival
round trips. Material calculation additionally requires the active engine
model/schema. The reserved `ordinary-green@1` identity must match its registered
canonical definition; changed parameters require a new revision or custom id.

## Development

```bash
npm ci
npm run verify
npm pack --dry-run
```

This is source-distributed ESM, so `npm run build` validates the public module
graph and package boundary rather than transpiling it.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for ownership and
[docs/EXPERIMENT_LOG.md](docs/EXPERIMENT_LOG.md) for the versioned learning loop.
