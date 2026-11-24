// Diagnostic only. Rows supported here are two examples from GDOT DPM table 4.5.
// No posted speed substitution, road limit for a rail axis, or freeway limit for a ramp.
export function gradeWarning(
  sourceClass,
  designSpeedMph,
  terrain,
  peakPercent,
) {
  const limit = new Map([
    ["freeway/65/rolling", 4],
    ["urban arterial/30/rolling", 9],
  ]).get([sourceClass, designSpeedMph, terrain].join("/"));
  if (sourceClass === "standard_gauge") return "rail criteria unresolved";
  if (sourceClass === "motorway_link")
    return "ramp design speed and ramp-specific criterion unresolved";
  if (limit === undefined)
    return "applicable design class, speed, terrain or criterion unresolved";
  return peakPercent > limit
    ? "above contextual reference"
    : "within contextual reference";
}

export function gradeReport(surface) {
  const heights = surface.rows.map((row) => row[0]);
  const intervals = [];
  for (let i = 1; i < heights.length; i++) {
    const [a, b] = [heights[i - 1], heights[i]];
    const run = b[3] - a[3];
    if (run > 1e-6)
      intervals.push({
        percent: (100 * (b[1] - a[1])) / run,
        mid: (a[3] + b[3]) / 2,
      });
  }
  let change = 0,
    distance = 0,
    rate = 0;
  for (let i = 1; i < intervals.length; i++) {
    const a = intervals[i - 1],
      b = intervals[i],
      d = b.mid - a.mid,
      delta = Math.abs(b.percent - a.percent);
    if (delta / d > rate) {
      change = delta;
      distance = d;
      rate = delta / d;
    }
  }
  const peak = Math.max(...intervals.map((v) => Math.abs(v.percent)));
  return {
    peakPercent: peak,
    changePp: change,
    transitionM: distance,
    ratePpPerM: rate,
    screen: gradeWarning(
      surface.sourceClass,
      surface.designSpeedMph,
      surface.designTerrain,
      peak,
    ),
    transitionCriterion:
      "unverified; design speed and applicable vertical curve length unavailable",
  };
}
