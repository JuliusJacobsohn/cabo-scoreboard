const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreRound, replayGame } = require('../scoring');
const points = (hands, caller) => scoreRound(hands, caller).map(entry => entry.points);

test('successful Cabo scores zero; other hands are summed', () => {
  assert.deepEqual(points([[1, 2], [4, 5]], 0), [0, 9]);
});
test('only the failed caller gets +5, not every losing player', () => {
  const entries = scoreRound([[1], [8], [9]], 1);
  assert.deepEqual(entries.map(entry => entry.points), [0, 13, 9]);
  assert.deepEqual(entries.map(entry => entry.penalty), [0, 5, 0]);
});
test('ties favor the caller only if the caller is tied for minimum', () => {
  assert.deepEqual(points([[5], [5], [8]], 1), [5, 0, 8]);
  assert.deepEqual(points([[5], [5], [8]], 2), [0, 0, 13]);
});
test('12–12–13–13 overrides normal scoring and caller penalty', () => {
  const entries = scoreRound([[13, 12, 13, 12], [0], [1]], 0);
  assert.deepEqual(entries.map(entry => entry.points), [0, 50, 50]);
  assert.equal(entries[0].penalty, 0);
  assert.equal(entries[0].moon, true);
});
test('exactly 100 resets only once; game ends strictly above 100', () => {
  const round = { hands: [[12, 12, 13, 13], [1]], caller: 1 };
  let result = replayGame(['Ada', 'Ben'], [round, round]);
  assert.deepEqual(result.totals, [0, 50]);
  assert.equal(result.history[1][1].reset, true);
  result = replayGame(['Ada', 'Ben'], [round, round, round]);
  assert.deepEqual(result.totals, [0, 100]);
  assert.equal(result.finished, false);
  assert.equal(result.history[2][1].reset, false);
  result = replayGame(['Ada', 'Ben'], [round, round, round, round]);
  assert.equal(result.finished, true);
  assert.deepEqual(result.winners, [0]);
  assert.throws(() => replayGame(['Ada', 'Ben'], [round, round, round, round, round]));
});
test('undo replay restores reset eligibility without mutating rounds', () => {
  const round = { hands: [[12, 12, 13, 13], [1]], caller: 0 };
  const original = JSON.stringify(round);
  assert.equal(replayGame(['A', 'B'], [round, round]).resetUsed[1], true);
  assert.equal(replayGame(['A', 'B'], [round]).resetUsed[1], false);
  assert.equal(JSON.stringify(round), original);
});
test('invalid, missing, excessive or impossible cards cannot be scored', () => {
  for(const hands of [[[], [1]], [[14], [1]], [[1.5], [1]], [[1, 2, 3, 4, 5], [1]], [[13, 13], [13]], [[0, 0], [0]], [[3, 3, 3], [3, 3]]]){
    assert.throws(() => scoreRound(hands, 0));
  }
  assert.throws(() => scoreRound([[1], [2]], null));
  assert.throws(() => scoreRound([[1], [2]], 2));
});
test('supports five players and totals that include Cabo penalties', () => {
  const round = { hands: [[1], [2], [3], [4], [5]], caller: 4 };
  assert.deepEqual(replayGame(['A', 'B', 'C', 'D', 'E'], [round]).totals, [0, 2, 3, 4, 10]);
});
