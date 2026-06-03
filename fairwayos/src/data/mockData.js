import { calcCourseHandicap, calcPlayingHandicap, strokesReceivedPerHole, calcNetScore, calcStableford, calcDifferential, adjustedGross } from '../utils/scoring';
import { calcSkins } from '../utils/skins';
import { COURSE_DATABASE } from './courses';

export const PLAYER_SEEDS = [
  { id: 'p1', name: 'Mike Harrington', email: 'mike@example.com', role: 'commissioner', handicapIndex: 8.4, teePreference: 'Blue' },
  { id: 'p2', name: 'Dave Kowalski',   email: 'dave@example.com', role: 'player',        handicapIndex: 14.2, teePreference: 'Blue' },
  { id: 'p3', name: 'Tom Reyes',       email: 'tom@example.com',  role: 'player',        handicapIndex: 5.1,  teePreference: 'Black' },
  { id: 'p4', name: 'Sarah Chen',      email: 'sarah@example.com',role: 'player',        handicapIndex: 18.6, teePreference: 'Gold' },
  { id: 'p5', name: 'Jim Callahan',    email: 'jim@example.com',  role: 'player',        handicapIndex: 11.0, teePreference: 'Blue' },
  { id: 'p6', name: 'Brad Novak',      email: 'brad@example.com', role: 'player',        handicapIndex: 22.3, teePreference: 'White' },
  { id: 'p7', name: 'Chris Weston',    email: 'chris@example.com',role: 'player',        handicapIndex: 3.8,  teePreference: 'Black' },
  { id: 'p8', name: 'Lisa Park',       email: 'lisa@example.com', role: 'player',        handicapIndex: 16.5, teePreference: 'Gold' },
];

// 6 rounds of gross scores [18 holes each]
const ROUND_SCORES = {
  r1: {
    courseId: 'cog-hill-4',
    tee: 'Blue',
    date: '2025-04-12',
    scores: {
      p1: [4,5,3,5,4,3,5,4,4,  4,4,3,5,5,4,3,4,5], // 74 gross
      p2: [5,6,4,5,5,4,6,5,5,  5,5,4,5,6,5,4,5,6], // 90 gross
      p3: [4,5,3,4,4,3,5,4,4,  4,4,3,5,5,4,3,4,5], // 73 gross
      p4: [5,6,4,6,5,4,6,5,5,  5,5,4,6,6,5,4,5,7], // 93 gross
      p5: [4,6,3,5,5,4,5,5,4,  5,4,3,5,6,4,3,5,6], // 82 gross
      p6: [6,7,4,6,5,4,6,6,5,  6,6,4,6,7,5,4,6,7], // 100 gross
      p7: [4,5,3,4,4,3,5,4,4,  4,4,3,5,5,4,3,4,5], // 73 gross
      p8: [5,6,4,5,5,4,6,5,5,  5,5,4,5,6,5,4,5,6], // 89 gross
    }
  },
  r2: {
    courseId: 'medinah-3',
    tee: 'Blue',
    date: '2025-04-26',
    scores: {
      p1: [4,5,4,3,5,5,3,5,4,  5,3,6,5,3,5,4,4,5], // 78 gross
      p2: [5,6,5,4,5,6,4,5,5,  5,4,6,5,3,5,5,5,6], // 89 gross
      p3: [4,5,4,3,4,5,3,5,4,  4,3,6,5,3,5,4,4,5], // 76 gross
      p4: [5,6,5,4,6,6,4,6,5,  6,4,7,6,4,6,5,5,7], // 97 gross
      p5: [5,5,4,3,5,6,3,5,5,  5,4,6,5,3,5,5,5,6], // 85 gross
      p6: [6,7,5,4,6,6,4,6,6,  6,5,7,6,4,6,5,5,7], // 101 gross
      p7: [4,5,4,3,4,5,3,4,4,  4,3,5,5,3,5,4,4,5], // 74 gross
      p8: [5,6,4,3,5,6,4,5,5,  5,4,6,5,4,5,4,5,6], // 87 gross
    }
  },
  r3: {
    courseId: 'olympia-fields-north',
    tee: 'Blue',
    date: '2025-05-10',
    scores: {
      p1: [4,5,3,5,4,3,5,4,4,  4,3,5,4,5,3,4,4,4], // 73 gross
      p2: [5,5,4,6,5,4,5,5,5,  5,4,5,5,6,4,5,5,5], // 88 gross
      p3: [4,4,3,5,4,3,5,4,4,  4,3,5,4,5,3,4,4,4], // 72 gross
      p4: [5,6,4,6,5,4,6,5,5,  6,4,6,5,6,4,5,5,5], // 92 gross
      p5: [5,5,3,5,5,3,5,5,5,  5,3,5,5,6,3,5,5,5], // 84 gross
      p6: [6,6,4,7,6,4,6,6,5,  6,5,6,6,7,4,6,6,6], // 102 gross
      p7: [4,4,3,5,4,3,5,4,4,  4,3,5,4,5,3,4,4,4], // 72 gross
      p8: [5,5,4,5,5,4,5,5,5,  5,4,5,5,5,4,5,5,5], // 86 gross
    }
  },
  r4: {
    courseId: 'cog-hill-4',
    tee: 'Blue',
    date: '2025-05-24',
    scores: {
      p1: [4,5,3,5,4,3,5,4,4,  5,4,3,5,5,5,3,4,5], // 76 gross
      p2: [5,6,4,5,5,3,6,5,5,  5,5,4,5,6,5,4,5,6], // 89 gross
      p3: [4,5,3,4,4,3,5,4,4,  4,4,3,5,5,4,3,4,5], // 73 gross
      p4: [6,6,4,6,5,4,7,5,5,  5,6,4,6,6,5,4,5,7], // 96 gross
      p5: [5,5,3,5,5,4,5,5,4,  5,5,3,5,6,5,3,5,6], // 84 gross
      p6: [6,7,5,6,6,4,7,6,5,  6,6,4,6,7,6,4,6,7], // 104 gross
      p7: [4,5,3,4,4,3,5,4,4,  4,4,3,5,5,4,3,4,5], // 73 gross
      p8: [5,6,4,5,5,4,6,5,5,  5,5,4,5,6,5,4,5,6], // 90 gross
    }
  },
  r5: {
    courseId: 'medinah-3',
    tee: 'Blue',
    date: '2025-06-07',
    scores: {
      p1: [4,5,4,3,5,6,3,5,4,  5,3,6,5,3,5,4,5,5], // 80 gross
      p2: [5,6,5,4,5,6,4,6,5,  5,4,7,5,3,5,5,5,6], // 91 gross
      p3: [4,5,4,3,5,5,3,5,4,  4,3,6,5,3,5,4,4,5], // 77 gross
      p4: [5,7,5,4,6,6,4,6,5,  6,4,7,6,4,6,5,5,7], // 98 gross
      p5: [4,6,4,3,5,6,3,5,5,  5,4,6,5,3,5,5,5,6], // 85 gross
      p6: [6,7,5,5,6,7,4,6,6,  6,5,7,6,4,7,5,6,7], // 105 gross
      p7: [3,5,4,3,4,5,3,4,4,  4,3,5,5,3,5,4,4,5], // 73 gross
      p8: [5,5,4,4,5,5,4,5,5,  5,4,6,5,4,5,4,5,6], // 86 gross
    }
  },
  r6: {
    courseId: 'olympia-fields-north',
    tee: 'Blue',
    date: '2025-06-21',
    scores: {
      p1: [4,5,3,5,5,3,5,5,4,  4,3,5,4,5,3,4,5,4], // 76 gross
      p2: [5,6,4,6,5,3,6,5,5,  5,4,5,5,6,4,5,5,5], // 89 gross
      p3: [4,4,3,5,4,3,5,4,4,  4,3,5,4,5,3,4,4,4], // 72 gross
      p4: [5,6,4,6,5,4,6,6,5,  5,4,6,5,6,4,5,5,5], // 92 gross
      p5: [5,5,3,6,5,3,5,5,5,  5,4,5,5,6,3,5,5,5], // 85 gross
      p6: [6,7,5,7,6,4,7,6,6,  6,5,7,6,7,4,6,6,6], // 107 gross
      p7: [4,4,3,5,4,3,5,4,4,  4,3,5,4,5,3,4,4,4], // 72 gross
      p8: [5,5,3,6,5,4,5,5,5,  5,4,5,5,6,4,5,5,5], // 87 gross
    }
  },
};

const CTP_BY_ROUND = {
  r1: [{ hole: 3, winnerId: 'p3', distance: "8'6\"" }],
  r2: [{ hole: 4, winnerId: 'p7', distance: "3'2\"" }],
  r3: [{ hole: 3, winnerId: 'p1', distance: "12'1\"" }],
  r4: [{ hole: 6, winnerId: 'p5', distance: "6'9\"" }],
  r5: [{ hole: 7, winnerId: 'p3', distance: "4'4\"" }],
  r6: [{ hole: 3, winnerId: 'p7', distance: "2'11\"" }],
};

export function generateMockData() {
  const leagueCourses = COURSE_DATABASE.slice(0, 3); // first 3 are the league courses
  const allCourses = COURSE_DATABASE;

  const league = {
    id: 'league-1',
    name: 'Westside Golf League',
    season: '2025',
    homeCourseId: 'cog-hill-4',
    startDate: '2025-04-01',
    endDate: '2025-10-31',
    scoringFormats: ['stroke', 'stableford'],
    handicapSystem: 'whs',
    handicapAllowance: 0.95,
    skinsType: 'gross',
    skinsEntry: 5,
    ctpEnabled: true,
    ctpHoles: [3, 6, 7, 12, 16],
    pointsTable: [
      { place: 1, points: 10 },
      { place: 2, points: 7 },
      { place: 3, points: 5 },
      { place: 4, points: 3 },
      { place: 5, points: 2 },
      { place: 6, points: 1 },
    ],
    inviteCode: 'WGL25X',
  };

  const players = PLAYER_SEEDS.map(p => ({ ...p }));

  const rounds = Object.entries(ROUND_SCORES).map(([roundId, roundData], idx) => {
    const course = allCourses.find(c => c.id === roundData.courseId);
    const teeObj = course.tees.find(t => t.name === roundData.tee);
    const playerIds = Object.keys(roundData.scores);

    const scores = playerIds.map(pid => {
      const player = players.find(p => p.id === pid);
      const grossScores = roundData.scores[pid];
      const courseHcp = calcCourseHandicap(player.handicapIndex, teeObj.slope, teeObj.rating, course.par);
      const playingHcp = calcPlayingHandicap(courseHcp, 0.95);
      const strokes = strokesReceivedPerHole(course.holes, playingHcp);
      const netScores = grossScores.map((g, i) => calcNetScore(g, strokes[i]));
      const stablefordPoints = grossScores.map((g, i) => calcStableford(g, course.holes[i].par, strokes[i]));
      const totalGross = grossScores.reduce((s, v) => s + v, 0);
      const totalNet = netScores.reduce((s, v) => s + v, 0);
      const totalStableford = stablefordPoints.reduce((s, v) => s + v, 0);
      const adjGross = adjustedGross(grossScores, course.holes, playingHcp);
      return {
        playerId: pid,
        grossScores,
        netScores,
        stablefordPoints,
        playingHandicap: playingHcp,
        totalGross,
        totalNet,
        totalStableford,
        adjustedGross: adjGross,
      };
    });

    const skinsResults = calcSkins(course.holes, scores, 'gross');

    return {
      id: roundId,
      date: roundData.date,
      courseId: roundData.courseId,
      tee: roundData.tee,
      playerIds,
      scores,
      ctpResults: CTP_BY_ROUND[roundId] || [],
      skinsResults,
    };
  });

  return { league, players, rounds, courses: allCourses };
}
