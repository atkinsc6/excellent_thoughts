import { calcSkins } from './skins';

const DEFS = [
  { id: 'eagle_club',    emoji: '🦅', title: 'Eagle Club',       desc: 'Hit an eagle (−2 or better) in a round' },
  { id: 'albatross',     emoji: '🌟', title: 'Albatross',        desc: 'Hit an albatross (−3 or better) in a round' },
  { id: 'ace',           emoji: '🎯', title: 'Ace!',             desc: 'Made a hole-in-one' },
  { id: 'birdie_binge',  emoji: '🐦', title: 'Birdie Binge',     desc: '3 or more birdies in a single round' },
  { id: 'broke_80',      emoji: '💥', title: 'Broke 80',         desc: 'Shot a gross score below 80' },
  { id: 'broke_90',      emoji: '⚡', title: 'Broke 90',         desc: 'Shot a gross score below 90' },
  { id: 'under_par_net', emoji: '📉', title: 'Under Par',        desc: 'Net score under par for the course' },
  { id: 'skin_collector',emoji: '💰', title: 'Skin Collector',   desc: 'Won 3 or more skins in a single round' },
  { id: 'iron_man',      emoji: '💪', title: 'Iron Man',         desc: 'Played 10 or more rounds in a season' },
  { id: 'round_winner',  emoji: '🏆', title: 'Round Winner',     desc: 'Finished 1st in a round by net score' },
  { id: 'ctp_star',      emoji: '📍', title: 'CTP Star',         desc: 'Won 3 or more closest-to-pin results' },
  { id: 'streak_3',      emoji: '🔥', title: 'Hat-Trick',        desc: 'Won 3 consecutive rounds' },
  { id: 'consistent',    emoji: '📊', title: 'Mr. Consistent',   desc: 'Five rounds within 3 strokes of avg net' },
  { id: 'comeback',      emoji: '⚔️',  title: 'Comeback',         desc: 'Best net round immediately after worst net round' },
  { id: 'low_net_season',emoji: '👑', title: 'Season Low Net',   desc: 'Lowest single-round net score of the season' },
];

export const ACHIEVEMENT_DEFS = Object.fromEntries(DEFS.map(d => [d.id, d]));

export function calcAchievements(players, rounds, courses) {
  const earned = []; // { playerId, achievementId, roundId, earnedAt }

  const sortedRounds = [...rounds].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Per-round checks
  for (const round of sortedRounds) {
    const course = courses.find(c => c.id === round.courseId);
    const roundScoresSorted = [...(round.scores || [])].sort((a, b) => (a.totalNet || 999) - (b.totalNet || 999));

    for (const ps of round.scores || []) {
      const pid = ps.playerId;
      const g = ps.grossScores || [];
      const holes = course?.holes || [];

      // Eagle / Albatross / Ace
      g.forEach((score, i) => {
        const par = holes[i]?.par ?? 4;
        if (score === 1) badge(earned, pid, 'ace', round.id, round.date);
        if (score <= par - 3) badge(earned, pid, 'albatross', round.id, round.date);
        else if (score <= par - 2) badge(earned, pid, 'eagle_club', round.id, round.date);
      });

      // Birdie binge (3+ birdies)
      const birdies = g.filter((score, i) => score > 0 && score < (holes[i]?.par ?? 4)).length;
      if (birdies >= 3) badge(earned, pid, 'birdie_binge', round.id, round.date);

      // Broke 80 / 90
      if (ps.totalGross > 0 && ps.totalGross < 80) badge(earned, pid, 'broke_80', round.id, round.date);
      if (ps.totalGross > 0 && ps.totalGross < 90) badge(earned, pid, 'broke_90', round.id, round.date);

      // Under par net
      if (ps.totalNet > 0 && course?.par && ps.totalNet < course.par) {
        badge(earned, pid, 'under_par_net', round.id, round.date);
      }

      // Round winner
      if (roundScoresSorted[0]?.playerId === pid && ps.totalNet > 0) {
        badge(earned, pid, 'round_winner', round.id, round.date);
      }
    }

    // Skin collector (3+ skins in one round)
    if (course?.holes && round.scores?.length >= 2) {
      const skins = calcSkins(course.holes, round.scores, 'net');
      const skinsMap = {};
      skins.forEach(s => { if (s.winnerId) skinsMap[s.winnerId] = (skinsMap[s.winnerId] || 0) + 1; });
      Object.entries(skinsMap).forEach(([pid, count]) => {
        if (count >= 3) badge(earned, pid, 'skin_collector', round.id, round.date);
      });
    }
  }

  // Season-wide checks per player
  for (const player of players) {
    const pid = player.id;
    const pr = sortedRounds.filter(r => r.playerIds?.includes(pid));

    // Iron Man
    if (pr.length >= 10) badge(earned, pid, 'iron_man', null, pr[9]?.date);

    // CTP Star
    const ctpWins = sortedRounds.reduce((s, r) => s + (r.ctpResults || []).filter(c => c.winnerId === pid).length, 0);
    if (ctpWins >= 3) badge(earned, pid, 'ctp_star', null, null);

    // Hat-Trick (3 consecutive round wins)
    let streak = 0;
    for (const round of sortedRounds) {
      const ps = round.scores?.find(s => s.playerId === pid);
      if (!ps) { streak = 0; continue; }
      const winner = [...(round.scores || [])].sort((a, b) => (a.totalNet || 999) - (b.totalNet || 999))[0];
      if (winner?.playerId === pid) { streak++; } else { streak = 0; }
      if (streak >= 3) { badge(earned, pid, 'streak_3', round.id, round.date); break; }
    }

    // Consistent (5 rounds within 3 of avg net)
    const netScores = pr.map(r => r.scores?.find(s => s.playerId === pid)?.totalNet).filter(n => n > 0);
    if (netScores.length >= 5) {
      const avg = netScores.reduce((a, b) => a + b, 0) / netScores.length;
      const withinRange = netScores.filter(n => Math.abs(n - avg) <= 3).length;
      if (withinRange >= 5) badge(earned, pid, 'consistent', null, null);
    }

    // Comeback (best net round after worst net round)
    if (netScores.length >= 3) {
      let worst = -Infinity, worstIdx = -1;
      netScores.forEach((n, i) => { if (n > worst) { worst = n; worstIdx = i; } });
      if (worstIdx < netScores.length - 1) {
        const afterWorst = netScores.slice(worstIdx + 1);
        const best = Math.min(...netScores);
        if (afterWorst.some(n => n === best)) badge(earned, pid, 'comeback', null, null);
      }
    }

    // Low net season
    // (computed globally below)
  }

  // Low net season: one player with the single lowest net round
  let globalLowNet = Infinity, globalLowPid = null, globalLowRoundId = null, globalLowDate = null;
  for (const round of sortedRounds) {
    for (const ps of round.scores || []) {
      if (ps.totalNet > 0 && ps.totalNet < globalLowNet) {
        globalLowNet = ps.totalNet;
        globalLowPid = ps.playerId;
        globalLowRoundId = round.id;
        globalLowDate = round.date;
      }
    }
  }
  if (globalLowPid) badge(earned, globalLowPid, 'low_net_season', globalLowRoundId, globalLowDate);

  // Deduplicate: one per (playerId, achievementId)
  const seen = new Set();
  const deduped = earned.filter(e => {
    const key = `${e.playerId}:${e.achievementId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

function badge(list, playerId, achievementId, roundId, earnedAt) {
  list.push({ playerId, achievementId, roundId, earnedAt: earnedAt || new Date().toISOString() });
}

// Group achievements by player
export function achievementsByPlayer(achievements) {
  const map = {};
  for (const a of achievements) {
    if (!map[a.playerId]) map[a.playerId] = [];
    map[a.playerId].push(a);
  }
  return map;
}
