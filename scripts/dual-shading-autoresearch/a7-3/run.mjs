#!/usr/bin/env node

import { appendFile, open, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CANDIDATE_PATH,
  DEFAULT_RESULTS_PATH,
  MAX_CANDIDATE_MILLISECONDS,
  evaluateCandidateFromFile,
  formatResultNdjson,
  formatResultTsv,
  resultRow,
  stableStringify,
} from "./evaluator.mjs";

function usage() {
  return [
    "Usage: node scripts/dual-shading-autoresearch/a7-3/run.mjs [options]",
    "",
    "Options:",
    "  --candidate <path>        Q-only candidate JSON",
    "  --format <json|ndjson|tsv> output full summary or one result row",
    "  --record [path]           append the deterministic NDJSON row once",
    `  --max-milliseconds <n>    evaluator deadline (maximum ${MAX_CANDIDATE_MILLISECONDS})`,
    "  --help                    show this help",
  ].join("\n");
}

function parseArguments(arguments_) {
  const options = {
    candidatePath: DEFAULT_CANDIDATE_PATH,
    format: "json",
    recordPath: null,
    maximumMilliseconds: MAX_CANDIDATE_MILLISECONDS,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help") return { help: true };
    if (argument === "--candidate") {
      options.candidatePath = arguments_[index + 1];
      index += 1;
      if (!options.candidatePath) throw new TypeError("--candidate requires a path.");
    } else if (argument === "--format") {
      options.format = arguments_[index + 1];
      index += 1;
      if (!["json", "ndjson", "tsv"].includes(options.format)) {
        throw new TypeError("--format must be json, ndjson, or tsv.");
      }
    } else if (argument === "--record") {
      const possiblePath = arguments_[index + 1];
      if (possiblePath && !possiblePath.startsWith("--")) {
        options.recordPath = possiblePath;
        index += 1;
      } else {
        options.recordPath = DEFAULT_RESULTS_PATH;
      }
    } else if (argument === "--max-milliseconds") {
      options.maximumMilliseconds = Number(arguments_[index + 1]);
      index += 1;
    } else {
      throw new TypeError(`unknown argument ${argument}`);
    }
  }
  return options;
}

function recordPathString(path) {
  return path instanceof URL ? fileURLToPath(path) : path;
}

export async function recordResultOnce(path, summary) {
  const filename = recordPathString(path);
  const lockPath = `${filename}.lock`;
  let handle;
  try {
    handle = await open(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`results writer lock already exists: ${lockPath}`);
    }
    throw error;
  }
  try {
    let existing = "";
    try {
      existing = await readFile(filename, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const row = resultRow(summary);
    for (const line of existing.split("\n").filter(Boolean)) {
      const parsed = JSON.parse(line);
      if (parsed.resultId !== row.resultId) continue;
      if (stableStringify(parsed) !== stableStringify(row)) {
        throw new Error(`results already contains conflicting resultId ${row.resultId}.`);
      }
      return false;
    }
    await appendFile(filename, formatResultNdjson(summary), "utf8");
    return true;
  } finally {
    await handle.close();
    await unlink(lockPath);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const summary = await evaluateCandidateFromFile({
    candidatePath: options.candidatePath,
    maximumMilliseconds: options.maximumMilliseconds,
  });
  if (options.recordPath !== null) {
    await recordResultOnce(options.recordPath, summary);
  }
  if (options.format === "ndjson") {
    process.stdout.write(formatResultNdjson(summary));
  } else if (options.format === "tsv") {
    process.stdout.write(formatResultTsv(summary, { includeHeader: true }));
  } else {
    process.stdout.write(`${stableStringify(summary, 2)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
