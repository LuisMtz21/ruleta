(() => {
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('names');
  const spinButton = document.getElementById('spin');
  const count = document.getElementById('count');
  const dialog = document.getElementById('result');
  const winnerText = document.getElementById('winner');
  const historyList = document.getElementById('historyList');
  const winnerHistoryDialog = document.getElementById('winnerHistoryDialog');
  const winnerHistoryList = document.getElementById('winnerHistoryList');
  const clearWinnerHistoryButton = document.getElementById('clearWinnerHistory');
  const CURRENT_KEY = 'ruleta_nombres_actuales_v1';
  const HISTORY_KEY = 'ruleta_nombres_historial_v1';
  const WINNER_HISTORY_KEY = 'ruleta_ganadores_v1';
  const colors = ['#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];
  let names = [];
  let rotation = 0;
  let spinning = false;
  let history = [];
  let winnerHistory = [];

  function getNames() {
    return input.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  }
  function saveCurrentNames() {
    try { localStorage.setItem(CURRENT_KEY, input.value); } catch (e) { }
  }
  function saveNamesToHistory(list) {
    try {
      list.forEach(name => {
        if (!history.some(saved => saved.toLocaleLowerCase() === name.toLocaleLowerCase())) history.unshift(name);
      });
      history = history.slice(0, 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      renderHistory();
    } catch (e) { }
  }
  function renderHistory() {
    historyList.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = 'Todavía no hay nombres guardados.';
      historyList.appendChild(empty);
      return;
    }
    history.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-name';
      button.textContent = name;
      button.title = 'Agregar ' + name;
      button.addEventListener('click', () => {
        if (spinning) return;
        const current = getNames();
        if (!current.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          input.value = input.value.trim() ? input.value.trimEnd() + '\n' + name : name;
          saveCurrentNames();
          updateWheel();
        }
      });
      historyList.appendChild(button);
    });
  }
  function renderWinnerHistory() {
    winnerHistoryList.replaceChildren();
    clearWinnerHistoryButton.disabled = winnerHistory.length === 0;
    if (!winnerHistory.length) {
      const empty = document.createElement('li');
      empty.className = 'winner-history-empty';
      empty.textContent = 'Todavía no hay ganadores registrados.';
      winnerHistoryList.appendChild(empty);
      return;
    }
    winnerHistory.forEach(record => {
      const item = document.createElement('li');
      item.className = 'winner-record';
      const name = document.createElement('strong');
      name.textContent = record.name;
      const date = document.createElement('time');
      date.dateTime = record.timestamp;
      date.textContent = new Date(record.timestamp).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      item.append(name, date);
      winnerHistoryList.appendChild(item);
    });
  }
  function addWinnerToHistory(name) {
    winnerHistory.unshift({ name, timestamp: new Date().toISOString() });
    try { localStorage.setItem(WINNER_HISTORY_KEY, JSON.stringify(winnerHistory)); } catch (e) { }
    renderWinnerHistory();
  }
  function loadSavedData() {
    try {
      const savedCurrent = localStorage.getItem(CURRENT_KEY);
      if (savedCurrent !== null) input.value = savedCurrent;
      const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(savedHistory)) history = savedHistory.filter(x => typeof x === 'string');
      const savedWinnerHistory = JSON.parse(localStorage.getItem(WINNER_HISTORY_KEY) || '[]');
      if (Array.isArray(savedWinnerHistory)) {
        winnerHistory = savedWinnerHistory.filter(record => record && typeof record.name === 'string' &&
          typeof record.timestamp === 'string' && Number.isFinite(Date.parse(record.timestamp)));
      }
    } catch (e) { }
    renderHistory();
    renderWinnerHistory();
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const cx = w / 2, cy = h / 2, radius = Math.min(w, h) / 2 - 8;
    ctx.clearRect(0, 0, w, h);
    if (!names.length) {
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = '#39334f'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Agrega nombres', cx, cy); return;
    }
    const arc = Math.PI * 2 / names.length;
    names.forEach((name, i) => {
      const start = rotation + i * arc - Math.PI / 2;
      const end = start + arc;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, start, end); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      const fontSize = Math.max(10, Math.min(17, 220 / names.length));
      ctx.font = `800 ${fontSize}px system-ui`;
      let label = name;
      const maxWidth = radius * .68;
      while (ctx.measureText(label).width > maxWidth && label.length > 4) label = label.slice(0, -2) + '…';
      ctx.fillText(label, radius - 15, 0);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(8, radius * .055), 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#29213f'; ctx.lineWidth = 3; ctx.stroke();
  }
  function updateWheel() {
    if (spinning) return;
    names = getNames();
    saveCurrentNames();
    count.textContent = `${names.length} participante${names.length === 1 ? '' : 's'}`;
    spinButton.disabled = names.length < 2;
    draw();
  }
  function spin() {
    if (spinning || names.length < 2) return;
    saveNamesToHistory(names);
    spinning = true; spinButton.disabled = true;
    const winnerIndex = Math.floor(Math.random() * names.length);
    const arc = Math.PI * 2 / names.length;
    const slotsPerName = Math.max(1, Math.floor(1000 / names.length));
    const slotIndex = Math.floor(Math.random() * slotsPerName);
    const positionInSlot = Math.random();
    const positionInSector = (slotIndex + positionInSlot) / slotsPerName;
    const targetMod = ((-(winnerIndex * arc + arc * positionInSector)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const currentMod = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const delta = ((targetMod - currentMod) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const start = rotation;
    const total = delta + Math.PI * 2 * (5 + Math.floor(Math.random() * 3));
    const duration = 4800, startTime = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      rotation = start + total * eased;
      draw();
      if (t < 1) requestAnimationFrame(frame);
      else {
        rotation = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        spinning = false; spinButton.disabled = false;
        winnerText.textContent = names[winnerIndex];
        addWinnerToHistory(names[winnerIndex]);
        dialog.showModal();
      }
    }
    requestAnimationFrame(frame);
  }
  document.getElementById('clear').addEventListener('click', () => { if (!spinning) { input.value = ''; updateWheel(); } });
  document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm('¿Deseas borrar todos los nombres guardados?')) {
      history = [];
      try { localStorage.removeItem(HISTORY_KEY); } catch (e) { }
      renderHistory();
    }
  });
  document.getElementById('openWinnerHistory').addEventListener('click', () => winnerHistoryDialog.showModal());
  document.getElementById('clearWinnerHistory').addEventListener('click', () => {
    if (confirm('¿Deseas borrar el historial de ganadores?')) {
      winnerHistory = [];
      try { localStorage.removeItem(WINNER_HISTORY_KEY); } catch (e) { }
      renderWinnerHistory();
    }
  });
  document.getElementById('closeWinnerHistory').addEventListener('click', () => winnerHistoryDialog.close());
  input.addEventListener('input', updateWheel);
  input.addEventListener('blur', () => saveNamesToHistory(getNames()));
  spinButton.addEventListener('click', spin);
  document.getElementById('close').addEventListener('click', () => dialog.close());
  window.addEventListener('resize', resizeCanvas);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => { });
  });
  loadSavedData();
  updateWheel(); resizeCanvas();
})();
