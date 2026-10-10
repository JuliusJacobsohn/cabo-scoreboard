(() => {
  const KEY = 'cabo_mobile_v1';
  const $ = selector => document.querySelector(selector);
  const { scoreRound, replayGame } = CaboScoring;
  const COLORS = ['#f4c542', '#7dd3fc', '#34d399', '#fb7185', '#c4b5fd'];
  let state = { version: 1, players: [], games: [], activeId: null };
  let selected = 0;
  let chart = null;
  let storageBlocked = false;

  function notify(message){
    $('#message').textContent = message;
    $('#message').classList.toggle('hidden', !message);
  }

  function validState(value){
    if(!value || value.version !== 1 || !Array.isArray(value.players) || !Array.isArray(value.games)) return false;
    if(value.players.length > 5 || value.players.some(name => typeof name !== 'string' || !name.trim())) return false;
    const ids = new Set();
    for(const game of value.games){
      if(typeof game.id !== 'string' || ids.has(game.id)) return false;
      ids.add(game.id);
      if(!Array.isArray(game.players) || game.players.length < 2 || game.players.length > 5 || game.players.some(name => typeof name !== 'string' || !name.trim())) return false;
      if(!Array.isArray(game.rounds) || !game.draft || game.draft.entries.length !== game.players.length) return false;
      replayGame(game.players, game.rounds);
      if(typeof game.closed !== 'boolean') return false;
      if(game.draft.caller !== null && (!Number.isInteger(game.draft.caller) || game.draft.caller < 0 || game.draft.caller >= game.players.length)) return false;
      for(const entry of game.draft.entries){
        if(!Array.isArray(entry.cards) || entry.cards.length > 4 || entry.cards.some(v => !Number.isInteger(v) || v < 0 || v > 13) || typeof entry.confirmed !== 'boolean' || (entry.confirmed && !entry.cards.length)) return false;
      }
    }
    return value.activeId === null || ids.has(value.activeId);
  }

  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const saved = JSON.parse(raw);
      if(!validState(saved)) throw new Error('Invalid saved game');
      state = saved;
    }
  }catch(error){
    storageBlocked = true;
    notify('Gespeicherte Spiele konnten nicht geladen werden. Bestehende Daten werden nicht überschrieben. Diese Sitzung funktioniert ohne Speicherung.');
  }

  function rememberDraft(game){
    game.draftUndo = game.draftUndo || [];
    game.draftUndo.push({ draft: structuredClone(game.draft), selected });
    if(game.draftUndo.length > 30) game.draftUndo.shift();
  }

  function save(){
    if(storageBlocked) return;
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }
    catch(error){ notify('Speichern ist nicht möglich. Lass diese Seite offen, damit das Spiel erhalten bleibt.'); }
  }

  function currentGame(){ return state.games.find(game => game.id === state.activeId); }
  function newDraft(count){ return { caller: null, entries: Array.from({ length: count }, () => ({ cards: [], confirmed: false })) }; }
  function button(text, onClick, className = ''){
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = text; el.className = className;
    el.addEventListener('click', onClick);
    return el;
  }

  function render(){
    const game = currentGame();
    document.body.classList.toggle('playing', !!game);
    $('#setupScreen').classList.toggle('hidden', !!game);
    $('#gameScreen').classList.toggle('hidden', !game);
    $('#error').textContent = '';
    if(game) renderGame(game);
    else renderSetup();
  }

  function addPlayer(name){
    name = name.trim();
    if(!name || state.players.length >= 5 || state.players.some(player => player.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    state.players.push(name.slice(0, 40));
    $('#playerName').value = '';
    save(); render(); $('#playerName').focus();
  }

  function renderSetup(){
    $('#chips').replaceChildren();
    state.players.forEach((name, index) => {
      const chip = document.createElement('div'); chip.className = 'chip';
      const label = document.createElement('span'); label.textContent = name;
      const remove = button('×', () => { state.players.splice(index, 1); save(); render(); });
      remove.setAttribute('aria-label', `${name} entfernen`);
      chip.append(label, remove); $('#chips').append(chip);
    });
    $('#btnStart').disabled = state.players.length < 2;
    $('#recentPlayers').replaceChildren();
    const recent = [...new Set(state.games.flatMap(game => game.players))].filter(name => !state.players.includes(name));
    recent.forEach(name => { const el = button(name, () => addPlayer(name)); el.disabled = state.players.length >= 5; $('#recentPlayers').append(el); });
    for(const closed of [false, true]){
      const list = $(closed ? '#closedGamesList' : '#openGamesList'); list.replaceChildren();
      const games = state.games.filter(game => game.closed === closed).slice().reverse();
      if(!games.length){ const empty = document.createElement('p'); empty.className = 'small'; empty.textContent = closed ? 'Noch keine beendeten Spiele.' : 'Keine offenen Spiele.'; list.append(empty); }
      games.forEach(game => {
        const result = replayGame(game.players, game.rounds);
        const el = button(game.players.join(' · '), () => { state.activeId = game.id; selected = 0; save(); render(); });
        const info = document.createElement('span'); info.className = 'small';
        info.textContent = closed ? `${game.rounds.length} Runden · Gewonnen: ${result.winners.map(index => game.players[index]).join(', ')}` : `${game.rounds.length} Runden gespielt · Fortsetzen`;
        el.append(info); list.append(el);
      });
    }
  }

  function renderGame(game){
    const result = replayGame(game.players, game.rounds);
    selected = Math.max(0, Math.min(selected, game.players.length - 1));
    $('#roundLabel').textContent = game.closed ? game.rounds.length : game.rounds.length + 1;
    $('#btnUndo').disabled = !game.rounds.length;
    $('#btnUndoInput').disabled = game.closed || !game.draftUndo?.length;
    $('#btnEndGame').disabled = game.closed || !game.rounds.length;
    $('#roundEntry').classList.toggle('hidden', game.closed);
    $('#finishBanner').classList.toggle('hidden', !game.closed);
    $('#finishBanner').textContent = `Spiel beendet · Gewonnen: ${result.winners.map(index => game.players[index]).join(', ')} (${Math.min(...result.totals)} Punkte)`;
    $('#scoreList').replaceChildren();
    game.players.forEach((name, index) => {
      const entry = game.draft.entries[index];
      const el = button('', () => { selected = index; render(); }, `playerButton${selected === index && !game.closed ? ' active' : ''}`);
      el.setAttribute('aria-pressed', String(selected === index));
      const label = document.createElement('span'); label.textContent = name; label.title = name; label.style.color = COLORS[index];
      const total = document.createElement('b'); total.textContent = result.totals[index];
      const detail = document.createElement('span'); detail.className = 'small';
      detail.textContent = game.closed ? 'Punkte' : entry.confirmed ? '✓ OK' : 'Offen';
      el.title = `${name}: ${result.totals[index]} Punkte${entry.cards.length ? ` · Karten ${entry.cards.join(', ')}` : ''}`;
      el.append(label, total, detail); $('#scoreList').append(el);
    });
    $('#scoreList').style.setProperty('--player-count', game.players.length);
    $('#entryTitle').textContent = `${game.players[selected]} · Karten eingeben`;
    const entry = game.draft.entries[selected];
    $('#cardValues').replaceChildren();
    entry.cards.forEach((value, index) => {
      const el = button(String(value), () => { rememberDraft(game); entry.cards.splice(index, 1); entry.confirmed = false; save(); render(); });
      el.setAttribute('aria-label', `Karte ${value} entfernen`); $('#cardValues').append(el);
    });
    if(!entry.cards.length){ const hint = document.createElement('span'); hint.className = 'small'; hint.textContent = 'Noch keine Karten'; $('#cardValues').append(hint); }
    $('#numberPad').replaceChildren();
    for(let value = 0; value <= 13; value++){
      const el = button(String(value), () => { rememberDraft(game); entry.cards.push(value); entry.confirmed = false; save(); render(); });
      el.disabled = entry.cards.length >= 4; el.dataset.value = value; $('#numberPad').append(el);
    }
    const backspace = button('⌫', () => {
      if(!entry.cards.length) return;
      rememberDraft(game); entry.cards.pop(); entry.confirmed = false; save(); render();
    }, 'backspace');
    backspace.disabled = !entry.cards.length;
    backspace.setAttribute('aria-label', 'Letzte Karte entfernen');
    $('#numberPad').append(backspace);
    $('#cardSum').textContent = entry.cards.reduce((sum, value) => sum + value, 0);
    $('#btnConfirm').disabled = !entry.cards.length || entry.confirmed;
    $('#btnConfirm').textContent = entry.confirmed ? '✓ OK' : 'OK';
    $('#callerButtons').replaceChildren();
    $('#callerButtons').style.setProperty('--player-count', game.players.length);
    game.players.forEach((name, index) => {
      const el = button(name, () => {
        if(game.closed || game.draft.caller === index) return;
        rememberDraft(game); game.draft.caller = index; save(); render();
      }, game.draft.caller === index ? 'active' : '');
      el.dataset.caller = index;
      el.setAttribute('aria-pressed', String(game.draft.caller === index));
      el.title = name;
      $('#callerButtons').append(el);
    });
    $('#btnRoundDone').disabled = true;
    $('#roundPreview').textContent = 'Alle Karten mit OK bestätigen und den Cabo-Rufer auswählen.';
    if(game.draft.entries.every(item => item.confirmed) && game.draft.caller !== null){
      try{
        const entries = scoreRound(game.draft.entries.map(item => item.cards), game.draft.caller);
        const next = replayGame(game.players, [...game.rounds, { hands: game.draft.entries.map(item => item.cards), caller: game.draft.caller }]);
        $('#roundPreview').replaceChildren();
        entries.forEach((item, index) => {
          const preview = document.createElement('span'); preview.className = 'previewScore';
          const name = document.createElement('span'); name.textContent = game.players[index];
          const points = document.createElement('b');
          points.textContent = `${item.points}${item.penalty ? ' (+5)' : ''}${next.history.at(-1)[index].reset ? ' ↘50' : ''}`;
          preview.title = `${game.players[index]}: ${item.points} Rundenpunkte${item.penalty ? ' inklusive 5 Strafpunkte' : ''}${item.moon ? ' · 12–12–13–13' : ''}${next.history.at(-1)[index].reset ? ' · Gesamtstand 100→50' : ''}`;
          preview.append(name, points); $('#roundPreview').append(preview);
        });
        $('#btnRoundDone').disabled = game.closed;
      }catch(error){ $('#roundPreview').textContent = error.message; }
    }
    renderHistory(game, result); renderGraph(game, result);
  }

  function renderHistory(game, result){
    $('#histHead').replaceChildren(); $('#histBody').replaceChildren();
    const header = document.createElement('tr');
    for(const name of ['Runde', ...game.players]){ const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = name; header.append(cell); }
    $('#histHead').append(header);
    result.history.forEach((entries, round) => {
      const row = document.createElement('tr');
      const number = document.createElement('th'); number.scope = 'row'; number.textContent = round + 1; row.append(number);
      entries.forEach((entry, index) => {
        const cell = document.createElement('td');
        cell.textContent = `${entry.points} → ${entry.total}${entry.reset ? ' ↘50' : ''}`;
        cell.title = `Karten: ${game.rounds[round].hands[index].join(', ')}${game.rounds[round].caller === index ? ' · Cabo angesagt' : ''}${entry.penalty ? ' · +5 Strafpunkte' : ''}`;
        row.append(cell);
      });
      $('#histBody').append(row);
    });
  }

  function renderGraph(game, result){
    if(chart) chart.destroy();
    if(typeof Chart === 'undefined' || $('#graphPanel').classList.contains('hidden')) return;
    chart = new Chart($('#gameGraphCanvas'), {
      type: 'line',
      data: { labels: Array.from({ length: game.rounds.length + 1 }, (_, index) => index), datasets: game.players.map((name, index) => ({ label: name, data: [0, ...result.history.map(entries => entries[index].total)], borderColor: COLORS[index], backgroundColor: COLORS[index], tension: 0, pointRadius: 3 })) },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e7eef9' } } }, scales: { x: { title: { display: true, text: 'Runde', color: '#9fb0c7' }, ticks: { color: '#9fb0c7', precision: 0 }, grid: { color: '#ffffff12' } }, y: { beginAtZero: true, ticks: { color: '#9fb0c7', precision: 0 }, grid: { color: '#ffffff12' } } } }
    });
  }

  $('#playerForm').addEventListener('submit', event => { event.preventDefault(); addPlayer($('#playerName').value); });
  $('#btnStart').addEventListener('click', () => {
    if(state.players.length < 2 || state.players.length > 5) return;
    const game = { id: crypto.randomUUID(), players: [...state.players], rounds: [], draft: newDraft(state.players.length), closed: false, startedAt: new Date().toISOString() };
    state.games.push(game); state.activeId = game.id; state.players = []; selected = 0; save(); render();
  });
  $('#btnMainMenu').addEventListener('click', () => { state.activeId = null; if(chart){ chart.destroy(); chart = null; } save(); render(); });
  $('#btnConfirm').addEventListener('click', () => {
    const game = currentGame();
    if(!game || game.closed || !game.draft.entries[selected].cards.length) return;
    rememberDraft(game);
    game.draft.entries[selected].confirmed = true;
    const next = game.draft.entries.findIndex(entry => !entry.confirmed);
    if(next >= 0) selected = next;
    save(); render();
  });
  $('#btnRoundDone').addEventListener('click', () => {
    const game = currentGame();
    if(!game || game.closed || !game.draft.entries.every(entry => entry.confirmed)) return;
    try{
      const round = { hands: game.draft.entries.map(entry => [...entry.cards]), caller: game.draft.caller };
      const result = replayGame(game.players, [...game.rounds, round]);
      game.rounds.push(round); game.closed = result.finished; game.draft = newDraft(game.players.length); game.draftUndo = []; selected = 0; save(); render();
    }catch(error){ $('#error').textContent = error.message; }
  });
  $('#btnUndo').addEventListener('click', () => {
    const game = currentGame(); if(!game || !game.rounds.length) return;
    if(!confirm('Letzte Runde wieder öffnen? Die Karten bleiben eingetragen und können korrigiert werden.')) return;
    const round = game.rounds.pop(); game.closed = false;
    game.draft = { caller: round.caller, entries: round.hands.map(cards => ({ cards: [...cards], confirmed: true })) };
    game.draftUndo = []; selected = 0; save(); render();
  });
  $('#btnUndoInput').addEventListener('click', () => {
    const game = currentGame(); if(!game || game.closed || !game.draftUndo?.length) return;
    const previous = game.draftUndo.pop(); game.draft = previous.draft; selected = previous.selected; save(); render();
  });
  $('#btnHistory').addEventListener('click', () => { $('#historyPanel').classList.toggle('hidden'); $('#graphPanel').classList.toggle('hidden'); const game = currentGame(); if(game) renderGraph(game, replayGame(game.players, game.rounds)); });
  $('#btnEndGame').addEventListener('click', () => {
    const game = currentGame(); if(!game || game.closed || !game.rounds.length) return;
    if(!confirm('Spiel mit den abgeschlossenen Runden beenden? Die aktuelle Eingabe wird nicht gewertet.')) return;
    game.closed = true; save(); render();
  });
  render();
})();
