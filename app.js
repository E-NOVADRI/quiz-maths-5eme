// ============================================================
// app.js — SPA Quiz Maths 5ème
// ============================================================

// ── État global ───────────────────────────────────────────
let state = {
  user:        null,
  view:        'login',
  lessonId:    null,
  questions:   [],
  current:     0,
  answers:     [],
  selected:    null,
  confirmed:   false,
  timeLeft:    30,
  timerId:     null,
  myScores:    {},
  lastResult:  null,
  subscription: null,
  referral:    null,
  selectedPricingPlan: null,
  adminTab:    'students',
  adminData:   { users: [], scores: {} },
};

// ── Helpers ────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}

function scoreColor(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 50) return 'mid';
  if (pct >   0) return 'low';
  return 'none';
}

function scoreMention(pct) {
  if (pct >= 80) return '🏆 Excellent travail !';
  if (pct >= 60) return '👍 Bien, continue ainsi !';
  if (pct >= 40) return '📚 Peut mieux faire.';
  return '🔄 À retravailler.';
}

function fillColor(pct) {
  if (pct >= 80) return 'fill-green';
  if (pct >= 50) return 'fill-amber';
  return 'fill-red';
}

function ringColor(pct) {
  if (pct >= 80) return 'ring-green';
  if (pct >= 60) return 'ring-blue';
  if (pct >= 40) return 'ring-amber';
  return 'ring-red';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function app() { return document.getElementById('app'); }

// ── Render dispatcher ─────────────────────────────────────
function render() {
  switch (state.view) {
    case 'login':     return renderLogin();
    case 'register':  return renderRegister();
    case 'home':      return renderHome();
    case 'quiz':      return renderQuiz();
    case 'result':    return renderResult();
    case 'dashboard': return renderDashboard();
    case 'admin':     return renderAdmin();
    case 'pricing':   return renderPricing();
    case 'referral':  return renderReferral();
    default:          return renderHome();
  }
}

// ── Topbar ─────────────────────────────────────────────────
function topbar(extra = '') {
  const u = state.user;
  if (!u) return '';
  const badge = renderSubscriptionBadge();
  const isAdmin = u.role === 'admin';
  return `
  <div class="topbar">
    <div class="topbar-brand">📐 Quiz Maths 5ème</div>
    <div class="topbar-right">
      ${badge}
      <button class="btn btn-sm" onclick="go('home')">📚 Leçons</button>
      ${u.role === 'student' ? `<button class="btn btn-sm" onclick="go('dashboard')">📊 Bilan</button>` : ''}
      ${u.role === 'student' ? `<button class="btn btn-sm" onclick="go('referral')">🎁 Parrainage</button>` : ''}
      ${u.role === 'student' ? `<button class="btn btn-sm" onclick="go('pricing')">⭐ Abonnement</button>` : ''}
      ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="go('admin')">👨‍🏫 Admin</button>` : ''}
      <button class="btn btn-sm" onclick="logout()">🚪</button>
    </div>
    <button class="hamburger" id="hamburger" onclick="toggleDrawer()">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-drawer" id="mobileDrawer">
    <div class="drawer-overlay" onclick="closeDrawer()"></div>
    <div class="drawer-panel">
      <div class="drawer-user">
        <div class="drawer-user-name">${u.name}</div>
        <div class="drawer-user-role">${u.role === 'admin' ? '👨‍🏫 Professeur' : '👨‍🎓 Élève'} ${badge}</div>
      </div>
      <button class="drawer-btn" onclick="go('home')">📚 Leçons</button>
      ${u.role === 'student' ? `<button class="drawer-btn" onclick="go('dashboard')">📊 Mon bilan</button>` : ''}
      ${u.role === 'student' ? `<button class="drawer-btn" onclick="go('referral')">🎁 Parrainage</button>` : ''}
      ${u.role === 'student' ? `<button class="drawer-btn" onclick="go('pricing')">⭐ Mon abonnement</button>` : ''}
      ${isAdmin ? `<button class="drawer-btn" onclick="go('admin')">👨‍🏫 Admin</button>` : ''}
      <div class="drawer-spacer"></div>
      <button class="drawer-btn danger" onclick="logout()">🚪 Déconnexion</button>
    </div>
  </div>
  ${extra}`;
}

function toggleDrawer() {
  const d = document.getElementById('mobileDrawer');
  const h = document.getElementById('hamburger');
  if (d) d.classList.toggle('open');
  if (h) h.classList.toggle('open');
}

function closeDrawer() {
  const d = document.getElementById('mobileDrawer');
  const h = document.getElementById('hamburger');
  if (d) d.classList.remove('open');
  if (h) h.classList.remove('open');
}

// ── Login ──────────────────────────────────────────────────
function renderLogin() {
  app().innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">📐</div>
      <h1>Quiz Maths 5ème</h1>
      <p>Révisez efficacement avec des quiz interactifs</p>
      <div class="form-group">
        <label>Identifiant</label>
        <input id="l-user" placeholder="ex: eleve1" autocomplete="username">
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input id="l-pass" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div id="l-err" class="error-msg hidden"></div>
      <button class="btn btn-primary w-full mt-2" onclick="doLogin()">Se connecter</button>
      <p class="register-link mt-2">Pas encore de compte ? <a onclick="go('register')">S'inscrire</a></p>
    </div>
  </div>`;
  document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

async function doLogin() {
  const username = document.getElementById('l-user')?.value?.trim();
  const password = document.getElementById('l-pass')?.value;
  const err = document.getElementById('l-err');
  err.classList.add('hidden');
  if (!username || !password) {
    err.textContent = 'Veuillez remplir tous les champs.';
    err.classList.remove('hidden'); return;
  }
  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    state.user = data.user;
    await loadSubscription();
    await loadReferral();
    await loadMyScores();
    go('home');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

async function logout() {
  try { await api('POST', '/api/auth/logout'); } catch (_) {}
  state.user = null; state.subscription = null; state.referral = null;
  state.myScores = {}; stopTimer();
  go('login');
}

// ── Register ───────────────────────────────────────────────
function renderRegister() {
  app().innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">📐</div>
      <h1>Créer un compte</h1>
      <p>Rejoignez l'application et commencez à réviser !</p>
      <div class="form-row">
        <div class="form-group"><label>Nom complet</label>
          <input id="r-name" placeholder="Ex: Koné Moussa"></div>
        <div class="form-group"><label>Classe</label>
          <input id="r-class" placeholder="Ex: 5ème 1"></div>
      </div>
      <div class="form-group"><label>Identifiant</label>
        <input id="r-user" placeholder="Ex: kone.moussa" autocomplete="username"></div>
      <div class="form-group"><label>Mot de passe</label>
        <input id="r-pass" type="password" placeholder="••••••••" autocomplete="new-password"></div>
      <div class="form-group">
        <label>Code de parrainage (optionnel)</label>
        <input id="r-code" placeholder="Ex: KONE7X2A" oninput="checkReferralCode(this.value)" style="text-transform:uppercase">
        <div id="r-code-hint" class="referral-input-hint">🎁 Code valide ! +7 jours Premium offerts</div>
      </div>
      <div id="r-err" class="error-msg hidden"></div>
      <button class="btn btn-primary w-full mt-2" onclick="doRegister()">S'inscrire</button>
      <p class="register-link mt-2">Déjà un compte ? <a onclick="go('login')">Se connecter</a></p>
    </div>
  </div>`;
}

let referralCheckTimer = null;
function checkReferralCode(val) {
  const hint = document.getElementById('r-code-hint');
  if (!hint) return;
  clearTimeout(referralCheckTimer);
  if (val.length < 6) { hint.classList.remove('valid'); return; }
  referralCheckTimer = setTimeout(async () => {
    try {
      await api('GET', '/api/referral/check/' + val.toUpperCase());
      hint.classList.add('valid');
    } catch (_) { hint.classList.remove('valid'); }
  }, 600);
}

async function doRegister() {
  const name = document.getElementById('r-name')?.value?.trim();
  const cls  = document.getElementById('r-class')?.value?.trim();
  const user = document.getElementById('r-user')?.value?.trim();
  const pass = document.getElementById('r-pass')?.value;
  const code = document.getElementById('r-code')?.value?.trim();
  const err  = document.getElementById('r-err');
  err.classList.add('hidden');
  if (!name || !user || !pass) {
    err.textContent = 'Nom, identifiant et mot de passe sont obligatoires.';
    err.classList.remove('hidden'); return;
  }
  try {
    const data = await api('POST', '/api/auth/register', {
      username: user, password: pass, name, class: cls, referralCode: code || null
    });
    if (data.referralBonus) {
      alert('🎁 Code accepté ! 7 jours Premium offerts à vous et votre parrain !');
    }
    state.user = data.user;
    await loadSubscription();
    await loadReferral();
    go('home');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

// ── Home ───────────────────────────────────────────────────
function renderHome() {
  const isPremium = state.subscription?.isActive;
  const cards = LESSONS.map(l => {
    const locked = !isPremium && l.id > 3;
    const s = state.myScores[l.id];
    let scoreEl = '';
    if (locked) {
      scoreEl = '<span class="lesson-lock">🔒 Premium</span>';
    } else if (s) {
      scoreEl = `<span class="lc-score ${scoreColor(s.bestScore)}">${s.bestScore}% · ${s.attempts} essai(s)</span>`;
    } else {
      scoreEl = '<span class="lc-score none">Non commencé</span>';
    }
    return `
    <div class="lesson-card${locked ? ' locked' : ''}" onclick="startLesson(${l.id})">
      <div class="lc-num">Leçon ${l.id}</div>
      <div class="lc-title">${l.title}</div>
      <div class="lc-comp">${l.competence}</div>
      ${scoreEl}
    </div>`;
  }).join('');

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div>
        <div class="section-title">📚 Leçons de Maths 5ème</div>
        <div class="section-sub">Bonjour ${state.user?.name || ''} ! Choisissez une leçon pour commencer.</div>
      </div>
      ${state.user?.role === 'student' ? `<button class="btn" onclick="go('dashboard')">📊 Mon bilan</button>` : ''}
    </div>
    <div class="lesson-grid">${cards}</div>
    ${!isPremium ? `
    <div class="card mt-2" style="background:var(--amber-lt);border-color:var(--amber);text-align:center;padding:1.25rem">
      <div style="font-size:2rem;margin-bottom:0.5rem">⭐</div>
      <div style="font-weight:700;margin-bottom:0.5rem">Débloquez toutes les leçons avec Premium</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:1rem">Les leçons 4 à 10 sont réservées aux abonnés.</div>
      <button class="btn btn-primary" onclick="go('pricing')">Voir les offres →</button>
    </div>` : ''}
  </div>`;
}

async function loadMyScores() {
  try {
    if (!state.user) return;
    const data = await api('GET', '/api/scores/dashboard/me');
    state.myScores = data;
  } catch (_) {}
}

// ── Start lesson ───────────────────────────────────────────
function startLesson(id) {
  const isPremium = state.subscription?.isActive;
  if (!isPremium && id > 3) { go('pricing'); return; }
  const bank = QUESTION_BANK[id];
  if (!bank) return;
  state.lessonId  = id;
  state.questions = shuffle(bank).slice(0, 20);
  state.current   = 0;
  state.answers   = [];
  state.selected  = null;
  state.confirmed = false;
  go('quiz');
  startTimer();
}

// ── Timer ──────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  state.timeLeft = 30;
  state.timerId = setInterval(() => {
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      stopTimer();
      state.selected  = -1;
      state.confirmed = true;
      const q = state.questions[state.current];
      state.answers.push({ selected: -1, correct: q.ans, timedOut: true });
      renderQuiz();
    } else {
      const bar = document.getElementById('timer-fill');
      const txt = document.getElementById('timer-text');
      if (bar) {
        const pct = (state.timeLeft / 30) * 100;
        bar.style.width = pct + '%';
        const cls = state.timeLeft > 15 ? 'fill-green' : state.timeLeft > 8 ? 'fill-amber' : 'fill-red';
        bar.className = 'progress-fill timer-fill ' + cls + (state.timeLeft <= 8 ? ' timer-pulse' : '');
      }
      if (txt) txt.textContent = '⏱ ' + state.timeLeft + 's';
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
}

// ── Quiz ───────────────────────────────────────────────────
function renderQuiz() {
  const lesson = LESSONS.find(l => l.id === state.lessonId);
  const q      = state.questions[state.current];
  const total  = state.questions.length;
  const idx    = state.current;
  const pct    = Math.round(((idx) / total) * 100);

  // Timer bar
  const timerPct   = (state.timeLeft / 30) * 100;
  const timerColor = state.timeLeft > 15 ? 'fill-green' : state.timeLeft > 8 ? 'fill-amber' : 'fill-red';
  const timerHTML  = !state.confirmed ? `
  <div class="timer-row">
    <div class="progress-bar timer-bar">
      <div id="timer-fill" class="progress-fill timer-fill ${timerColor}${state.timeLeft <= 8 ? ' timer-pulse' : ''}"
           style="width:${timerPct}%"></div>
    </div>
    <span id="timer-text" class="timer-text">⏱ ${state.timeLeft}s</span>
  </div>` : '';

  // Options
  const letters = ['A', 'B', 'C', 'D'];
  const opts = q.opts.map((o, i) => {
    let cls = 'option-btn';
    if (state.confirmed) {
      if (i === q.ans)                          cls += ' correct';
      else if (i === state.selected && i !== q.ans) cls += ' wrong';
    } else if (i === state.selected) {
      cls += ' selected';
    }
    return `
    <button class="${cls}" onclick="selectOpt(${i})" ${state.confirmed ? 'disabled' : ''}>
      <span class="opt-letter">${letters[i]}</span>
      <span>${o}</span>
    </button>`;
  }).join('');

  // Feedback
  let feedback = '';
  if (state.confirmed) {
    const ans   = state.answers[state.answers.length - 1];
    const isOk  = ans.selected === q.ans;
    const timedOut = ans.timedOut;
    const parts = COURSE_PARTS[state.lessonId] || {};
    const partInfo = q.part && parts[q.part] ? parts[q.part] : null;

    feedback = `
    <div class="feedback ${isOk ? 'ok' : 'nok'}">
      ${timedOut ? '<span class="timeout-badge">⏱ Temps écoulé !</span><br>' : ''}
      <span class="feedback-icon">${isOk ? '✓' : '✗'}</span>
      <strong>${isOk ? 'Correct !' : 'Incorrect.'}</strong>
      ${!isOk ? `<br><small>Bonne réponse : <strong>${letters[q.ans]}. ${q.opts[q.ans]}</strong></small>` : ''}
      <br><small>${q.expl}</small>
    </div>
    ${partInfo ? `
    <div class="revision-hint">
      <span class="rh-icon">${partInfo.icon}</span>
      <div>
        <div class="rh-label">📖 Révise :</div>
        <div class="rh-part">${partInfo.label}</div>
      </div>
    </div>` : ''}`;
  }

  const isLast = idx === total - 1;

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="card">
      <div class="quiz-topbar">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div class="question-label">${lesson?.title || ''}</div>
          <div class="text-sm text-muted">Question ${idx + 1} / ${total}</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill fill-blue" style="width:${pct}%"></div>
        </div>
      </div>
      ${timerHTML}
      <div class="question-text">${q.q}</div>
      <div class="options">${opts}</div>
      ${feedback}
      <div class="quiz-nav">
        ${!state.confirmed
          ? `<button class="btn btn-primary" id="btnValidate" onclick="confirmQ()"
               ${state.selected === null ? 'disabled' : ''}>Valider</button>`
          : isLast
            ? `<button class="btn btn-primary" onclick="finishQuiz()">Voir les résultats 🏁</button>`
            : `<button class="btn btn-primary" onclick="nextQ()">Question suivante →</button>`
        }
        <button class="btn" onclick="if(confirm('Quitter le quiz ?')){stopTimer();go('home')}">✕ Quitter</button>
      </div>
    </div>
  </div>`;
}

function selectOpt(i) {
  if (state.confirmed) return;
  state.selected = i;
  renderQuiz();
}

function confirmQ() {
  stopTimer();
  if (state.selected === null) return;
  state.confirmed = true;
  const q = state.questions[state.current];
  if (state.answers.length <= state.current) {
    state.answers.push({ selected: state.selected, correct: q.ans });
  }
  renderQuiz();
}

function nextQ() {
  stopTimer();
  state.current++;
  state.selected  = null;
  state.confirmed = false;
  renderQuiz();
  startTimer();
}

async function finishQuiz() {
  stopTimer();
  const lesson = LESSONS.find(l => l.id === state.lessonId);
  const correct = state.answers.filter(a => a.selected === a.correct).length;
  const total   = state.answers.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongParts = state.answers
    .map((a, i) => a.selected !== a.correct ? (state.questions[i]?.part || null) : null)
    .filter(Boolean);

  state.lastResult = {
    lessonId: state.lessonId,
    lessonTitle: lesson?.title || '',
    correct, total, percent, wrongParts,
  };

  try {
    await api('POST', '/api/scores', {
      lessonId: state.lessonId,
      lessonTitle: lesson?.title || '',
      correct, total, percent, wrongParts,
    });
    await loadMyScores();
  } catch (_) {}

  go('result');
}

// ── Results ────────────────────────────────────────────────
function buildRevisionSummary(r) {
  if (!r.wrongParts || r.wrongParts.length === 0 || r.percent === 100) return '';
  const lessonParts = COURSE_PARTS[r.lessonId] || {};
  const seen = new Set();
  const items = r.wrongParts
    .filter(p => p && lessonParts[p] && !seen.has(p) && seen.add(p))
    .map(p => {
      const info = lessonParts[p];
      return `<div class="rev-item"><span>${info.icon}</span> ${info.label}</div>`;
    }).join('');
  if (!items) return '';
  return `
  <div class="revision-summary">
    <div class="rev-title">📌 Parties à retravailler :</div>
    ${items}
  </div>`;
}

function renderResult() {
  const r = state.lastResult;
  if (!r) { go('home'); return; }
  const revSum = buildRevisionSummary(r);
  const bar = r.percent;

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="card">
      <div class="result-wrap">
        <div class="result-ring ${ringColor(r.percent)}">
          <div>
            <div class="result-pct">${r.percent}%</div>
            <div class="result-label">${r.correct}/${r.total}</div>
          </div>
        </div>
        <div class="result-mention">${scoreMention(r.percent)}</div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:1rem">${r.lessonTitle}</div>
        <div class="progress-bar" style="max-width:300px;margin:0 auto 1rem">
          <div class="progress-fill ${fillColor(r.percent)}" style="width:${bar}%"></div>
        </div>
        <div class="stats-row" style="max-width:360px;margin:0 auto 1.25rem">
          <div class="stat-box"><div class="mv" style="color:var(--green)">${r.correct}</div><div class="ml">Correctes</div></div>
          <div class="stat-box"><div class="mv" style="color:var(--red)">${r.total - r.correct}</div><div class="ml">Incorrectes</div></div>
          <div class="stat-box"><div class="mv">${r.total}</div><div class="ml">Total</div></div>
        </div>
        ${revSum}
        <div class="result-actions">
          <button class="btn btn-primary" onclick="startLesson(${r.lessonId})">🔄 Recommencer</button>
          <button class="btn" onclick="go('home')">📚 Autres leçons</button>
          ${state.user?.role === 'student' ? `<button class="btn" onclick="go('dashboard')">📊 Mon bilan</button>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

// ── Dashboard ──────────────────────────────────────────────
async function renderDashboard() {
  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div><div class="section-title">📊 Mon bilan</div></div>
    </div>
    <div class="splash"><div class="spinner-lg"></div></div>
  </div>`;

  let scores = [];
  try { scores = await api('GET', '/api/scores/me'); } catch (_) {}

  const byLesson = {};
  for (const s of scores) {
    if (!byLesson[s.lessonId]) byLesson[s.lessonId] = { best: 0, tries: 0, title: s.lessonTitle };
    byLesson[s.lessonId].tries++;
    if (s.percent > byLesson[s.lessonId].best) byLesson[s.lessonId].best = s.percent;
  }

  const totalTries    = scores.length;
  const started       = Object.keys(byLesson).length;
  const avgScore      = totalTries > 0 ? Math.round(scores.reduce((s, x) => s + x.percent, 0) / totalTries) : 0;
  const bestScore     = totalTries > 0 ? Math.max(...scores.map(s => s.percent)) : 0;

  const lessonRows = LESSONS.map(l => {
    const d = byLesson[l.id];
    if (!d) return `
    <div class="lesson-perf-row">
      <div class="lpr-name">${l.title}</div>
      <div class="lpr-bar"><div class="progress-bar"><div class="progress-fill fill-blue" style="width:0%"></div></div></div>
      <div class="lpr-pct" style="color:var(--hint)">—</div>
      <div class="lpr-tries">0 essai</div>
    </div>`;
    return `
    <div class="lesson-perf-row">
      <div class="lpr-name">${l.title}</div>
      <div class="lpr-bar"><div class="progress-bar"><div class="progress-fill ${fillColor(d.best)}" style="width:${d.best}%"></div></div></div>
      <div class="lpr-pct" style="color:var(--${d.best>=80?'green':d.best>=50?'amber':'red'})">${d.best}%</div>
      <div class="lpr-tries">${d.tries} essai(s)</div>
    </div>`;
  }).join('');

  const recentHistory = scores.slice(0, 8).map(s => `
  <div class="history-row">
    <span class="hr-date">${fmtDate(s.createdAt)}</span>
    <span class="hr-title">${s.lessonTitle}</span>
    <span class="badge badge-${scoreColor(s.percent)}">${s.percent}%</span>
    <span class="text-sm text-muted">${s.correct}/${s.total}</span>
    <button class="btn btn-sm" onclick="startLesson(${s.lessonId})">▶</button>
  </div>`).join('');

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div><div class="section-title">📊 Mon bilan</div></div>
      <button class="btn" onclick="go('home')">← Retour</button>
    </div>
    <div class="metrics-row">
      <div class="metric-card"><div class="mv">${totalTries}</div><div class="ml">Tentatives</div></div>
      <div class="metric-card"><div class="mv">${started}</div><div class="ml">Leçons commencées</div></div>
      <div class="metric-card"><div class="mv">${avgScore}%</div><div class="ml">Score moyen</div></div>
      <div class="metric-card"><div class="mv">${bestScore}%</div><div class="ml">Meilleur score</div></div>
    </div>
    <div class="card mt-2">
      <div class="detail-section">
        <h3>Performance par leçon</h3>
        ${lessonRows}
      </div>
    </div>
    <div class="card mt-2">
      <div class="detail-section">
        <h3>Historique récent</h3>
        ${recentHistory || '<div class="empty-state"><div>📝</div>Commencez votre premier quiz !</div>'}
      </div>
    </div>
  </div>`;
}

// ── Admin ──────────────────────────────────────────────────
async function renderAdmin() {
  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div><div class="section-title">👨‍🏫 Panneau Admin</div></div>
      <button class="btn" onclick="go('home')">← Retour</button>
    </div>
    <div class="tabs">
      <div class="tab ${state.adminTab==='students'?'active':''}" onclick="switchTab('students')">👨‍🎓 Élèves</div>
      <div class="tab ${state.adminTab==='scores'?'active':''}" onclick="switchTab('scores')">📊 Performances</div>
      <div class="tab ${state.adminTab==='subscriptions'?'active':''}" onclick="switchTab('subscriptions')">⭐ Abonnements</div>
      <div class="tab ${state.adminTab==='referrals'?'active':''}" onclick="switchTab('referrals')">🎁 Parrainage</div>
    </div>
    <div id="admin-content"><div class="splash"><div class="spinner-lg"></div></div></div>
  </div>`;
  await loadAdminTab();
}

function switchTab(tab) {
  state.adminTab = tab;
  // Update active tab visually
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => {
    if (t.textContent.includes(
      tab === 'students' ? 'Élèves' :
      tab === 'scores'   ? 'Performances' :
      tab === 'subscriptions' ? 'Abonnements' : 'Parrainage'
    )) t.classList.add('active');
  });
  loadAdminTab();
}

async function loadAdminTab() {
  const el = document.getElementById('admin-content');
  if (!el) return;
  el.innerHTML = '<div class="splash"><div class="spinner-lg"></div></div>';

  if (state.adminTab === 'students') {
    const users = await api('GET', '/api/users').catch(() => []);
    state.adminData.users = users;
    const rows = users.filter(u => u.role !== 'admin').map(u => `
    <tr>
      <td>${u.name}</td>
      <td><code>${u.username}</code></td>
      <td>${u.class || '—'}</td>
      <td><span class="badge badge-${u.role==='admin'?'admin':'student'}">${u.role}</span></td>
      <td>
        <button class="btn btn-sm" onclick="openEditModal('${u._id}','${u.name}','${u.class||''}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}','${u.name}')">🗑️</button>
      </td>
    </tr>`).join('');
    el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
      <button class="btn btn-primary" onclick="openAddModal()">+ Ajouter un élève</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Identifiant</th><th>Classe</th><th>Rôle</th><th>Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucun élève</td></tr>'}</tbody>
      </table>
    </div>`;

  } else if (state.adminTab === 'scores') {
    const [dash, all] = await Promise.all([
      api('GET', '/api/scores/dashboard/all').catch(() => ({})),
      api('GET', '/api/scores/all').catch(() => []),
    ]);
    const users = await api('GET', '/api/users').catch(() => []);
    const totalAttempts = all.length;
    const activeUsers   = Object.keys(dash).length;

    const rows = Object.entries(dash).map(([uid, d]) => {
      const u = users.find(x => x._id === uid);
      return `
      <tr>
        <td>${d.userName || u?.name || '—'}</td>
        <td>${d.attempts}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar" style="width:80px"><div class="progress-fill ${fillColor(d.avgScore)}" style="width:${d.avgScore}%"></div></div>
            <span style="font-size:13px;font-weight:700">${d.avgScore}%</span>
          </div>
        </td>
        <td><span class="badge badge-${scoreColor(d.bestScore)}">${d.bestScore}%</span></td>
        <td><button class="btn btn-sm" onclick="showStudentDetail('${uid}')">Détail</button></td>
      </tr>`;
    }).join('');

    el.innerHTML = `
    <div class="metrics-row" style="margin-bottom:1rem">
      <div class="metric-card"><div class="mv">${users.length}</div><div class="ml">Élèves inscrits</div></div>
      <div class="metric-card"><div class="mv">${activeUsers}</div><div class="ml">Élèves actifs</div></div>
      <div class="metric-card"><div class="mv">${totalAttempts}</div><div class="ml">Tentatives totales</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Tentatives</th><th>Score moyen</th><th>Meilleur</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucune donnée</td></tr>'}</tbody>
      </table>
    </div>`;

  } else if (state.adminTab === 'subscriptions') {
    const data = await api('GET', '/api/subscription/all-stats').catch(() => ({ users: [] }));
    const rows = (data.users || []).map(u => `
    <tr>
      <td>${u.name}</td>
      <td><span class="badge ${u.plan==='premium'?'badge-good':'badge-student'}">${u.plan}</span></td>
      <td>${u.premiumUntil ? fmtDate(u.premiumUntil) : '—'}</td>
      <td>${u.daysLeft > 0 ? u.daysLeft + ' j' : '—'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openActivateModal('${u.id}')">Activer/Prolonger</button></td>
    </tr>`).join('');

    el.innerHTML = `
    <div class="metrics-row" style="margin-bottom:1rem">
      <div class="metric-card"><div class="mv">${data.totalPremium||0}</div><div class="ml">Premium actifs</div></div>
      <div class="metric-card"><div class="mv">${data.totalFree||0}</div><div class="ml">Plan gratuit</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nom</th><th>Plan</th><th>Expire le</th><th>Jours restants</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  } else if (state.adminTab === 'referrals') {
    const data = await api('GET', '/api/referral/all').catch(() => ({ topReferrers: [], recent: [] }));
    const topRows = (data.topReferrers || []).map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.name}</td>
      <td><code>${r.code}</code></td>
      <td>${r.count}</td>
      <td>${r.days} j</td>
    </tr>`).join('');
    const recentRows = (data.recent || []).map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td>${r.parrain || '—'} → ${r.filleul || '—'}</td>
      <td><span class="badge badge-good">+${r.days}j</span></td>
    </tr>`).join('');

    el.innerHTML = `
    <div class="metrics-row" style="margin-bottom:1rem">
      <div class="metric-card"><div class="mv">${data.totalReferrals||0}</div><div class="ml">Parrainages</div></div>
      <div class="metric-card"><div class="mv">${data.totalDaysOffered||0}j</div><div class="ml">Jours offerts</div></div>
    </div>
    <div class="detail-section">
      <h3>Top 10 parrains</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Nom</th><th>Code</th><th>Filleuls</th><th>Jours gagnés</th></tr></thead>
          <tbody>${topRows||'<tr><td colspan="5" style="text-align:center;color:var(--hint)">Aucun parrainage</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="detail-section mt-2">
      <h3>20 derniers parrainages</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Parrain → Filleul</th><th>Bonus</th></tr></thead>
          <tbody>${recentRows||'<tr><td colspan="3" style="text-align:center;color:var(--hint)">Aucun</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
  }
}

function openAddModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>+ Ajouter un élève</h2>
    <div class="form-row">
      <div class="form-group"><label>Nom complet</label><input id="a-name" placeholder="Koné Moussa"></div>
      <div class="form-group"><label>Classe</label><input id="a-class" placeholder="5ème 1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Identifiant</label><input id="a-user" placeholder="kone.moussa"></div>
      <div class="form-group"><label>Mot de passe</label><input id="a-pass" type="password" placeholder="••••••"></div>
    </div>
    <div id="a-err" class="error-msg hidden"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="submitAdd()">Créer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function submitAdd() {
  const name = document.getElementById('a-name')?.value?.trim();
  const cls  = document.getElementById('a-class')?.value?.trim();
  const user = document.getElementById('a-user')?.value?.trim();
  const pass = document.getElementById('a-pass')?.value;
  const err  = document.getElementById('a-err');
  if (!name || !user || !pass) { err.textContent = 'Tous les champs sont obligatoires.'; err.classList.remove('hidden'); return; }
  try {
    await api('POST', '/api/users', { name, class: cls, username: user, password: pass, role: 'student' });
    closeModal(); renderAdmin();
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  }
}

function openEditModal(id, name, cls) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>✏️ Modifier l'élève</h2>
    <div class="form-group"><label>Nom complet</label><input id="e-name" value="${name}"></div>
    <div class="form-group"><label>Classe</label><input id="e-class" value="${cls}"></div>
    <div class="form-group"><label>Nouveau mot de passe (optionnel)</label><input id="e-pass" type="password" placeholder="Laisser vide pour ne pas changer"></div>
    <div id="e-err" class="error-msg hidden"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="submitEdit('${id}')">Enregistrer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function submitEdit(id) {
  const name = document.getElementById('e-name')?.value?.trim();
  const cls  = document.getElementById('e-class')?.value?.trim();
  const pass = document.getElementById('e-pass')?.value;
  const err  = document.getElementById('e-err');
  try {
    const body = { name, class: cls };
    if (pass) body.password = pass;
    await api('PUT', `/api/users/${id}`, body);
    closeModal(); renderAdmin();
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Supprimer l'élève "${name}" et tous ses scores ?`)) return;
  try {
    await api('DELETE', `/api/users/${id}`);
    renderAdmin();
  } catch (e) { alert(e.message); }
}

async function showStudentDetail(userId) {
  const scores = await api('GET', `/api/scores/user/${userId}`).catch(() => []);
  const user   = state.adminData.users.find(u => u._id === userId) || {};
  const rows   = scores.map(s => `
  <tr>
    <td>${fmtDate(s.createdAt)}</td>
    <td>${s.lessonTitle}</td>
    <td><span class="badge badge-${scoreColor(s.percent)}">${s.percent}%</span></td>
    <td>${s.correct}/${s.total}</td>
  </tr>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>📊 ${user.name || 'Élève'} — Historique complet</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Leçon</th><th>Score</th><th>Résultat</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--hint)">Aucune tentative</td></tr>'}</tbody>
      </table>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Fermer</button></div>
  </div>`;
  document.body.appendChild(overlay);
}

function openActivateModal(userId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>⭐ Activer Premium</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:1rem">Choisissez la durée d'activation :</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1rem">
      <label><input type="radio" name="dur" value="7"> 7 jours (test)</label>
      <label><input type="radio" name="dur" value="30" checked> 30 jours (mensuel)</label>
      <label><input type="radio" name="dur" value="90"> 90 jours (trimestriel)</label>
      <label><input type="radio" name="dur" value="365"> 365 jours (annuel)</label>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="activateSubscription('${userId}')">Confirmer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function activateSubscription(userId) {
  const days = parseInt(document.querySelector('input[name="dur"]:checked')?.value || 30);
  try {
    await api('POST', `/api/subscription/activate/${userId}`, { days });
    closeModal();
    alert(`✅ Premium activé pour ${days} jours !`);
    loadAdminTab();
  } catch (e) { alert(e.message); }
}

function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.remove();
}

// ── Pricing ────────────────────────────────────────────────
function renderPricing() {
  const sub = state.subscription;
  const isFree = !sub?.isActive;

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div><div class="section-title">⭐ Abonnement</div>
        <div class="section-sub">Débloquez toutes les leçons avec Premium</div>
      </div>
      <button class="btn" onclick="go('home')">← Retour</button>
    </div>
    ${sub?.isActive ? `
    <div class="card" style="background:var(--green-lt);border-color:var(--green);margin-bottom:1rem;text-align:center">
      <div style="font-size:2rem">⭐</div>
      <div style="font-weight:700;color:var(--green)">Vous êtes Premium !</div>
      <div style="font-size:13px;color:var(--muted)">Expire le ${fmtDate(sub.premiumUntil)} (${sub.daysLeft} jours restants)</div>
    </div>` : ''}
    <div class="pricing-grid">
      <!-- Gratuit -->
      <div class="pricing-card">
        <div class="pricing-badge">Gratuit</div>
        <div class="pricing-price">0 F</div>
        <div class="pricing-period">pour toujours</div>
        <ul class="pricing-features">
          <li>✓ 3 premières leçons</li>
          <li>✓ 10 questions par quiz</li>
          <li class="no">✗ Historique</li>
          <li class="no">✗ Tableau de bord</li>
          <li class="no">✗ Leçons 4 à 10</li>
        </ul>
        <button class="btn w-full" disabled>${isFree ? 'Plan actuel' : 'Plan de base'}</button>
      </div>
      <!-- Mensuel -->
      <div class="pricing-card featured">
        <div class="pricing-badge">Mensuel ⭐</div>
        <div class="pricing-price">500 F</div>
        <div class="pricing-period">par mois</div>
        <ul class="pricing-features">
          <li>✓ Toutes les leçons (1–10)</li>
          <li>✓ 20 questions par quiz</li>
          <li>✓ Historique complet</li>
          <li>✓ Tableau de bord</li>
          <li>✓ Badge ⭐ Premium</li>
        </ul>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%">
          <button class="btn btn-wave w-full" onclick="openPaymentModal('wave','mensuel')">🟦 Payer avec Wave</button>
          <button class="btn btn-orange w-full" onclick="openPaymentModal('orange','mensuel')">🟠 Orange Money</button>
        </div>
      </div>
      <!-- Annuel -->
      <div class="pricing-card">
        <div class="pricing-badge gold">Annuel ⭐ −30%</div>
        <div class="pricing-price">4 200 F</div>
        <div class="pricing-period">par an</div>
        <ul class="pricing-features">
          <li>✓ Toutes les leçons (1–10)</li>
          <li>✓ 20 questions par quiz</li>
          <li>✓ Historique complet</li>
          <li>✓ Tableau de bord</li>
          <li>✓ Badge ⭐ Premium</li>
        </ul>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%">
          <button class="btn btn-wave w-full" onclick="openPaymentModal('wave','annuel')">🟦 Payer avec Wave</button>
          <button class="btn btn-orange w-full" onclick="openPaymentModal('orange','annuel')">🟠 Orange Money</button>
        </div>
      </div>
    </div>
    <div class="card" style="text-align:center;font-size:13px;color:var(--muted)">
      🎁 Parrainez vos amis et gagnez des jours Premium gratuits !
      <button class="btn btn-sm mt-1" onclick="go('referral')">Voir mon code</button>
    </div>
  </div>`;
}

function openPaymentModal(method, plan) {
  state.selectedPricingPlan = plan;
  const config  = window.APP_CONFIG || {};
  const monthly = config.PREMIUM_PRICE_MONTHLY || 500;
  const annual  = config.PREMIUM_PRICE_ANNUAL  || 4200;
  const amount  = plan === 'annuel' ? annual : monthly;
  const number  = method === 'wave'
    ? (config.WAVE_NUMBER   || '+2250700000000')
    : (config.ORANGE_NUMBER || '+2250800000000');
  const label = method === 'wave' ? '🟦 Wave' : '🟠 Orange Money';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal';
  overlay.innerHTML = `
  <div class="modal-box">
    <h2>${label} — Plan ${plan}</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:1rem">
      Envoyez le montant exact au numéro ci-dessous, puis saisissez votre référence de transaction.
    </p>
    <div class="payment-modal-number">${number}</div>
    <div class="payment-amount">${Number(amount).toLocaleString('fr-FR')} F CFA</div>
    <div class="form-group">
      <label>Référence de transaction</label>
      <input id="tx-ref" placeholder="ex: TXN123456789" autocomplete="off">
    </div>
    <div id="pay-err" class="error-msg hidden"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="confirmPayment('${method}')">Confirmer</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function confirmPayment(method) {
  const ref = document.getElementById('tx-ref')?.value?.trim();
  const err = document.getElementById('pay-err');
  if (!ref) { err.textContent = 'Entrez la référence de transaction.'; err.classList.remove('hidden'); return; }
  try {
    await api('POST', '/api/subscription/payment/confirm', {
      transactionRef: ref,
      plan: state.selectedPricingPlan,
      paymentMethod: method,
    });
    closeModal();
    await loadSubscription();
    alert('🎉 Félicitations ! Votre accès Premium est activé !');
    go('home');
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  }
}

async function loadSubscription() {
  try {
    state.subscription = await api('GET', '/api/subscription/status');
  } catch (_) {
    state.subscription = { plan: 'free', isActive: false, daysLeft: 0 };
  }
}

function renderSubscriptionBadge() {
  const sub = state.subscription;
  if (!sub || sub.plan === 'free' || !sub.isActive) {
    return '<span class="plan-badge free">Gratuit</span>';
  }
  if (sub.daysLeft <= 3) {
    return `<span class="plan-badge expiring">⚠️ Expire dans ${sub.daysLeft}j</span>`;
  }
  return '<span class="plan-badge premium">⭐ Premium</span>';
}

// ── Referral ───────────────────────────────────────────────
async function renderReferral() {
  await loadReferral();
  const r    = state.referral || { code: '----', referralDays: 0, referralCount: 0, filleuls: [] };
  const sub  = state.subscription;
  const isPremium = sub?.isActive;

  const filleulRows = (r.filleuls || []).map(f => `
  <div class="filleul-row">
    <span>${f.name}</span>
    <span style="color:var(--hint);font-size:12px">${fmtDate(f.date)}</span>
    <span class="filleul-days">+${f.daysOffered}j ✓</span>
  </div>`).join('') || '<div style="color:var(--hint);font-size:13px;padding:0.5rem 0">Aucun filleul pour le moment.</div>';

  app().innerHTML = topbar() + `
  <div class="main-content">
    <div class="section-header">
      <div><div class="section-title">🎁 Mon programme de parrainage</div></div>
      <button class="btn" onclick="go('home')">← Retour</button>
    </div>

    <div class="card">
      <div style="font-size:14px;color:var(--muted);margin-bottom:0.5rem">Votre code de parrainage</div>
      <div class="referral-code-box">
        <div class="referral-code">${r.code}</div>
        <button id="copy-code-btn" class="btn btn-sm btn-copy" onclick="copyReferralCode()">📋 Copier</button>
      </div>

      <div class="referral-stats">
        <div class="metric-card"><div class="mv">${r.referralCount}</div><div class="ml">Filleuls</div></div>
        <div class="metric-card"><div class="mv">+${r.referralDays}j</div><div class="ml">Gagnés</div></div>
        <div class="metric-card">
          ${isPremium
            ? `<div class="mv" style="font-size:14px;color:var(--green)">⭐ Actif</div><div class="ml">jusqu'au ${fmtDate(sub.premiumUntil)}</div>`
            : `<div class="mv" style="font-size:14px;color:var(--hint)">Gratuit</div><div class="ml">Parrainez pour gagner Premium !</div>`
          }
        </div>
      </div>

      <div class="referral-steps">
        <div style="font-weight:700;margin-bottom:0.5rem;font-size:14px">Comment ça marche :</div>
        <div class="referral-step"><div class="referral-step-num">1</div><div>Copiez votre code unique</div></div>
        <div class="referral-step"><div class="referral-step-num">2</div><div>Partagez-le à vos amis (WhatsApp, SMS…)</div></div>
        <div class="referral-step"><div class="referral-step-num">3</div><div>Votre ami s'inscrit avec votre code</div></div>
        <div class="referral-step"><div class="referral-step-num">4</div><div>Vous gagnez <strong>tous les deux 7 jours Premium</strong> !</div></div>
      </div>

      <div style="font-weight:700;margin-bottom:0.75rem">Mes filleuls (${r.referralCount}) :</div>
      <div>${filleulRows}</div>

      <div class="share-btns mt-2">
        <button class="btn btn-whatsapp" onclick="shareOnWhatsApp()">📤 Partager sur WhatsApp</button>
        <button id="copy-msg-btn" class="btn btn-copy" onclick="copyReferralMessage()">📋 Copier le message</button>
      </div>
    </div>
  </div>`;
}

async function loadReferral() {
  try {
    state.referral = await api('GET', '/api/referral/me');
  } catch (_) {
    state.referral = { code: '----', referralDays: 0, referralCount: 0, filleuls: [] };
  }
}

function copyReferralCode() {
  const code = state.referral?.code || '';
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-code-btn');
    if (btn) { btn.textContent = '✓ Copié !'; setTimeout(() => btn.textContent = '📋 Copier', 2000); }
  }).catch(() => {});
}

function copyReferralMessage() {
  const code   = state.referral?.code || '';
  const appUrl = window.APP_CONFIG?.APP_URL || window.location.origin;
  const msg    = `Mon code de parrainage est ${code}. Inscris-toi sur ${appUrl} et nous gagnons tous les deux 7 jours Premium gratuits !`;
  navigator.clipboard.writeText(msg).then(() => {
    const btn = document.getElementById('copy-msg-btn');
    if (btn) { btn.textContent = '✓ Message copié !'; setTimeout(() => btn.textContent = '📋 Copier le message', 2000); }
  }).catch(() => {});
}

function shareOnWhatsApp() {
  const code   = state.referral?.code || '';
  const appUrl = window.APP_CONFIG?.APP_URL || window.location.origin;
  const msg    = encodeURIComponent(
    `Salut ! 👋\n\nUtilise mon code de parrainage *${code}* pour t'inscrire sur cette super appli de révision.\n\nTu gagnes 7 jours Premium GRATUITS à l'inscription ! 🎁\n\n👉 ${appUrl}`
  );
  window.open('https://wa.me/?text=' + msg, '_blank');
}

// ── Navigation ─────────────────────────────────────────────
function go(view) {
  closeDrawer();
  stopTimer();
  state.view = view;
  render();
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  try {
    window.APP_CONFIG = await api('GET', '/api/config').catch(() => ({}));
    const user = await api('GET', '/api/auth/me');
    state.user = user;
    await loadSubscription();
    await loadReferral();
    await loadMyScores();
    go('home');
  } catch (_) {
    go('login');
  }
}

// ── Expose window functions ────────────────────────────────
window.doLogin       = doLogin;
window.doRegister    = doRegister;
window.logout        = logout;
window.go            = go;
window.startLesson   = startLesson;
window.selectOpt     = selectOpt;
window.confirmQ      = confirmQ;
window.nextQ         = nextQ;
window.finishQuiz    = finishQuiz;
window.toggleDrawer  = toggleDrawer;
window.closeDrawer   = closeDrawer;
window.switchTab     = switchTab;
window.openAddModal  = openAddModal;
window.submitAdd     = submitAdd;
window.openEditModal = openEditModal;
window.submitEdit    = submitEdit;
window.deleteUser    = deleteUser;
window.showStudentDetail = showStudentDetail;
window.closeModal    = closeModal;
window.openActivateModal = openActivateModal;
window.activateSubscription = activateSubscription;
window.selectPlan    = (p) => { state.selectedPricingPlan = p; };
window.openPaymentModal  = openPaymentModal;
window.confirmPayment    = confirmPayment;
window.copyReferralCode  = copyReferralCode;
window.copyReferralMessage = copyReferralMessage;
window.shareOnWhatsApp   = shareOnWhatsApp;
window.checkReferralCode = checkReferralCode;

// ── Start ──────────────────────────────────────────────────
init();
