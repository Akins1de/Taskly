/* ==========================================================================
   Taskly PLUS — focus timer, year heatmap, voice input, ambient design.
   Plugs into the engine through window.CalmApp and the calm:* events.
   Loaded after app.js. Own strings (uk / en / ru) live here.
   ========================================================================== */
(() => {
  'use strict';
  const A = window.CalmApp;
  if (!A) return;
  const S = A.state;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const findTask = (id) => S.tasks.find((x) => x.id === id);
  const curSpace = () => S.ui.space || 'personal';
  const splitKey = (key) => { const i = key.indexOf('|'); return i === -1 ? { space: 'personal', date: key } : { space: key.slice(0, i), date: key.slice(i + 1) }; };
  const pickForm = (n, forms) => { if (!forms || !forms.length) return ''; if (forms.length === 2) return n === 1 ? forms[0] : forms[1]; const a = Math.abs(n) % 100; const b = a % 10; if (a > 10 && a < 20) return forms[2]; if (b > 1 && b < 5) return forms[1]; if (b === 1) return forms[0]; return forms[2]; };
  const plTasks = (n) => { const d = (window.CalmI18n || {})[S.ui.lang] || (window.CalmI18n || {}).uk; return pickForm(n, d && d.p ? d.p.tasks : null); };
  // Marks a task done through its own checkbox so the engine runs its usual animations and toasts.
  function markDone(id) {
    const x = findTask(id); if (!x || x.done) return;
    const click = () => { const li = document.querySelector(`#list-wrap .task[data-id="${CSS.escape(id)}"]`); const c = li && li.querySelector('.check'); if (c) c.click(); };
    const li = document.querySelector(`#list-wrap .task[data-id="${CSS.escape(id)}"]`);
    if (li) click(); else { A.selectDate(x.date); requestAnimationFrame(click); }
  }

  const STR = {
    uk: {
      h: 'год', m: 'хв', s: 'с',
      focusAct: 'Фокус на справі', focusStopAct: 'Зупинити фокус', focusStarted: 'Фокус {min} хв. Поїхали.', focusPausedT: 'Пауза', focusResumedT: 'Продовжуємо',
      focusDoneToast: 'Фокус завершено: {dur}', focusStoppedToast: 'Фокус зупинено · {dur}', focusDoneTitle: 'Час вийшов', focusAgain: 'Ще {min} хв', focusMarkDone: 'Готово ✓',
      focusClose: 'Закрити', focusPause: 'Пауза', focusResume: 'Далі', focusPlus5: '+5 хв', focusStop: 'Стоп', focusCap: 'фокус', focusOverCap: 'час вийшов', focusPausedCap: 'пауза',
      focusToday: 'сьогодні у фокусі {dur}', focusEsc: 'Esc згортає, таймер іде далі', focusOpen: 'Відкрити режим фокусу', sumFocus: 'фокус · 7 днів', spentTitle: 'У фокусі загалом: {dur}',
      heatTitle: 'Рік у клітинках', heatYear: '{n} за рік', heatRecord: 'рекорд серії: {n}', heatBest: 'найкращий день: {day}', heatLess: 'менше', heatMore: 'більше', heatNone: 'нічого',
      voiceAria: 'Затисни й говори, відпусти, щоб додати', voiceListening: 'Слухаю…', voiceDenied: 'Немає доступу до мікрофона', voiceNoSpeech: 'Нічого не почув. Спробуй ще раз.', voiceErr: 'Голос не спрацював',
    },
    en: {
      h: 'h', m: 'min', s: 's',
      focusAct: 'Focus on this task', focusStopAct: 'Stop focus', focusStarted: 'Focus {min} min. Go.', focusPausedT: 'Paused', focusResumedT: 'Resumed',
      focusDoneToast: 'Focus done: {dur}', focusStoppedToast: 'Focus stopped · {dur}', focusDoneTitle: 'Time is up', focusAgain: '{min} min more', focusMarkDone: 'Done ✓',
      focusClose: 'Close', focusPause: 'Pause', focusResume: 'Resume', focusPlus5: '+5 min', focusStop: 'Stop', focusCap: 'focus', focusOverCap: 'time is up', focusPausedCap: 'paused',
      focusToday: 'in focus today {dur}', focusEsc: 'Esc minimises, the timer keeps running', focusOpen: 'Open focus mode', sumFocus: 'focus · 7 days', spentTitle: 'Total in focus: {dur}',
      heatTitle: 'Year in cells', heatYear: '{n} this year', heatRecord: 'record streak: {n}', heatBest: 'best day: {day}', heatLess: 'less', heatMore: 'more', heatNone: 'nothing',
      voiceAria: 'Hold and speak, release to add', voiceListening: 'Listening…', voiceDenied: 'No microphone access', voiceNoSpeech: 'Heard nothing. Try again.', voiceErr: 'Voice input failed',
    },
    ru: {
      h: 'ч', m: 'мин', s: 'с',
      focusAct: 'Фокус на задаче', focusStopAct: 'Остановить фокус', focusStarted: 'Фокус {min} мин. Поехали.', focusPausedT: 'Пауза', focusResumedT: 'Продолжаем',
      focusDoneToast: 'Фокус завершён: {dur}', focusStoppedToast: 'Фокус остановлен · {dur}', focusDoneTitle: 'Время вышло', focusAgain: 'Ещё {min} мин', focusMarkDone: 'Готово ✓',
      focusClose: 'Закрыть', focusPause: 'Пауза', focusResume: 'Дальше', focusPlus5: '+5 мин', focusStop: 'Стоп', focusCap: 'фокус', focusOverCap: 'время вышло', focusPausedCap: 'пауза',
      focusToday: 'сегодня в фокусе {dur}', focusEsc: 'Esc сворачивает, таймер идёт дальше', focusOpen: 'Открыть режим фокуса', sumFocus: 'фокус · 7 дней', spentTitle: 'В фокусе всего: {dur}',
      heatTitle: 'Год в клетках', heatYear: '{n} за год', heatRecord: 'рекорд серии: {n}', heatBest: 'лучший день: {day}', heatLess: 'меньше', heatMore: 'больше', heatNone: 'ничего',
      voiceAria: 'Зажми и говори, отпусти, чтобы добавить', voiceListening: 'Слушаю…', voiceDenied: 'Нет доступа к микрофону', voiceNoSpeech: 'Ничего не услышал. Попробуй ещё.', voiceErr: 'Голос не сработал',
    },
  };
  const T = (k, vars) => {
    const d = STR[S.ui.lang] || STR.uk;
    const s = d[k] != null ? d[k] : (STR.uk[k] != null ? STR.uk[k] : k);
    return vars ? s.replace(/\{(\w+)\}/g, (m, x) => (x in vars ? String(vars[x]) : m)) : s;
  };
  const fmtDur = (sec) => {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
    if (h) return m ? `${h} ${T('h')} ${m} ${T('m')}` : `${h} ${T('h')}`;
    if (m) return `${m} ${T('m')}`;
    return `${sec} ${T('s')}`;
  };
  const mmss = (sec) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`;

  /* ======================================================================
     Focus timer — state lives in its own storage key (todo.calm.focus.v1):
     the active session, seconds spent per task and a per-day log.
     ====================================================================== */
  const FKEY = 'todo.calm.focus.v1';
  const F = Object.assign({ log: {}, spent: {}, preset: 25, active: null }, (() => { try { return JSON.parse(localStorage.getItem(FKEY)) || {}; } catch { return {}; } })());
  if (!F.spent || typeof F.spent !== 'object') F.spent = {};
  const spentOf = (id) => (Number.isFinite(F.spent[id]) ? F.spent[id] : 0);
  const persist = () => { try { localStorage.setItem(FKEY, JSON.stringify(F)); } catch { /* ignore */ } };
  let ticker = null;
  let saveCountdown = 0;
  let bar = null;
  let mode = null;

  const remaining = () => { const a = F.active; if (!a) return 0; if (a.paused || a.over) return a.remaining; return Math.max(0, Math.round((a.endsAt - Date.now()) / 1000)); };
  const progress = () => { const a = F.active; if (!a || !a.total) return 0; return Math.min(100, Math.round((1 - remaining() / a.total) * 100)); };
  function credit(sec) {
    const a = F.active; if (!a || sec <= 0) return;
    F.spent[a.id] = spentOf(a.id) + sec;
    const k = A.todayKey();
    F.log[k] = (F.log[k] || 0) + sec;
    a.session = (a.session || 0) + sec;
    saveCountdown -= sec;
    if (saveCountdown <= 0) { saveCountdown = 15; persist(); }
  }
  function flush() { saveCountdown = 0; persist(); }
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, at, dur) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.09, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + dur); o.start(at); o.stop(at + dur + .05); };
      const t0 = ctx.currentTime + .02; play(659, t0, .5); play(880, t0 + .22, .7); play(1175, t0 + .44, .9);
      setTimeout(() => ctx.close().catch(() => {}), 2500);
    } catch { /* no audio */ }
  }
  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, silent: true }); } catch { /* ignore */ }
  }
  function tick() {
    const a = F.active; if (!a) { stopTicker(); return; }
    if (!a.paused && !a.over) {
      const rem = remaining();
      credit(Math.max(0, (Number.isFinite(a.remaining) ? a.remaining : a.total) - rem)); // also covers time spent while the tab slept
      a.remaining = rem;
      a.lastTick = Date.now();
      if (rem <= 0) finish();
    }
    renderBar(); renderMode();
  }
  function startTicker() { stopTicker(); ticker = setInterval(tick, 1000); }
  function stopTicker() { if (ticker) clearInterval(ticker); ticker = null; }

  function startFocus(id, minutes, restart) {
    const x = findTask(id); if (!x) return;
    if (F.active) {
      if (restart) { const a = F.active; if (!a.paused && !a.over) credit(Math.max(0, a.remaining - remaining())); } // same task again: keep the bar and the full-screen mode
      else stopFocus(true);
    }
    minutes = minutes || F.preset || 25;
    const now = Date.now();
    F.active = { id, total: minutes * 60, remaining: minutes * 60, endsAt: now + minutes * 60000, lastTick: now, paused: false, over: false, session: 0 };
    F.preset = minutes;
    persist();
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch { /* ignore */ }
    startTicker();
    document.body.classList.add('has-fbar');
    renderBar(); markCards(); renderMode();
    A.toast(T('focusStarted', { min: minutes }));
  }
  function pauseFocus() { const a = F.active; if (!a || a.paused || a.over) return; a.remaining = remaining(); a.paused = true; flush(); renderBar(); renderMode(); A.toast(T('focusPausedT')); }
  function resumeFocus() { const a = F.active; if (!a || !a.paused || a.over) return; a.endsAt = Date.now() + a.remaining * 1000; a.lastTick = Date.now(); a.paused = false; persist(); renderBar(); renderMode(); A.toast(T('focusResumedT')); }
  function plusFive() { const a = F.active; if (!a) return; if (a.over) { a.over = false; a.paused = false; a.endsAt = Date.now() + 300000; a.lastTick = Date.now(); a.remaining = 300; a.total += 300; } else { a.endsAt += 300000; a.total += 300; if (a.paused) a.remaining += 300; } persist(); renderBar(); renderMode(); }
  function finish() {
    const a = F.active; if (!a || a.over) return;
    a.over = true; a.remaining = 0; flush();
    const x = findTask(a.id);
    chime();
    notify(T('focusDoneTitle'), x ? x.text : '');
    A.toast(T('focusDoneToast', { dur: fmtDur(a.session) }), { ms: 5000 });
    renderBar(); renderMode();
  }
  function stopFocus(silent) {
    const a = F.active; if (!a) return;
    if (!a.paused && !a.over) { const rem = remaining(); credit(Math.max(0, a.remaining - rem)); }
    const dur = a.session || 0;
    F.active = null;
    stopTicker(); flush();
    if (bar) { const b = bar; bar = null; b.classList.add('fbar--out'); setTimeout(() => b.remove(), 260); }
    document.body.classList.remove('has-fbar');
    closeMode();
    A.render('focus-stop');
    if (!silent) A.toast(T('focusStoppedToast', { dur: fmtDur(dur) }));
  }
  function completeFocus() { const a = F.active; if (!a) return; const id = a.id; stopFocus(true); markDone(id); }
  function againFocus() { const a = F.active; if (!a) return; startFocus(a.id, F.preset || 25, true); }

  /* ---- Bottom pill ---- */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(cls, label, fn, title) { const b = el('button', cls, label); b.type = 'button'; if (title) { b.title = title; b.setAttribute('aria-label', title); } b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b; }
  function renderBar() {
    const a = F.active;
    if (!a) return;
    const x = findTask(a.id);
    if (!x) { stopFocus(true); return; }
    if (!bar) {
      bar = el('div', 'fbar'); bar.setAttribute('role', 'status');
      bar.append(el('div', 'fbar__ring'), el('span', 'fbar__text'), el('span', 'fbar__time'), el('span', 'fbar__ctl'));
      bar.querySelector('.fbar__ring').addEventListener('click', openMode);
      bar.querySelector('.fbar__text').addEventListener('click', openMode);
      bar.querySelector('.fbar__text').title = T('focusOpen');
      document.body.appendChild(bar);
    }
    bar.classList.toggle('fbar--paused', a.paused && !a.over);
    bar.classList.toggle('fbar--over', Boolean(a.over));
    bar.querySelector('.fbar__ring').style.setProperty('--p', String(progress()));
    const text = bar.querySelector('.fbar__text'); if (text.textContent !== x.text) text.textContent = x.text;
    bar.querySelector('.fbar__time').textContent = a.over ? fmtDur(a.session) : mmss(remaining());
    const ctl = bar.querySelector('.fbar__ctl');
    const key = a.over ? 'over' : (a.paused ? 'paused' : 'run');
    if (ctl.dataset.key !== key) {
      ctl.dataset.key = key; ctl.replaceChildren();
      ctl.style.display = 'inline-flex'; ctl.style.gap = '4px';
      if (a.over) { ctl.append(btn('fbar__btn', T('focusAgain', { min: F.preset || 25 }), againFocus), btn('fbar__btn fbar__btn--done', '✓', completeFocus, T('focusMarkDone')), btn('fbar__btn fbar__btn--stop', '✕', () => stopFocus(true), T('focusClose'))); }
      else { ctl.append(btn('fbar__btn', a.paused ? '▶' : '❚❚', a.paused ? resumeFocus : pauseFocus, a.paused ? T('focusResume') : T('focusPause')), btn('fbar__btn fbar__btn--done', '✓', completeFocus, T('focusMarkDone')), btn('fbar__btn fbar__btn--stop', '✕', () => stopFocus(false), T('focusStop'))); }
    }
  }

  /* ---- Full-screen focus mode ---- */
  function openMode() {
    if (mode || !F.active) return;
    mode = el('div', 'fmode'); mode.setAttribute('role', 'dialog'); mode.setAttribute('aria-modal', 'true');
    const box = el('div', 'fmode__box');
    const ring = el('div', 'fmode__ring'); ring.append(el('div', 'fmode__time'), el('div', 'fmode__cap'));
    const aurora = el('div', 'fmode__aurora'); aurora.append(el('i'), el('i'));
    mode.appendChild(aurora);
    box.append(ring, el('div', 'fmode__task'), el('div', 'fmode__sub'), el('div', 'fmode__presets'), el('div', 'fmode__ctl'), el('div', 'fmode__sub fmode__hint', T('focusEsc')));
    mode.append(box, btn('fmode__close', '✕', closeMode, T('focusClose')));
    document.body.appendChild(mode);
    mode.addEventListener('click', (e) => { if (e.target === mode) closeMode(); });
    renderMode();
  }
  function closeMode() { if (!mode) return; const m = mode; mode = null; m.classList.add('fmode--out'); setTimeout(() => m.remove(), 260); }
  function renderMode() {
    const a = F.active;
    if (!mode) return;
    if (!a) { closeMode(); return; }
    const x = findTask(a.id); if (!x) { closeMode(); return; }
    mode.classList.toggle('fmode--paused', a.paused && !a.over);
    mode.classList.toggle('fmode--over', Boolean(a.over));
    mode.classList.toggle('fmode--final', !a.over && !a.paused && remaining() <= 60); // last minute: the aurora speeds up and warms
    $('.fmode__ring', mode).style.setProperty('--p', String(progress()));
    $('.fmode__time', mode).textContent = a.over ? '✓' : mmss(remaining());
    $('.fmode__cap', mode).textContent = a.over ? T('focusOverCap') : (a.paused ? T('focusPausedCap') : T('focusCap'));
    $('.fmode__task', mode).textContent = x.text;
    const today = A.todayKey();
    $('.fmode__sub:not(.fmode__hint)', mode).textContent = T('focusToday', { dur: fmtDur(F.log[today] || 0) });
    const presets = $('.fmode__presets', mode);
    if (!presets.childElementCount) for (const m of [15, 25, 45, 60]) { const b = btn('fmode__preset', `${m} ${T('m')}`, () => { F.preset = m; persist(); if (F.active && (F.active.over || F.active.paused)) againFocus(); else renderMode(); }); b.dataset.min = String(m); presets.appendChild(b); }
    for (const b of presets.children) b.setAttribute('aria-pressed', String(Number(b.dataset.min) === (F.preset || 25)));
    const ctl = $('.fmode__ctl', mode);
    const key = a.over ? 'over' : (a.paused ? 'paused' : 'run');
    if (ctl.dataset.key !== key) {
      ctl.dataset.key = key; ctl.replaceChildren();
      if (a.over) ctl.append(btn('fmode__btn fmode__btn--primary', T('focusAgain', { min: F.preset || 25 }), againFocus), btn('fmode__btn', T('focusMarkDone'), completeFocus), btn('fmode__btn', T('focusClose'), () => stopFocus(true)));
      else ctl.append(btn('fmode__btn fmode__btn--primary', a.paused ? T('focusResume') : T('focusPause'), a.paused ? resumeFocus : pauseFocus), btn('fmode__btn', T('focusPlus5'), plusFive), btn('fmode__btn', T('focusMarkDone'), completeFocus), btn('fmode__btn', T('focusStop'), () => stopFocus(false)));
    }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode) { e.stopPropagation(); closeMode(); } }, true);

  /* ---- Cards: focus button + spent chip (cards are rebuilt on every render) ---- */
  function markCards() {
    const activeId = F.active ? F.active.id : null;
    for (const li of $$('#list-wrap .task')) {
      const id = li.dataset.id; const x = findTask(id); if (!x) continue;
      li.classList.toggle('task--focus', id === activeId);
      const actions = li.querySelector('.actions');
      if (actions && !actions.querySelector('[data-action="focus"]') && !x.done) {
        const b = el('button', 'icon-btn icon-btn--focus', id === activeId ? '◼' : '▶'); b.type = 'button'; b.dataset.action = 'focus';
        b.setAttribute('aria-pressed', String(id === activeId)); b.title = T(id === activeId ? 'focusStopAct' : 'focusAct'); b.setAttribute('aria-label', `${b.title}: ${x.text}`);
        actions.insertBefore(b, actions.querySelector('[data-action="edit"]'));
      }
      const meta = li.querySelector('.meta');
      const spent = spentOf(id);
      if (meta && spent >= 60 && !meta.querySelector('.chip--spent')) { const c = el('span', 'chip chip--spent', `◔ ${fmtDur(spent)}`); c.title = T('spentTitle', { dur: fmtDur(spent) }); meta.appendChild(c); }
    }
  }
  const listWrap = $('#list-wrap');
  if (listWrap) listWrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="focus"]'); if (!b) return;
    e.stopPropagation(); e.preventDefault();
    const li = b.closest('.task'); if (!li) return;
    if (F.active && F.active.id === li.dataset.id) stopFocus(false); else startFocus(li.dataset.id, F.preset || 25);
  }, true);
  // Resume a session that was running when the tab closed.
  if (F.active) {
    const a = F.active;
    if (!findTask(a.id)) { F.active = null; persist(); }
    else {
      if (!a.paused && !a.over) { const rem = remaining(); credit(Math.max(0, a.remaining - rem)); a.remaining = rem; a.lastTick = Date.now(); if (rem <= 0) { a.over = true; } }
      document.body.classList.add('has-fbar'); startTicker(); renderBar();
    }
  }

  /* ======================================================================
     Year heatmap + focus stat in the history view
     ====================================================================== */
  const weekdayIdx = (k) => (A.parseKey(k).getDay() + 6) % 7;
  function yearCounts() {
    const today = A.todayKey();
    const from = A.addDays(today, -370);
    const counts = new Map();
    const bump = (ts) => { if (!Number.isFinite(ts)) return; const k = A.keyOf(new Date(ts)); if (k >= from && k <= today) counts.set(k, (counts.get(k) || 0) + 1); };
    const space = curSpace();
    for (const x of S.tasks) if (x.done && (x.space || 'personal') === space) bump(x.doneAt);
    for (const k of Object.keys(S.goals)) if (splitKey(k).space === space) for (const g of S.goals[k]) if (g.done) bump(g.doneAt);
    return counts;
  }
  let heatAnimated = false;
  function renderHeat() {
    const summary = $('#history-summary');
    if (!summary) return;
    const old = $('.heat'); if (old) old.remove();
    const counts = yearCounts();
    const today = A.todayKey();
    let start = A.addDays(today, -364);
    start = A.addDays(start, -weekdayIdx(start));
    const L = (window.CalmI18n || {})[S.ui.lang] || (window.CalmI18n || {}).uk || { monthsShort: [], weekdaysFull: [] };
    const wrap = el('section', 'heat'); wrap.setAttribute('aria-label', T('heatTitle'));
    const head = el('div', 'heat__head'); head.append(el('h3', 'heat__title', T('heatTitle')));
    const stats = el('div', 'heat__stats');
    const months = el('div', 'heat__months');
    const grid = el('div', 'heat__grid');
    let total = 0, run = 0, record = 0, i = 0;
    const byWd = [0, 0, 0, 0, 0, 0, 0];
    let max = 1; for (const n of counts.values()) if (n > max) max = n;
    const level = (n) => (n <= 0 ? 0 : n >= max ? 4 : Math.min(4, Math.max(1, Math.ceil((n / max) * 4))));
    for (let k = start, w = 0; ; k = A.addDays(k, 1), i++) {
      const d = A.parseKey(k);
      const wd = weekdayIdx(k);
      if (wd === 0 && i) w++;
      if (d.getDate() === 1 || i === 0) { const m = el('span', 'heat__month', L.monthsShort[d.getMonth()] || ''); m.style.setProperty('--w', String(w)); if (i === 0 && d.getDate() > 20) m.hidden = true; months.appendChild(m); }
      const n = counts.get(k) || 0;
      const future = k > today;
      const c = el('button', 'heat__cell heat__cell--' + level(n) + (k === today ? ' heat__cell--today' : '') + (future ? ' heat__cell--future' : ''));
      c.type = 'button'; c.dataset.date = k; c.style.setProperty('--i', String(heatAnimated ? 0 : i));
      c.title = `${A.fullLabel(k)}: ${n ? n + ' ' + plTasks(n) : T('heatNone')}`;
      c.setAttribute('aria-label', c.title);
      if (future) c.disabled = true;
      grid.appendChild(c);
      if (!future) { total += n; byWd[wd] += n; if (n) { run++; if (run > record) record = run; } else run = 0; }
      if (k === today) { if (wd < 6) for (let j = wd + 1; j < 7; j++) { const f = el('span', 'heat__cell heat__cell--future'); grid.appendChild(f); } break; }
    }
    heatAnimated = true;
    let bestWd = 0; for (let j = 1; j < 7; j++) if (byWd[j] > byWd[bestWd]) bestWd = j;
    const bestN = byWd[bestWd];
    for (const [key, val] of [['heatYear', { n: total }], ['heatRecord', { n: record }], ['heatBest', { day: bestN ? (L.weekdaysFull[bestWd] || '') : '—' }]]) {
      const s = el('span', null); s.innerHTML = T(key, val).replace(/(\d+|—|[A-Za-zА-Яа-яЇїІіЄєҐґ’']+$)/, '<b>$1</b>'); stats.appendChild(s);
    }
    head.appendChild(stats);
    const scroll = el('div', 'heat__scroll'); scroll.append(months, grid);
    const foot = el('div', 'heat__foot');
    const legend = el('span', 'heat__legend'); legend.append(document.createTextNode(T('heatLess') + ' '), el('i'), el('i'), el('i'), el('i'), el('i'), document.createTextNode(' ' + T('heatMore')));
    foot.append(el('span', null, ''), legend);
    wrap.append(head, scroll, foot);
    summary.insertAdjacentElement('afterend', wrap);
    scroll.scrollLeft = scroll.scrollWidth;
    grid.addEventListener('click', (e) => { const c = e.target.closest('.heat__cell[data-date]'); if (c && !c.disabled) A.selectDate(c.dataset.date); });
  }
  function renderFocusStat() {
    const summary = $('#history-summary'); if (!summary || summary.querySelector('.hstat--focus')) return;
    let sec = 0; const today = A.todayKey();
    for (let i = 0; i < 7; i++) sec += F.log[A.addDays(today, -i)] || 0;
    const s = el('div', 'hstat hstat--focus'); s.append(el('span', 'eyebrow', T('sumFocus')), el('span', 'hstat__val', sec ? fmtDur(sec) : '—'));
    summary.appendChild(s);
  }

  /* ======================================================================
     Voice input (Web Speech API; hidden where unsupported)
     ====================================================================== */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const input = $('#add-input'); const form = $('#add-form');
  let rec = null, listening = false, micBtn = null;
  if (SR && input && form) {
    micBtn = el('button', 'mic'); micBtn.type = 'button';
    micBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
    input.insertAdjacentElement('afterend', micBtn);
    const LANGS = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' };
    const MAX_LISTEN_MS = 180000; // safety stop after 3 minutes
    let wantStop = false, finalText = '', interimText = '', listenTimer = null, fatal = false;
    const setListening = (on) => { listening = on; micBtn.classList.toggle('mic--on', on); input.classList.toggle('add-input--listening', on); if (on) { input.dataset.ph = input.placeholder; input.placeholder = T('voiceListening'); } else if (input.dataset.ph) { input.placeholder = input.dataset.ph; } };
    const show = () => { input.value = (finalText + ' ' + interimText).replace(/\s+/g, ' ').trim(); input.dispatchEvent(new Event('input', { bubbles: true })); };
    const finishVoice = () => {
      clearTimeout(listenTimer); setListening(false);
      const text = (finalText + ' ' + interimText).replace(/\s+/g, ' ').trim() || input.value.trim();
      finalText = ''; interimText = '';
      if (!text) return;
      input.value = text; input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }, 200);
    };
    // Push-to-talk, like a messenger: hold the mic, speak, release to add. The browser ends a
    // recognition session after a pause, so we keep restarting it while the button is held.
    let holding = false;
    const startRec = () => {
      rec = new SR(); rec.lang = LANGS[S.ui.lang] || 'uk-UA'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = true;
      rec.onstart = () => { setListening(true); if (!holding) { wantStop = true; try { rec.stop(); } catch { /* ignore */ } } };
      rec.onresult = (e) => {
        interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText = (finalText + ' ' + r[0].transcript).trim(); else interimText += r[0].transcript; }
        show();
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { fatal = true; A.toast(T('voiceDenied')); }
        else if (e.error !== 'no-speech' && e.error !== 'aborted' && e.error !== 'network') { fatal = true; A.toast(T('voiceErr')); }
      };
      rec.onend = () => {
        if (!wantStop && !fatal) { try { rec.start(); return; } catch { /* fall through */ } }
        finishVoice();
      };
      rec.start();
    };
    const beginHold = (e) => {
      if (e && e.pointerType === 'mouse' && e.button !== 0) return;
      if (e && e.preventDefault) e.preventDefault();
      if (holding) return;
      holding = true; wantStop = false; fatal = false; interimText = ''; finalText = input.value.trim(); // keep what was already typed
      if (e && e.pointerId != null) { try { micBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      try { startRec(); clearTimeout(listenTimer); listenTimer = setTimeout(endHold, MAX_LISTEN_MS); }
      catch { holding = false; setListening(false); A.toast(T('voiceErr')); }
    };
    const endHold = () => {
      if (!holding) return;
      holding = false; wantStop = true; clearTimeout(listenTimer);
      if (rec && listening) { try { rec.stop(); } catch { finishVoice(); } }
      else if (!rec) finishVoice();
      // if recognition has not started yet, onstart will stop it and onend finishes the entry
    };
    micBtn.addEventListener('pointerdown', beginHold);
    micBtn.addEventListener('pointerup', endHold);
    micBtn.addEventListener('pointercancel', endHold);
    micBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    micBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); beginHold(null); } });
    micBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endHold(); } });
  }

  /* ======================================================================
     Ambient design hooks
     ====================================================================== */
  const ambient = el('div', 'ambient'); ambient.setAttribute('aria-hidden', 'true'); ambient.append(el('i'), el('i'));
  document.body.prepend(ambient);
  const tiles = $('#tiles');
  if (tiles && window.matchMedia('(hover: hover)').matches) tiles.addEventListener('pointermove', (e) => {
    const tile = e.target.closest('.tile'); if (!tile) return;
    const r = tile.getBoundingClientRect(); tile.style.setProperty('--mx', (e.clientX - r.left) + 'px'); tile.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  function renderAmbient() {
    const today = A.todayKey();
    const tt = S.tasks.filter((x) => x.date === today && (x.space || 'personal') === curSpace());
    const done = tt.filter((x) => x.done).length;
    const pct = tt.length ? Math.round((done / tt.length) * 100) : 0;
    document.documentElement.style.setProperty('--prog', pct + '%');
    // Only the ring glows green, and only while looking at today; the greeting text is never recoloured.
    const onToday = S.ui.view === 'day' && S.selectedDate === today;
    document.documentElement.dataset.alldone = onToday && tt.length && done === tt.length ? '1' : '0';
  }

  /* ======================================================================
     Design round 2: accent colour, time-of-day tint, streak flame,
     sparklines, "day closed" seal, drawn empty state, drag ghost
     ====================================================================== */
  const PKEY = 'todo.calm.plus.v1';
  const P = Object.assign({ lastStreak: 0 }, (() => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { return {}; } })());
  const persistP = () => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch { /* ignore */ } };
  const root = document.documentElement;

  /* ---- Time of day tints the ambient glow ---- */
  const TOD = [[5, '#F5C451', '#FFB38A'], [11, '#8AC8FF', '#B9A6FF'], [17, '#B58CF5', '#F27E9B'], [22, '#3B5BDB', '#6D5BD0']];
  function renderTod() {
    const h = new Date().getHours(); let pick = TOD[TOD.length - 1];
    for (const t of TOD) if (h >= t[0]) pick = t;
    root.style.setProperty('--tod', pick[1]); root.style.setProperty('--tod2', pick[2]);
  }
  setInterval(renderTod, 300000);

  /* ---- Streak flame ---- */
  function streakNow() {
    const counts = yearCounts(); let k = A.todayKey();
    if (!counts.get(k)) k = A.addDays(k, -1);
    let n = 0; while (counts.get(k)) { n++; k = A.addDays(k, -1); }
    return n;
  }
  let flameSpace = null; // the space the current flame belongs to
  function renderFlame() {
    const val = $('#t-streak'); const tile = val && val.closest('.tile'); if (!tile) return;
    const space = curSpace();
    if (!P.streaks || typeof P.streaks !== 'object') P.streaks = {}; // last known streak per space (the smoke must not play on a space switch)
    const last = Number.isFinite(P.streaks[space]) ? P.streaks[space] : 0;
    const s = streakNow(); let flame = tile.querySelector('.flame');
    if (flame && flameSpace !== space) { flame.remove(); flame = null; }
    const make = () => { const f = el('span', 'flame'); f.setAttribute('aria-hidden', 'true'); f.append(el('i'), el('i'), el('i')); tile.appendChild(f); flameSpace = space; return f; };
    if (s >= 3) {
      if (!flame || flame.classList.contains('flame--out')) { if (flame) flame.remove(); flame = make(); }
      flame.style.setProperty('--fs', String(1 + Math.min(4, Math.floor(s / 7)) * .15)); // grows a step per full week
    } else if (last >= 3 && s < 3 && !(flame && flame.classList.contains('flame--out'))) {
      if (!flame) flame = make(); // the streak broke since the last visit: burn out with smoke
      const f = flame; requestAnimationFrame(() => { f.classList.add('flame--out'); setTimeout(() => f.remove(), 1900); });
    } else if (flame && !flame.classList.contains('flame--out')) {
      flame.remove();
    }
    if (last !== s) { P.streaks[space] = s; persistP(); }
  }

  /* ---- Sparklines instead of the week bars ---- */
  function weekData() {
    const counts = yearCounts(); const today = A.todayKey(); const out = [];
    for (let i = 6; i >= 0; i--) { const k = A.addDays(today, -i); out.push({ k, n: counts.get(k) || 0 }); }
    return out;
  }
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]); return e; };
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  }
  let sparkId = 0;
  function renderSpark(container, withLabels) {
    if (!container) return;
    const w = Math.max(60, Math.round(container.clientWidth || 200)), h = Math.max(30, Math.round(container.clientHeight || 56));
    const data = weekData(); const max = Math.max(1, ...data.map((d) => d.n));
    const padX = 8, top = 10, bottom = withLabels ? 16 : 6;
    const L = (window.CalmI18n || {})[S.ui.lang] || (window.CalmI18n || {}).uk || { weekdays: [] };
    const pts = data.map((d, i) => ({ x: Math.round(padX + (w - padX * 2) * i / (data.length - 1)), y: Math.round(top + (h - top - bottom) * (1 - d.n / max)), d }));
    const svg = svgEl('svg', { class: 'spark', viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img' });
    const gid = 'spark-grad-' + (++sparkId);
    const defs = svgEl('defs'); const grad = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(svgEl('stop', { offset: '0', 'stop-color': 'currentColor', 'stop-opacity': '.3' }), svgEl('stop', { offset: '1', 'stop-color': 'currentColor', 'stop-opacity': '0' }));
    defs.appendChild(grad); svg.appendChild(defs);
    const line = smoothPath(pts);
    svg.appendChild(svgEl('path', { class: 'spark__area', d: `${line} L${pts[pts.length - 1].x},${h - bottom} L${pts[0].x},${h - bottom} Z`, fill: `url(#${gid})` }));
    svg.appendChild(svgEl('path', { class: 'spark__line', d: line }));
    const today = A.todayKey();
    pts.forEach((p, i) => {
      const g = svgEl('g', { class: 'spark__g' });
      const c = svgEl('circle', { class: 'spark__pt' + (p.d.n ? ' spark__pt--on' : '') + (p.d.k === today ? ' spark__pt--today' : ''), cx: p.x, cy: p.y, r: p.d.k === today ? 3.5 : 2.5 });
      const title = svgEl('title'); title.textContent = `${A.fullLabel(p.d.k)}: ${p.d.n}`; c.appendChild(title);
      const t = svgEl('text', { x: p.x, y: Math.max(9, p.y - 8), 'text-anchor': i === 0 ? 'start' : (i === pts.length - 1 ? 'end' : 'middle') }); t.textContent = String(p.d.n);
      g.append(c, t); svg.appendChild(g);
      if (withLabels) { const wd = svgEl('text', { class: 'spark__wd', x: p.x, y: h - 3, 'text-anchor': 'middle' }); wd.textContent = L.weekdays[(A.parseKey(p.d.k).getDay() + 6) % 7] || ''; svg.appendChild(wd); }
    });
    svg.style.color = 'var(--acc)'; // the area gradient uses currentColor
    container.replaceChildren(svg);
  }
  function renderSparks() { renderSpark($('#t-week'), false); renderSpark($('#stats-bars'), true); }
  let sparkResize = null;
  addEventListener('resize', () => { clearTimeout(sparkResize); sparkResize = setTimeout(renderSparks, 120); });

  /* ---- Empty state that draws itself ---- */
  function renderEmptyArt() {
    const empty = $('#empty'); const mark = empty && empty.querySelector('.empty__mark'); if (!mark) return;
    if (empty.hidden) { mark.dataset.drawn = ''; return; }
    if (mark.dataset.drawn === '1') return;
    mark.dataset.drawn = '1';
    mark.innerHTML = '<svg class="empty__art" viewBox="0 0 120 72" aria-hidden="true">'
      + '<path style="--i:0" pathLength="1" d="M6 58 H114"/>'
      + '<path class="acc" style="--i:1" pathLength="1" d="M36 58 A24 24 0 0 1 84 58"/>'
      + '<path class="acc" style="--i:3" pathLength="1" d="M60 22 V12"/><path class="acc" style="--i:3" pathLength="1" d="M40 29 L33 22"/><path class="acc" style="--i:3" pathLength="1" d="M80 29 L87 22"/>'
      + '<path style="--i:4" pathLength="1" d="M14 66 H40"/><path style="--i:5" pathLength="1" d="M80 66 H106"/>'
      + '</svg>';
  }

  /* ---- "Day complete": light sweep over goals + list, ring pop — when all tasks AND all goals are done ---- */
  const doneState = new Map();
  let celebrateReady = false;
  function dayComplete(k) {
    const space = curSpace();
    const tasks = S.tasks.filter((x) => x.date === k && (x.space || 'personal') === space);
    const goalsOn = S.goals[space === 'personal' ? k : `${space}|${k}`] || [];
    return tasks.length > 0 && tasks.every((x) => x.done) && goalsOn.length > 0 && goalsOn.every((g) => g.done);
  }
  function celebrate() {
    for (const [sel, cls] of [['#goals', 'goals--seal'], ['#list-wrap', 'list--seal'], ['#hero-ring', 'ring--seal'], ['#tiles', 'tiles--seal']]) {
      const e = $(sel); if (!e || e.hidden) continue;
      e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls);
      setTimeout(() => e.classList.remove(cls), 1800);
    }
  }
  function checkCelebrate() {
    if (S.ui.view !== 'day' || !S.selectedDate) return;
    const key = curSpace() + '|' + S.selectedDate;
    const now = dayComplete(S.selectedDate);
    const prev = doneState.get(key);
    doneState.set(key, now);
    if (celebrateReady && prev === false && now) celebrate();
  }

  /* ---- Calendar: drop the trailing rows that belong to the next month ---- */
  const calGrid = $('#cal-grid');
  function trimCalendar() {
    if (!calGrid || calGrid.childElementCount !== 42) return;
    const cells = Array.from(calGrid.children);
    let last = cells.length - 1;
    while (last >= 0 && cells[last].classList.contains('cal-day--other')) last--;
    const keep = Math.ceil((last + 1) / 7) * 7; // finish the last row that still holds a day of this month
    for (let i = cells.length - 1; i >= keep; i--) cells[i].remove();
  }
  if (calGrid) { new MutationObserver(trimCalendar).observe(calGrid, { childList: true }); trimCalendar(); }

  /* ---- Drag ghost: a tilted copy of the card follows the cursor ---- */
  if (listWrap) listWrap.addEventListener('dragstart', (e) => {
    const li = e.target && e.target.closest ? e.target.closest('.task') : null;
    if (!li || !e.dataTransfer || typeof e.dataTransfer.setDragImage !== 'function') return;
    const card = li.querySelector('.card'); if (!card) return;
    const ghost = card.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.style.width = card.offsetWidth + 'px';
    document.body.appendChild(ghost);
    const r = card.getBoundingClientRect();
    try { e.dataTransfer.setDragImage(ghost, Math.max(0, e.clientX - r.left), Math.max(0, e.clientY - r.top)); } catch { /* ignore */ }
    setTimeout(() => ghost.remove(), 0);
  }, true);

  /* ---- Static strings that depend on language ---- */
  function applyStrings() {
    if (micBtn) { micBtn.title = T('voiceAria'); micBtn.setAttribute('aria-label', T('voiceAria')); }
    if (bar) bar.querySelector('.fbar__text').title = T('focusOpen');
  }

  /* ---- Hook into the engine's render ---- */
  function onRender() {
    if (F.active) { const x = findTask(F.active.id); if (x && x.done) stopFocus(true); } // the focused task got checked off: close the session quietly (time is kept)
    markCards();
    renderAmbient();
    renderTod();
    renderFlame();
    renderSparks();
    renderEmptyArt();
    checkCelebrate();
    celebrateReady = true;
    if (S.ui.view === 'history') { renderFocusStat(); renderHeat(); }
    else { const old = $('.heat'); if (old) old.remove(); }
    if (bar) renderBar();
  }
  document.addEventListener('calm:render', onRender);
  document.addEventListener('calm:lang-changed', () => { applyStrings(); if (bar) { bar.querySelector('.fbar__ctl').dataset.key = ''; renderBar(); } if (mode) { $('.fmode__ctl', mode).dataset.key = ''; $('.fmode__presets', mode).replaceChildren(); renderMode(); } });
  applyStrings();
  onRender();
})();
