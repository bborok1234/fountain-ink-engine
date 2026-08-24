import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_R16_LOADING_ARCHIVE_MANIFEST_PATH,
  validateR16LoadingArchive,
} from "../scripts/dual-shading-autoresearch/a7-loading-r16/archive-validator.mjs";

test("terminal R16 loading archive seals contract-pass visual falsification", async () => {
  const report = await validateR16LoadingArchive();
  assert.equal(
    report.evaluatorLockDigest,
    "156db0d82dd55297d0ce4be42b7bf50ec1b728d2e35578097b7a2f7151a64d01",
  );
  assert.equal(report.resultRowCount, 1);
  assert.equal(report.caseCount, 99);
  assert.equal(report.status, "contract-pass-visual-falsified");
  assert.equal(report.scientificConclusion, "loading-only-falsified");
  assert.equal(report.automaticNinePointClaim, false);
  assert.equal(report.scoreAfter, 6.3);
  assert.equal(report.currentRuntimeRejected, false);
  assert.equal(
    report.nextMethod,
    "ordered-deposit-time-plus-surface-lifetime-gated-pinned-redistribution",
  );
});

test("R16 loading archive self-pins its validator and rejects manifest tampering", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-r16-loading-archive-"));
  const manifestPath = join(directory, "archive-manifest.json");
  try {
    const manifest = JSON.parse(await readFile(
      DEFAULT_R16_LOADING_ARCHIVE_MANIFEST_PATH,
      "utf8",
    ));
    assert.match(
      manifest.artifacts[
        "scripts/dual-shading-autoresearch/a7-loading-r16/archive-validator.mjs"
      ],
      /^[0-9a-f]{64}$/,
    );
    manifest.artifacts[
      "scripts/dual-shading-autoresearch/a7-loading-r16/archive-validator.mjs"
    ] = "0".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
    await assert.rejects(
      validateR16LoadingArchive({ manifestPath }),
      /archive artifact mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
