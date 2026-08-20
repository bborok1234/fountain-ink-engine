# Fountain Ink Engine Instructions

## Authority

- This directory is the active, independently publishable ink-material library.
- It owns deterministic calculation only: contracts, contact, density, surface,
  and later optical components.
- HTML demos are clients. Product UI, persistence, replay, mobile/native code,
  React, Vite, Sites, and application policy do not belong here.

## Change discipline

- Keep explicit inputs, seeds, and version contracts. Never read wall-clock time,
  viewport state, device state, or global random state inside material code.
- Change one material hypothesis at a time and record it in
  `docs/EXPERIMENT_LOG.md`.
- Preserve comparison checkpoints as evidence, not as a permanent assertion that
  one pixel image is the artistic truth.
- A formula change requires an `engineModelVersion` change. A serialized recipe
  shape change requires a `recipeSchemaVersion` change.
- Public consumers import only package barrels. Do not expose or import private
  source paths.
- Do not bundle fonts, screenshots, or reference images without a verified
  redistributable license and notice.

## Validation

Run:

```bash
npm run verify
npm pack --dry-run
```

Report calculation changes, tests, untested browser visuals, and known limits.
