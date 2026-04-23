// utils/scoring.js
const Race = require('../models/Race');
const Athlete = require('../models/Athlete');
const Pick = require('../models/Pick');

function scoreSideBets(sideBets) {
  let total = 0;

  const difficultyPoints = {
    high: 5,
    medium: 10,
    hard: 15
  };

  ['men', 'women'].forEach(gender => {
    sideBets[gender].forEach(bet => {
      if (!bet.correctAnswer) return;

      if (bet.pick === bet.correctAnswer) {
        bet.points = difficultyPoints[bet.difficulty];
        total += bet.points;
      } else {
        bet.points = 0;
      }
    });
  });

  return total;
}

function getPlacementPoints(place) {
  if (place === 1) return 100;
  if (place === 2) return 85;
  if (place === 3) return 75;
  if (place <= 10) return 60 - (place - 4) * 5;
  if (place <= 20) return 25 - (place - 11) * 1.5;
  return 5;
}

function scoreRace(finishers, series, priorSwimCR = 0, priorBikeCR = 0, priorRunCR = 0, priorTotalCR = 0) {
  const seriesToConfig = {
    'Ironman 70.3 Pro Series': '70.3',
    'Challenge': '70.3',
    'Ironman 70.3': '70.3',
    'Ironman Pro Series': 'IRONMAN',
    'Ironman': 'IRONMAN',
    'T100': 'T100',
    'WTCS': 'WTCS'
  };

  const raceType = seriesToConfig[series] || '70.3';

  const CONFIG = {
    "WTCS": { placementWeight: 0.85, timeWeight: 0.10, splitWeight: 1.00, timeDecayPct: 0.03, underdogThresholds: [18, 12, 7] },
    "T100": { placementWeight: 0.85, timeWeight: 0.15, splitWeight: 1.00, timeDecayPct: 0.04, underdogThresholds: [9, 6, 4] },
    "70.3": { placementWeight: 0.80, timeWeight: 0.20, splitWeight: 1.00, timeDecayPct: 0.05, underdogThresholds: [15, 10, 5] },
    "IRONMAN": { placementWeight: 0.75, timeWeight: 0.25, splitWeight: 1.00, timeDecayPct: 0.07, underdogThresholds: [12, 8, 4] }
  };

  const weights = CONFIG[raceType] || CONFIG["70.3"];

  if (finishers.length === 0) return [];

  const sorted = [...finishers].sort((a, b) => a.totalTimeSeconds - b.totalTimeSeconds);
  const winnerTime = sorted[0]?.totalTimeSeconds || 0;

  const bestSplits = {
    swim: Math.min(...sorted.map(r => r.swimTimeSeconds || Infinity)),
    bike: Math.min(...sorted.map(r => r.bikeTimeSeconds || Infinity)),
    run:  Math.min(...sorted.map(r => r.runTimeSeconds  || Infinity))
  };

  return finishers.map(finisher => {
    const placementPoints = getPlacementPoints(finisher.place || 999);

    const timeDiffPct = winnerTime > 0 ? (finisher.totalTimeSeconds - winnerTime) / winnerTime : 0;
    const timeBonus = Math.max(0, Math.round(10 * (1 - timeDiffPct / weights.timeDecayPct)));

    let splitBonus = 0;
    const splitBreakdown = { swim: 0, bike: 0, run: 0 };

    ["swim", "bike", "run"].forEach(dis => {
      const key = `${dis}TimeSeconds`;

      const sortedBySplit = [...sorted]
        .filter(f => f[key] != null)
        .sort((a, b) => a[key] - b[key]);

      if (sortedBySplit.length === 0) return;

      const first  = sortedBySplit[0]?.athlete?.toString();
      const second = sortedBySplit[1]?.athlete?.toString();
      const third  = sortedBySplit[2]?.athlete?.toString();

      const athleteId = finisher.athlete.toString();

      if (athleteId === first) {
        splitBreakdown[dis] = 5;
        splitBonus += 5;
      } else if (athleteId === second) {
        splitBreakdown[dis] = 3;
        splitBonus += 3;
      } else if (athleteId === third) {
        splitBreakdown[dis] = 1;
        splitBonus += 1;
      }
    });

    const startRank = Number.isFinite(Number(finisher.startRank)) ? Number(finisher.startRank) : null;
    const place = Number.isFinite(Number(finisher.place)) ? Number(finisher.place) : null;

    let positionGain = 0;
    if (startRank !== null && place !== null) {
      positionGain = startRank - place;
    }

    const [big, med, small] = weights.underdogThresholds;
    let underdogBonus = 0;
    if (positionGain >= big) underdogBonus = 7;
    else if (positionGain >= med) underdogBonus = 3.5;
    else if (positionGain >= small) underdogBonus = 1.5;

    let recordBonus = 0;
    if (priorSwimCR > 0  && finisher.swimTimeSeconds  != null && finisher.swimTimeSeconds  < priorSwimCR) recordBonus += 3;
    if (priorBikeCR > 0  && finisher.bikeTimeSeconds  != null && finisher.bikeTimeSeconds  < priorBikeCR) recordBonus += 3;
    if (priorRunCR > 0   && finisher.runTimeSeconds   != null && finisher.runTimeSeconds   < priorRunCR)  recordBonus += 3;
    if (priorTotalCR > 0 && finisher.totalTimeSeconds != null && finisher.totalTimeSeconds < priorTotalCR) recordBonus += 5;

    const totalScore =
      placementPoints * weights.placementWeight +
      timeBonus     * weights.timeWeight +
      splitBonus    * weights.splitWeight +
      underdogBonus +
      recordBonus;

    return {
      ...finisher,
      score: Math.round(totalScore),
      breakdown: {
        placementPoints,
        timeBonus,
        splitBonus,
        splitBreakdown,
        underdogBonus,
        recordBonus,
        totalScore
      }
    };
  });
}

async function scoreUserPicks(raceId) {
  const race = await Race.findById(raceId).populate('results.athlete');
  const picks = await Pick.find({ race: raceId }).populate('user');

  const resultsByAthlete = new Map();
  race.results.forEach(r => resultsByAthlete.set(r.athlete._id.toString(), r));

  const totalField = race.results.length;

  const fastest = {
    men: {
      swim: race.fastestSwim,
      bike: race.fastestBike,
      run:  race.fastestRun
    },
    women: {
      swim: race.fastestSwim,
      bike: race.fastestBike,
      run:  race.fastestRun
    }
  };

  const userScores = [];

  for (const pick of picks) {
    let score = 0;
    const breakdown = {};

    function scoreAthletePick(pickObj) {
      const res = resultsByAthlete.get(pickObj.athlete.toString());
      if (!res) return 0;

      const diff = Math.abs(res.place - pickObj.predictedPlace);
      let multiplier = diff === 0 ? 1.5 :
                       diff === 1 ? 1.25 :
                       diff === 2 ? 1.1 :
                       diff <= 5 ? 1.0 : 0.5;

      if (pickObj.isUnderdog) {
        const isEligible = res.startRank > totalField / 2;
        if (isEligible) {
          if (res.place <= totalField * 0.5) multiplier *= 2;
          else if (res.place >= totalField * 0.75) multiplier *= 0.5;
        }
      }

      return Math.round(res.score * multiplier);
    }

    pick.menPicks.forEach(p => score += scoreAthletePick(p));
    pick.womenPicks.forEach(p => score += scoreAthletePick(p));

    function scoreFastest(pickAthlete, actualAthlete) {
      if (!pickAthlete) return 0;
      if (pickAthlete.toString() === actualAthlete?.toString()) return 10;
      return 0;
    }

    score += scoreFastest(pick.fastestMen.swim, fastest.men.swim);
    score += scoreFastest(pick.fastestMen.bike, fastest.men.bike);
    score += scoreFastest(pick.fastestMen.run,  fastest.men.run);

    score += scoreFastest(pick.fastestWomen.swim, fastest.women.swim);
    score += scoreFastest(pick.fastestWomen.bike, fastest.women.bike);
    score += scoreFastest(pick.fastestWomen.run,  fastest.women.run);

    userScores.push({
      user: pick.user._id,
      race: raceId,
      score,
      breakdown
    });
  }

  return userScores;
}

async function scoreFantasyPicksForRace(raceId, finalResultsForRace, fastest, raceName) {
  const picks = await Pick.find({ race: raceId })
    .populate('user')
    .populate('menPicks.athlete')
    .populate('womenPicks.athlete');

  const resultsByAthlete = new Map();
  finalResultsForRace.forEach(r => {
    resultsByAthlete.set(r.athlete.toString(), r);
  });

  const totalFieldSize = finalResultsForRace.length;

  function scoreAthletePick(res, predictedPlace, isUnderdog, totalFieldSize) {
    if (!res) return 0;

    const diff = Math.abs(res.place - predictedPlace);
    let multiplier = diff === 0 ? 1.5 :
                     diff === 1 ? 1.25 :
                     diff === 2 ? 1.1 :
                     diff <= 5 ? 1.0 : 0.5;

    if (isUnderdog) {
      const isEligible = res.startRank > totalFieldSize / 2;
      if (isEligible) {
        if (res.place <= totalFieldSize * 0.5) multiplier *= 2;
        else if (res.place >= totalFieldSize * 0.75) multiplier *= 0.5;
      }
    }

    return Math.round(res.score * multiplier);
  }

  function scoreFastestPick(pickAthlete, actualAthlete) {
    if (!pickAthlete) return 0;
    if (pickAthlete.toString() === actualAthlete?.toString()) return 10;
    return 0;
  }

  for (const pick of picks) {
    let totalScore = 0;
    const athleteBreakdown = { men: [], women: [] };
    const fastestBreakdown = { men: {}, women: {} };

    pick.menPicks.forEach(p => {
      const res = resultsByAthlete.get(p.athlete._id.toString());
      const pts = scoreAthletePick(res, p.predictedPlace, p.isUnderdog, totalFieldSize);
      totalScore += pts;
      athleteBreakdown.men.push({
        athlete: p.athlete.name,
        predictedPlace: p.predictedPlace,
        actualPlace: res ? res.place : null,
        isUnderdog: p.isUnderdog,
        points: pts
      });
    });

    pick.womenPicks.forEach(p => {
      const res = resultsByAthlete.get(p.athlete._id.toString());
      const pts = scoreAthletePick(res, p.predictedPlace, p.isUnderdog, totalFieldSize);
      totalScore += pts;
      athleteBreakdown.women.push({
        athlete: p.athlete.name,
        predictedPlace: p.predictedPlace,
        actualPlace: res ? res.place : null,
        isUnderdog: p.isUnderdog,
        points: pts
      });
    });

    const fastestMenPoints = {
      swim: scoreFastestPick(pick.fastestMen?.swim, fastest.swim),
      bike: scoreFastestPick(pick.fastestMen?.bike, fastest.bike),
      run:  scoreFastestPick(pick.fastestMen?.run,  fastest.run)
    };
    const fastestWomenPoints = {
      swim: scoreFastestPick(pick.fastestWomen?.swim, fastest.swim),
      bike: scoreFastestPick(pick.fastestWomen?.bike, fastest.bike),
      run:  scoreFastestPick(pick.fastestWomen?.run,  fastest.run)
    };

    const fastestTotal =
      fastestMenPoints.swim + fastestMenPoints.bike + fastestMenPoints.run +
      fastestWomenPoints.swim + fastestWomenPoints.bike + fastestWomenPoints.run;

    totalScore += fastestTotal;

    fastestBreakdown.men = fastestMenPoints;
    fastestBreakdown.women = fastestWomenPoints;

    const sideBetTotal = scoreSideBets(pick.sideBets || { men: [], women: [] });

    totalScore += sideBetTotal;

    pick.fantasyScoreTotal = totalScore;
    pick.fantasyBreakdown = {
      athletePicks: athleteBreakdown,
      fastest: fastestBreakdown,
      // sideBets breakdown not stored in original snippet, so omitted
    };

    await pick.save();
  }

  return picks.length;
}

module.exports = {
  scoreSideBets,
  getPlacementPoints,
  scoreRace,
  scoreUserPicks,
  scoreFantasyPicksForRace
};
