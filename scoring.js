((root) => {
  function validateRound(hands, caller){
    if(!Array.isArray(hands) || hands.length < 2 || hands.length > 5) throw new Error('Es müssen 2–5 Spieler teilnehmen.');
    if(!Number.isInteger(caller) || caller < 0 || caller >= hands.length) throw new Error('Wähle den Cabo-Rufer aus.');
    const counts = Array(14).fill(0);
    for(const cards of hands){
      if(!Array.isArray(cards) || cards.length < 1 || cards.length > 4) throw new Error('Für jeden Spieler 1–4 Karten eingeben.');
      for(const value of cards){
        if(!Number.isInteger(value) || value < 0 || value > 13) throw new Error('Kartenwerte müssen zwischen 0 und 13 liegen.');
        counts[value]++;
        if(counts[value] > (value === 0 || value === 13 ? 2 : 4)) throw new Error(`Der Wert ${value} wurde öfter eingegeben, als er im Deck vorhanden ist.`);
      }
    }
  }

  function scoreRound(hands, caller){
    validateRound(hands, caller);
    const sums = hands.map(cards => cards.reduce((sum, value) => sum + value, 0));
    const minimum = Math.min(...sums);
    const moon = hands.findIndex(cards => [...cards].sort((a, b) => a - b).join(',') === '12,12,13,13');
    const callerWins = sums[caller] === minimum;
    return sums.map((sum, index) => {
      const winner = moon >= 0 ? index === moon : sum === minimum && (!callerWins || index === caller);
      const penalty = moon < 0 && index === caller && !callerWins ? 5 : 0;
      return { sum, points: moon >= 0 ? (winner ? 0 : 50) : (winner ? 0 : sum + penalty), penalty, winner, moon: index === moon };
    });
  }

  function replayGame(players, rounds){
    const totals = players.map(() => 0);
    const resetUsed = players.map(() => false);
    const history = [];
    let finished = false;
    for(const round of rounds){
      if(finished) throw new Error('Nach dem Spielende kann keine weitere Runde gewertet werden.');
      if(round.hands.length !== players.length) throw new Error('Die Spieleranzahl stimmt nicht überein.');
      const entries = scoreRound(round.hands, round.caller).map((entry, index) => {
        totals[index] += entry.points;
        const reset = totals[index] === 100 && !resetUsed[index];
        if(reset){ totals[index] = 50; resetUsed[index] = true; }
        return { ...entry, total: totals[index], reset };
      });
      history.push(entries);
      finished = totals.some(total => total > 100);
    }
    const minimum = Math.min(...totals);
    return { totals, resetUsed, history, finished, winners: totals.map((total, index) => total === minimum ? index : -1).filter(index => index >= 0) };
  }

  const api = { validateRound, scoreRound, replayGame };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CaboScoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
