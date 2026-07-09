const $ = id => document.getElementById(id);
let currentQuinielaId = null;

const DB = {
  get: (key, def = null) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function toast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 3000);
}

function stageLabel(s) {
  const labels = {
    GROUP_STAGE: 'Fase de Grupos',
    ROUND_OF_32: 'Ronda de 32',
    ROUND_OF_16: 'Octavos de Final',
    QUARTER_FINALS: 'Cuartos de Final',
    SEMI_FINALS: 'Semifinales',
    FINAL: 'Final'
  };
  return labels[s] || s;
}

const STAGE_ORDER = {
  GROUP_STAGE: 0,
  ROUND_OF_32: 1,
  ROUND_OF_16: 2,
  QUARTER_FINALS: 3,
  SEMI_FINALS: 4,
  FINAL: 5
};

function matchesForQuiniela(q) {
  const matches = getMatches();
  const min = STAGE_ORDER[q.start_stage] ?? 0;
  return matches.filter(m => (STAGE_ORDER[m.stage] ?? 0) >= min);
}

function getAdmin() { return DB.get('q_webapp_admin', null); }
function setAdmin(a) { DB.set('q_webapp_admin', a); }

function getMatches() {
  if (!DB.get('q_webapp_matches')) {
    const normalized = INITIAL_MATCHES.map(m => ({
      id: m.id,
      stage: m.stage,
      group_name: m.group || null,
      match_date: m.date,
      status: 'SCHEDULED',
      home_team_id: m.home_team_id,
      home_team: m.home_team,
      home_score: null,
      away_team_id: m.away_team_id,
      away_team: m.away_team,
      away_score: null
    }));
    DB.set('q_webapp_matches', normalized);
  }
  return DB.get('q_webapp_matches');
}

function saveMatches(matches) { DB.set('q_webapp_matches', matches); }

function getQuinielas() { return DB.get('q_webapp_quinielas', []); }
function saveQuinielas(qs) { DB.set('q_webapp_quinielas', qs); }

function getParticipants() { return DB.get('q_webapp_participants', []); }
function saveParticipants(ps) { DB.set('q_webapp_participants', ps); }

function getPredictions() { return DB.get('q_webapp_predictions', []); }
function savePredictions(ps) { DB.set('q_webapp_predictions', ps); }

function init() {
  // Preload data into localStorage
  getMatches();

  const admin = getAdmin();
  if (!admin) {
    showRegister();
  } else {
    showLogin();
  }

  // If coming back after login
  if (sessionStorage.getItem('q_webapp_logged_in')) {
    showApp();
  }
}

function showLogin() {
  $('login-form').style.display = 'block';
  $('register-form').style.display = 'none';
  $('auth-msg').textContent = 'Inicia sesión para gestionar tus quinielas.';
}

function showRegister() {
  $('login-form').style.display = 'none';
  $('register-form').style.display = 'block';
  $('auth-msg').textContent = 'Crea tu cuenta de administrador.';
}

function register() {
  const name = $('reg-name').value.trim();
  const user = $('reg-user').value.trim();
  const pass = $('reg-pass').value;
  const pass2 = $('reg-pass2').value;

  if (!name || !user || !pass) { toast('Completa todos los campos', 'error'); return; }
  if (pass.length < 4) { toast('Mínimo 4 caracteres', 'error'); return; }
  if (pass !== pass2) { toast('Las contraseñas no coinciden', 'error'); return; }

  setAdmin({ name, user, pass });
  toast('✅ Admin registrado', 'success');
  showLogin();
}

function login() {
  const user = $('login-user').value.trim();
  const pass = $('login-pass').value;
  const admin = getAdmin();

  if (!admin) { toast('No hay admin registrado', 'error'); return; }
  if (user !== admin.user || pass !== admin.pass) { toast('Usuario o contraseña incorrectos', 'error'); return; }

  sessionStorage.setItem('q_webapp_logged_in', '1');
  showApp();
}

function logout() {
  sessionStorage.removeItem('q_webapp_logged_in');
  location.reload();
}

function showApp() {
  $('auth-section').style.display = 'none';
  $('main-nav').style.display = 'flex';
  showTab('home');
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const section = $(name + '-section');
  if (section) section.style.display = 'block';

  const map = { home: 0, quinielas: 1, partidos: 2, predicciones: 3, simulacion: 4 };
  const navBtns = document.querySelectorAll('.nav-btn');
  if (navBtns[map[name]]) navBtns[map[name]].classList.add('active');

  if (name === 'home') renderHome();
  if (name === 'quinielas') renderQuinielas();
  if (name === 'partidos') renderMatchesAdmin();
  if (name === 'predicciones') initPredictions();
  if (name === 'simulacion') initSimulation();
}

function renderHome() {
  const qs = getQuinielas();
  const list = $('home-quinielas-list');
  if (!qs.length) {
    list.innerHTML = '<p class="empty">No hay quinielas creadas.</p>';
    return;
  }
  list.innerHTML = qs.map(q => `
    <div class="qcard">
      <div>
        <h3>${q.name}</h3>
        <p>${participantCount(q.id)} participantes · ${stageLabel(q.start_stage)}</p>
      </div>
      <div class="qactions">
        <button class="btn btn-p btn-s" onclick="openQuiniela(${q.id}); showTab('quinielas');">⚙️ Gestionar</button>
        <button class="btn btn-g btn-s" onclick="showPredictionsForQuiniela(${q.id})">📝 Predicciones</button>
      </div>
    </div>
  `).join('');
}

function participantCount(qid) {
  return getParticipants().filter(p => p.quiniela_id === qid).length;
}

function createQuiniela() {
  const name = $('new-q-name').value.trim();
  const start_stage = $('new-q-stage').value;
  if (!name) { toast('Nombre requerido', 'error'); return; }

  const qs = getQuinielas();
  const id = qs.length ? Math.max(...qs.map(q => q.id)) + 1 : 1;
  qs.push({ id, name, start_stage, status: 'active', created_at: new Date().toISOString() });
  saveQuinielas(qs);
  $('new-q-name').value = '';
  toast('✅ Quiniela creada', 'success');
  renderQuinielas();
  renderHome();
}

function renderQuinielas() {
  const qs = getQuinielas();

  // Global selector
  const globalSelect = $('global-q-select');
  globalSelect.innerHTML = '<option value="">— Selecciona quiniela —</option>' +
    qs.map(q => `<option value="${q.id}">${q.name} (${participantCount(q.id)} participantes)</option>`).join('');

  const list = $('admin-quinielas-list');
  if (!qs.length) {
    list.innerHTML = '<p class="empty">No hay quinielas.</p>';
    closeDetail();
    return;
  }
  list.innerHTML = qs.map(q => `
    <div class="admin-row">
      <div class="admin-info">
        <strong>${q.name}</strong>
        <span>${participantCount(q.id)} participantes · ${stageLabel(q.start_stage)} · 
          <span class="badge ${q.status === 'active' ? 'bs' : 'bw'}">${q.status}</span>
        </span>
      </div>
      <div class="admin-actions">
        <button class="btn btn-p btn-s" onclick="openQuiniela(${q.id})">⚙️ Gestionar</button>
        <button class="btn btn-d btn-s" onclick="deleteQuiniela(${q.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function deleteQuiniela(id) {
  if (!confirm('¿Eliminar esta quiniela, sus participantes y predicciones?')) return;
  saveQuinielas(getQuinielas().filter(q => q.id !== id));
  saveParticipants(getParticipants().filter(p => p.quiniela_id !== id));
  savePredictions(getPredictions().filter(p => {
    const part = getParticipants().find(x => x.id === p.participant_id);
    return part && part.quiniela_id !== id;
  }));
  if (currentQuinielaId === id) closeDetail();
  renderQuinielas();
  renderHome();
  toast('Quiniela eliminada', 'error');
}

function openQuiniela(id) {
  currentQuinielaId = id;
  const q = getQuinielas().find(x => x.id === id);
  if (!q) return;

  $('quiniela-detail').style.display = 'block';
  $('detail-title').textContent = q.name;
  $('detail-meta').innerHTML = `${participantCount(id)} participantes · ${stageLabel(q.start_stage)} · <span class="badge ${q.status === 'active' ? 'bs' : 'bw'}">${q.status}</span>`;

  showDetailTab('participants');
  renderDetailParticipants();
  renderDetailLeaderboard();
}

function closeDetail() {
  currentQuinielaId = null;
  $('quiniela-detail').style.display = 'none';
}

function showDetailTab(name) {
  document.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
  $(`detail-${name}`).classList.add('active');
  const idx = { participants: 0, leaderboard: 1 }[name];
  document.querySelectorAll('.detail-tab')[idx]?.classList.add('active');
}

function renderDetailParticipants() {
  if (!currentQuinielaId) return;
  const ps = getParticipants().filter(p => p.quiniela_id === currentQuinielaId);
  const list = $('detail-participants-list');
  if (!ps.length) {
    list.innerHTML = '<p class="empty">Sin participantes.</p>';
    return;
  }

  const teamOptions = TEAMS.map(t => `<option value="${t.id}">${t.flag} ${t.name}</option>`).join('');
  list.innerHTML = `
    <div class="tw"><table><thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Equipo</th><th></th></tr></thead><tbody>
      ${ps.map((p, i) => {
        const team = TEAMS.find(t => t.id === p.team_id);
        return `<tr>
          <td>${i + 1}</td>
          <td>${p.full_name} ${p.is_demo ? '<span class="demo-badge">DEMO</span>' : ''}</td>
          <td>${p.email}</td>
          <td>
            <select onchange="assignTeam(${p.id}, this.value)">
              <option value="">— Sin equipo —</option>
              ${teamOptions.replace(`value="${p.team_id}"`, `value="${p.team_id}" selected`)}
            </select>
            <button class="btn btn-g btn-s" onclick="raffleTeam(${p.id})">🎲</button>
          </td>
          <td><button class="btn btn-d btn-s" onclick="deleteParticipant(${p.id})">❌</button></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`;
}

function addParticipant(quiniela_id, full_name, email) {
  if (!quiniela_id || !full_name || !email) { toast('Quiniela, nombre y email requeridos', 'error'); return false; }
  const ps = getParticipants();
  const id = ps.length ? Math.max(...ps.map(p => p.id)) + 1 : 1;
  ps.push({
    id,
    quiniela_id,
    full_name,
    email,
    team_id: null,
    token: uuidv4(),
    is_demo: false
  });
  saveParticipants(ps);
  return true;
}

function addParticipantGlobal() {
  const qid = parseInt($('global-q-select').value, 10);
  const name = $('global-p-name').value.trim();
  const email = $('global-p-email').value.trim();

  if (addParticipant(qid, name, email)) {
    toast('✅ Miembro agregado', 'success');
    $('global-p-name').value = '';
    $('global-p-email').value = '';
    renderQuinielas();
    if (currentQuinielaId === qid) {
      openQuiniela(qid);
    }
  }
}

function addParticipantDetail() {
  const name = $('detail-p-name').value.trim();
  const email = $('detail-p-email').value.trim();
  if (addParticipant(currentQuinielaId, name, email)) {
    toast('✅ Participante agregado', 'success');
    $('detail-p-name').value = '';
    $('detail-p-email').value = '';
    renderDetailParticipants();
    renderDetailLeaderboard();
    renderQuinielas();
    renderHome();
  }
}

function deleteParticipant(id) {
  if (!confirm('¿Eliminar este participante y sus predicciones?')) return;
  saveParticipants(getParticipants().filter(p => p.id !== id));
  savePredictions(getPredictions().filter(p => p.participant_id !== id));
  renderDetailParticipants();
  renderDetailLeaderboard();
  renderQuinielas();
  renderHome();
}

function assignTeam(pid, teamId) {
  const ps = getParticipants();
  const p = ps.find(x => x.id === pid);
  if (!p) return;
  p.team_id = teamId ? parseInt(teamId, 10) : null;
  saveParticipants(ps);
  toast('Equipo asignado', 'success');
  renderDetailLeaderboard();
}

function raffleTeam(pid) {
  const ps = getParticipants();
  const p = ps.find(x => x.id === pid);
  if (!p) return;
  const randomTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
  p.team_id = randomTeam.id;
  saveParticipants(ps);
  toast('🎲 Equipo sorteado: ' + randomTeam.name, 'success');
  renderDetailParticipants();
  renderDetailLeaderboard();
}

function renderDetailLeaderboard() {
  const board = buildLeaderboard(currentQuinielaId);
  const list = $('detail-leaderboard-list');
  if (!board.length) {
    list.innerHTML = '<p class="empty">Sin datos aún.</p>';
    return;
  }
  list.innerHTML = `
    <div class="tw"><table><thead><tr><th>#</th><th>Participante</th><th>Equipo</th><th>Puntos</th></tr></thead><tbody>
      ${board.map((r, i) => `<tr>
        <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
        <td>${r.full_name} ${r.is_demo ? '<span class="demo-badge">DEMO</span>' : ''}</td>
        <td>${r.team ? r.team.flag + ' ' + r.team.name : '—'}</td>
        <td><strong>${r.points}</strong></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

function buildLeaderboard(qid) {
  const participants = getParticipants().filter(p => p.quiniela_id === qid);
  const matches = getMatches();
  const predictions = getPredictions();

  return participants.map(p => {
    let points = 0;
    const preds = predictions.filter(x => x.participant_id === p.id);
    preds.forEach(pred => {
      const m = matches.find(m => m.id === pred.match_id);
      if (!m || m.status !== 'FINISHED' || m.home_score === null || m.away_score === null) return;
      if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
        points += 3;
      } else {
        const predWinner = pred.home_score > pred.away_score ? 'H' : pred.home_score < pred.away_score ? 'A' : 'D';
        const realWinner = m.home_score > m.away_score ? 'H' : m.home_score < m.away_score ? 'A' : 'D';
        if (predWinner === realWinner) points += 1;
      }
    });
    return { ...p, points, team: TEAMS.find(t => t.id === p.team_id) };
  }).sort((a, b) => b.points - a.points);
}

function renderMatchesAdmin() {
  const matches = getMatches();
  const groups = {};
  matches.forEach(m => {
    const g = m.group_name ? `Grupo ${m.group_name}` : (m.stage === 'FINAL' && m.home_team.startsWith('Perdedor') ? 'Tercer Lugar' : stageLabel(m.stage));
    if (!groups[g]) groups[g] = [];
    groups[g].push(m);
  });

  const statuses = {
    SCHEDULED: 'Programado',
    IN_PLAY: 'En juego',
    FINISHED: 'Finalizado',
    POSTPONED: 'Postergado'
  };

  let html = '';
  for (const [g, ms] of Object.entries(groups)) {
    html += `<div class="match-group"><h4>${g}</h4><div class="tw"><table><thead><tr><th>Local</th><th>Visitante</th><th>Fecha</th><th>Estado</th><th>Local</th><th>Vis</th><th></th></tr></thead><tbody>`;
    html += ms.map(m => `
      <tr>
        <td>${m.home_team}</td>
        <td>${m.away_team}</td>
        <td><input type="date" class="date-input" id="md-${m.id}" value="${m.match_date || ''}"></td>
        <td>
          <select class="status-input" id="ms-${m.id}">
            ${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${m.status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td><input type="number" class="score-input" id="mh-${m.id}" value="${m.home_score !== null ? m.home_score : ''}" min="0"></td>
        <td><input type="number" class="score-input" id="ma-${m.id}" value="${m.away_score !== null ? m.away_score : ''}" min="0"></td>
        <td><button class="btn btn-p btn-s" onclick="saveMatch(${m.id})">💾 Guardar</button></td>
      </tr>
    `).join('');
    html += '</tbody></table></div></div>';
  }
  $('matches-list').innerHTML = html;
}

function saveMatch(id) {
  const matches = getMatches();
  const m = matches.find(x => x.id === id);
  if (!m) return;

  m.match_date = $(`md-${id}`).value;
  m.status = $(`ms-${id}`).value;
  m.home_score = $(`mh-${id}`).value === '' ? null : parseInt($(`mh-${id}`).value, 10);
  m.away_score = $(`ma-${id}`).value === '' ? null : parseInt($(`ma-${id}`).value, 10);

  saveMatches(matches);
  toast('✅ Partido guardado', 'success');
  renderMatchesAdmin();
  renderDetailLeaderboard();
}

function initPredictions() {
  const qs = getQuinielas();
  const predQ = $('pred-q-select');
  predQ.innerHTML = '<option value="">— Selecciona quiniela —</option>' +
    qs.map(q => `<option value="${q.id}">${q.name}</option>`).join('');
  $('pred-p-select').innerHTML = '<option value="">— Selecciona participante —</option>';
  $('pred-form').innerHTML = '';
}

function showPredictionsForCurrent() {
  if (!currentQuinielaId) { toast('Selecciona una quiniela', 'error'); return; }
  showPredictionsForQuiniela(currentQuinielaId);
}

function showPredictionsForQuiniela(qid) {
  showTab('predicciones');
  $('pred-q-select').value = qid;
  onPredQChange();
}

function onPredQChange() {
  const qid = parseInt($('pred-q-select').value, 10);
  const pSelect = $('pred-p-select');
  pSelect.innerHTML = '<option value="">— Selecciona participante —</option>';
  $('pred-form').innerHTML = '';
  if (!qid) return;

  const ps = getParticipants().filter(p => p.quiniela_id === qid);
  pSelect.innerHTML += ps.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('');
  pSelect.onchange = renderPredForm;
}

function renderPredForm() {
  const qid = parseInt($('pred-q-select').value, 10);
  const pid = parseInt($('pred-p-select').value, 10);
  const container = $('pred-form');
  if (!qid || !pid) { container.innerHTML = ''; return; }

  const q = getQuinielas().find(x => x.id === qid);
  const matches = matchesForQuiniela(q);
  const predictions = getPredictions();

  container.innerHTML = `
    <h3>Predicciones de ${getParticipants().find(p => p.id === pid)?.full_name || ''}</h3>
    <div class="tw"><table><thead><tr><th>Partido</th><th>Fecha</th><th>Local</th><th>Vis</th></tr></thead><tbody>
      ${matches.map(m => {
        const pred = predictions.find(x => x.participant_id === pid && x.match_id === m.id);
        return `<tr>
          <td>${m.home_team} vs ${m.away_team}</td>
          <td>${m.match_date || '—'}</td>
          <td><input type="number" class="score-input" id="pred-h-${m.id}" value="${pred ? pred.home_score : ''}" min="0"></td>
          <td><input type="number" class="score-input" id="pred-a-${m.id}" value="${pred ? pred.away_score : ''}" min="0"></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
    <button class="btn btn-p" style="margin-top:14px" onclick="savePredictions()">💾 Guardar Predicciones</button>
  `;
}

function savePredictions() {
  const qid = parseInt($('pred-q-select').value, 10);
  const pid = parseInt($('pred-p-select').value, 10);
  if (!qid || !pid) { toast('Selecciona quiniela y participante', 'error'); return; }

  const q = getQuinielas().find(x => x.id === qid);
  const matches = matchesForQuiniela(q);
  let preds = getPredictions().filter(x => x.participant_id !== pid);

  matches.forEach(m => {
    const h = $(`pred-h-${m.id}`)?.value;
    const a = $(`pred-a-${m.id}`)?.value;
    if (h !== '' && a !== '' && h !== undefined && a !== undefined) {
      preds.push({ participant_id: pid, match_id: m.id, home_score: parseInt(h, 10), away_score: parseInt(a, 10) });
    }
  });

  savePredictions(preds);
  toast('✅ Predicciones guardadas', 'success');
}

function initSimulation() {
  const qs = getQuinielas();
  $('sim-q-select').innerHTML = '<option value="">— Selecciona quiniela —</option>' +
    qs.map(q => `<option value="${q.id}">${q.name}</option>`).join('');
}

function generateDemo() {
  const qid = parseInt($('sim-q-select').value, 10);
  const count = parseInt($('sim-count').value, 10) || 48;
  if (!qid) { toast('Selecciona una quiniela', 'error'); return; }

  const qs = getQuinielas();
  const q = qs.find(x => x.id === qid);
  const matches = matchesForQuiniela(q);

  const firstNames = ['Ana','Luis','Carlos','María','Pedro','Sofía','Juan','Lucía','Miguel','Valentina','José','Camila','Andrés','Daniela','Fernando','Paula','Diego','Martina','Jorge','Isabella'];
  const lastNames = ['García','Rodríguez','López','Martínez','Pérez','González','Sánchez','Romero','Torres','Ruiz','Aguirre','Castro','Vargas','Molina','Rojas','Morales','Reyes','Jiménez','Herrera','Medina'];

  let ps = getParticipants();
  let preds = getPredictions();
  let maxId = ps.length ? Math.max(...ps.map(p => p.id)) : 0;
  const newIds = [];

  for (let i = 0; i < count; i++) {
    maxId++;
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    ps.push({
      id: maxId,
      quiniela_id: qid,
      full_name: `${fn} ${ln} ${i + 1}`,
      email: `demo${maxId}@test.com`,
      team_id: null,
      token: uuidv4(),
      is_demo: true
    });
    newIds.push(maxId);
  }

  // Generate random predictions for each new demo participant
  newIds.forEach(pid => {
    preds = preds.filter(p => p.participant_id !== pid);
    matches.forEach(m => {
      preds.push({
        participant_id: pid,
        match_id: m.id,
        home_score: Math.floor(Math.random() * 4),
        away_score: Math.floor(Math.random() * 4)
      });
    });
  });

  saveParticipants(ps);
  savePredictions(preds);

  $('sim-result').innerHTML = `<p class="hint">✅ Se generaron ${count} participantes demo con predicciones aleatorias.</p>`;
  toast('Simulación completada', 'success');
  renderQuinielas();
  renderHome();
}

function clearDemo() {
  const qid = parseInt($('sim-q-select').value, 10);
  if (!qid) { toast('Selecciona una quiniela', 'error'); return; }
  if (!confirm('¿Eliminar todos los participantes DEMO de esta quiniela?')) return;

  const demoIds = getParticipants()
    .filter(p => p.quiniela_id === qid && p.is_demo)
    .map(p => p.id);

  saveParticipants(getParticipants().filter(p => !demoIds.includes(p.id)));
  savePredictions(getPredictions().filter(p => !demoIds.includes(p.participant_id)));

  $('sim-result').innerHTML = '<p class="hint">Demo eliminada.</p>';
  toast('Demo eliminada', 'success');
  renderQuinielas();
  renderHome();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
