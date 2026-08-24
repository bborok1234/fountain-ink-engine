#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCK_PATH,
  DEFAULT_RESULTS_PATH,
  createEvaluatorLock,
  evaluateCandidateFromFile,
  formatResultNdjson,
  stableStringify,
} from "./evaluator.mjs";

function parseArguments(argv) {
  return Object.freeze({
    writeLock: argv.includes("--write-lock"),
    record: argv.includes("--record"),
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.writeLock) {
    const lock = await createEvaluatorLock();
    await writeFile(DEFAULT_LOCK_PATH, `${stableStringify(lock, 2)}\n`, {
      flag: "wx",
    });
    return Object.freeze({ kind: "lock", lock });
  }
  const summary = await evaluateCandidateFromFile();
  if (options.record) {
    await writeFile(DEFAULT_RESULTS_PATH, formatResultNdjson(summary), {
      flag: "wx",
    });
  }
  return Object.freeze({ kind: "result", summary });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((result) => {
    process.stdout.write(`${stableStringify(result, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
