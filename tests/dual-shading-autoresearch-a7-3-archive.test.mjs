import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_A7_3_ARCHIVE_MANIFEST_PATH,
  DEFAULT_A7_3_BATCH_RESULT_PATH,
  validateA7_3Archive,
} from "../scripts/dual-shading-autoresearch/a7-3/archive-validator.mjs";

test("terminal A7-3 archive seals one baseline plus eight Q hard rejections", async () => {
  const report = await validateA7_3Archive();
  assert.equal(
    report.evaluatorLockDigest,
    "80b3894087a8f4b633e80a9d4880c95c818230e8457a701c7b873459e410ce53",
  );
  assert.equal(report.resultRowCount, 1);
  assert.equal(report.batchResultRowCount, 8);
  assert.equal(report.archivedCandidateCount, 9);
  assert.equal(report.shortlistCount, 0);
  assert.equal(report.plateau, true);
  assert.equal(report.automaticNinePointClaim, false);
  assert.equal(report.conclusion, "shared-vacancy-r15-plateau");
  assert.equal(typeof report.currentRuntimeRejected, "boolean");
});

test("A7-3 archive manifest byte tampering is rejected before rows are trusted", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-a7-3-manifest-"));
  const manifestPath = join(directory, "archive-manifest.json");
  try {
    const manifest = JSON.parse(await readFile(
      DEFAULT_A7_3_ARCHIVE_MANIFEST_PATH,
      "utf8",
    ));
    manifest.artifacts[
      "research/dual-shading-autoresearch/a7-3/results.ndjson"
    ] = "0".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await assert.rejects(
      validateA7_3Archive({ manifestPath }),
      /A7-3 archive artifact mismatch/,
    );

    delete manifest.artifacts[
      "research/dual-shading-autoresearch/a7-3/results.ndjson"
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await assert.rejects(
      validateA7_3Archive({ manifestPath }),
      /a7_3ArchiveManifest\.artifacts keys mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A7-3 archive rejects cross-candidate replay and reopened hard gates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-a7-3-replay-"));
  const batchResultPath = join(directory, "batch-results.ndjson");
  try {
    const rows = (await readFile(DEFAULT_A7_3_BATCH_RESULT_PATH, "utf8"))
      .split("\n").filter(Boolean).map(JSON.parse);

    const replayed = [...rows];
    replayed[0] = rows[1];
    await writeFile(
      batchResultPath,
      `${replayed.map(JSON.stringify).join("\n")}\n`,
      "utf8",
    );
    await assert.rejects(
      validateA7_3Archive({ batchResultPath }),
      /terminal batch row 1 identity mismatch/,
    );

    const reopened = rows.map((row, index) => index === 0
      ? { ...row, hardGates: { ...row.hardGates, passed: true } }
      : row);
    await writeFile(
      batchResultPath,
      `${reopened.map(JSON.stringify).join("\n")}\n`,
      "utf8",
    );
    await assert.rejects(
      validateA7_3Archive({ batchResultPath }),
      /must remain a non-nine-point hard rejection/,
    );

    const claimed = rows.map((row, index) => index === 0
      ? { ...row, automaticNinePointClaim: true }
      : row);
    await writeFile(
      batchResultPath,
      `${claimed.map(JSON.stringify).join("\n")}\n`,
      "utf8",
    );
    await assert.rejects(
      validateA7_3Archive({ batchResultPath }),
      /must remain a non-nine-point hard rejection/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
