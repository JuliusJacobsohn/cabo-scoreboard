((root) => {
  const { replayGame } = typeof module !== 'undefined' && module.exports ? require('./scoring') : root.CaboScoring;

  function summarizeGames(games){
    const byPlayer = new Map();
    for(const game of games){
      if(!game.closed || !game.rounds.length) continue;
      const result = replayGame(game.players, game.rounds);
      game.players.forEach((name, index) => {
        const key = name.trim().toLocaleLowerCase();
        if(!byPlayer.has(key)) byPlayer.set(key, {
          key, name, gamesPlayed: 0, wins: 0, losses: 0, totalPoints: 0,
          minPoints: Infinity, maxPoints: -Infinity, rankSum: 0, roundsPlayed: 0,
          roundPoints: 0, calls: 0, failedCalls: 0, moons: 0, resets: 0,
          scoreHistory: [], positionCounts: {}
        });
        const stat = byPlayer.get(key);
        const total = result.totals[index];
        const rank = 1 + result.totals.filter(score => score < total).length;
        stat.gamesPlayed++; stat.totalPoints += total; stat.rankSum += rank;
        stat.minPoints = Math.min(stat.minPoints, total); stat.maxPoints = Math.max(stat.maxPoints, total);
        stat.positionCounts[rank] = (stat.positionCounts[rank] || 0) + 1;
        if(result.winners.includes(index)) stat.wins++; else stat.losses++;
        stat.roundsPlayed += game.rounds.length;
        result.history.forEach((entries, round) => {
          const entry = entries[index];
          stat.roundPoints += entry.points;
          if(game.rounds[round].caller === index) stat.calls++;
          if(entry.penalty) stat.failedCalls++;
          if(entry.moon) stat.moons++;
          if(entry.reset) stat.resets++;
        });
        stat.scoreHistory.push({ id: game.id, stamp: Date.parse(game.startedAt) || 0, score: total });
      });
    }
    return [...byPlayer.values()].map(stat => ({
      ...stat,
      scoreHistory: stat.scoreHistory.sort((a, b) => a.stamp - b.stamp),
      avgPoints: stat.totalPoints / stat.gamesPlayed,
      avgRank: stat.rankSum / stat.gamesPlayed,
      avgRoundPoints: stat.roundPoints / stat.roundsPlayed,
      winRate: stat.wins / stat.gamesPlayed * 100
    })).sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins || a.avgPoints - b.avgPoints || a.name.localeCompare(b.name));
  }

  const api = { summarizeGames };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CaboStatistics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
