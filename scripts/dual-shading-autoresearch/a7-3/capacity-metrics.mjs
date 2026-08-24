const FLOAT32_EPSILON = 2 ** -23;

function reconstructSpecies(total, residual, fraction) {
  return {
    primary: (1 - fraction) * total - residual,
    secondary: fraction * total + residual,
  };
}

function quantile(values, probability) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * probability)),
  );
  return sorted[index];
}

export function capacityFloat32Budget(capacity) {
  return Math.max(
    2e-6,
    Math.max(1, Math.abs(capacity)) * FLOAT32_EPSILON * 64,
  );
}

export function analyzeSharedVacancyCapacity({ state, capacity }) {
  if (!Number.isFinite(capacity) || !(capacity > 0)) {
    throw new TypeError("capacity must be a finite positive number.");
  }
  const total = state?.adsorbedTotalMass;
  const residual = state?.adsorbedSecondaryResidualMass;
  if (
    !(total instanceof Float32Array)
    || !(residual instanceof Float32Array)
    || total.length !== residual.length
    || total.length !== state.width * state.height
  ) {
    throw new TypeError("state must expose matching adsorbed total/residual planes.");
  }

  const budget = capacityFloat32Budget(capacity);
  const occupancies = [];
  let occupiedCells = 0;
  let saturatedCells = 0;
  let nonFiniteCells = 0;
  let negativeSpeciesCells = 0;
  let overflowCells = 0;
  let overflowPeak = 0;
  let minimumFreeSite = capacity;
  let adsorbedMass = 0;
  let saturatedMass = 0;
  let primaryAdsorbedMass = 0;
  let secondaryAdsorbedMass = 0;
  for (let index = 0; index < total.length; index += 1) {
    const amount = total[index];
    const localResidual = residual[index];
    if (!Number.isFinite(amount) || !Number.isFinite(localResidual)) {
      nonFiniteCells += 1;
      continue;
    }
    const species = reconstructSpecies(
      amount,
      localResidual,
      state.initialSecondaryFraction,
    );
    if (species.primary < 0 || species.secondary < 0 || amount < 0) {
      negativeSpeciesCells += 1;
    }
    primaryAdsorbedMass += species.primary;
    secondaryAdsorbedMass += species.secondary;
    if (!(amount > 0)) continue;
    occupiedCells += 1;
    adsorbedMass += amount;
    const occupancy = amount / capacity;
    occupancies.push(occupancy);
    if (occupancy >= 0.9) {
      saturatedCells += 1;
      saturatedMass += amount;
    }
    const overflow = Math.max(0, amount - capacity);
    if (overflow > budget) overflowCells += 1;
    overflowPeak = Math.max(overflowPeak, overflow);
    minimumFreeSite = Math.min(minimumFreeSite, capacity - amount);
  }
  const peakOccupancy = occupancies.length === 0
    ? 0
    : Math.max(...occupancies);
  return Object.freeze({
    capacity,
    budget,
    occupiedCells,
    saturatedCells,
    saturatedCellShare: occupiedCells === 0 ? 0 : saturatedCells / occupiedCells,
    saturatedMassShare: adsorbedMass === 0 ? 0 : saturatedMass / adsorbedMass,
    q50Occupancy: quantile(occupancies, 0.5),
    q95Occupancy: quantile(occupancies, 0.95),
    peakOccupancy,
    minimumFreeSite,
    overflowCells,
    overflowPeak,
    nonFiniteCells,
    negativeSpeciesCells,
    primaryAdsorbedMass,
    secondaryAdsorbedMass,
    passed:
      nonFiniteCells === 0
      && negativeSpeciesCells === 0
      && overflowCells === 0,
  });
}

export function aggregateSharedVacancyCapacity(cases) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new TypeError("cases must be a non-empty array.");
  }
  const failures = [];
  for (const entry of cases) {
    if (entry.capacity.passed) continue;
    if (entry.capacity.nonFiniteCells > 0) {
      failures.push(`${entry.id}/capacity-non-finite`);
    }
    if (entry.capacity.negativeSpeciesCells > 0) {
      failures.push(`${entry.id}/capacity-negative-species`);
    }
    if (entry.capacity.overflowCells > 0) {
      failures.push(`${entry.id}/capacity-overflow`);
    }
  }
  return Object.freeze({
    passed: failures.length === 0,
    failures: Object.freeze(failures),
    minimumQ95Occupancy: Math.min(
      ...cases.map((entry) => entry.capacity.q95Occupancy),
    ),
    maximumQ95Occupancy: Math.max(
      ...cases.map((entry) => entry.capacity.q95Occupancy),
    ),
    maximumPeakOccupancy: Math.max(
      ...cases.map((entry) => entry.capacity.peakOccupancy),
    ),
    maximumSaturatedMassShare: Math.max(
      ...cases.map((entry) => entry.capacity.saturatedMassShare),
    ),
    maximumOverflowPeak: Math.max(
      ...cases.map((entry) => entry.capacity.overflowPeak),
    ),
  });
}
