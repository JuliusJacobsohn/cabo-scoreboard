const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const KEY = 'cabo_mobile_v1';

function app(storage = {}){
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/cabo-scoreboard/', runScripts: 'outside-only' });
  const { window } = dom;
  window.structuredClone = structuredClone;
  window.confirm = () => true;
  for(const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  window.eval(fs.readFileSync(path.join(root, 'scoring.js'), 'utf8'));
  window.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
  return {
    window,
    el: selector => window.document.querySelector(selector),
    click(selector){ const el = this.el(selector); assert.ok(el, selector); assert.ok(!el.disabled, `Disabled: ${selector}`); el.click(); },
    state: () => JSON.parse(window.localStorage.getItem(KEY)),
    game(){ const state = this.state(); return state.games.find(game => game.id === state.activeId); },
    reload(){ const storage = Object.fromEntries(Object.keys(window.localStorage).map(key => [key, window.localStorage.getItem(key)])); window.close(); return app(storage); },
    start(names = ['Ada', 'Ben']){
      for(const name of names){ this.el('#playerName').value = name; this.el('#playerForm').dispatchEvent(new window.Event('submit', { cancelable: true })); }
      this.click('#btnStart');
    },
    card(value){ this.click(`#numberPad button[data-value="${value}"]`); },
    caller(index){ this.el('#callerSelect').value = String(index); this.el('#callerSelect').dispatchEvent(new window.Event('change')); },
    round(hands, caller){
      for(let i = 0; i < hands.length; i++){
        this.window.document.querySelectorAll('.playerButton')[i].click();
        for(const value of hands[i]) this.card(value);
        this.click('#btnConfirm');
      }
      this.caller(caller); this.click('#btnRoundDone');
    }
  };
}

test('setup, complete round and score history use actual app handlers', () => {
  const a = app(); a.start();
  a.round([[1, 2], [8]], 1);
  assert.equal(a.game().rounds.length, 1);
  assert.match(a.el('#histBody').textContent, /13 → 13/);
  assert.equal(a.el('#roundLabel').textContent, '2');
  assert.equal(a.el('#btnRoundDone').disabled, true);
  a.window.close();
});
test('input Undo restores card input and survives reload', () => {
  let a = app(); a.start(); a.card(3); a.card(9); a = a.reload();
  a.click('#btnUndoInput');
  assert.deepEqual(a.game().draft.entries[0].cards, [3]);
  a.click('#btnUndoInput'); assert.deepEqual(a.game().draft.entries[0].cards, []);
  assert.equal(a.el('#btnUndoInput').disabled, true); a.window.close();
});
test('Undo restores confirmation and selected player, then caller changes', () => {
  const a = app(); a.start(); a.card(7); a.click('#btnConfirm');
  assert.match(a.el('#entryTitle').textContent, /Ben/);
  a.click('#btnUndoInput');
  assert.match(a.el('#entryTitle').textContent, /Ada/);
  assert.equal(a.game().draft.entries[0].confirmed, false);
  a.caller(1); a.click('#btnUndoInput'); assert.equal(a.game().draft.caller, null);
  a.window.close();
});
test('remove card invalidates OK; impossible deck cannot commit', () => {
  const a = app(); a.start();
  a.card(13); a.card(13); a.click('#btnConfirm'); a.card(13); a.click('#btnConfirm'); a.caller(0);
  assert.equal(a.el('#btnRoundDone').disabled, true);
  assert.match(a.el('#roundPreview').textContent, /Deck/);
  a.window.document.querySelectorAll('.playerButton')[0].click(); a.click('#cardValues button');
  assert.equal(a.game().draft.entries[0].confirmed, false); a.window.close();
});
test('undo round after reload recalculates totals; corrected cards can recommit', () => {
  let a = app(); a.start(); a.round([[2], [8]], 1); a = a.reload();
  a.click('#btnUndo'); assert.equal(a.game().rounds.length, 0);
  assert.match(a.el('#scoreList').textContent, /0/);
  a.window.document.querySelectorAll('.playerButton')[1].click(); a.click('#cardValues button'); a.card(1); a.click('#btnConfirm');
  a.click('#btnRoundDone');
  assert.match(a.el('#histBody').textContent, /2 → 2/);
  assert.match(a.el('#histBody').textContent, /0 → 0/); a.window.close();
});
test('moon scoring, once-only reset, automatic game end and undo restore state', () => {
  let a = app(); a.start();
  for(let i = 0; i < 4; i++) a.round([[12, 12, 13, 13], [1]], 1);
  assert.equal(a.game().closed, true);
  assert.match(a.el('#finishBanner').textContent, /Ada/);
  a = a.reload(); a.click('#btnUndo');
  assert.equal(a.game().closed, false);
  assert.match(a.el('#scoreList').textContent, /100/);
  a.click('#btnRoundDone'); assert.equal(a.game().closed, true); a.window.close();
});
test('switching games preserves drafts and completed scores independently', () => {
  const a = app(); a.start(); const first = a.game().id; a.card(5); a.click('#btnMainMenu');
  a.start(['Chris', 'Dee']); a.round([[1], [4]], 0); a.click('#btnMainMenu');
  a.click('#openGamesList button:last-child');
  assert.equal(a.game().id, first); assert.deepEqual(a.game().draft.entries[0].cards, [5]); a.window.close();
});
test('five-player selection is compact; name markup remains text', () => {
  const a = app(); a.start(['<img src=x>', 'B', 'C', 'D', 'E']);
  assert.equal(a.window.document.querySelectorAll('.playerButton').length, 5);
  assert.equal(a.window.document.querySelectorAll('#scoreList img').length, 0);
  assert.equal(a.el('#graphPanel').classList.contains('hidden'), true);
  assert.equal(a.el('#historyPanel').classList.contains('hidden'), true);
  a.click('#btnHistory'); assert.equal(a.el('#historyPanel').classList.contains('hidden'), false);
  a.window.close();
});
test('malformed storage is preserved without silent overwrite', () => {
  const a = app({ [KEY]: '{invalid' });
  assert.match(a.el('#message').textContent, /nicht geladen/);
  a.start(); a.card(3);
  assert.equal(a.window.localStorage.getItem(KEY), '{invalid'); a.window.close();
});
test('manual finish ignores unfinished round; reopening restores editable results', () => {
  const a = app(); a.start(); a.round([[2], [6]], 0); a.card(13); a.click('#btnEndGame');
  assert.equal(a.game().rounds.length, 1); assert.equal(a.game().closed, true);
  a.click('#btnUndo'); assert.equal(a.game().closed, false);
  assert.deepEqual(a.game().draft.entries[0].cards, [2]); a.window.close();
});
