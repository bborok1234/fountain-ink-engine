function median(values) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function runs(alpha, width, height, horizontal, threshold) {
  const values = [];
  const outer = horizontal ? height : width;
  const inner = horizontal ? width : height;
  for (let a = 0; a < outer; a += 1) {
    let run = 0;
    for (let b = 0; b <= inner; b += 1) {
      const x = horizontal ? b : a;
      const y = horizontal ? a : b;
      const filled = b < inner && alpha[y * width + x] >= threshold;
      if (filled) run += 1;
      else if (run > 0) {
        values.push(run);
        run = 0;
      }
    }
  }
  return values;
}

/** Analyze a final glyph Contact alpha plane without Canvas or font access. */
export function analyzeContactAlpha(alpha, width, height, threshold = 128) {
  if (!(alpha instanceof Uint8ClampedArray) || alpha.length !== width * height) {
    throw new TypeError("alpha must be a width * height Uint8ClampedArray.");
  }
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 255) {
    throw new TypeError("threshold must be an integer in 1...255.");
  }
  const filled = new Uint8Array(alpha.length);
  for (let index = 0; index < alpha.length; index += 1) {
    filled[index] = alpha[index] >= threshold ? 1 : 0;
  }
  const visited = new Uint8Array(alpha.length);
  const holes = [];
  let components = 0;
  const visit = (start, filledRegion) => {
    const queue = [start];
    visited[start] = 1;
    let area = 0;
    let touchesEdge = false;
    while (queue.length) {
      const index = queue.pop();
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (visited[next] || Boolean(filled[next]) !== filledRegion) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    return { area, touchesEdge };
  };
  for (let index = 0; index < alpha.length; index += 1) {
    if (visited[index]) continue;
    if (filled[index]) components += 1;
    else {
      const region = visit(index, false);
      if (!region.touchesEdge) holes.push(region.area);
      continue;
    }
    visit(index, true);
  }

  const distance = new Float32Array(alpha.length);
  distance.fill(Number.POSITIVE_INFINITY);
  for (let index = 0; index < filled.length; index += 1) {
    if (!filled[index]) distance[index] = 0;
  }
  const relax = (x, y, nx, ny, cost) => {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
    const index = y * width + x;
    distance[index] = Math.min(distance[index], distance[ny * width + nx] + cost);
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!filled[y * width + x]) continue;
      relax(x, y, x - 1, y, 1);
      relax(x, y, x, y - 1, 1);
      relax(x, y, x - 1, y - 1, Math.SQRT2);
      relax(x, y, x + 1, y - 1, Math.SQRT2);
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      if (!filled[y * width + x]) continue;
      relax(x, y, x + 1, y, 1);
      relax(x, y, x, y + 1, 1);
      relax(x, y, x + 1, y + 1, Math.SQRT2);
      relax(x, y, x - 1, y + 1, Math.SQRT2);
    }
  }
  const centerDiameters = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!filled[index]) continue;
      const value = distance[index];
      let localMaximum = true;
      for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny += 1) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx += 1) {
          if (distance[ny * width + nx] > value + 1e-6) localMaximum = false;
        }
      }
      if (localMaximum) centerDiameters.push(value * 2);
    }
  }
  return Object.freeze({
    alphaThreshold: threshold,
    connectedComponents: components,
    counterCount: holes.length,
    counterAreas: Object.freeze(holes.sort((a, b) => a - b)),
    medianStrokeWidth: median(centerDiameters),
    medianHorizontalRun: median(runs(alpha, width, height, true, threshold)),
    medianVerticalRun: median(runs(alpha, width, height, false, threshold)),
  });
}
