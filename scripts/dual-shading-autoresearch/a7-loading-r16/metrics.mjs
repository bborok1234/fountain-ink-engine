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

function bytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  const a = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
  const b = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function weightedQuantile(samples, fraction) {
  if (samples.length === 0) return 0;
  const ordered = [...samples].sort((left, right) => left.value - right.value);
  const totalWeight = ordered.reduce((sum, entry) => sum + entry.weight, 0);
  const target = totalWeight * fraction;
  let cumulative = 0;
  for (const sample of ordered) {
    cumulative += sample.weight;
    if (cumulative >= target) return sample.value;
  }
  return ordered.at(-1).value;
}

function reconstruct(total, residual, f0) {
  return {
    primary: (1 - f0) * total - residual,
    secondary: f0 * total + residual,
  };
}

function speciesTotals(state) {
  let primary = 0;
  let secondary = 0;
  let residual = 0;
  let minimumSpecies = Infinity;
  let finite = true;
  for (const [totalName, residualName] of PHASE_PAIRS) {
    for (let index = 0; index < state[totalName].length; index += 1) {
      const total = state[totalName][index];
      const localResidual = state[residualName][index];
      const species = reconstruct(total, localResidual, state.initialSecondaryFraction);
      if (![total, localResidual, species.primary, species.secondary].every(Number.isFinite)) {
        finite = false;
      }
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
    minimumSpecies: Number.isFinite(minimumSpecies) ? minimumSpecies : 0,
    finite,
  };
}

function connected(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const sizes = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    const stack = [start];
    visited[start] = 1;
    let size = 0;
    while (stack.length > 0) {
      const index = stack.pop();
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next] === 0 || visited[next] === 1) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  const pixels = sizes.reduce((sum, value) => sum + value, 0);
  const isolated = sizes.filter((value) => value <= 2)
    .reduce((sum, value) => sum + value, 0);
  return {
    largest: sizes[0] ?? 0,
    largestShare: pixels === 0 ? 0 : (sizes[0] ?? 0) / pixels,
    isolatedShare: pixels === 0 ? 0 : isolated / pixels,
  };
}

function isInterior(mask, width, height, index) {
  if (mask[index] === 0) return false;
  const x = index % width;
  const y = Math.floor(index / width);
  return x > 0 && y > 0 && x < width - 1 && y < height - 1
    && mask[index - 1] === 1 && mask[index + 1] === 1
    && mask[index - width] === 1 && mask[index + width] === 1;
}

function regionSpan(samples) {
  return weightedQuantile(samples, 0.95) - weightedQuantile(samples, 0.05);
}

export function analyzeLoad(fixture, scale) {
  let finiteNonnegative = true;
  let outsideZero = true;
  let total = 0;
  let highLoadCells = 0;
  let contactCells = 0;
  for (let index = 0; index < fixture.arealLoad.data.length; index += 1) {
    const value = fixture.arealLoad.data[index];
    if (!Number.isFinite(value) || value < 0) finiteNonnegative = false;
    if (fixture.contactMask[index] === 0 && value !== 0) outsideZero = false;
    if (fixture.contactMask[index] === 1) {
      contactCells += 1;
      if (value > scale * 1.05) highLoadCells += 1;
    }
    total += value;
  }
  const center = fixture.arealLoad.data[20 * 56 + 28];
  const armSamples = [];
  if (fixture.shape === "cross") {
    for (let x = 14; x <= 21; x += 1) {
      armSamples.push(fixture.arealLoad.data[20 * 56 + x]);
    }
  }
  const positiveArms = armSamples.filter((value) => value > 0);
  const armMean = positiveArms.length === 0
    ? 0
    : positiveArms.reduce((sum, value) => sum + value, 0) / positiveArms.length;
  return Object.freeze({
    repeatExact: bytesEqual(fixture.arealLoad.data, fixture.repeatLoad.data),
    finiteNonnegative,
    outsideZero,
    total: roundMetric(total),
    maximum: roundMetric(Math.max(...fixture.arealLoad.data)),
    interiorMinimum: roundMetric(
      fixture.interiorLoad.length === 0 ? 0 : Math.min(...fixture.interiorLoad),
    ),
    interiorMaximum: roundMetric(
      fixture.interiorLoad.length === 0 ? 0 : Math.max(...fixture.interiorLoad),
    ),
    highLoadOccupancy: roundMetric(
      contactCells === 0 ? 0 : highLoadCells / contactCells,
    ),
    crossJunctionToArmRatio: roundMetric(
      armMean === 0 ? 0 : center / armMean,
    ),
  });
}

export function analyzePhysical(fixture, fractionDeltaMinimum = 0.008) {
  const before = speciesTotals(fixture.initialState);
  const after = speciesTotals(fixture.state);
  let initialResidualMaximum = 0;
  for (const [, residualName] of PHASE_PAIRS) {
    for (const value of fixture.initialState[residualName]) {
      initialResidualMaximum = Math.max(initialResidualMaximum, Math.abs(value));
    }
  }
  const massScale = Math.max(before.total, 1e-12);
  let maximumVisible = 0;
  for (let index = 0; index < fixture.contactMask.length; index += 1) {
    maximumVisible = Math.max(
      maximumVisible,
      fixture.state.mobileTotalMass[index] + fixture.state.adsorbedTotalMass[index],
    );
  }
  const threshold = Math.max(1e-7, maximumVisible * 0.01);
  const samples = [];
  const body = [];
  const junction = [];
  const positive = new Uint8Array(fixture.contactMask.length);
  const negative = new Uint8Array(fixture.contactMask.length);
  let signed = 0;
  let signedContact = 0;
  let signedInterior = 0;
  for (let index = 0; index < fixture.contactMask.length; index += 1) {
    const total = fixture.state.mobileTotalMass[index]
      + fixture.state.adsorbedTotalMass[index];
    if (total < threshold) continue;
    const residual = fixture.state.mobileSecondaryResidualMass[index]
      + fixture.state.adsorbedSecondaryResidualMass[index];
    const delta = residual / total;
    const sample = { value: delta, weight: total };
    samples.push(sample);
    const x = index % fixture.state.width;
    const y = Math.floor(index / fixture.state.width);
    if (Math.abs(x - 28) <= 4 && Math.abs(y - 20) <= 4) junction.push(sample);
    if (Math.abs(x - 28) >= 7 && Math.abs(y - 20) <= 5) body.push(sample);
    if (delta >= fractionDeltaMinimum) positive[index] = 1;
    if (delta <= -fractionDeltaMinimum) negative[index] = 1;
    if (positive[index] === 0 && negative[index] === 0) continue;
    signed += 1;
    if (fixture.contactMask[index] === 0) continue;
    signedContact += 1;
    if (isInterior(fixture.contactMask, fixture.state.width, fixture.state.height, index)) {
      signedInterior += 1;
    }
  }
  const pos = connected(positive, fixture.state.width, fixture.state.height);
  const neg = connected(negative, fixture.state.width, fixture.state.height);
  const q05 = weightedQuantile(samples, 0.05);
  const q95 = weightedQuantile(samples, 0.95);
  return Object.freeze({
    allFinite: before.finite && after.finite,
    minimumSpecies: roundMetric(after.minimumSpecies, 10),
    initialSecondaryFraction: fixture.initialState.initialSecondaryFraction,
    initialResidualMaximum: roundMetric(initialResidualMaximum, 10),
    primaryConservationError: roundMetric(Math.abs(after.primary - before.primary) / massScale, 10),
    secondaryConservationError: roundMetric(Math.abs(after.secondary - before.secondary) / massScale, 10),
    residualConservationError: roundMetric(Math.abs(after.residual) / massScale, 10),
    q05: roundMetric(q05),
    q95: roundMetric(q95),
    fractionSpan: roundMetric(q95 - q05),
    bodyFractionSpan: roundMetric(regionSpan(body)),
    junctionFractionSpan: roundMetric(regionSpan(junction)),
    signedAreaRatio: roundMetric(samples.length === 0 ? 0 : signed / samples.length),
    signedInteriorShare: roundMetric(signedContact === 0 ? 0 : signedInterior / signedContact),
    positivePatchPixels: pos.largest,
    negativePatchPixels: neg.largest,
    positivePatchShare: roundMetric(pos.largestShare),
    negativePatchShare: roundMetric(neg.largestShare),
    speckleShare: roundMetric(
      signed === 0
        ? 0
        : (pos.isolatedShare + neg.isolatedShare) / 2,
    ),
  });
}

function pixelContrast(data, offset, paper) {
  return Math.max(
    Math.abs(data[offset] - paper[0]),
    Math.abs(data[offset + 1] - paper[1]),
    Math.abs(data[offset + 2] - paper[2]),
  );
}

export function analyzeOptical({ transported, wellMixed, contactMask, paper }) {
  const changed = new Uint8Array(contactMask.length);
  let alphaDeltaMaximum = 0;
  let inkPixels = 0;
  let changedPixels = 0;
  let deltaTotal = 0;
  let baselineForeground = 0;
  let retained = 0;
  let mixedContrastTotal = 0;
  let transportedContrastTotal = 0;
  for (let index = 0; index < contactMask.length; index += 1) {
    const offset = index * 4;
    const a = pixelContrast(transported.data, offset, paper);
    const b = pixelContrast(wellMixed.data, offset, paper);
    const delta = Math.max(
      Math.abs(transported.data[offset] - wellMixed.data[offset]),
      Math.abs(transported.data[offset + 1] - wellMixed.data[offset + 1]),
      Math.abs(transported.data[offset + 2] - wellMixed.data[offset + 2]),
    );
    alphaDeltaMaximum = Math.max(
      alphaDeltaMaximum,
      Math.abs(transported.data[offset + 3] - wellMixed.data[offset + 3]),
    );
    if (a >= 8 || b >= 8) {
      inkPixels += 1;
      deltaTotal += delta;
    }
    if (delta >= 1) {
      changedPixels += 1;
      changed[index] = 1;
    }
    if (b >= 8) {
      baselineForeground += 1;
      mixedContrastTotal += b;
      transportedContrastTotal += a;
      if (a >= 8) retained += 1;
    }
  }
  const components = connected(changed, transported.width, transported.height);
  let changedContact = 0;
  let changedInterior = 0;
  for (let index = 0; index < changed.length; index += 1) {
    if (changed[index] === 0 || contactMask[index] === 0) continue;
    changedContact += 1;
    if (isInterior(contactMask, transported.width, transported.height, index)) {
      changedInterior += 1;
    }
  }
  return Object.freeze({
    alphaDeltaMaximum,
    changedAreaRatio: roundMetric(inkPixels === 0 ? 0 : changedPixels / inkPixels),
    meanMaximumChannelDelta: roundMetric(inkPixels === 0 ? 0 : deltaTotal / inkPixels),
    changedPatchPixels: components.largest,
    changedPatchShare: roundMetric(components.largestShare),
    changedSpeckleShare: roundMetric(components.isolatedShare),
    changedInteriorShare: roundMetric(
      changedContact === 0 ? 0 : changedInterior / changedContact,
    ),
    readabilityContrastRatio: roundMetric(
      mixedContrastTotal === 0 ? 1 : transportedContrastTotal / mixedContrastTotal,
    ),
    readabilityRetentionRatio: roundMetric(
      baselineForeground === 0 ? 1 : retained / baselineForeground,
    ),
  });
}
