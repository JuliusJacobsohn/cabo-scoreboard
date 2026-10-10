(() => {
  const KEY = 'cabo_mobile_v1';
  const $ = selector => document.querySelector(selector);
  const { scoreRound, replayGame } = CaboScoring;
  const { summarizeGames } = CaboStatistics;
  const COLORS = ['#f4c542', '#7dd3fc', '#34d399', '#fb7185', '#c4b5fd'];
  let state = { version: 1, players: [], games: [], activeId: null };
  let selected = 0;
  let chart = null;
  let analyticsCharts = [];
  let analyticsContext = 'history';
  let analyticsView = 'graph';
  let statsPlayer = '';
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
    if($('#analyticsDialog').open) renderAnalytics();
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
    chart = createScoreGraph('gameGraphCanvas', game, result);
  }

  function chartOptions(){
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: '#e7eef9' } } },
      scales: {
        x: { ticks: { color: '#9fb0c7' }, grid: { color: '#ffffff12' } },
        y: { beginAtZero: true, ticks: { color: '#9fb0c7', precision: 0 }, grid: { color: '#ffffff12' } }
      }
    };
  }

  function createScoreGraph(canvas, game, result){
    if(typeof Chart === 'undefined') return null;
    const options = chartOptions();
    options.scales.x.title = { display: true, text: 'Runde', color: '#9fb0c7' };
    options.scales.x.ticks.precision = 0;
    return new Chart($('#' + canvas), {
      type: 'line',
      data: { labels: Array.from({ length: game.rounds.length + 1 }, (_, index) => index), datasets: game.players.map((name, index) => ({ label: name, data: [0, ...result.history.map(entries => entries[index].total)], borderColor: COLORS[index], backgroundColor: COLORS[index], tension: 0, pointRadius: 3 })) },
      options
    });
  }

  function destroyAnalyticsCharts(){
    analyticsCharts.forEach(item => item?.destroy()); analyticsCharts = [];
  }

  function openAnalytics(context, view){
    analyticsContext = context; analyticsView = view;
    const dialog = $('#analyticsDialog');
    if(!dialog.open){
      if(typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    document.body.classList.add('modalOpen'); renderAnalytics();
  }

  function closeAnalytics(){
    const dialog = $('#analyticsDialog');
    if(typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.classList.remove('modalOpen'); destroyAnalyticsCharts();
  }

  function renderAnalytics(){
    destroyAnalyticsCharts();
    $('#analyticsTitle').textContent = analyticsContext === 'history' ? 'Graph & Verlauf' : 'Spielarchiv & Statistik';
    const views = analyticsContext === 'history' ? ['graph', 'history'] : ['games', 'stats'];
    document.querySelectorAll('#analyticsTabs button').forEach(tab => {
      const active = tab.dataset.view === analyticsView;
      tab.classList.toggle('hidden', !views.includes(tab.dataset.view));
      tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    });
    for(const [view, panel] of Object.entries({ graph: 'modalGraphPanel', history: 'historyPanel', games: 'archivePanel', stats: 'statisticsPanel' })){
      $('#' + panel).classList.toggle('hidden', view !== analyticsView);
    }
    if(analyticsContext === 'history'){
      const game = currentGame(); if(!game) return;
      const result = replayGame(game.players, game.rounds);
      if(analyticsView === 'graph') analyticsCharts.push(createScoreGraph('historyGraphCanvas', game, result));
      else renderHistory(game, result);
    }else if(analyticsView === 'stats') renderStatistics();
    else{
      const list = $('#archiveGamesList'); list.replaceChildren();
      const games = state.games.filter(game => game.closed).slice().reverse();
      if(!games.length) list.textContent = 'Noch keine beendeten Spiele.';
      games.forEach(game => {
        const result = replayGame(game.players, game.rounds);
        const el = button(game.players.join(' · '), () => {
          state.activeId = game.id; selected = 0; closeAnalytics(); save(); render(); openAnalytics('history', 'graph');
        });
        const info = document.createElement('span'); info.className = 'small';
        info.textContent = `${game.rounds.length} Runden · Gewonnen: ${result.winners.map(index => game.players[index]).join(', ')} · Graph öffnen`;
        el.append(info); list.append(el);
      });
    }
  }

  function renderStatistics(){
    const stats = summarizeGames(state.games);
    $('#statsEmpty').classList.toggle('hidden', !!stats.length);
    $('#statsContent').classList.toggle('hidden', !stats.length);
    $('#statsBody').replaceChildren(); $('#statsPlayerButtons').replaceChildren();
    if(!stats.length) return;
    const selectedStat = stats.find(stat => stat.key === statsPlayer) || stats[0]; statsPlayer = selectedStat.key;
    const format = number => number.toLocaleString('de-DE', { maximumFractionDigits: 1 });
    stats.forEach(stat => {
      const row = document.createElement('tr');
      for(const [index, value] of [stat.name, stat.gamesPlayed, stat.wins, stat.losses, format(stat.winRate) + '%', format(stat.avgPoints), format(stat.avgRank), stat.minPoints, stat.maxPoints].entries()){
        const cell = document.createElement(index === 0 ? 'th' : 'td'); cell.textContent = value;
        if(index === 0) cell.scope = 'row'; row.append(cell);
      }
      $('#statsBody').append(row);
      const el = button(stat.name, () => { statsPlayer = stat.key; renderAnalytics(); }, stat.key === statsPlayer ? 'btnAccent' : '');
      el.setAttribute('aria-pressed', String(stat.key === statsPlayer)); $('#statsPlayerButtons').append(el);
    });
    $('#callStatsLine').textContent = `${selectedStat.name}: ${selectedStat.roundsPlayed} Runden · Ø ${format(selectedStat.avgRoundPoints)} Rundenpunkte · ${selectedStat.calls} Cabo-Rufe, davon ${selectedStat.failedCalls} mit +5 · ${selectedStat.moons} Kamikaze · ${selectedStat.resets} Resets`;
    if(typeof Chart === 'undefined') return;
    const labels = stats.map(stat => stat.name);
    const addChart = (canvas, type, data, options = chartOptions()) => analyticsCharts.push(new Chart($('#' + canvas), { type, data, options }));
    addChart('statsWinLossCanvas', 'bar', { labels, datasets: [
      { label: 'Siege', data: stats.map(stat => stat.wins), backgroundColor: '#34d399' },
      { label: 'Niederlagen', data: stats.map(stat => stat.losses), backgroundColor: '#fb7185' }
    ] });
    addChart('statsPointsCanvas', 'bar', { labels, datasets: [
      { label: 'Min.', data: stats.map(stat => stat.minPoints), backgroundColor: '#7dd3fc' },
      { label: 'Ø Punkte', data: stats.map(stat => stat.avgPoints), backgroundColor: '#f4c542' },
      { label: 'Max.', data: stats.map(stat => stat.maxPoints), backgroundColor: '#fb7185' }
    ] });
    addChart('statsTrendCanvas', 'line', {
      labels: selectedStat.scoreHistory.map((_, index) => `Partie ${index + 1}`),
      datasets: [{ label: selectedStat.name, data: selectedStat.scoreHistory.map(entry => entry.score), borderColor: '#f4c542', backgroundColor: '#f4c542', tension: 0, pointRadius: 4 }]
    });
    const positions = Object.entries(selectedStat.positionCounts).sort(([a], [b]) => Number(a) - Number(b));
    addChart('statsPositionCanvas', 'doughnut', {
      labels: positions.map(([rank]) => `Platz ${rank}`),
      datasets: [{ data: positions.map(([, count]) => count), backgroundColor: COLORS, borderColor: '#0b0f14' }]
    }, { responsive: true, maintainAspectRatio: false, animation: false, plugins: chartOptions().plugins });
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
  $('#btnHistory').addEventListener('click', () => openAnalytics('history', 'graph'));
  $('#btnSetupHistory').addEventListener('click', () => openAnalytics('archive', 'games'));
  $('#btnSetupStats').addEventListener('click', () => openAnalytics('archive', 'stats'));
  $('#btnCloseAnalytics').addEventListener('click', closeAnalytics);
  $('#analyticsDialog').addEventListener('close', () => { document.body.classList.remove('modalOpen'); destroyAnalyticsCharts(); });
  document.querySelectorAll('#analyticsTabs button').forEach(tab => {
    tab.addEventListener('click', () => { analyticsView = tab.dataset.view; renderAnalytics(); $('.analyticsBody').scrollTop = 0; });
    tab.addEventListener('keydown', event => {
      if(!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll('#analyticsTabs button')].filter(item => !item.classList.contains('hidden'));
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click(); tabs[next].focus();
    });
  });
  $('#btnEndGame').addEventListener('click', () => {
    const game = currentGame(); if(!game || game.closed || !game.rounds.length) return;
    if(!confirm('Spiel mit den abgeschlossenen Runden beenden? Die aktuelle Eingabe wird nicht gewertet.')) return;
    game.closed = true; save(); render();
  });
  render();
})();
