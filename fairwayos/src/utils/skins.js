// Calculate skins results for a round
// holes: array of hole objects with strokeIndex
// playerScores: array of { playerId, grossScores, netScores }
// type: 'gross' | 'net'
// Returns array of { hole, winnerId, carryover, pot } (pot = number of skins carried)
export function calcSkins(holes, playerScores, type = 'gross') {
  const results = [];
  let carryover = 0;

  for (let i = 0; i < 18; i++) {
    const scores = playerScores.map(ps => ({
      playerId: ps.playerId,
      score: type === 'gross' ? ps.grossScores[i] : ps.netScores[i],
    })).filter(s => s.score && s.score > 0);

    if (scores.length === 0) {
      results.push({ hole: i + 1, winnerId: null, carryover: true, pot: carryover + 1 });
      carryover++;
      continue;
    }

    const min = Math.min(...scores.map(s => s.score));
    const winners = scores.filter(s => s.score === min);

    if (winners.length === 1) {
      const pot = carryover + 1;
      results.push({ hole: i + 1, winnerId: winners[0].playerId, carryover: false, pot });
      carryover = 0;
    } else {
      results.push({ hole: i + 1, winnerId: null, carryover: true, pot: carryover + 1 });
      carryover++;
    }
  }

  return results;
}

// Summarize skins won per player for a round
export function skinsSummary(skinsResults) {
  const summary = {};
  skinsResults.forEach(result => {
    if (result.winnerId) {
      summary[result.winnerId] = (summary[result.winnerId] || 0) + result.pot;
    }
  });
  return summary;
}

// Season skins totals across all rounds
export function seasonSkinsTotals(rounds) {
  const totals = {};
  rounds.forEach(round => {
    if (round.skinsResults) {
      const summary = skinsSummary(round.skinsResults);
      Object.entries(summary).forEach(([playerId, count]) => {
        totals[playerId] = (totals[playerId] || 0) + count;
      });
    }
  });
  return totals;
}
