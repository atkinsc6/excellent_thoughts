// Calculate course handicap (WHS)
export function calcCourseHandicap(handicapIndex, slope, rating, par) {
  return Math.round(handicapIndex * (slope / 113) + (rating - par));
}

// Calculate playing handicap
export function calcPlayingHandicap(courseHandicap, allowance = 1.0) {
  return Math.round(courseHandicap * allowance);
}

// Calculate strokes received per hole
// Returns array of 18 booleans/numbers: 1 = receives stroke, 0 = does not
// If playingHandicap > 18, some holes get 2 strokes
export function strokesReceivedPerHole(holes, playingHandicap) {
  return holes.map(hole => {
    if (playingHandicap >= hole.strokeIndex) {
      return playingHandicap >= hole.strokeIndex + 18 ? 2 : 1;
    }
    return 0;
  });
}

// Calculate net score for a hole
export function calcNetScore(gross, strokesReceived) {
  return gross - strokesReceived;
}

// Calculate stableford points for a hole
export function calcStableford(gross, par, strokesReceived) {
  if (!gross || gross === 0) return 0;
  const net = gross - strokesReceived;
  const pts = 2 + (par - net);
  return Math.max(0, pts);
}

// Calculate WHS handicap differential
export function calcDifferential(adjustedGross, courseRating, slopeRating) {
  return parseFloat(((adjustedGross - courseRating) * 113 / slopeRating).toFixed(1));
}

// Calculate handicap index from array of differentials (WHS method)
// Uses best 8 of last 20, multiply average by 0.96, cap at 54.0
export function calcHandicapIndex(differentials) {
  const last20 = differentials.slice(-20);
  if (last20.length === 0) return 0;

  const sorted = [...last20].sort((a, b) => a - b);
  const count = last20.length;

  let useCount;
  if (count <= 3) useCount = 1;
  else if (count <= 6) useCount = 2;
  else if (count <= 8) useCount = 2;
  else if (count <= 11) useCount = 3;
  else if (count <= 14) useCount = 4;
  else if (count <= 16) useCount = 5;
  else if (count <= 18) useCount = 6;
  else if (count === 19) useCount = 7;
  else useCount = 8;

  const best = sorted.slice(0, useCount);
  const avg = best.reduce((s, d) => s + d, 0) / useCount;
  const index = Math.min(54.0, parseFloat((avg * 0.96).toFixed(1)));
  return index;
}

// Scoring breakdown: count eagles, birdies, pars, bogeys, doubles, worse
export function calcScorecardBreakdown(grossScores, holes) {
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, worse = 0;
  grossScores.forEach((g, i) => {
    if (!g || !holes[i]) return;
    const d = g - holes[i].par;
    if (d <= -2) eagles++;
    else if (d === -1) birdies++;
    else if (d === 0) pars++;
    else if (d === 1) bogeys++;
    else if (d === 2) doubles++;
    else worse++;
  });
  return { eagles, birdies, pars, bogeys, doubles, worse };
}

// Partition rounds into first and second halves for split-season tracking
export function partitionRoundsByHalf(rounds, breakpoint) {
  const sorted = [...rounds].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!breakpoint) return { firstHalf: sorted, secondHalf: [] };
  if (breakpoint.type === 'round') {
    const n = breakpoint.value || 0;
    return { firstHalf: sorted.slice(0, n), secondHalf: sorted.slice(n) };
  }
  return {
    firstHalf: sorted.filter(r => r.date < breakpoint.value),
    secondHalf: sorted.filter(r => r.date >= breakpoint.value),
  };
}

// Adjusted gross score (Equitable Stroke Control)
export function adjustedGross(grossScores, holes, playingHandicap) {
  const maxPerHole = (hcp) => {
    if (hcp <= 9) return 7;
    if (hcp <= 19) return 8;
    if (hcp <= 29) return 9;
    if (hcp <= 39) return 10;
    return 11;
  };
  const max = maxPerHole(playingHandicap);
  return grossScores.reduce((sum, score, i) => {
    return sum + Math.min(score, max);
  }, 0);
}
