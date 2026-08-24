import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import {
  EDGE_DYE_COMPONENT_RECIPE_R14,
  WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  compositeDyeFiniteLoadingTransportedOptical,
  compositeDyeFiniteLoadingWellMixedControlOptical,
  finiteLoadingDyeOpticalModelVersion,
  freezeDyeComponentRecipe,
} from "fountain-ink-engine";
import {
  FIXTURE_HEIGHT,
  FIXTURE_WIDTH,
  PAPER_PROFILES,
  SHAPE_PROFILES,
  WIDTH_PROFILES,
  runFixture,
} from "./fixtures.mjs";
import {
  aggregateMatrix,
  analyzeOptical,
  analyzePhysicalState,
  paretoDominates,
} from "./metrics.mjs";

export const ENGINE_BASELINE_VERSION = "0.43.0-experimental.1";
export const CANDIDATE_SCHEMA_VERSION =
  "dual-shading-autoresearch-candidate-v1";
export const MAX_CANDIDATE_MILLISECONDS = 30_000;

export const REPOSITORY_ROOT = fileURLToPath(
  new URL("../../", import.meta.url),
);
export const DEFAULT_CANDIDATE_PATH = new URL(
  "../../research/dual-shading-autoresearch/candidate.json",
  import.meta.url,
);
export const DEFAULT_LOCK_PATH = new URL(
  "../../research/dual-shading-autoresearch/evaluator-lock.json",
  import.meta.url,
);
export const DEFAULT_RESULTS_PATH = new URL(
  "../../research/dual-shading-autoresearch/results.ndjson",
  import.meta.url,
);
export const PHOTO_ANNOTATION_PATH = new URL(
  "../../research/dual-shading-autoresearch/photo-topology-v1.json",
  import.meta.url,
);

const LOCKED_PATHS = Object.freeze([
  "package-lock.json",
  "package.json",
  "research/dual-shading-autoresearch/photo-topology-v1.json",
  "scripts/dual-shading-autoresearch/evaluator.mjs",
  "scripts/dual-shading-autoresearch/fixtures.mjs",
  "scripts/dual-shading-autoresearch/metrics.mjs",
]);

const ENGINE_SOURCE_TREE_PATH = "src";

const CANDIDATE_KEYS = Object.freeze([
  "schemaVersion",
  "id",
  "hypothesis",
  "note",
  "primaryDiffusivity",
  "secondaryDiffusivity",
  "primaryAdsorptionRate",
  "secondaryAdsorptionRate",
  "primaryDesorptionRate",
  "secondaryDesorptionRate",
]);

const RATE_KEYS = Object.freeze(CANDIDATE_KEYS.slice(4));
const DYE_STATE_PLANES = Object.freeze([
  "mobileTotalMass",
  "mobileSecondaryResidualMass",
  "adsorbedTotalMass",
  "adsorbedSecondaryResidualMass",
  "depthTotalMass",
  "depthSecondaryResidualMass",
]);

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function collectTreeFiles(directoryUrl, relativeDirectory = "") {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  const files = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory === ""
      ? entry.name
      : `${relativeDirectory}/${entry.name}`;
    const entryUrl = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      directoryUrl,
    );
    if (entry.isSymbolicLink()) {
      throw new Error(`engine source lock rejects symbolic link ${relativePath}.`);
    }
    if (entry.isDirectory()) {
      files.push(...await collectTreeFiles(entryUrl, relativePath));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`engine source lock rejects non-file ${relativePath}.`);
    }
    files.push(Object.freeze({ relativePath, bytes: await readFile(entryUrl) }));
  }
  return files;
}

export async function computeEngineSourceTreeDigest({
  repositoryRoot = REPOSITORY_ROOT,
} = {}) {
  const directoryUrl = new URL(
    `${ENGINE_SOURCE_TREE_PATH}/`,
    `file://${repositoryRoot}/`,
  );
  const hash = createHash("sha256");
  const files = await collectTreeFiles(directoryUrl);
  for (const { relativePath, bytes } of files) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.byteLength));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortedValue(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value, space = 0) {
  return JSON.stringify(sortedValue(value), null, space);
}

function assertPlainObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
}

function assertExactKeys(value, expectedKeys, path) {
  const actual = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} keys mismatch; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable data property.`);
    }
  }
}

function assertText(value, path, maximumLength) {
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.length > maximumLength
  ) {
    throw new TypeError(
      `${path} must be a non-empty string of at most ${maximumLength} characters.`,
    );
  }
}

export function validateCandidate(candidate) {
  assertPlainObject(candidate, "candidate");
  assertExactKeys(candidate, CANDIDATE_KEYS, "candidate");
  if (candidate.schemaVersion !== CANDIDATE_SCHEMA_VERSION) {
    throw new TypeError(
      `candidate.schemaVersion must be ${CANDIDATE_SCHEMA_VERSION}.`,
    );
  }
  assertText(candidate.id, "candidate.id", 64);
  if (!/^dual-shading-[a-z0-9][a-z0-9._-]*$/.test(candidate.id)) {
    throw new TypeError(
      "candidate.id must start with dual-shading- and use lowercase URL-safe characters.",
    );
  }
  assertText(candidate.hypothesis, "candidate.hypothesis", 500);
  assertText(candidate.note, "candidate.note", 500);
  for (const key of RATE_KEYS) {
    if (
      !Number.isFinite(candidate[key])
      || candidate[key] < 0
      || candidate[key] > 1
    ) {
      throw new TypeError(`candidate.${key} must be finite in 0...1.`);
    }
  }
  return true;
}

function candidateRecipe(candidate) {
  validateCandidate(candidate);
  return freezeDyeComponentRecipe({
    ...EDGE_DYE_COMPONENT_RECIPE_R14,
    id: candidate.id,
    revision: 1,
    ...Object.fromEntries(RATE_KEYS.map((key) => [key, candidate[key]])),
  });
}

function assertLockShape(lock) {
  assertPlainObject(lock, "evaluatorLock");
  assertExactKeys(
    lock,
    [
      "schemaVersion",
      "algorithm",
      "files",
      "engineSourceTreeDigest",
      "baselineMatrixDigest",
    ],
    "evaluatorLock",
  );
  if (lock.schemaVersion !== "dual-shading-evaluator-lock-v2") {
    throw new TypeError(
      "evaluatorLock.schemaVersion must be dual-shading-evaluator-lock-v2.",
    );
  }
  if (lock.algorithm !== "sha256") {
    throw new TypeError("evaluatorLock.algorithm must be sha256.");
  }
  assertPlainObject(lock.files, "evaluatorLock.files");
  assertExactKeys(lock.files, LOCKED_PATHS, "evaluatorLock.files");
  for (const path of LOCKED_PATHS) {
    if (!/^[0-9a-f]{64}$/.test(lock.files[path])) {
      throw new TypeError(`evaluatorLock.files[${path}] must be a SHA-256 hex digest.`);
    }
  }
  for (const name of ["engineSourceTreeDigest", "baselineMatrixDigest"]) {
    if (!/^[0-9a-f]{64}$/.test(lock[name])) {
      throw new TypeError(`evaluatorLock.${name} must be a SHA-256 hex digest.`);
    }
  }
}

export function assertPinnedDigests(expected, actual) {
  assertExactKeys(actual, LOCKED_PATHS, "actualEvaluatorDigests");
  for (const path of LOCKED_PATHS) {
    if (actual[path] !== expected[path]) {
      throw new Error(
        `evaluator lock mismatch for ${path}: expected ${expected[path]}, received ${actual[path]}.`,
      );
    }
  }
  return true;
}

export function assertPinnedEngineSourceDigest(expected, actual) {
  if (actual !== expected) {
    throw new Error(
      `engine source tree lock mismatch: expected ${expected}, received ${actual}.`,
    );
  }
  return true;
}

export async function verifyEvaluatorLock({
  lockPath = DEFAULT_LOCK_PATH,
  repositoryRoot = REPOSITORY_ROOT,
} = {}) {
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  assertLockShape(lock);
  const actual = {};
  for (const path of LOCKED_PATHS) {
    const bytes = await readFile(new URL(path, `file://${repositoryRoot}/`));
    actual[path] = sha256Bytes(bytes);
  }
  assertPinnedDigests(lock.files, actual);
  assertPinnedEngineSourceDigest(
    lock.engineSourceTreeDigest,
    await computeEngineSourceTreeDigest({ repositoryRoot }),
  );
  return Object.freeze({
    lock: Object.freeze(lock),
    digest: sha256Bytes(stableStringify(lock)),
  });
}

async function assertEngineBaselineVersion() {
  const packageJson = JSON.parse(await readFile(
    new URL("../../package.json", import.meta.url),
    "utf8",
  ));
  if (packageJson.version !== ENGINE_BASELINE_VERSION) {
    throw new Error(
      `dual-shading evaluator is pinned to engine ${ENGINE_BASELINE_VERSION}; received ${String(packageJson.version)}. Refresh the evaluator lock deliberately.`,
    );
  }
}

function updateTypedArray(hash, value) {
  hash.update(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
}

function fixtureStateDigest(fixture) {
  const hash = createHash("sha256");
  hash.update(fixture.id);
  hash.update(String(fixture.steps));
  for (const name of DYE_STATE_PLANES) updateTypedArray(hash, fixture.state[name]);
  updateTypedArray(hash, fixture.baseRgba.data);
  updateTypedArray(hash, fixture.concentration.data);
  return hash.digest("hex");
}

function imageDigest(...images) {
  const hash = createHash("sha256");
  for (const image of images) updateTypedArray(hash, image.data);
  return hash.digest("hex");
}

function compositePair(fixture, recipe) {
  const common = {
    pixelWidth: FIXTURE_WIDTH,
    pixelHeight: FIXTURE_HEIGHT,
    baseRgba: fixture.baseRgba,
    concentration: fixture.concentration,
    dyeComponent: fixture.state,
    dyeComponentRecipe: recipe,
    paperOpticalProfile: WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  };
  return {
    transported: compositeDyeFiniteLoadingTransportedOptical(common),
    wellMixed: compositeDyeFiniteLoadingWellMixedControlOptical(common),
  };
}

function assertWithinDeadline(deadline) {
  if (performance.now() > deadline) {
    throw new Error(
      `candidate exceeded the ${MAX_CANDIDATE_MILLISECONDS}ms evaluator budget.`,
    );
  }
}

function compactCase(entry) {
  return Object.freeze({
    id: entry.fixture.id,
    shape: entry.fixture.shape,
    width: entry.fixture.widthId,
    paper: entry.fixture.paperId,
    steps: entry.fixture.steps,
    stateDigest: fixtureStateDigest(entry.fixture),
    opticalDigest: imageDigest(
      entry.opticalPair.transported,
      entry.opticalPair.wellMixed,
    ),
    physical: entry.physical,
    optical: entry.optical,
  });
}

async function evaluateCandidateWithAnnotation(
  candidate,
  annotation,
  { maximumMilliseconds = MAX_CANDIDATE_MILLISECONDS } = {},
) {
  if (
    !Number.isFinite(maximumMilliseconds)
    || maximumMilliseconds <= 0
    || maximumMilliseconds > MAX_CANDIDATE_MILLISECONDS
  ) {
    throw new TypeError(
      `maximumMilliseconds must be finite in 1...${MAX_CANDIDATE_MILLISECONDS}.`,
    );
  }
  const recipe = candidateRecipe(candidate);
  const targets = annotation.evaluatorTargets;
  const paperChannels = [
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.red,
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.green,
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.blue,
  ];
  const deadline = performance.now() + maximumMilliseconds;
  const candidateCases = [];
  const baselineCases = [];
  let repeatExact = true;
  for (const shape of SHAPE_PROFILES) {
    for (const widthProfile of WIDTH_PROFILES) {
      for (const paperProfile of PAPER_PROFILES) {
        assertWithinDeadline(deadline);
        const options = { shape, widthProfile, paperProfile };
        const first = runFixture({ ...options, dyeComponentRecipe: recipe });
        const second = runFixture({ ...options, dyeComponentRecipe: recipe });
        const baseline = runFixture({
          ...options,
          dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R14,
        });
        const firstOptical = compositePair(first, recipe);
        const secondOptical = compositePair(second, recipe);
        const baselineOptical = compositePair(
          baseline,
          EDGE_DYE_COMPONENT_RECIPE_R14,
        );
        const exact = fixtureStateDigest(first) === fixtureStateDigest(second)
          && imageDigest(
            firstOptical.transported,
            firstOptical.wellMixed,
          ) === imageDigest(
            secondOptical.transported,
            secondOptical.wellMixed,
          );
        repeatExact &&= exact;
        const candidateEntry = {
          fixture: first,
          opticalPair: firstOptical,
          physical: analyzePhysicalState({
            initialState: first.initialState,
            state: first.state,
            contactMask: first.contactMask,
            fractionDeltaMinimum: targets.fractionDeltaMinimum,
            visibleMassAbsoluteMinimum: targets.visibleMassAbsoluteMinimum,
            visibleMassRelativeMinimum: targets.visibleMassRelativeMinimum,
          }),
          optical: analyzeOptical({
            transported: firstOptical.transported,
            wellMixed: firstOptical.wellMixed,
            baselineTransported: baselineOptical.transported,
            contactMask: first.contactMask,
            paperChannels,
            foregroundContrastMinimum: targets.foregroundContrastMinimum,
            changedChannelMinimum: targets.changedChannelMinimum,
            strongChangedChannelMinimum:
              targets.strongChangedChannelMinimum,
          }),
        };
        const baselineEntry = {
          fixture: baseline,
          opticalPair: baselineOptical,
          physical: analyzePhysicalState({
            initialState: baseline.initialState,
            state: baseline.state,
            contactMask: baseline.contactMask,
            fractionDeltaMinimum: targets.fractionDeltaMinimum,
            visibleMassAbsoluteMinimum: targets.visibleMassAbsoluteMinimum,
            visibleMassRelativeMinimum: targets.visibleMassRelativeMinimum,
          }),
          optical: analyzeOptical({
            transported: baselineOptical.transported,
            wellMixed: baselineOptical.wellMixed,
            baselineTransported: baselineOptical.transported,
            contactMask: baseline.contactMask,
            paperChannels,
            foregroundContrastMinimum: targets.foregroundContrastMinimum,
            changedChannelMinimum: targets.changedChannelMinimum,
            strongChangedChannelMinimum:
              targets.strongChangedChannelMinimum,
          }),
        };
        candidateCases.push(compactCase(candidateEntry));
        baselineCases.push(compactCase(baselineEntry));
      }
    }
  }
  assertWithinDeadline(deadline);
  const candidateAggregate = aggregateMatrix(
    candidateCases,
    annotation,
    { repeatExact },
  );
  const baselineAggregate = aggregateMatrix(
    baselineCases,
    annotation,
    { repeatExact: true },
  );
  return {
    candidateCases,
    baselineCases,
    candidateAggregate,
    baselineAggregate,
    repeatExact,
  };
}

export async function evaluateCandidateFromFile({
  candidatePath = DEFAULT_CANDIDATE_PATH,
  lockPath = DEFAULT_LOCK_PATH,
  maximumMilliseconds = MAX_CANDIDATE_MILLISECONDS,
} = {}) {
  const lockInfo = await verifyEvaluatorLock({ lockPath });
  await assertEngineBaselineVersion();
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  validateCandidate(candidate);
  const annotation = JSON.parse(await readFile(PHOTO_ANNOTATION_PATH, "utf8"));
  const evaluated = await evaluateCandidateWithAnnotation(
    candidate,
    annotation,
    { maximumMilliseconds },
  );
  const candidateDigest = sha256Bytes(stableStringify(candidate));
  const matrixDigest = sha256Bytes(stableStringify(evaluated.candidateCases));
  const baselineMatrixDigest = sha256Bytes(
    stableStringify(evaluated.baselineCases),
  );
  if (baselineMatrixDigest !== lockInfo.lock.baselineMatrixDigest) {
    throw new Error(
      `baseline matrix lock mismatch: expected ${lockInfo.lock.baselineMatrixDigest}, received ${baselineMatrixDigest}.`,
    );
  }
  const baselineDominatesCandidate = paretoDominates(
    evaluated.baselineAggregate.pareto,
    evaluated.candidateAggregate.pareto,
  );
  const candidateDominatesBaseline = paretoDominates(
    evaluated.candidateAggregate.pareto,
    evaluated.baselineAggregate.pareto,
  );
  const status = !evaluated.candidateAggregate.passed
    ? "reject-hard"
    : evaluated.baselineAggregate.passed && baselineDominatesCandidate
      ? "reject-dominated"
      : "shortlist";
  const resultId = sha256Bytes(
    `${candidateDigest}:${lockInfo.digest}:${matrixDigest}`,
  ).slice(0, 20);
  return Object.freeze({
    schemaVersion: "dual-shading-autoresearch-result-v1",
    resultId,
    status,
    automaticNinePointClaim: false,
    candidate: Object.freeze(candidate),
    candidateDigest,
    evaluatorLockDigest: lockInfo.digest,
    fixedBaseline: Object.freeze({
      engineVersion: ENGINE_BASELINE_VERSION,
      dyeRecipe: "edge-dye-study@14",
      opticalModel: finiteLoadingDyeOpticalModelVersion,
      paletteAndInitialFraction: "fixed-from-edge-dye-study@14",
      papers: Object.freeze(PAPER_PROFILES.map(({ recipe }) =>
        `${recipe.id}@${recipe.revision}`)),
      matrixDigest: baselineMatrixDigest,
    }),
    evaluatorMatrix: Object.freeze({
      shapes: Object.freeze([...SHAPE_PROFILES]),
      widths: Object.freeze(WIDTH_PROFILES.map(({ id }) => id)),
      papers: Object.freeze(PAPER_PROFILES.map(({ id }) => id)),
      caseCount: evaluated.candidateCases.length,
      repeatExact: evaluated.repeatExact,
      matrixDigest,
    }),
    hardGates: Object.freeze({
      passed: evaluated.candidateAggregate.passed,
      failures: evaluated.candidateAggregate.failures,
    }),
    pareto: Object.freeze({
      candidate: evaluated.candidateAggregate.pareto,
      baseline: evaluated.baselineAggregate.pareto,
      baselineDominatesCandidate,
      candidateDominatesBaseline,
      weightedScore: null,
    }),
    topology: evaluated.candidateAggregate.topology,
    cases: Object.freeze(evaluated.candidateCases),
    humanReview: Object.freeze({
      requiredForAccepted: true,
      requiredForNinePointClaim: true,
      protocol: "blinded normal-size comparison against the pinned real-photo topology families",
      completed: false,
    }),
  });
}

export function resultRow(summary) {
  return Object.freeze({
    schemaVersion: "dual-shading-autoresearch-row-v2",
    resultId: summary.resultId,
    candidateId: summary.candidate.id,
    candidate: summary.candidate,
    candidateDigest: summary.candidateDigest,
    evaluatorLockDigest: summary.evaluatorLockDigest,
    matrixDigest: summary.evaluatorMatrix.matrixDigest,
    status: summary.status,
    hardGateFailures: summary.hardGates.failures,
    pareto: summary.pareto.candidate,
    baselineDominatesCandidate: summary.pareto.baselineDominatesCandidate,
    candidateDominatesBaseline: summary.pareto.candidateDominatesBaseline,
    automaticNinePointClaim: false,
  });
}

export function formatResultNdjson(summary) {
  return `${stableStringify(resultRow(summary))}\n`;
}

export const RESULT_TSV_HEADER = Object.freeze([
  "resultId",
  "candidateId",
  "status",
  "hardGateFailureCount",
  "candidateDigest",
  "matrixDigest",
  "paretoJson",
]);

export function formatResultTsv(summary, { includeHeader = false } = {}) {
  const row = [
    summary.resultId,
    summary.candidate.id,
    summary.status,
    String(summary.hardGates.failures.length),
    summary.candidateDigest,
    summary.evaluatorMatrix.matrixDigest,
    stableStringify(summary.pareto.candidate),
  ].join("\t");
  return includeHeader
    ? `${RESULT_TSV_HEADER.join("\t")}\n${row}\n`
    : `${row}\n`;
}
