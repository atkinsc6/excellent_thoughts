import { calcSkins, skinsSummary } from './skins';
import { partitionRoundsByHalf } from './scoring';

export function calcSeasonAwards(players, rounds, courses, league) {
  if (!players.length || !rounds.length) return [];

  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p; });

  const playerStats = players.map(p => {
    const playerRounds = rounds.filter(r => r.playerIds?.includes(p.id));
    const grossScores = [];
    const netScores = [];
    let eagles = 0, birdies = 0;

    playerRounds.forEach(r => {
      const ps = r.scores?.find(s => s.playerId === p.id);
      if (!ps) return;
      if (ps.totalGross) grossScores.push(ps.totalGross);
      if (ps.totalNet) netScores.push(ps.totalNet);
      const course = courses.find(c => c.id === r.courseId);
      if (course && ps.grossScores) {
        ps.grossScores.forEach((g, i) => {
          const par = course.holes?.[i]?.par;
          if (!par || !g) return;
          const d = g - par;
          if (d <= -2) eagles++;
          else if (d === -1) birdies++;
        });
      }
    });

    let points = 0;
    rounds.forEach(r => {
      if (!r.playerIds?.includes(p.id)) return;
      const sorted = [...(r.scores || [])].sort((a, b) => a.totalNet - b.totalNet);
      const rank = sorted.findIndex(s => s.playerId === p.id) + 1;
      const pts = league?.pointsTable?.find(pt => pt.place === rank)?.points || 0;
      points += pts;
    });

    const avgNet = netScores.length ? netScores.reduce((s, v) => s + v, 0) / netScores.length : 0;
    const stdDev = netScores.length >= 4
      ? Math.sqrt(netScores.reduce((s, v) => s + (v - avgNet) ** 2, 0) / netScores.length)
      : null;

    return { id: p.id, name: p.name, roundsPlayed: playerRounds.length, grossScores, netScores, avgNet, stdDev, eagles, birdies, points };
  }).filter(s => s.roundsPlayed > 0);

  if (!playerStats.length) return [];

  const awards = [];

  // Season Champion
  const champion = [...playerStats].sort((a, b) => b.points - a.points || a.avgNet - b.avgNet)[0];
  awards.push({ id: 'season_champion', title: 'Season Champion', icon: '🏆', winnerId: champion.id, winnerName: champion.name, value: `${champion.points} pts`, description: 'Most season points' });

  // Low Gross (single round)
  let lgBest = null;
  rounds.forEach(r => r.scores?.forEach(ps => {
    if (ps.totalGross && (!lgBest || ps.totalGross < lgBest.score)) lgBest = { score: ps.totalGross, playerId: ps.playerId };
  }));
  if (lgBest && playerMap[lgBest.playerId]) awards.push({ id: 'low_gross', title: 'Low Gross', icon: '🎯', winnerId: lgBest.playerId, winnerName: playerMap[lgBest.playerId].name, value: String(lgBest.score), description: 'Lowest single-round gross score' });

  // Low Net (single round)
  let lnBest = null;
  rounds.forEach(r => r.scores?.forEach(ps => {
    if (ps.totalNet && (!lnBest || ps.totalNet < lnBest.score)) lnBest = { score: ps.totalNet, playerId: ps.playerId };
  }));
  if (lnBest && playerMap[lnBest.playerId]) awards.push({ id: 'low_net', title: 'Low Net', icon: '🥇', winnerId: lnBest.playerId, winnerName: playerMap[lnBest.playerId].name, value: String(lnBest.score), description: 'Lowest single-round net score' });

  // Eagle Eye
  const eagleLeader = [...playerStats].sort((a, b) => b.eagles - a.eagles)[0];
  if (eagleLeader?.eagles > 0) awards.push({ id: 'eagle_eye', title: 'Eagle Eye', icon: '🦅', winnerId: eagleLeader.id, winnerName: eagleLeader.name, value: `${eagleLeader.eagles} eagles`, description: 'Most eagles on the season' });

  // Birdie Machine
  const birdieLeader = [...playerStats].sort((a, b) => b.birdies - a.birdies)[0];
  if (birdieLeader?.birdies > 0) awards.push({ id: 'birdie_machine', title: 'Birdie Machine', icon: '🐦', winnerId: birdieLeader.id, winnerName: birdieLeader.name, value: `${birdieLeader.birdies} birdies`, description: 'Most birdies on the season' });

  // Skin King
  const skinTotals = {};
  rounds.forEach(r => {
    const course = courses.find(c => c.id === r.courseId);
    if (!course?.holes || !r.scores) return;
    const skinResults = calcSkins(course.holes, r.scores, league?.skinsType === 'gross' ? 'gross' : 'net');
    const summary = skinsSummary(skinResults);
    Object.entries(summary).forEach(([pid, skins]) => { skinTotals[pid] = (skinTotals[pid] || 0) + skins; });
  });
  const topSkins = Object.entries(skinTotals).sort((a, b) => b[1] - a[1])[0];
  if (topSkins && playerMap[topSkins[0]]) awards.push({ id: 'skin_king', title: 'Skin King', icon: '💰', winnerId: topSkins[0], winnerName: playerMap[topSkins[0]].name, value: `${topSkins[1]} skins`, description: 'Most skins won on the season' });

  // CTP King
  const ctpCounts = {};
  rounds.forEach(r => r.ctpResults?.forEach(c => { if (c.winnerId) ctpCounts[c.winnerId] = (ctpCounts[c.winnerId] || 0) + 1; }));
  const topCtp = Object.entries(ctpCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCtp && playerMap[topCtp[0]]) awards.push({ id: 'ctp_king', title: 'CTP King', icon: '📍', winnerId: topCtp[0], winnerName: playerMap[topCtp[0]].name, value: `${topCtp[1]} wins`, description: 'Most closest-to-pin wins' });

  // Most Consistent
  const consistent = [...playerStats].filter(s => s.stdDev !== null).sort((a, b) => a.stdDev - b.stdDev)[0];
  if (consistent) awards.push({ id: 'most_consistent', title: 'Most Consistent', icon: '📊', winnerId: consistent.id, winnerName: consistent.name, value: `±${consistent.stdDev.toFixed(1)}`, description: 'Lowest score variance (min 4 rounds)' });

  // Most Improved (biggest handicap drop)
  let mostImproved = null;
  let maxImprovement = 0;
  playerStats.forEach(ps => {
    const p = playerMap[ps.id];
    if (!p?.differentials || p.differentials.length < 2) return;
    const sorted = [...p.differentials].sort((a, b) => a.date.localeCompare(b.date));
    const improvement = sorted[0].differential - sorted[sorted.length - 1].differential;
    if (improvement > maxImprovement) { maxImprovement = improvement; mostImproved = ps; }
  });
  if (mostImproved) awards.push({ id: 'most_improved', title: 'Most Improved', icon: '📈', winnerId: mostImproved.id, winnerName: mostImproved.name, value: `-${maxImprovement.toFixed(1)} HCP`, description: 'Biggest handicap improvement this season' });

  // Iron Man
  const ironMan = [...playerStats].sort((a, b) => b.roundsPlayed - a.roundsPlayed)[0];
  awards.push({ id: 'iron_man', title: 'Iron Man', icon: '🏅', winnerId: ironMan.id, winnerName: ironMan.name, value: `${ironMan.roundsPlayed} rounds`, description: 'Most rounds played' });

  // Comeback Player (only when halves enabled)
  if (league?.splitIntoHalves && league?.halvesBreakpoint) {
    const { firstHalf, secondHalf } = partitionRoundsByHalf(rounds, league.halvesBreakpoint);
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      let bestComeback = null;
      let bestImprovement = -Infinity;
      players.forEach(p => {
        const fhR = firstHalf.filter(r => r.playerIds?.includes(p.id));
        const shR = secondHalf.filter(r => r.playerIds?.includes(p.id));
        if (!fhR.length || !shR.length) return;
        const fhAvg = fhR.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 0), 0) / fhR.length;
        const shAvg = shR.reduce((s, r) => s + (r.scores?.find(sc => sc.playerId === p.id)?.totalNet || 0), 0) / shR.length;
        const improvement = fhAvg - shAvg;
        if (improvement > bestImprovement) { bestImprovement = improvement; bestComeback = p; }
      });
      if (bestComeback && bestImprovement > 0) {
        awards.push({ id: 'comeback_player', title: 'Comeback Player', icon: '⚡', winnerId: bestComeback.id, winnerName: bestComeback.name, value: `-${bestImprovement.toFixed(1)} avg net`, description: 'Most improved in the 2nd half vs 1st half' });
      }
    }
  }

  return awards;
}
