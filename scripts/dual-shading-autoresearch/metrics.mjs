const PHASE_PAIRS = Object.freeze([
  Object.freeze(["mobileTotalMass", "mobileSecondaryResidualMass"]),
  Object.freeze(["adsorbedTotalMass", "adsorbedSecondaryResidualMass"]),
  Object.freeze(["depthTotalMass", "depthSecondaryResidualMass"]),
]);

export function roundMetric(value, digits = 8) {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function weightedQuantile(samples, fraction) {
  if (samples.length === 0) return 0;
  const ordered = [...samples].sort((left, right) => left.value - right.value);
  const totalWeight = ordered.reduce((sum, sample) => sum + sample.weight, 0);
  const target = totalWeight * Math.max(0, Math.min(1, fraction));
  let cumulative = 0;
  for (const sample of ordered) {
    cumulative += sample.weight;
    if (cumulative >= target) return sample.value;
  }
  return ordered.at(-1).value;
}

function reconstructSpecies(total, residual, initialSecondaryFraction) {
  return {
    primary: (1 - initialSecondaryFraction) * total - residual,
    secondary: initialSecondaryFraction * total + residual,
  };
}

function speciesTotals(state) {
  let primary = 0;
  let secondary = 0;
  let residual = 0;
  let allFinite = true;
  let minimumSpecies = Number.POSITIVE_INFINITY;
  for (const [totalName, residualName] of PHASE_PAIRS) {
    const totals = state[totalName];
    const residuals = state[residualName];
    for (let index = 0; index < totals.length; index += 1) {
      const total = totals[index];
      const localResidual = residuals[index];
      const species = reconstructSpecies(
        total,
        localResidual,
        state.initialSecondaryFraction,
      );
      if (
        !Number.isFinite(total)
        || !Number.isFinite(localResidual)
        || !Number.isFinite(species.primary)
        || !Number.isFinite(species.secondary)
      ) allFinite = false;
      minimumSpecies = Math.min(
        minimumSpecies,
        total,
        species.primary,
        species.secondary,
      );
      primary += species.primary;
      secondary += species.secondary;
      residual += localResidual;
    }
  }
  return {
    primary,
    secondary,
    residual,
    total: primary + secondary,
    allFinite,
    minimumSpecies: Number.isFinite(minimumSpecies) ? minimumSpecies : 0,
  };
}

function isContactInterior(contact, width, height, index) {
  if (contact[index] === 0) return false;
  const x = index % width;
  const y = Math.floor(index / width);
  return x > 0
    && y > 0
    && x < width - 1
    && y < height - 1
    && contact[index - 1] === 1
    && contact[index + 1] === 1
    && contact[index - width] === 1
    && contact[index + width] === 1;
}

export function connectedComponentStats(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const sizes = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    visited[start] = 1;
    const pending = [start];
    let size = 0;
    while (pending.length > 0) {
      const index = pending.pop();
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (const [dx, dy] of neighbors) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (
          nextX < 0
          || nextY < 0
          || nextX >= width
          || nextY >= height
        ) continue;
        const next = nextY * width + nextX;
        if (mask[next] === 0 || visited[next] === 1) continue;
        visited[next] = 1;
        pending.push(next);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  const pixelCount = sizes.reduce((sum, size) => sum + size, 0);
  const isolatedPixels = sizes
    .filter((size) => size <= 2)
    .reduce((sum, size) => sum + size, 0);
  return {
    componentCount: sizes.length,
    pixelCount,
    largest: sizes[0] ?? 0,
    largestShare: pixelCount === 0 ? 0 : (sizes[0] ?? 0) / pixelCount,
    isolatedShare: pixelCount === 0 ? 0 : isolatedPixels / pixelCount,
  };
}

export function analyzePhysicalState({
  initialState,
  state,
  contactMask,
  fractionDeltaMinimum,
  visibleMassAbsoluteMinimum,
  visibleMassRelativeMinimum,
}) {
  const before = speciesTotals(initialState);
  const after = speciesTotals(state);
  let maximumVisibleTotal = 0;
  for (let index = 0; index < contactMask.length; index += 1) {
    maximumVisibleTotal = Math.max(
      maximumVisibleTotal,
      state.mobileTotalMass[index] + state.adsorbedTotalMass[index],
    );
  }
  const visibleMassThreshold = Math.max(
    visibleMassAbsoluteMinimum,
    maximumVisibleTotal * visibleMassRelativeMinimum,
  );
  const visibleFractionSamples = [];
  const positiveMask = new Uint8Array(contactMask.length);
  const negativeMask = new Uint8Array(contactMask.length);
  let visibleCells = 0;
  let signedCells = 0;
  let signedContactCells = 0;
  let signedInteriorCells = 0;
  for (let index = 0; index < contactMask.length; index += 1) {
    const visibleTotal = state.mobileTotalMass[index]
      + state.adsorbedTotalMass[index];
    const visibleResidual = state.mobileSecondaryResidualMass[index]
      + state.adsorbedSecondaryResidualMass[index];
    if (!(visibleTotal >= visibleMassThreshold)) continue;
    visibleCells += 1;
    const fractionDelta = visibleResidual / visibleTotal;
    visibleFractionSamples.push({ value: fractionDelta, weight: visibleTotal });
    const positive = fractionDelta >= fractionDeltaMinimum;
    const negative = fractionDelta <= -fractionDeltaMinimum;
    if (positive) positiveMask[index] = 1;
    if (negative) negativeMask[index] = 1;
    if (!positive && !negative) continue;
    signedCells += 1;
    if (contactMask[index] !== 1) continue;
    signedContactCells += 1;
    if (isContactInterior(
      contactMask,
      state.width,
      state.height,
      index,
    )) signedInteriorCells += 1;
  }
  const positive = connectedComponentStats(
    positiveMask,
    state.width,
    state.height,
  );
  const negative = connectedComponentStats(
    negativeMask,
    state.width,
    state.height,
  );
  const massScale = Math.max(before.total, 1e-12);
  const q05 = weightedQuantile(visibleFractionSamples, 0.05);
  const q50 = weightedQuantile(visibleFractionSamples, 0.5);
  const q95 = weightedQuantile(visibleFractionSamples, 0.95);
  return {
    allFinite: before.allFinite && after.allFinite,
    minimumSpecies: roundMetric(after.minimumSpecies, 10),
    primaryConservationError: roundMetric(
      Math.abs(after.primary - before.primary) / massScale,
      10,
    ),
    secondaryConservationError: roundMetric(
      Math.abs(after.secondary - before.secondary) / massScale,
      10,
    ),
    residualConservationError: roundMetric(
      Math.abs(after.residual) / massScale,
      10,
    ),
    visibleMassThreshold: roundMetric(visibleMassThreshold, 10),
    visibleCells,
    q05: roundMetric(q05),
    q50: roundMetric(q50),
    q95: roundMetric(q95),
    fractionSpan: roundMetric(q95 - q05),
    signedAreaRatio: roundMetric(
      visibleCells === 0 ? 0 : signedCells / visibleCells,
    ),
    signedInteriorShare: roundMetric(
      signedContactCells === 0 ? 0 : signedInteriorCells / signedContactCells,
    ),
    positivePatchPixels: positive.largest,
    negativePatchPixels: negative.largest,
    positivePatchShare: roundMetric(positive.largestShare),
    negativePatchShare: roundMetric(negative.largestShare),
    speckleShare: roundMetric(
      signedCells === 0
        ? 0
        : (
          positive.isolatedShare * positive.pixelCount
          + negative.isolatedShare * negative.pixelCount
        ) / signedCells,
    ),
  };
}

function pixelContrast(data, offset, paperChannels) {
  return Math.max(
    Math.abs(data[offset] - paperChannels[0]),
    Math.abs(data[offset + 1] - paperChannels[1]),
    Math.abs(data[offset + 2] - paperChannels[2]),
  );
}

export function analyzeOptical({
  transported,
  wellMixed,
  baselineTransported,
  contactMask,
  paperChannels,
  foregroundContrastMinimum,
  changedChannelMinimum,
  strongChangedChannelMinimum,
}) {
  const width = transported.width;
  const height = transported.height;
  const changedMask = new Uint8Array(width * height);
  let alphaDeltaMaximum = 0;
  let inkPixels = 0;
  let changedPixels = 0;
  let strongChangedPixels = 0;
  let totalMaxChannelDelta = 0;
  let maximumChannelDelta = 0;
  let baselineForegroundPixels = 0;
  let retainedForegroundPixels = 0;
  let candidateContrastTotal = 0;
  let baselineContrastTotal = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const transportedContrast = pixelContrast(
      transported.data,
      offset,
      paperChannels,
    );
    const mixedContrast = pixelContrast(
      wellMixed.data,
      offset,
      paperChannels,
    );
    const baselineContrast = pixelContrast(
      baselineTransported.data,
      offset,
      paperChannels,
    );
    const maxChannelDelta = Math.max(
      Math.abs(transported.data[offset] - wellMixed.data[offset]),
      Math.abs(transported.data[offset + 1] - wellMixed.data[offset + 1]),
      Math.abs(transported.data[offset + 2] - wellMixed.data[offset + 2]),
    );
    alphaDeltaMaximum = Math.max(
      alphaDeltaMaximum,
      Math.abs(transported.data[offset + 3] - wellMixed.data[offset + 3]),
    );
    if (
      transportedContrast >= foregroundContrastMinimum
      || mixedContrast >= foregroundContrastMinimum
    ) {
      inkPixels += 1;
      totalMaxChannelDelta += maxChannelDelta;
    }
    maximumChannelDelta = Math.max(maximumChannelDelta, maxChannelDelta);
    if (maxChannelDelta >= changedChannelMinimum) {
      changedPixels += 1;
      changedMask[index] = 1;
    }
    if (maxChannelDelta >= strongChangedChannelMinimum) {
      strongChangedPixels += 1;
    }
    if (baselineContrast < foregroundContrastMinimum) continue;
    baselineForegroundPixels += 1;
    baselineContrastTotal += baselineContrast;
    candidateContrastTotal += transportedContrast;
    if (transportedContrast >= foregroundContrastMinimum) {
      retainedForegroundPixels += 1;
    }
  }
  const components = connectedComponentStats(changedMask, width, height);
  let changedContactCells = 0;
  let changedInteriorCells = 0;
  for (let index = 0; index < changedMask.length; index += 1) {
    if (changedMask[index] === 0 || contactMask[index] === 0) continue;
    changedContactCells += 1;
    if (isContactInterior(contactMask, width, height, index)) {
      changedInteriorCells += 1;
    }
  }
  const baselineMeanContrast = baselineForegroundPixels === 0
    ? 0
    : baselineContrastTotal / baselineForegroundPixels;
  const candidateMeanContrast = baselineForegroundPixels === 0
    ? 0
    : candidateContrastTotal / baselineForegroundPixels;
  return {
    alphaDeltaMaximum,
    inkPixels,
    changedPixels,
    changedAreaRatio: roundMetric(
      inkPixels === 0 ? 0 : changedPixels / inkPixels,
    ),
    strongChangedAreaRatio: roundMetric(
      inkPixels === 0 ? 0 : strongChangedPixels / inkPixels,
    ),
    meanMaximumChannelDelta: roundMetric(
      inkPixels === 0 ? 0 : totalMaxChannelDelta / inkPixels,
    ),
    maximumChannelDelta,
    changedPatchPixels: components.largest,
    changedPatchShare: roundMetric(components.largestShare),
    changedSpeckleShare: roundMetric(components.isolatedShare),
    changedInteriorShare: roundMetric(
      changedContactCells === 0
        ? 0
        : changedInteriorCells / changedContactCells,
    ),
    readabilityContrastRatio: roundMetric(
      baselineMeanContrast === 0
        ? 1
        : candidateMeanContrast / baselineMeanContrast,
    ),
    readabilityRetentionRatio: roundMetric(
      baselineForegroundPixels === 0
        ? 1
        : retainedForegroundPixels / baselineForegroundPixels,
    ),
  };
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function requiredCase(entry, targets) {
  return targets.requiredWidths.includes(entry.width)
    && targets.requiredPapers.includes(entry.paper)
    && targets.requiredShapes.includes(entry.shape);
}

function groupMean(cases, key, property) {
  const matching = cases.filter((entry) => entry[key] === property);
  return mean(matching.map((entry) => entry.physical.fractionSpan));
}

export function aggregateMatrix(cases, annotation, { repeatExact }) {
  const targets = annotation.evaluatorTargets;
  const gates = targets.hardGates;
  const failures = [];
  if (!repeatExact) failures.push("determinism/repeat-not-exact");
  for (const entry of cases) {
    const { physical, optical } = entry;
    if (!physical.allFinite) failures.push(`${entry.id}/finite`);
    if (physical.minimumSpecies < -gates.nonnegativeTolerance) {
      failures.push(`${entry.id}/nonnegative`);
    }
    if (
      physical.primaryConservationError > gates.conservationRelativeMaximum
      || physical.secondaryConservationError > gates.conservationRelativeMaximum
    ) failures.push(`${entry.id}/species-conservation`);
    if (
      physical.residualConservationError > gates.residualRelativeMaximum
    ) failures.push(`${entry.id}/residual-conservation`);
    if (optical.alphaDeltaMaximum !== 0) {
      failures.push(`${entry.id}/optical-alpha`);
    }
    if (
      optical.readabilityContrastRatio < gates.readabilityContrastRatioMinimum
      || optical.readabilityRetentionRatio < gates.readabilityRetentionRatioMinimum
    ) failures.push(`${entry.id}/readability`);
    if (!requiredCase(entry, targets)) continue;
    if (
      physical.q05 > -targets.fractionDeltaMinimum
      || physical.q95 < targets.fractionDeltaMinimum
      || physical.positivePatchPixels < gates.signedPatchMinimumPixels
      || physical.negativePatchPixels < gates.signedPatchMinimumPixels
    ) failures.push(`${entry.id}/signed-patches`);
    if (physical.signedAreaRatio > gates.globalRecolorAreaMaximum) {
      failures.push(`${entry.id}/global-recolor`);
    }
    if (
      physical.signedInteriorShare < gates.interiorShareMinimum
      || physical.signedInteriorShare > gates.interiorShareMaximum
    ) failures.push(`${entry.id}/perfect-outline`);
    if (physical.speckleShare > gates.speckleShareMaximum) {
      failures.push(`${entry.id}/state-speckle`);
    }
    if (
      optical.changedAreaRatio < gates.opticalChangedAreaMinimum
      || optical.meanMaximumChannelDelta < gates.opticalMeanChannelDeltaMinimum
    ) failures.push(`${entry.id}/optical-ab-too-weak`);
    if (optical.changedAreaRatio > gates.opticalChangedAreaMaximum) {
      failures.push(`${entry.id}/optical-global-recolor`);
    }
    if (
      optical.changedPatchPixels < gates.opticalPatchMinimumPixels
      || optical.changedPatchShare < gates.opticalPatchShareMinimum
    ) failures.push(`${entry.id}/optical-fragmented`);
    if (
      optical.changedInteriorShare < gates.opticalInteriorShareMinimum
      || optical.changedInteriorShare > gates.opticalInteriorShareMaximum
    ) failures.push(`${entry.id}/optical-outline`);
    if (optical.changedSpeckleShare > gates.speckleShareMaximum) {
      failures.push(`${entry.id}/optical-speckle`);
    }
  }

  const paperFractionSpan = Object.fromEntries(
    ["smooth", "balanced", "absorbent"].map((paper) => [
      paper,
      roundMetric(groupMean(
        cases.filter((entry) => targets.requiredWidths.includes(entry.width)),
        "paper",
        paper,
      )),
    ]),
  );
  const porousMean = mean([
    paperFractionSpan.balanced,
    paperFractionSpan.absorbent,
  ]);
  const paperResponseRatio = porousMean
    / Math.max(paperFractionSpan.smooth, 1e-12);
  if (paperResponseRatio < gates.paperResponseRatioMinimum) {
    failures.push("matrix/paper-topology");
  }
  const nibFractionSpan = Object.fromEntries(
    ["thin", "medium", "broad"].map((width) => [
      width,
      roundMetric(mean(cases
        .filter((entry) => targets.requiredPapers.includes(entry.paper))
        .filter((entry) => entry.width === width)
        .map((entry) => entry.physical.fractionSpan))),
    ]),
  );
  const nibResponseRatio = nibFractionSpan.broad
    / Math.max(nibFractionSpan.thin, 1e-12);
  if (nibResponseRatio < gates.nibBroadToThinRatioMinimum) {
    failures.push("matrix/nib-topology");
  }

  const required = cases.filter((entry) => requiredCase(entry, targets));
  const patchCoherence = mean(required.map((entry) => Math.min(
    entry.physical.positivePatchShare,
    entry.physical.negativePatchShare,
  )));
  const artifactIntegrity = mean(required.map((entry) => Math.min(
    1 - entry.physical.speckleShare,
    1 - entry.optical.changedSpeckleShare,
    1 - Math.abs(entry.physical.signedInteriorShare - 0.5),
  )));
  const rawSignedFractionSpan = mean(
    required.map((entry) => entry.physical.fractionSpan),
  );
  const rawOpticalChangedArea = mean(
    required.map((entry) => entry.optical.changedAreaRatio),
  );
  const rawOpticalMeanChannelDelta = mean(
    required.map((entry) => entry.optical.meanMaximumChannelDelta),
  );
  const saturate = (value, target) => Math.max(0, Math.min(1, value / target));
  const paretoTargets = targets.paretoTargets;
  const pareto = Object.freeze({
    signedFractionFidelity: roundMetric(saturate(
      rawSignedFractionSpan,
      paretoTargets.signedFractionSpanSaturation,
    )),
    connectedPatchCoherence: roundMetric(patchCoherence),
    opticalAreaFidelity: roundMetric(saturate(
      rawOpticalChangedArea,
      paretoTargets.opticalChangedAreaSaturation,
    )),
    opticalDeltaFidelity: roundMetric(saturate(
      rawOpticalMeanChannelDelta,
      paretoTargets.opticalMeanChannelDeltaSaturation,
    )),
    minimumReadability: roundMetric(Math.min(
      ...cases.map((entry) => Math.min(
        entry.optical.readabilityContrastRatio,
        entry.optical.readabilityRetentionRatio,
      )),
    )),
    paperResponseFidelity: roundMetric(saturate(
      paperResponseRatio,
      paretoTargets.paperResponseRatioSaturation,
    )),
    nibResponseFidelity: roundMetric(saturate(
      nibResponseRatio,
      paretoTargets.nibBroadToThinRatioSaturation,
    )),
    artifactIntegrity: roundMetric(artifactIntegrity),
  });
  return Object.freeze({
    passed: failures.length === 0,
    failures: Object.freeze([...new Set(failures)].sort()),
    topology: Object.freeze({
      paperFractionSpan: Object.freeze(paperFractionSpan),
      nibFractionSpan: Object.freeze(nibFractionSpan),
      paperResponseRatio: roundMetric(paperResponseRatio),
      nibBroadToThinRatio: roundMetric(nibResponseRatio),
    }),
    pareto,
  });
}

export function paretoDominates(left, right, epsilon = 1e-8) {
  const keys = Object.keys(right);
  const noWorse = keys.every((key) => left[key] + epsilon >= right[key]);
  const strictlyBetter = keys.some((key) => left[key] > right[key] + epsilon);
  return noWorse && strictlyBetter;
}
