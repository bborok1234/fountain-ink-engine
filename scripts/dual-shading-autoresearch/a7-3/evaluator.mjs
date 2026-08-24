import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import {
  EDGE_DYE_COMPONENT_RECIPE_R15,
  WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  compositeDyeFiniteLoadingTransportedOptical,
  compositeDyeFiniteLoadingWellMixedControlOptical,
  finiteLoadingDyeOpticalModelVersion,
  freezeDyeComponentRecipe,
  serializeDyeComponentRecipe,
} from "fountain-ink-engine";
import {
  FIXTURE_HEIGHT,
  FIXTURE_WIDTH,
  PAPER_PROFILES,
  SHAPE_PROFILES,
  WIDTH_PROFILES,
  runFixture,
} from "../fixtures.mjs";
import {
  aggregateMatrix,
  analyzeOptical,
  analyzePhysicalState,
  paretoDominates,
} from "../metrics.mjs";
import {
  ENGINE_ROOT,
  computeCurrentEngineSourceTreeDigest,
  stableStringify,
  validateR14Archive,
} from "../archive-validator.mjs";
import {
  aggregateSharedVacancyCapacity,
  analyzeSharedVacancyCapacity,
} from "./capacity-metrics.mjs";

export const ENGINE_BASELINE_VERSION = "0.44.0-experimental.1";
export const CANDIDATE_SCHEMA_VERSION =
  "dual-shading-a7-3-shared-vacancy-candidate-v1";
export const EVALUATOR_LOCK_SCHEMA_VERSION =
  "dual-shading-a7-3-evaluator-lock-v1";
export const MAX_CANDIDATE_MILLISECONDS = 30_000;
export const MINIMUM_SHARED_ADSORPTION_CAPACITY = 0.01875;
export const MAXIMUM_SHARED_ADSORPTION_CAPACITY = 0.225;

export const DEFAULT_CANDIDATE_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/candidate.json",
  import.meta.url,
);
export const DEFAULT_LOCK_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/evaluator-lock.json",
  import.meta.url,
);
export const DEFAULT_RESULTS_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/results.ndjson",
  import.meta.url,
);
export const PHOTO_ANNOTATION_PATH = new URL(
  "../../../research/dual-shading-autoresearch/photo-topology-v1.json",
  import.meta.url,
);

const LOCKED_PATHS = Object.freeze([
  "package-lock.json",
  "package.json",
  "research/dual-shading-autoresearch/photo-topology-v1.json",
  "research/dual-shading-autoresearch/r14-archive-manifest.json",
  "scripts/dual-shading-autoresearch/archive-validator.mjs",
  "scripts/dual-shading-autoresearch/fixtures.mjs",
  "scripts/dual-shading-autoresearch/metrics.mjs",
  "scripts/dual-shading-autoresearch/a7-3/capacity-metrics.mjs",
  "scripts/dual-shading-autoresearch/a7-3/evaluator.mjs",
  "scripts/dual-shading-autoresearch/a7-3/run.mjs",
  "scripts/dual-shading-autoresearch/a7-3/batch.mjs",
]);

const CANDIDATE_KEYS = Object.freeze([
  "schemaVersion",
  "id",
  "hypothesis",
  "note",
  "sharedAdsorptionCapacity",
]);

const DYE_STATE_PLANES = Object.freeze([
  "mobileTotalMass",
  "mobileSecondaryResidualMass",
  "adsorbedTotalMass",
  "adsorbedSecondaryResidualMass",
  "depthTotalMass",
  "depthSecondaryResidualMass",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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
  assertPlainObject(value, path);
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
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
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

function assertSha256(value, path) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    throw new TypeError(`${path} must be SHA-256 hex.`);
  }
}

export function validateCandidate(candidate) {
  assertExactKeys(candidate, CANDIDATE_KEYS, "candidate");
  if (candidate.schemaVersion !== CANDIDATE_SCHEMA_VERSION) {
    throw new TypeError(
      `candidate.schemaVersion must be ${CANDIDATE_SCHEMA_VERSION}.`,
    );
  }
  assertText(candidate.id, "candidate.id", 64);
  if (!/^dual-shading-a7-3-[a-z0-9][a-z0-9._-]*$/.test(candidate.id)) {
    throw new TypeError(
      "candidate.id must start with dual-shading-a7-3- and use lowercase URL-safe characters.",
    );
  }
  assertText(candidate.hypothesis, "candidate.hypothesis", 500);
  assertText(candidate.note, "candidate.note", 500);
  if (
    !Number.isFinite(candidate.sharedAdsorptionCapacity)
    || candidate.sharedAdsorptionCapacity < MINIMUM_SHARED_ADSORPTION_CAPACITY
    || candidate.sharedAdsorptionCapacity > MAXIMUM_SHARED_ADSORPTION_CAPACITY
  ) {
    throw new TypeError(
      `candidate.sharedAdsorptionCapacity must be finite in ${MINIMUM_SHARED_ADSORPTION_CAPACITY}...${MAXIMUM_SHARED_ADSORPTION_CAPACITY}.`,
    );
  }
  return true;
}

function candidateRecipe(candidate) {
  validateCandidate(candidate);
  return freezeDyeComponentRecipe({
    ...EDGE_DYE_COMPONENT_RECIPE_R15,
    id: candidate.id,
    revision: 1,
    sharedAdsorptionCapacity: candidate.sharedAdsorptionCapacity,
  });
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
  return Object.freeze({
    transported: compositeDyeFiniteLoadingTransportedOptical(common),
    wellMixed: compositeDyeFiniteLoadingWellMixedControlOptical(common),
  });
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
    capacity: entry.capacity,
  });
}

function analyzeFixture({ fixture, opticalPair, baselineOptical, recipe, targets }) {
  const paperChannels = [
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.red,
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.green,
    WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.blue,
  ];
  return compactCase({
    fixture,
    opticalPair,
    physical: analyzePhysicalState({
      initialState: fixture.initialState,
      state: fixture.state,
      contactMask: fixture.contactMask,
      fractionDeltaMinimum: targets.fractionDeltaMinimum,
      visibleMassAbsoluteMinimum: targets.visibleMassAbsoluteMinimum,
      visibleMassRelativeMinimum: targets.visibleMassRelativeMinimum,
    }),
    optical: analyzeOptical({
      transported: opticalPair.transported,
      wellMixed: opticalPair.wellMixed,
      baselineTransported: baselineOptical.transported,
      contactMask: fixture.contactMask,
      paperChannels,
      foregroundContrastMinimum: targets.foregroundContrastMinimum,
      changedChannelMinimum: targets.changedChannelMinimum,
      strongChangedChannelMinimum: targets.strongChangedChannelMinimum,
    }),
    capacity: analyzeSharedVacancyCapacity({
      state: fixture.state,
      capacity: recipe.sharedAdsorptionCapacity,
    }),
  });
}

async function evaluateWithAnnotation(
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
          dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R15,
        });
        const firstOptical = compositePair(first, recipe);
        const secondOptical = compositePair(second, recipe);
        const baselineOptical = compositePair(
          baseline,
          EDGE_DYE_COMPONENT_RECIPE_R15,
        );
        repeatExact &&=
          fixtureStateDigest(first) === fixtureStateDigest(second)
          && imageDigest(
            firstOptical.transported,
            firstOptical.wellMixed,
          ) === imageDigest(
            secondOptical.transported,
            secondOptical.wellMixed,
          );
        candidateCases.push(analyzeFixture({
          fixture: first,
          opticalPair: firstOptical,
          baselineOptical,
          recipe,
          targets: annotation.evaluatorTargets,
        }));
        baselineCases.push(analyzeFixture({
          fixture: baseline,
          opticalPair: baselineOptical,
          baselineOptical,
          recipe: EDGE_DYE_COMPONENT_RECIPE_R15,
          targets: annotation.evaluatorTargets,
        }));
      }
    }
  }
  assertWithinDeadline(deadline);
  return Object.freeze({
    candidateCases: Object.freeze(candidateCases),
    baselineCases: Object.freeze(baselineCases),
    candidateAggregate: aggregateMatrix(candidateCases, annotation, {
      repeatExact,
    }),
    baselineAggregate: aggregateMatrix(baselineCases, annotation, {
      repeatExact: true,
    }),
    candidateCapacity: aggregateSharedVacancyCapacity(candidateCases),
    baselineCapacity: aggregateSharedVacancyCapacity(baselineCases),
    repeatExact,
  });
}

async function readAnnotation() {
  return JSON.parse(await readFile(PHOTO_ANNOTATION_PATH, "utf8"));
}

async function baselineMatrixDigest() {
  const baselineCandidate = {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    id: "dual-shading-a7-3-lock-baseline",
    hypothesis: "Lock the authored R15 shared-vacancy baseline.",
    note: "This candidate exists only while generating the evaluator lock.",
    sharedAdsorptionCapacity:
      EDGE_DYE_COMPONENT_RECIPE_R15.sharedAdsorptionCapacity,
  };
  const evaluated = await evaluateWithAnnotation(
    baselineCandidate,
    await readAnnotation(),
  );
  return sha256(stableStringify(evaluated.baselineCases));
}

async function digestLockedFiles({ engineRoot = ENGINE_ROOT } = {}) {
  const files = {};
  for (const path of LOCKED_PATHS) {
    files[path] = sha256(await readFile(
      new URL(path, `file://${engineRoot}/`),
    ));
  }
  return files;
}

export async function createEvaluatorLock({ engineRoot = ENGINE_ROOT } = {}) {
  const archive = await validateR14Archive({ engineRoot });
  if (!archive.currentRuntimeRejected) {
    throw new Error("A7-3 lock requires the current runtime to reject R14.");
  }
  const archiveManifestBytes = await readFile(
    new URL(
      "research/dual-shading-autoresearch/r14-archive-manifest.json",
      `file://${engineRoot}/`,
    ),
  );
  return Object.freeze({
    schemaVersion: EVALUATOR_LOCK_SCHEMA_VERSION,
    algorithm: "sha256",
    evaluatorId: "dual-shading-a7-3-shared-vacancy-v1",
    engineVersion: ENGINE_BASELINE_VERSION,
    fixedBaseline: Object.freeze({
      dyeRecipe: "edge-dye-study@15",
      opticalModel: finiteLoadingDyeOpticalModelVersion,
      candidateSchemaVersion: CANDIDATE_SCHEMA_VERSION,
      sharedAdsorptionCapacity:
        EDGE_DYE_COMPONENT_RECIPE_R15.sharedAdsorptionCapacity,
    }),
    files: Object.freeze(await digestLockedFiles({ engineRoot })),
    engineSourceTreeDigest: await computeCurrentEngineSourceTreeDigest({
      engineRoot,
    }),
    baseRecipeCanonicalDigest: sha256(
      serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R15),
    ),
    baselineMatrixDigest: await baselineMatrixDigest(),
    predecessor: Object.freeze({
      evaluatorLockDigest: archive.evaluatorLockDigest,
      archiveManifestDigest: sha256(archiveManifestBytes),
      conclusion: archive.conclusion,
    }),
  });
}

function validateEvaluatorLock(lock) {
  assertExactKeys(lock, [
    "schemaVersion",
    "algorithm",
    "evaluatorId",
    "engineVersion",
    "fixedBaseline",
    "files",
    "engineSourceTreeDigest",
    "baseRecipeCanonicalDigest",
    "baselineMatrixDigest",
    "predecessor",
  ], "evaluatorLock");
  if (lock.schemaVersion !== EVALUATOR_LOCK_SCHEMA_VERSION) {
    throw new TypeError(`evaluatorLock.schemaVersion must be ${EVALUATOR_LOCK_SCHEMA_VERSION}.`);
  }
  if (
    lock.algorithm !== "sha256"
    || lock.evaluatorId !== "dual-shading-a7-3-shared-vacancy-v1"
    || lock.engineVersion !== ENGINE_BASELINE_VERSION
  ) {
    throw new TypeError("evaluatorLock identity does not match A7-3.");
  }
  assertExactKeys(lock.fixedBaseline, [
    "dyeRecipe",
    "opticalModel",
    "candidateSchemaVersion",
    "sharedAdsorptionCapacity",
  ], "evaluatorLock.fixedBaseline");
  if (
    lock.fixedBaseline.dyeRecipe !== "edge-dye-study@15"
    || lock.fixedBaseline.opticalModel !== finiteLoadingDyeOpticalModelVersion
    || lock.fixedBaseline.candidateSchemaVersion !== CANDIDATE_SCHEMA_VERSION
    || lock.fixedBaseline.sharedAdsorptionCapacity
      !== EDGE_DYE_COMPONENT_RECIPE_R15.sharedAdsorptionCapacity
  ) {
    throw new TypeError("evaluatorLock fixed baseline does not match R15.");
  }
  assertExactKeys(lock.files, LOCKED_PATHS, "evaluatorLock.files");
  for (const [path, digest] of Object.entries(lock.files)) {
    assertSha256(digest, `evaluatorLock.files[${path}]`);
  }
  for (const key of [
    "engineSourceTreeDigest",
    "baseRecipeCanonicalDigest",
    "baselineMatrixDigest",
  ]) assertSha256(lock[key], `evaluatorLock.${key}`);
  assertExactKeys(lock.predecessor, [
    "evaluatorLockDigest",
    "archiveManifestDigest",
    "conclusion",
  ], "evaluatorLock.predecessor");
  assertSha256(
    lock.predecessor.evaluatorLockDigest,
    "evaluatorLock.predecessor.evaluatorLockDigest",
  );
  assertSha256(
    lock.predecessor.archiveManifestDigest,
    "evaluatorLock.predecessor.archiveManifestDigest",
  );
  if (lock.predecessor.conclusion !== "capacity-free-r14-plateau") {
    throw new TypeError("evaluatorLock predecessor conclusion changed.");
  }
}

export async function verifyEvaluatorLock({
  lockPath = DEFAULT_LOCK_PATH,
  engineRoot = ENGINE_ROOT,
} = {}) {
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  validateEvaluatorLock(lock);
  const actualFiles = await digestLockedFiles({ engineRoot });
  for (const path of LOCKED_PATHS) {
    if (actualFiles[path] !== lock.files[path]) {
      throw new Error(`A7-3 evaluator lock mismatch for ${path}.`);
    }
  }
  const currentSourceTreeDigest = await computeCurrentEngineSourceTreeDigest({
    engineRoot,
  });
  if (currentSourceTreeDigest !== lock.engineSourceTreeDigest) {
    throw new Error("A7-3 engine source tree lock mismatch.");
  }
  const packageJson = JSON.parse(await readFile(
    new URL("package.json", `file://${engineRoot}/`),
    "utf8",
  ));
  if (packageJson.version !== ENGINE_BASELINE_VERSION) {
    throw new Error(
      `A7-3 evaluator is pinned to engine ${ENGINE_BASELINE_VERSION}; received ${String(packageJson.version)}.`,
    );
  }
  const recipeDigest = sha256(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R15),
  );
  if (recipeDigest !== lock.baseRecipeCanonicalDigest) {
    throw new Error("A7-3 base recipe canonical digest mismatch.");
  }
  const archive = await validateR14Archive({ engineRoot });
  if (
    archive.evaluatorLockDigest !== lock.predecessor.evaluatorLockDigest
    || archive.conclusion !== lock.predecessor.conclusion
    || lock.predecessor.archiveManifestDigest
      !== lock.files[
        "research/dual-shading-autoresearch/r14-archive-manifest.json"
      ]
  ) {
    throw new Error("A7-3 predecessor archive provenance mismatch.");
  }
  return Object.freeze({
    lock: Object.freeze(lock),
    digest: sha256(stableStringify(lock)),
  });
}

export async function evaluateCandidateFromFile({
  candidatePath = DEFAULT_CANDIDATE_PATH,
  lockPath = DEFAULT_LOCK_PATH,
  maximumMilliseconds = MAX_CANDIDATE_MILLISECONDS,
} = {}) {
  const lockInfo = await verifyEvaluatorLock({ lockPath });
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  validateCandidate(candidate);
  const evaluated = await evaluateWithAnnotation(
    candidate,
    await readAnnotation(),
    { maximumMilliseconds },
  );
  const candidateDigest = sha256(stableStringify(candidate));
  const matrixDigest = sha256(stableStringify(evaluated.candidateCases));
  const fixedBaselineMatrixDigest = sha256(
    stableStringify(evaluated.baselineCases),
  );
  if (fixedBaselineMatrixDigest !== lockInfo.lock.baselineMatrixDigest) {
    throw new Error(
      `A7-3 baseline matrix lock mismatch: expected ${lockInfo.lock.baselineMatrixDigest}, received ${fixedBaselineMatrixDigest}.`,
    );
  }
  const physicalPassed = evaluated.candidateAggregate.passed;
  const capacityPassed = evaluated.candidateCapacity.passed;
  const hardGateFailures = [
    ...evaluated.candidateAggregate.failures,
    ...evaluated.candidateCapacity.failures,
  ];
  const baselineDominatesCandidate = paretoDominates(
    evaluated.baselineAggregate.pareto,
    evaluated.candidateAggregate.pareto,
  );
  const candidateDominatesBaseline = paretoDominates(
    evaluated.candidateAggregate.pareto,
    evaluated.baselineAggregate.pareto,
  );
  const status = !physicalPassed || !capacityPassed
    ? "reject-hard"
    : evaluated.baselineAggregate.passed && baselineDominatesCandidate
      ? "reject-dominated"
      : "shortlist";
  const resultId = sha256(
    `${candidateDigest}:${lockInfo.digest}:${matrixDigest}`,
  ).slice(0, 20);
  return Object.freeze({
    schemaVersion: "dual-shading-a7-3-autoresearch-result-v1",
    resultId,
    status,
    automaticNinePointClaim: false,
    candidate: Object.freeze(candidate),
    candidateDigest,
    evaluatorLockDigest: lockInfo.digest,
    predecessor: lockInfo.lock.predecessor,
    fixedBaseline: Object.freeze({
      engineVersion: ENGINE_BASELINE_VERSION,
      dyeRecipe: "edge-dye-study@15",
      opticalModel: finiteLoadingDyeOpticalModelVersion,
      sharedAdsorptionCapacity:
        EDGE_DYE_COMPONENT_RECIPE_R15.sharedAdsorptionCapacity,
      paletteRatesAndInitialFraction: "fixed-from-edge-dye-study@15",
      papers: Object.freeze(PAPER_PROFILES.map(({ recipe }) =>
        `${recipe.id}@${recipe.revision}`)),
      matrixDigest: fixedBaselineMatrixDigest,
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
      passed: physicalPassed && capacityPassed,
      failures: Object.freeze(hardGateFailures),
    }),
    capacity: evaluated.candidateCapacity,
    pareto: Object.freeze({
      candidate: evaluated.candidateAggregate.pareto,
      baseline: evaluated.baselineAggregate.pareto,
      baselineDominatesCandidate,
      candidateDominatesBaseline,
      weightedScore: null,
    }),
    topology: evaluated.candidateAggregate.topology,
    cases: evaluated.candidateCases,
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
    schemaVersion: "dual-shading-a7-3-autoresearch-row-v1",
    resultId: summary.resultId,
    candidateId: summary.candidate.id,
    candidate: summary.candidate,
    candidateDigest: summary.candidateDigest,
    evaluatorLockDigest: summary.evaluatorLockDigest,
    predecessor: summary.predecessor,
    matrixDigest: summary.evaluatorMatrix.matrixDigest,
    status: summary.status,
    hardGateFailures: summary.hardGates.failures,
    capacity: summary.capacity,
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
  "sharedAdsorptionCapacity",
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
    String(summary.candidate.sharedAdsorptionCapacity),
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

export { stableStringify };
