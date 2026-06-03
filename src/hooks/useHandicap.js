import { calcDifferential, calcHandicapIndex } from '../utils/scoring';

export function useHandicap(players, rounds, courses) {
  function getDifferentials(playerId) {
    const diffs = [];
    rounds.forEach(round => {
      const course = courses.find(c => c.id === round.courseId);
      if (!course) return;
      const tee = course.tees.find(t => t.name === round.tee);
      if (!tee) return;
      const ps = round.scores?.find(s => s.playerId === playerId);
      if (!ps) return;
      const diff = calcDifferential(ps.adjustedGross || ps.totalGross, tee.rating, tee.slope);
      diffs.push({
        roundId: round.id,
        date: round.date,
        courseId: round.courseId,
        courseName: course.name,
        grossScore: ps.totalGross,
        adjustedGross: ps.adjustedGross || ps.totalGross,
        differential: diff,
      });
    });
    return diffs.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function getHandicapIndex(playerId) {
    const diffs = getDifferentials(playerId).map(d => d.differential);
    return calcHandicapIndex(diffs);
  }

  function getHandicapTrend(playerId) {
    const diffs = getDifferentials(playerId);
    return diffs.map((d, i) => ({
      date: d.date,
      index: calcHandicapIndex(diffs.slice(0, i + 1).map(x => x.differential)),
    }));
  }

  return { getDifferentials, getHandicapIndex, getHandicapTrend };
}
