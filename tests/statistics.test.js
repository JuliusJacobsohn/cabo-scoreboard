const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeGames } = require('../statistics');
const game = (players, rounds, extra = {}) => ({ id: 'game', startedAt: '2026-10-10T00:00:00Z', closed: true, players, rounds, ...extra });

test('statistics exclude open/empty games, merge names and count actual caller penalties', () => {
  const rounds = [{ hands: [[1], [8]], caller: 1 }];
  const games = [game(['Ada', 'Ben'], rounds), game(['ADA', 'Cat'], [{ hands: [[2], [2]], caller: 0 }]), game(['Ada', 'Ben'], rounds, { closed: false }), game(['Ada', 'Ben'], [])];
  const original = JSON.stringify(games);
  const stats = summarizeGames(games);
  const ada = stats.find(stat => stat.key === 'ada');
  assert.equal(ada.gamesPlayed, 2); assert.equal(ada.wins, 2); assert.equal(ada.winRate, 100);
  assert.equal(ada.avgPoints, 0); assert.equal(ada.avgRank, 1);
  const ben = stats.find(stat => stat.key === 'ben');
  assert.equal(ben.losses, 1); assert.equal(ben.calls, 1); assert.equal(ben.failedCalls, 1);
  assert.equal(ben.avgRoundPoints, 13); assert.equal(ben.avgPoints, 13);
  assert.equal(JSON.stringify(games), original);
});

test('shared wins and equal-score positions use the lowest total', () => {
  const stats = summarizeGames([game(['Ada', 'Ben', 'Cat'], [{ hands: [[0], [0], [5]], caller: 0 }])]);
  for(const name of ['ada', 'ben']){
    const stat = stats.find(item => item.key === name);
    assert.equal(stat.wins, 1); assert.deepEqual(stat.positionCounts, { 1: 1 });
  }
  assert.deepEqual(stats.find(item => item.key === 'cat').positionCounts, { 3: 1 });
});

test('statistics distinguish round points from totals after reset and recalculate after undo', () => {
  const round = { hands: [[12, 12, 13, 13], [1]], caller: 0 };
  const entry = game(['Ada', 'Ben'], [round, round, round]);
  const stats = summarizeGames([entry]);
  const ben = stats.find(stat => stat.key === 'ben');
  assert.equal(ben.totalPoints, 100); assert.equal(ben.roundPoints, 150);
  assert.equal(ben.avgRoundPoints, 50); assert.equal(ben.resets, 1);
  assert.equal(stats.find(stat => stat.key === 'ada').moons, 3);
  entry.rounds.pop(); entry.closed = false;
  assert.deepEqual(summarizeGames([entry]), []);
  entry.closed = true;
  assert.equal(summarizeGames([entry]).find(stat => stat.key === 'ben').totalPoints, 50);
});

test('player point history follows chronological game starts', () => {
  const round = { hands: [[1], [8]], caller: 0 };
  const stats = summarizeGames([
    game(['Ada', 'Ben'], [round], { id: 'later', startedAt: '2026-10-10T12:00:00Z' }),
    game(['Ada', 'Ben'], [round, round], { id: 'earlier', startedAt: '2026-10-09T12:00:00Z' })
  ]);
  assert.deepEqual(stats.find(stat => stat.key === 'ben').scoreHistory.map(item => item.score), [16, 8]);
});
