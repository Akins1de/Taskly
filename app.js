/* ==========================================================================
   CALM «Монохром+» — engine
   Dark-first minimal todo: calendar, daily goals, note, subtasks, history,
   search, dashboard/list layouts, light theme, uk/en/ru UI, undo, recurring
   tasks, smart dates in the input, swipe on touch, drop onto calendar days.
   Classic script (works from file://). Requires i18n.js (window.CalmI18n).
   ========================================================================== */
(() => {
  'use strict';

  /* ======================================================================
     Constants
     ====================================================================== */
  const STORAGE_KEY = 'todo.calm.v1';
  const LEGACY_KEYS = ['todo.brutalpro.v1'];
  const LEGACY_HEX = ['#FFE14D', '#FF7AB6', '#5CE1FF', '#B8FF5C', '#FF9A3C'];
  const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const FILTERS = ['all', 'active', 'done'];
  const VIEWS = ['day', 'all', 'history'];
  const THEMES = ['dark', 'light'];
  const LAYOUTS = ['dash', 'list'];
  const LANGS = ['uk', 'en', 'ru'];
  const REPEATS = ['daily', 'weekdays', 'weekly'];
  const MAX_LEN = 200;
  const MAX_GOALS = 3;
  const EXIT_MS = 200;
  const UNDO_MS = 6000;
  const HISTORY_DAYS = 90;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const I18N = window.CalmI18n || {};

  /* ======================================================================
     DOM
     ====================================================================== */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const els = {
    html: document.documentElement,
    app: $('#app'),
    navLinks: $$('.navlink[data-nav]'),
    navCountDay: $('#nav-count-day'),
    navCountAll: $('#nav-count-all'),
    themeBtn: $('#theme-btn'),
    layoutBtns: $$('.seg__btn[data-layout]'),
    langBtns: $$('.seg__btn[data-lang]'),
    lang: $('#lang'),
    langBtn: $('#lang-btn'),
    langCode: $('#lang-code'),
    langMenu: $('#lang-menu'),
    langOpts: $$('.lang__opt[data-lang]'),
    crumb: $('#crumb'),
    space: $('#space'),
    spaceBtn: $('#space-btn'),
    spaceName: $('#space-name'),
    spaceMenu: $('#space-menu'),
    searchWrap: $('#search-wrap'),
    search: $('#search'),
    searchClear: $('#search-clear'),
    dateEyebrow: $('#date-eyebrow'),
    heroL1: $('#hero-l1'),
    heroL2: $('#hero-l2'),
    heroSub: $('#hero-sub'),
    heroRing: $('#hero-ring'),
    ringFg: $('#ring-fg'),
    ringPct: $('#ring-pct'),
    tiles: $('#tiles'),
    tDone: $('#t-done'),
    tDoneSub: $('#t-done-sub'),
    tActive: $('#t-active'),
    tActiveSub: $('#t-active-sub'),
    tStreak: $('#t-streak'),
    tStreakSub: $('#t-streak-sub'),
    tWeek: $('#t-week'),
    tWeekSub: $('#t-week-sub'),
    datebar: $('#datebar'),
    dateTitle: $('#date-title'),
    dateCount: $('#date-count'),
    dateFull: $('#date-full'),
    datebarNav: $('#datebar-nav'),
    dateToday: $('#date-today'),
    filtersWrap: $('#filters'),
    filters: $$('.filter[data-filter]'),
    banner: $('#overdue-banner'),
    bannerText: $('#overdue-text'),
    bannerMove: $('#overdue-move'),
    bannerShow: $('#overdue-show'),
    goals: $('#goals'),
    goalsList: $('#goals-list'),
    goalsCount: $('#goals-count'),
    dayStamp: $('#day-stamp'),
    noteWrap: $('#note-wrap'),
    note: $('#note'),
    form: $('#add-form'),
    input: $('#add-input'),
    addHint: $('#add-hint'),
    swatches: $$('.swatch[data-color]'),
    addImportant: $('#add-important'),
    listWrap: $('#list-wrap'),
    empty: $('#empty'),
    emptyTitle: $('#empty-title'),
    emptyMsg: $('#empty-msg'),
    history: $('#history'),
    historySummary: $('#history-summary'),
    historyList: $('#history-list'),
    foot: $('#foot'),
    counter: $('#counter'),
    clearBtn: $('#clear-btn'),
    context: $('#context'),
    contextClose: $('#context-close'),
    calMonth: $('#cal-month'),
    calWeekdays: $('#cal-weekdays'),
    calGrid: $('#cal-grid'),
    calToday: $('#cal-today'),
    upnext: $('#upnext-list'),
    statsBars: $('#stats-bars'),
    popover: $('#popover'),
    tpl: $('#task-tpl'),
    subTpl: $('#sub-tpl'),
  };

  /* ======================================================================
     State
     ====================================================================== */
  const state = {
    tasks: [],
    goals: {},
    notes: {},
    ui: { filter: 'all', view: 'day', theme: 'dark', layout: 'dash', lang: detectLang(), space: 'personal' },
    spaces: [{ id: 'personal' }, { id: 'work' }],   // built-in ids get localised names; custom ones carry `name`
    selectedDate: null,
    month: null,
    editingId: null,
    addColor: 'auto',
    addImportant: false,
    addDate: null,       // date parsed from the add input ("завтра", "пт", "15.09")
    query: '',
  };
  const leaving = new Set();
  const seenIds = new Set();
  const seenDone = new Set();
  const expanded = new Set();
  const drag = { id: null, overId: null, before: false, calDate: null };
  const tweens = new Map();
  const dayDoneToasted = new Set();
  const dayClosedToasted = new Set();
  let undoRecord = null;
  let pendingFocus = null;
  let noteTimer = null;
  let toastTimer = null;
  let searchTimer = null;
  let popoverCleanup = null;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     i18n helpers
     ====================================================================== */
  function detectLang() {
    const nav = (navigator.language || 'uk').toLowerCase();
    if (nav.startsWith('uk')) return 'uk';
    if (nav.startsWith('ru')) return 'ru';
    return 'en';
  }
  const L = () => I18N[state.ui.lang] || I18N.uk || { s: {}, p: {}, months: [], monthsGen: [], monthsShort: [], weekdays: [], weekdaysFull: [], seed: {} };
  function fmt(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  const t = (key, vars) => fmt(L().s[key] != null ? L().s[key] : key, vars);
  function pickForm(n, forms) {
    if (!forms || !forms.length) return '';
    if (forms.length === 2) return n === 1 ? forms[0] : forms[1];
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  const pl = (key, n) => pickForm(n, L().p[key]);
  const tp = (key, n, vars) => fmt(pickForm(n, L().p[key]), Object.assign({ n }, vars || {}));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const labelNames = () => {
    const cfg = window.CalmConfig || {};
    const l = cfg.labels || {};
    return l[state.ui.lang] || (l.c1 ? l : (l.uk || {}));
  };
  function emit(name, detail) { document.dispatchEvent(new CustomEvent('calm:' + name, { detail: detail || {} })); }

  /* ---- Dates ------------------------------------------------------------ */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  const todayKey = () => keyOf(new Date());
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const monthOf = (k) => k.slice(0, 7);
  const weekdayIndex = (k) => (parseKey(k).getDay() + 6) % 7;

  function relLabel(k) {
    const d = diffDays(todayKey(), k);
    if (d === 0) return t('today');
    if (d === 1) return t('tomorrow');
    if (d === -1) return t('yesterday');
    if (d > 1 && d < 7) return t('inDays', { n: d, noun: pl('days', d) });
    if (d < -1 && d > -7) return t('daysAgo', { n: -d, noun: pl('days', -d) });
    if (d <= -7 && d > -14) return t('lastWeek');
    return L().weekdaysFull[weekdayIndex(k)];
  }
  function fullLabel(k) {
    const d = parseKey(k);
    return `${L().weekdays[weekdayIndex(k)]}, ${d.getDate()} ${L().monthsGen[d.getMonth()]}`;
  }
  function longLabel(k) {
    const d = parseKey(k);
    return `${L().weekdaysFull[weekdayIndex(k)]}, ${d.getDate()} ${L().monthsGen[d.getMonth()]}`;
  }
  function shortLabel(k) {
    const d = parseKey(k);
    const rel = diffDays(todayKey(), k);
    if (rel === 0) return t('today');
    if (rel === 1) return t('tomorrow');
    if (rel === -1) return t('yesterday');
    return `${d.getDate()} ${L().monthsShort[d.getMonth()]}`;
  }
  function groupLabel(k) {
    const rel = diffDays(todayKey(), k);
    if (rel === 0) return t('today');
    if (rel === 1) return t('tomorrow');
    return fullLabel(k);
  }

  /* ---- Smart date words in the add input --------------------------------- */
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Returns { text, date } — `text` with the date words removed, `date` a key or null.
  function parseSmartDate(raw) {
    const D = L().dates;
    let text = raw.replace(/\s+/g, ' ').trim();
    if (!D || !text) return { text, date: null };
    const today = todayKey();
    let date = null;
    const cut = (from, len) => { text = (text.slice(0, from) + ' ' + text.slice(from + len)).replace(/\s{2,}/g, ' ').trim(); };
    const tryWords = (list, fn) => {
      for (const w of list || []) {
        const m = new RegExp('(^|\\s)' + escapeRe(w) + '(?=\\s|$|[,.!?])', 'i').exec(text);
        if (m) { const d = fn(); if (d) { cut(m.index, m[0].length); return d; } }
      }
      return null;
    };
    // 15.09 / 15/09 / 15.09.2026 / 2026-09-15
    const iso = /(^|\s)(\d{4})-(\d{2})-(\d{2})(?=\s|$)/.exec(text);
    if (iso) { const dt = new Date(+iso[2], +iso[3] - 1, +iso[4]); if (dt.getMonth() === +iso[3] - 1) { date = keyOf(dt); cut(iso.index, iso[0].length); } }
    if (!date) {
      const dm = /(^|\s)(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=\s|$|[,!?])/.exec(text);
      if (dm) {
        const d = +dm[2]; const m = +dm[3]; let y = dm[4] ? +dm[4] : new Date().getFullYear();
        if (y < 100) y += 2000;
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const dt = new Date(y, m - 1, d);
          if (dt.getMonth() === m - 1) { if (!dm[4] && keyOf(dt) < today) dt.setFullYear(y + 1); date = keyOf(dt); cut(dm.index, dm[0].length); }
        }
      }
    }
    if (!date) date = tryWords(D.dayAfter, () => addDays(today, 2));
    if (!date) date = tryWords(D.tomorrow, () => addDays(today, 1));
    if (!date) date = tryWords(D.today, () => today);
    if (!date && D.inDays) {
      const m = new RegExp('(^|\\s)' + D.inDays + '(?=\\s|$|[,.!?])', 'i').exec(text);
      if (m) { const n = parseInt(m[2], 10); if (n > 0 && n < 400) { date = addDays(today, n); cut(m.index, m[0].length); } }
    }
    if (!date) date = tryWords(D.nextWeek, () => addDays(today, 7));
    if (!date && Array.isArray(D.weekdays)) {
      for (let i = 0; i < 7 && !date; i++) {
        date = tryWords(D.weekdays[i], () => addDays(today, (i - weekdayIndex(today) + 7) % 7));
      }
    }
    return { text, date };
  }

  /* ---- Spaces ----------------------------------------------------------- */
  const curSpace = () => state.ui.space || 'personal';
  const spaceOf = (x) => x.space || 'personal';
  const inSpace = (x) => spaceOf(x) === curSpace();
  // Goals and notes are keyed per day; other spaces prefix the key with their id.
  const gk = (date, space = curSpace()) => (space === 'personal' ? date : `${space}|${date}`);
  function splitKey(key) { const i = key.indexOf('|'); return i === -1 ? { space: 'personal', date: key } : { space: key.slice(0, i), date: key.slice(i + 1) }; }
  function spaceName(s) {
    if (s.id === 'personal') return t('spacePersonal');
    if (s.id === 'work') return t('spaceWork');
    return s.name || s.id;
  }
  const spaceTasks = () => state.tasks.filter(inSpace);

  /* ---- Queries ---------------------------------------------------------- */
  const findTask = (id) => state.tasks.find((x) => x.id === id);
  const tasksOn = (k) => state.tasks.filter((x) => x.date === k && inSpace(x));
  const overdueTasks = () => { const today = todayKey(); return state.tasks.filter((x) => !x.done && x.date < today && inSpace(x)); };
  const goalsOn = (k) => state.goals[gk(k)] || [];
  const dayClosed = (k) => { const g = goalsOn(k); return g.length > 0 && g.every((x) => x.done); };
  function applyFilter(list) {
    let out = list;
    if (state.ui.filter === 'active') out = out.filter((x) => !x.done);
    else if (state.ui.filter === 'done') out = out.filter((x) => x.done);
    const q = state.query.trim().toLowerCase();
    if (q) out = out.filter((x) => x.text.toLowerCase().includes(q) || x.subtasks.some((s) => s.text.toLowerCase().includes(q)));
    return out;
  }
  function nodeFor(id) { return els.listWrap.querySelector(`.task[data-id="${CSS.escape(id)}"]`); }

  function doneDays() {
    const set = new Set();
    for (const x of state.tasks) if (x.done && Number.isFinite(x.doneAt) && inSpace(x)) set.add(keyOf(new Date(x.doneAt)));
    for (const k of Object.keys(state.goals)) if (splitKey(k).space === curSpace()) for (const g of state.goals[k]) if (g.done && Number.isFinite(g.doneAt)) set.add(keyOf(new Date(g.doneAt)));
    return set;
  }
  function streak() {
    const set = doneDays();
    let k = todayKey();
    if (!set.has(k)) k = addDays(k, -1);
    let n = 0;
    while (set.has(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  function countsSince(days) {
    const counts = new Map();
    const today = todayKey();
    for (let i = days - 1; i >= 0; i--) counts.set(addDays(today, -i), 0);
    const bump = (ts) => { if (!Number.isFinite(ts)) return; const k = keyOf(new Date(ts)); if (counts.has(k)) counts.set(k, counts.get(k) + 1); };
    for (const x of state.tasks) if (x.done && inSpace(x)) bump(x.doneAt);
    for (const k of Object.keys(state.goals)) if (splitKey(k).space === curSpace()) for (const g of state.goals[k]) if (g.done) bump(g.doneAt);
    return counts;
  }
  const weekCounts = () => countsSince(7);

  /* ---- Recurring tasks -------------------------------------------------- */
  function seriesMembers(sid) { return state.tasks.filter((x) => x.seriesId === sid).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); }
  function seriesAnchor(x) { const m = x.seriesId ? seriesMembers(x.seriesId) : []; return m.length ? m[0].date : x.date; }
  function ruleMatches(rule, key, anchorKey) {
    const wd = weekdayIndex(key);
    if (rule === 'daily') return true;
    if (rule === 'weekdays') return wd < 5;
    if (rule === 'weekly') return wd === weekdayIndex(anchorKey);
    return false;
  }
  function repeatLabel(x) {
    if (x.repeat === 'daily') return t('chipDaily');
    if (x.repeat === 'weekdays') return t('chipWeekdays');
    if (x.repeat === 'weekly') return t('chipWeekly', { day: L().weekdays[weekdayIndex(seriesAnchor(x))] });
    return '';
  }
  // Create today's instance for every series whose rule matches today (missed days are skipped, not piled up).
  function materializeRecurring() {
    const today = todayKey();
    const bySeries = new Map();
    for (const x of state.tasks) if (x.repeat && x.seriesId) { if (!bySeries.has(x.seriesId)) bySeries.set(x.seriesId, []); bySeries.get(x.seriesId).push(x); }
    let created = 0;
    for (const [sid, members] of bySeries) {
      members.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const first = members[0];
      const last = members[members.length - 1];
      if (last.date >= today) continue;
      if (!ruleMatches(last.repeat, today, first.date)) continue;
      const inst = {
        id: uid(), text: last.text, done: false, doneAt: null, createdAt: Date.now(), color: last.color, date: today,
        important: last.important, subtasks: last.subtasks.map((s) => ({ id: uid(), text: s.text, done: false })), repeat: last.repeat, seriesId: sid,
        space: spaceOf(last),
      };
      state.tasks.splice(state.tasks.indexOf(last) + 1, 0, inst);
      created++;
    }
    if (created) save();
    return created;
  }
  function setRepeat(id, rule) {
    const x = findTask(id);
    if (!x) return;
    if (!rule) {
      const sid = x.seriesId;
      for (const y of state.tasks) if (sid ? y.seriesId === sid : y === x) { y.repeat = null; y.seriesId = null; }
    } else {
      const sid = x.seriesId || x.id;
      x.seriesId = sid;
      for (const y of state.tasks) if (y.seriesId === sid) y.repeat = rule;
    }
    save();
    materializeRecurring();
    render('repeat');
    toast(t(rule ? 'toastRepeatOn' : 'toastRepeatOff'));
  }

  /* ======================================================================
     Persistence
     ====================================================================== */
  function uid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
  function normColor(c) {
    if (COLORS.includes(c)) return c;
    const i = LEGACY_HEX.indexOf(c);
    return i >= 0 ? COLORS[i] : randomColor();
  }
  function sanitizeTask(x, today) {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id || typeof x.text !== 'string') return null;
    const done = Boolean(x.done);
    const subs = Array.isArray(x.subtasks) ? x.subtasks
      .filter((s) => s && typeof s.text === 'string' && s.text.trim())
      .map((s) => ({ id: typeof s.id === 'string' && s.id ? s.id : uid(), text: s.text.slice(0, MAX_LEN), done: Boolean(s.done) })) : [];
    const repeat = REPEATS.includes(x.repeat) ? x.repeat : null;
    return {
      id: x.id,
      text: x.text.slice(0, MAX_LEN),
      done,
      doneAt: done ? (Number.isFinite(x.doneAt) ? x.doneAt : (Number.isFinite(x.createdAt) ? x.createdAt : Date.now())) : null,
      createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
      color: normColor(x.color),
      date: typeof x.date === 'string' && DATE_RE.test(x.date) ? x.date : today,
      important: Boolean(x.important),
      subtasks: subs,
      repeat,
      seriesId: repeat && typeof x.seriesId === 'string' && x.seriesId ? x.seriesId : (repeat ? x.id : null),
      space: typeof x.space === 'string' && x.space ? x.space.slice(0, 40) : 'personal',
    };
  }
  const KEY_RE = /^(?:[A-Za-z0-9_-]{1,40}\|)?\d{4}-\d{2}-\d{2}$/;
  function sanitize(data) {
    const today = todayKey();
    const out = { tasks: [], goals: {}, notes: {}, ui: { ...state.ui }, spaces: [{ id: 'personal' }, { id: 'work' }] };
    const seen = new Set();
    if (data && Array.isArray(data.spaces)) {
      const ids = new Set(out.spaces.map((s) => s.id));
      for (const s of data.spaces) {
        if (!s || typeof s.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(s.id) || ids.has(s.id)) continue;
        ids.add(s.id);
        out.spaces.push({ id: s.id, name: typeof s.name === 'string' ? s.name.slice(0, 40) : s.id });
      }
    }
    const spaceIds = new Set(out.spaces.map((s) => s.id));
    if (data && Array.isArray(data.tasks)) {
      for (const raw of data.tasks) {
        const x = sanitizeTask(raw, today);
        if (x && !seen.has(x.id)) { seen.add(x.id); if (!spaceIds.has(x.space)) x.space = 'personal'; out.tasks.push(x); }
      }
    }
    if (data && data.goals && typeof data.goals === 'object') {
      for (const k of Object.keys(data.goals)) {
        if (!KEY_RE.test(k) || !Array.isArray(data.goals[k])) continue;
        const list = data.goals[k]
          .filter((g) => g && typeof g.text === 'string' && g.text.trim())
          .slice(0, MAX_GOALS)
          .map((g) => ({ id: typeof g.id === 'string' && g.id ? g.id : uid(), text: g.text.slice(0, MAX_LEN), done: Boolean(g.done), doneAt: g.done ? (Number.isFinite(g.doneAt) ? g.doneAt : Date.now()) : null }));
        if (list.length) out.goals[k] = list;
      }
    }
    if (data && data.notes && typeof data.notes === 'object') {
      for (const k of Object.keys(data.notes)) {
        if (KEY_RE.test(k) && typeof data.notes[k] === 'string' && data.notes[k].trim()) out.notes[k] = data.notes[k].slice(0, 2000);
      }
    }
    if (data && data.ui && typeof data.ui === 'object') {
      if (FILTERS.includes(data.ui.filter)) out.ui.filter = data.ui.filter;
      if (VIEWS.includes(data.ui.view)) out.ui.view = data.ui.view;
      if (THEMES.includes(data.ui.theme)) out.ui.theme = data.ui.theme;
      if (LAYOUTS.includes(data.ui.layout)) out.ui.layout = data.ui.layout;
      if (LANGS.includes(data.ui.lang)) out.ui.lang = data.ui.lang;
      out.ui.space = spaceIds.has(data.ui.space) ? data.ui.space : 'personal';
    }
    return out;
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) return sanitize(JSON.parse(raw));
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy === null) continue;
        const data = JSON.parse(legacy);
        if (data && Array.isArray(data.tasks) && data.tasks.length) return sanitize({ tasks: data.tasks, goals: data.goals, notes: data.notes });
      }
      return null;
    } catch {
      return sanitize({});
    }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks: state.tasks, goals: state.goals, notes: state.notes, ui: state.ui, spaces: state.spaces }));
    } catch { /* quota / private mode */ }
  }

  function seed() {
    const S = L().seed || {};
    const T = S.tasks || [];
    const G = S.goals || [];
    const N = S.notes || [];
    const SUBS = S.subs || [];
    const today = todayKey();
    const now = Date.now();
    const H = 3600000;
    const day = (n) => addDays(today, n);
    const at = (n, hour) => { const d = parseKey(day(n)); d.setHours(hour, 0, 0, 0); return d.getTime(); };
    const mk = (text, date, o = {}) => ({
      id: uid(), text, date, done: Boolean(o.done), doneAt: o.done ? (o.doneAt || now - H) : null,
      createdAt: o.createdAt || now - 2 * H, color: o.color || randomColor(), important: Boolean(o.important),
      subtasks: (o.subs || []).map((s, i) => ({ id: uid(), text: s, done: i === 0 })), repeat: o.repeat || null, seriesId: null, space: 'personal',
    });
    state.tasks = [
      mk(T[0], day(-1), { color: 'c5', createdAt: at(-1, 9) }),
      mk(T[1], today, { important: true, color: 'c1', subs: SUBS }),
      mk(T[2], today, { color: 'c2' }),
      mk(T[3], today, { color: 'c3' }),
      mk(T[4], today, { done: true, doneAt: now - H, color: 'c4', repeat: 'daily' }),
      mk(T[5], day(1), { color: 'c5' }),
      mk(T[6], day(3), { important: true, color: 'c3' }),
      mk(T[7], day(6), { color: 'c1' }),
      mk(T[8], day(-2), { done: true, doneAt: at(-2, 20), color: 'c1' }),
      mk(T[9], day(-3), { done: true, doneAt: at(-3, 18), color: 'c2' }),
      mk(T[10], day(-4), { done: true, doneAt: at(-4, 8), color: 'c4' }),
      mk(T[11], day(-7), { done: true, doneAt: at(-7, 17), color: 'c3' }),
    ].filter((x) => x.text);
    for (const x of state.tasks) if (x.repeat) x.seriesId = x.id;
    state.goals = {
      [today]: [
        { id: uid(), text: G[0], done: true, doneAt: now - 2 * H },
        { id: uid(), text: G[1], done: false, doneAt: null },
      ],
      [day(-1)]: [{ id: uid(), text: G[2], done: true, doneAt: at(-1, 17) }],
      [day(-3)]: [{ id: uid(), text: G[3], done: true, doneAt: at(-3, 19) }, { id: uid(), text: G[4], done: false, doneAt: null }],
    };
    state.notes = { [today]: N[0], [day(-1)]: N[1], [day(-3)]: N[2], [day(-7)]: N[3] };
    for (const k of Object.keys(state.notes)) if (!state.notes[k]) delete state.notes[k];
  }

  /* ======================================================================
     Theme, layout, language
     ====================================================================== */
  function applyTheme() {
    const th = state.ui.theme;
    els.html.dataset.theme = th;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(els.html).getPropertyValue('--bg').trim() || (th === 'dark' ? '#000000' : '#FFFFFF'));
    els.themeBtn.textContent = th === 'dark' ? '☀' : '☾';
    els.themeBtn.setAttribute('aria-label', t(th === 'dark' ? 'themeToLight' : 'themeToDark'));
    els.themeBtn.title = els.themeBtn.getAttribute('aria-label');
  }
  function toggleTheme() {
    state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
    emit('theme-changed', { theme: state.ui.theme });
  }
  function applyLayout() {
    els.html.dataset.layout = state.ui.layout;
    for (const b of els.layoutBtns) b.setAttribute('aria-pressed', String(b.dataset.layout === state.ui.layout));
  }
  function setLayout(l) {
    if (!LAYOUTS.includes(l) || l === state.ui.layout) return;
    state.ui.layout = l;
    closeContext();
    applyLayout();
    save();
    emit('layout-changed', { layout: l });
  }
  function setLang(l) {
    closeLangMenu();
    if (!LANGS.includes(l) || l === state.ui.lang) return;
    if (flushEdit()) render('flush');
    state.ui.lang = l;
    applyStatic();
    applyTheme();
    save();
    updateAddHint();
    render('lang');
    emit('lang-changed', { lang: l });
  }
  const LANG_CODES = { uk: 'UA', en: 'EN', ru: 'RU' };
  function openLangMenu() {
    if (!els.langMenu) return;
    const r = els.langBtn.getBoundingClientRect();
    els.lang.classList.toggle('lang--up', r.top > window.innerHeight / 2);
    els.langMenu.hidden = false;
    els.langBtn.setAttribute('aria-expanded', 'true');
    const first = els.langMenu.querySelector('.lang__opt:not([aria-selected="true"])');
    if (first) first.focus();
  }
  function closeLangMenu() {
    if (!els.langMenu || els.langMenu.hidden) return;
    els.langMenu.hidden = true;
    els.langBtn.setAttribute('aria-expanded', 'false');
  }

  function setText(el, text) {
    if (!el) return;
    if (!el.firstElementChild) { el.textContent = text; return; }
    const first = el.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) first.nodeValue = text + ' ';
    else el.insertBefore(document.createTextNode(text + ' '), first);
  }
  const setAttr = (el, attr, text) => { if (el) el.setAttribute(attr, text); };

  function applyStatic() {
    els.html.lang = state.ui.lang;
    for (const b of els.langBtns) b.setAttribute('aria-pressed', String(b.dataset.lang === state.ui.lang));
    if (els.langCode) els.langCode.textContent = LANG_CODES[state.ui.lang] || state.ui.lang.toUpperCase();
    setAttr(els.langBtn, 'aria-label', t('langAria'));
    setAttr(els.langBtn, 'title', t('langAria'));
    for (const o of els.langOpts) o.setAttribute('aria-selected', String(o.dataset.lang === state.ui.lang));
    setText($('.brand__name'), t('brand'));
    setText($('.sidenav__label'), t('space'));
    setAttr($('.sidenav'), 'aria-label', t('navAria'));
    for (const b of els.navLinks) {
      const key = { day: 'navDay', all: 'navAll', history: 'navHistory', calendar: 'navCalendar' }[b.dataset.nav];
      const span = b.querySelector('span:not(.navlink__count)');
      if (key && span) span.textContent = t(key);
    }
    for (const b of els.layoutBtns) b.textContent = t(b.dataset.layout === 'dash' ? 'layoutDash' : 'layoutList');
    setAttr($('.seg[role="group"]:not(.seg--lang)'), 'aria-label', t('layoutAria'));
    setText($('.sidenav__hint'), t('storageHint'));
    setAttr(els.search, 'placeholder', t('searchPh'));
    setAttr(els.search, 'aria-label', t('searchAria'));
    setAttr(els.searchClear, 'aria-label', t('searchClear'));
    setText($('.ring__cap'), t('ringCap'));
    setAttr(els.tiles, 'aria-label', t('overviewAria'));
    const tileKeys = ['tileDone', 'tileLeft', 'tileStreak', 'tileWeek'];
    $$('.tile').forEach((tile, i) => { const lab = tile.querySelector('.eyebrow'); if (lab && tileKeys[i]) lab.textContent = t(tileKeys[i]); });
    setAttr(els.datebar, 'aria-label', t('sectionAria'));
    setText(els.dateToday, t('today'));
    setAttr($('.date-nav[data-day="prev"]'), 'aria-label', t('prevDay'));
    setAttr($('.date-nav[data-day="next"]'), 'aria-label', t('nextDay'));
    setAttr(els.filtersWrap, 'aria-label', t('filtersAria'));
    for (const f of els.filters) setText(f, t({ all: 'filterAll', active: 'filterActive', done: 'filterDone' }[f.dataset.filter]));
    setText(els.bannerMove, t('moveToToday'));
    setText(els.bannerShow, t('show'));
    setText($('.goals__title'), t('goalsTitle'));
    setAttr(els.goals, 'aria-label', t('goalsAria'));
    setText(els.dayStamp, t('dayClosed'));
    setAttr(els.noteWrap, 'aria-label', t('noteAria'));
    setAttr(els.note, 'aria-label', t('noteAria'));
    setAttr(els.note, 'placeholder', t('notePh'));
    setAttr(els.input, 'placeholder', t('addPh'));
    setAttr(els.input, 'aria-label', t('addAria'));
    setAttr($('.swatches'), 'aria-label', t('swatchGroup'));
    const names = labelNames();
    els.swatches.forEach((s, i) => {
      const name = s.dataset.color === 'auto' ? t('swatchAuto') : (names[s.dataset.color] || t('swatchN', { n: i }));
      s.title = name;
      s.setAttribute('aria-label', name);
    });
    setText(els.addImportant, t('important'));
    setText($('.add-btn'), t('add'));
    setText(els.clearBtn, t('clearDone'));
    const hint = $('.hint');
    if (hint) hint.innerHTML = t('hint'); // trusted dictionary markup (kbd tags), never user text
    setAttr(els.history, 'aria-label', t('histAria'));
    setAttr(els.context, 'aria-label', t('contextAria'));
    setAttr(els.contextClose, 'aria-label', t('close'));
    setAttr($('.panel.calendar'), 'aria-label', t('calendarAria'));
    setAttr($('.cal-nav[data-cal="prev"]'), 'aria-label', t('prevMonth'));
    setAttr($('.cal-nav[data-cal="next"]'), 'aria-label', t('nextMonth'));
    setText(els.calToday, t('calToday'));
    const upPanel = els.upnext ? els.upnext.closest('.panel') : null;
    if (upPanel) { setAttr(upPanel, 'aria-label', t('upnextAria')); setText(upPanel.querySelector('.panel__title'), t('upnextTitle')); setText(upPanel.querySelector('.eyebrow'), t('upnextEyebrow')); }
    const wkPanel = els.statsBars ? els.statsBars.closest('.panel') : null;
    if (wkPanel) { setAttr(wkPanel, 'aria-label', t('weekAria')); setText(wkPanel.querySelector('.panel__title'), t('weekTitle')); setText(wkPanel.querySelector('.eyebrow'), t('weekEyebrow')); }
    setAttr(els.popover, 'aria-label', t('popoverAria'));
    const tc = els.tpl.content;
    setAttr(tc.querySelector('.text'), 'title', t('dblEdit'));
    setAttr(tc.querySelector('.handle'), 'title', t('handleTitle'));
    setAttr(tc.querySelector('.subs__input'), 'placeholder', t('subPh'));
    setAttr(tc.querySelector('.subs__input'), 'aria-label', t('subNewAria'));
    setAttr(tc.querySelector('.subs__btn'), 'aria-label', t('subAddAria'));
    els.calWeekdays.replaceChildren();
  }

  function openContext() {
    els.context.classList.add('context--open');
    els.app.dataset.contextOpen = 'true';
    for (const b of els.navLinks) if (b.dataset.nav === 'calendar') b.setAttribute('aria-expanded', 'true');
  }
  function closeContext() {
    els.context.classList.remove('context--open');
    delete els.app.dataset.contextOpen;
    for (const b of els.navLinks) if (b.dataset.nav === 'calendar') b.setAttribute('aria-expanded', 'false');
  }
  function toggleContext() { if (els.context.classList.contains('context--open')) closeContext(); else openContext(); }
  const contextInline = () => state.ui.layout === 'dash' && window.innerWidth > 900;

  /* ======================================================================
     Toast (with optional action), popover, tween
     ====================================================================== */
  function toast(msg, opts = {}) {
    let el = document.querySelector('.toast');
    if (el) el.remove();
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = msg;
    el.appendChild(text);
    const dismiss = () => { el.classList.add('toast--out'); setTimeout(() => el.remove(), 220); };
    if (opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast__btn';
      b.textContent = opts.action.label;
      b.addEventListener('click', () => { clearTimeout(toastTimer); dismiss(); opts.action.fn(); });
      el.appendChild(b);
    }
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(dismiss, opts.ms || 2400);
  }
  function closePopover() {
    if (popoverCleanup) { popoverCleanup(); popoverCleanup = null; }
    els.popover.hidden = true;
    els.popover.replaceChildren();
  }
  function openPopover(anchor, build) {
    closePopover();
    const pop = els.popover;
    build(pop);
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    let left = r.left;
    let top = r.bottom + 8;
    if (left + pw > window.innerWidth - 12) left = Math.max(12, window.innerWidth - pw - 12);
    if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    const onDown = (e) => { if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closePopover(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePopover(); anchor.focus(); } };
    const onScroll = () => closePopover();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    popoverCleanup = () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
    const first = pop.querySelector('button, input');
    if (first) first.focus();
  }
  function tweenNumber(el, to, format) {
    if (!el) return;
    const prev = tweens.get(el);
    const from = prev && Number.isFinite(prev.value) ? prev.value : to;
    if (prev && prev.raf) cancelAnimationFrame(prev.raf);
    if (reducedMotion || from === to) { el.textContent = format(to); tweens.set(el, { value: to, raf: 0 }); return; }
    const t0 = performance.now();
    const dur = 420;
    const step = () => {
      const p = Math.min(1, Math.max(0, (performance.now() - t0) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = format(v);
      const rec = tweens.get(el);
      if (p < 1) { rec.raf = requestAnimationFrame(step); rec.value = v; } else { rec.raf = 0; rec.value = to; el.textContent = format(to); }
    };
    tweens.set(el, { value: from, raf: requestAnimationFrame(step) });
  }

  /* ======================================================================
     Render
     ====================================================================== */
  function render(reason) {
    if (state.editingId && !findTask(state.editingId)) state.editingId = null;
    emit('before-render', { reason });

    const active = document.activeElement;
    let refocus = null;
    if (active && els.listWrap.contains(active)) {
      const li = active.closest('.task');
      if (li) refocus = { id: li.dataset.id, action: active.dataset.action || null, subAdd: Boolean(active.closest('.subs__add')) };
    }

    renderNav();
    renderHero();
    renderTiles();
    renderDatebar();
    renderBanner();
    renderGoals();
    renderNote();
    renderList();
    renderHistory();
    renderMeta();
    renderCalendar();
    renderUpnext();
    renderBars(els.statsBars, true);

    if (state.editingId) {
      const input = els.listWrap.querySelector('.edit-input');
      if (input) { input.focus({ preventScroll: true }); const len = input.value.length; input.setSelectionRange(len, len); }
    } else if (pendingFocus) {
      const pf = pendingFocus;
      pendingFocus = null;
      if (pf.kind === 'goal') {
        const inputs = els.goalsList.querySelectorAll('.goal__input');
        const el = inputs[Math.min(pf.slot, inputs.length - 1)];
        if (el) el.focus({ preventScroll: true });
      } else if (pf.kind === 'subadd') {
        const li = nodeFor(pf.id);
        const el = li && li.querySelector('.subs__input');
        if (el) el.focus({ preventScroll: true });
      } else if (pf.kind === 'input') {
        els.input.focus({ preventScroll: true });
      }
    } else if (refocus) {
      const li = nodeFor(refocus.id);
      if (li) {
        let target = null;
        if (refocus.subAdd) target = li.querySelector('.subs__input');
        else if (refocus.action) target = li.querySelector(`[data-action="${refocus.action}"]`);
        (target || li.querySelector('[data-action="edit"]') || els.input).focus({ preventScroll: true });
      } else {
        els.input.focus({ preventScroll: true });
      }
    }
    emit('render', { reason });
  }

  function renderNav() {
    for (const b of els.navLinks) {
      if (b.dataset.nav === 'calendar') continue;
      b.setAttribute('aria-pressed', String(b.dataset.nav === state.ui.view));
    }
    const todayActive = tasksOn(todayKey()).filter((x) => !x.done).length;
    const allActive = spaceTasks().filter((x) => !x.done).length;
    els.navCountDay.textContent = todayActive ? String(todayActive) : '';
    els.navCountAll.textContent = allActive ? String(allActive) : '';
    els.crumb.textContent = t({ day: 'navDay', all: 'navAll', history: 'navHistory' }[state.ui.view]);
    const cur = state.spaces.find((s) => s.id === curSpace()) || state.spaces[0];
    if (els.spaceName) els.spaceName.textContent = spaceName(cur);
    if (els.spaceBtn) { els.spaceBtn.setAttribute('aria-label', t('spacesAria')); els.spaceBtn.title = t('spacesAria'); }
    els.searchWrap.classList.toggle('search--active', Boolean(state.query.trim()));
    if (document.activeElement !== els.search) els.search.value = state.query;
  }

  function renderHero() {
    const k = state.selectedDate;
    const today = todayKey();
    const hour = new Date().getHours();
    let l1 = t(hour < 5 ? 'greetNight' : hour < 11 ? 'greetMorning' : hour < 17 ? 'greetDay' : 'greetEvening');
    let l2 = '';
    let sub = '';
    if (state.ui.view === 'history') {
      const n = Object.keys(historyDays()).length;
      l1 = t('heroHistoryL1');
      l2 = t('heroHistoryL2');
      sub = t('heroHistorySub');
      els.dateEyebrow.textContent = tp('withRecords', n);
    } else if (state.ui.view === 'all') {
      const n = spaceTasks().filter((x) => !x.done).length;
      l1 = t('heroAllL1');
      l2 = n ? t('heroAllL2', { n, noun: pl('active', n) }) : t('heroAllDone');
      sub = t('heroAllSub');
      els.dateEyebrow.textContent = cap(longLabel(today));
    } else {
      const list = tasksOn(k);
      const activeN = list.filter((x) => !x.done).length;
      if (k === today) {
        if (list.length && activeN === 0) l2 = t('heroDayAllDone');
        else if (activeN === 0) l2 = t('heroDayFree');
        else if (activeN <= 2) l2 = t('heroDayFew');
        else if (activeN <= 5) l2 = t('heroDaySome');
        else l2 = t('heroDayBusy');
        sub = t('heroDaySub');
      } else {
        l1 = relLabel(k) + ',';
        l2 = activeN ? tp('planned', activeN) : t('heroOtherNone');
        sub = t(k < today ? 'heroPastSub' : 'heroFutureSub');
      }
      els.dateEyebrow.textContent = cap(longLabel(k));
    }
    els.heroL1.textContent = l1;
    els.heroL2.textContent = l2;
    els.heroSub.textContent = sub;

    const tt = tasksOn(today);
    const pct = tt.length ? Math.round((tt.filter((x) => x.done).length / tt.length) * 100) : 0;
    const C = 2 * Math.PI * 58;
    els.ringFg.setAttribute('stroke-dasharray', String(C));
    els.ringFg.setAttribute('stroke-dashoffset', String(C * (1 - pct / 100)));
    tweenNumber(els.ringPct, pct, (v) => `${v}%`);
    els.heroRing.setAttribute('aria-label', t('ringAria', { n: pct }));
    els.heroRing.hidden = !(state.ui.view === 'day' && k === today); // the ring is about today only
    // Compact the top of the page once there is something to work with.
    const busy = state.ui.view !== 'day' || tasksOn(k).length > 0;
    els.html.dataset.compact = busy ? '1' : '0';
  }

  function renderTiles() {
    const today = todayKey();
    const tt = tasksOn(today);
    const done = tt.filter((x) => x.done).length;
    const pct = tt.length ? Math.round((done / tt.length) * 100) : 0;
    tweenNumber(els.tDone, pct, (v) => `${v}%`);
    els.tDoneSub.textContent = tt.length ? t('tileDoneSub', { done, total: tt.length }) : t('tileDoneNone');
    const activeN = tt.length - done;
    tweenNumber(els.tActive, activeN, (v) => String(v));
    const od = overdueTasks().length;
    els.tActiveSub.textContent = od ? t('tileOverdue', { n: od, noun: pl('overdueAdj', od) }) : t('tileCalm');
    els.tActiveSub.classList.toggle('tile__sub--neg', od > 0);
    els.tActiveSub.classList.toggle('tile__sub--pos', od === 0);
    const s = streak();
    tweenNumber(els.tStreak, s, (v) => String(v));
    els.tStreakSub.textContent = s ? t('streakSub', { noun: pl('days', s) }) : t('streakNone');
    let weekTotal = 0;
    for (const n of weekCounts().values()) weekTotal += n;
    els.tWeekSub.textContent = t('weekClosed', { n: weekTotal });
    renderBars(els.tWeek, false);
  }

  function renderBars(container, withLabels) {
    if (!container) return;
    const counts = weekCounts();
    const today = todayKey();
    const max = Math.max(1, ...counts.values());
    const frag = document.createDocumentFragment();
    for (const [k, n] of counts) {
      const bar = document.createElement('div');
      bar.className = 'bar' + (k === today ? ' bar--today' : '') + (n ? ' bar--on' : '');
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', `${fullLabel(k)}: ${n}`);
      const fill = document.createElement('span');
      fill.className = 'bar__fill';
      fill.style.setProperty('--h', String(Math.max(n ? 18 : 0, Math.round((n / max) * 100))));
      bar.appendChild(fill);
      if (withLabels) { const lab = document.createElement('span'); lab.className = 'bar__label'; lab.textContent = L().weekdays[weekdayIndex(k)]; bar.appendChild(lab); }
      frag.appendChild(bar);
    }
    container.replaceChildren(frag);
  }

  function renderDatebar() {
    const k = state.selectedDate;
    const view = state.ui.view;
    const today = todayKey();
    if (view === 'day') {
      els.dateTitle.textContent = t(k === today ? 'dateTitleDay' : (k < today ? 'dateTitlePast' : 'dateTitleFuture'));
      els.dateFull.textContent = `${relLabel(k)} · ${fullLabel(k)}`;
      els.datebarNav.hidden = false;
      els.dateToday.disabled = k === today;
    } else if (view === 'all') {
      els.dateTitle.textContent = t('dateTitleAll');
      els.dateFull.textContent = t('dateSubAll');
      els.datebarNav.hidden = true;
    } else {
      els.dateTitle.textContent = t('dateTitleHistory');
      els.dateFull.textContent = t('dateSubHistory');
      els.datebarNav.hidden = true;
    }
    els.filtersWrap.hidden = view === 'history';
    els.html.dataset.view = view;
  }

  function renderBanner() {
    const od = overdueTasks();
    const show = od.length > 0 && state.ui.view !== 'history' && !(state.ui.view === 'all' && state.ui.filter !== 'done');
    els.banner.hidden = !show;
    if (!show) return;
    els.bannerText.textContent = `${od.length} ${pl('overdueTasks', od.length)}`;
    els.bannerShow.hidden = state.ui.view === 'all';
  }

  function renderGoals() {
    const k = state.selectedDate;
    const goals = goalsOn(k);
    const closed = dayClosed(k);
    const doneN = goals.filter((g) => g.done).length;
    els.goals.hidden = state.ui.view !== 'day';
    els.goals.classList.toggle('goals--closed', closed);
    els.goalsCount.textContent = goals.length ? `${doneN} / ${goals.length}` : '';
    els.dayStamp.hidden = !closed;
    const frag = document.createDocumentFragment();
    const phs = [t('goalPh1'), t('goalPh2'), t('goalPh3')];
    for (let i = 0; i < MAX_GOALS; i++) {
      const g = goals[i] || null;
      const li = document.createElement('li');
      li.className = 'goal' + (g && g.done ? ' goal--done' : '');
      li.dataset.slot = String(i);
      const num = document.createElement('span'); num.className = 'goal__num'; num.textContent = String(i + 1);
      const check = makeCheck(Boolean(g && g.done), true);
      check.dataset.goalAction = 'toggle';
      check.disabled = !g;
      check.setAttribute('aria-label', g ? t(g.done ? 'goalMarkUndone' : 'goalMarkDone') + g.text : t('goalEmpty'));
      const input = document.createElement('input');
      input.className = 'goal__input';
      input.type = 'text';
      input.maxLength = MAX_LEN;
      input.value = g ? g.text : '';
      input.placeholder = phs[i];
      input.setAttribute('aria-label', t('goalN', { n: i + 1 }));
      input.dataset.goalAction = 'text';
      input.autocomplete = 'off';
      input.enterKeyHint = 'next';
      li.append(num, check, input);
      frag.appendChild(li);
    }
    els.goalsList.replaceChildren(frag);
  }

  function renderNote() {
    const k = gk(state.selectedDate);
    els.noteWrap.hidden = state.ui.view !== 'day';
    if (document.activeElement !== els.note || els.note.dataset.date !== k) {
      els.note.value = state.notes[k] || '';
      els.note.dataset.date = k;
      autoGrow(els.note);
    }
    els.note.classList.toggle('note--empty', !els.note.value.trim());
  }
  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.max(ta.value.trim() ? 54 : 40, ta.scrollHeight + 2) + 'px'; }

  function makeCheck(checked, small) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'check' + (small ? ' check--sm' : '');
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', String(checked));
    const box = document.createElement('span'); box.className = 'check__box';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'check__svg'); svg.setAttribute('viewBox', '0 0 28 28'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'check__path'); path.setAttribute('pathLength', '30'); path.setAttribute('d', 'M6 14.5 L12 20.5 L22 8');
    svg.appendChild(path); box.appendChild(svg); btn.appendChild(box);
    return btn;
  }

  function setHighlighted(el, text) {
    const q = state.query.trim();
    el.replaceChildren();
    if (!q) { el.textContent = text; return; }
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    let i = 0;
    let idx = lower.indexOf(ql, i);
    while (idx !== -1) {
      if (idx > i) el.appendChild(document.createTextNode(text.slice(i, idx)));
      const m = document.createElement('mark');
      m.textContent = text.slice(idx, idx + q.length);
      el.appendChild(m);
      i = idx + q.length;
      idx = lower.indexOf(ql, i);
    }
    if (i < text.length) el.appendChild(document.createTextNode(text.slice(i)));
  }

  function createTaskNode(x, enterIndex, showDate) {
    const li = els.tpl.content.firstElementChild.cloneNode(true);
    const card = li.querySelector('.card');
    const check = li.querySelector('.check');
    const textEl = li.querySelector('.text');
    const meta = li.querySelector('.meta');
    const editing = state.editingId === x.id;
    const isOpen = expanded.has(x.id);
    const subDone = x.subtasks.filter((s) => s.done).length;

    li.dataset.id = x.id;
    li.style.setProperty('--card', `var(--${x.color})`);
    li.classList.toggle('done', x.done);
    li.classList.toggle('important', x.important);
    li.classList.toggle('editing', editing);
    li.classList.toggle('open', isOpen);
    li.draggable = !editing && state.ui.view === 'day' && !state.query.trim();
    if (leaving.has(x.id)) li.classList.add('leaving');
    if (!seenIds.has(x.id)) {
      seenIds.add(x.id);
      li.classList.add('enter');
      card.style.setProperty('--enter-delay', Math.min(enterIndex * 30, 240) + 'ms');
    }
    const justDone = x.done && !seenDone.has(x.id);
    check.setAttribute('aria-checked', String(x.done));
    check.classList.toggle('just-done', justDone);
    check.setAttribute('aria-label', t(x.done ? 'taskMarkUndone' : 'taskMarkDone') + x.text);

    if (editing) {
      const input = document.createElement('input');
      input.className = 'edit-input';
      input.type = 'text';
      input.maxLength = MAX_LEN;
      input.value = x.text;
      input.setAttribute('aria-label', t('editAria'));
      input.setAttribute('enterkeyhint', 'done');
      input.autocomplete = 'off';
      textEl.replaceWith(input);
    } else {
      setHighlighted(textEl, x.text);
    }

    const today = todayKey();
    if (showDate) {
      const chip = document.createElement('span');
      const overdue = !x.done && x.date < today;
      chip.className = 'chip chip--date' + (overdue ? ' chip--overdue' : '');
      chip.textContent = shortLabel(x.date);
      meta.appendChild(chip);
    }
    if (x.important) {
      const chip = document.createElement('span');
      chip.className = 'chip chip--imp';
      chip.textContent = t('importantChip');
      meta.appendChild(chip);
    }
    if (x.repeat) {
      const chip = document.createElement('span');
      chip.className = 'chip chip--rep';
      chip.textContent = '↻ ' + repeatLabel(x);
      meta.appendChild(chip);
    }
    if (x.subtasks.length) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip chip--sub';
      chip.dataset.action = 'subtasks';
      chip.textContent = `${subDone}/${x.subtasks.length}`;
      chip.setAttribute('aria-label', t('subsAria', { done: subDone, total: x.subtasks.length }));
      meta.appendChild(chip);
    }
    const cfg = window.CalmConfig || {};
    const names = labelNames();
    if (names[x.color]) {
      const chip = document.createElement('span');
      chip.className = 'chip chip--label';
      chip.style.setProperty('--card', `var(--${x.color})`);
      const dot = document.createElement('i');
      dot.className = 'chip__dot';
      chip.append(dot, document.createTextNode(names[x.color]));
      meta.appendChild(chip);
    }
    if (cfg.showTime && Number.isFinite(x.createdAt)) {
      const d = new Date(x.createdAt);
      const time = document.createElement('span');
      time.className = 'time';
      time.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      time.title = t('timeTitle', { date: fullLabel(keyOf(d)), time: time.textContent });
      card.insertBefore(time, li.querySelector('.actions'));
    }

    for (const b of li.querySelectorAll('.actions [data-action]')) {
      const a = b.dataset.action;
      const label = {
        important: t(x.important ? 'actImpOff' : 'actImpOn'), subtasks: t(isOpen ? 'actSubsHide' : 'actSubs'),
        repeat: t('actRepeat'), move: t('actMove'), edit: t('actEdit'), delete: t('actDelete'),
      }[a];
      b.setAttribute('aria-label', `${label}: ${x.text}`);
      b.title = label;
      if (a === 'important') b.setAttribute('aria-pressed', String(x.important));
      if (a === 'repeat') b.setAttribute('aria-pressed', String(Boolean(x.repeat)));
      if (a === 'subtasks') b.setAttribute('aria-expanded', String(isOpen));
    }

    const subs = li.querySelector('.subs');
    subs.hidden = !isOpen;
    if (isOpen) {
      const ul = subs.querySelector('.subs__list');
      for (const s of x.subtasks) {
        const row = els.subTpl.content.firstElementChild.cloneNode(true);
        row.dataset.subId = s.id;
        row.classList.toggle('sub--done', s.done);
        const c = makeCheck(s.done, true);
        c.dataset.subAction = 'toggle';
        c.setAttribute('aria-label', t(s.done ? 'taskMarkUndone' : 'taskMarkDone') + s.text);
        row.insertBefore(c, row.firstChild);
        setHighlighted(row.querySelector('.sub__text'), s.text);
        row.querySelector('.sub__del').setAttribute('aria-label', t('subDel') + s.text);
        ul.appendChild(row);
      }
    }
    return li;
  }

  function renderList() {
    const view = state.ui.view;
    const listView = view !== 'history';
    els.listWrap.hidden = !listView;
    els.form.hidden = !listView;
    if (!listView) { els.empty.hidden = true; return; }

    for (const x of state.tasks) if (!x.done) seenDone.delete(x.id);
    const frag = document.createDocumentFragment();
    let enterIndex = 0;
    let visibleCount = 0;
    const push = (ul, x, showDate) => {
      const isNew = !seenIds.has(x.id);
      ul.appendChild(createTaskNode(x, enterIndex, showDate));
      if (isNew) enterIndex++;
      visibleCount++;
    };
    const q = state.query.trim();

    if (view === 'day') {
      const ul = document.createElement('ul');
      ul.className = 'list' + (q ? '' : ' list--dnd');
      ul.id = 'list';
      ul.setAttribute('aria-label', t('listAria', { date: fullLabel(state.selectedDate) }));
      for (const x of applyFilter(tasksOn(state.selectedDate))) push(ul, x, false);
      frag.appendChild(ul);
    } else {
      const today = todayKey();
      const groups = [];
      const mine = spaceTasks();
      const overdue = applyFilter(mine.filter((x) => !x.done && x.date < today));
      if (overdue.length) groups.push({ key: null, title: t('groupOverdue'), cls: 'group--overdue', tasks: overdue });
      const dates = Array.from(new Set(mine.filter((x) => x.date >= today).map((x) => x.date))).sort();
      for (const d of dates) {
        const list = applyFilter(tasksOn(d));
        if (list.length) groups.push({ key: d, title: groupLabel(d), cls: d === today ? 'group--today' : '', tasks: list });
      }
      const earlier = applyFilter(mine.filter((x) => x.done && x.date < today)).sort((a, b) => (a.date < b.date ? 1 : -1));
      if (earlier.length) groups.push({ key: null, title: t('groupEarlier'), cls: 'group--earlier', tasks: earlier });
      for (const g of groups) {
        const sec = document.createElement('section');
        sec.className = 'group ' + g.cls;
        const h = document.createElement(g.key ? 'button' : 'h3');
        h.className = 'group__title';
        if (g.key) { h.type = 'button'; h.dataset.jump = g.key; h.title = t('openDay'); }
        h.textContent = g.title;
        const cnt = document.createElement('span'); cnt.className = 'count'; cnt.textContent = String(g.tasks.length);
        h.appendChild(cnt);
        const ul = document.createElement('ul'); ul.className = 'list';
        for (const x of g.tasks) push(ul, x, true);
        sec.append(h, ul);
        frag.appendChild(sec);
      }
    }
    els.listWrap.replaceChildren(frag);
    for (const x of state.tasks) if (x.done) seenDone.add(x.id);

    const scopeTotal = view === 'day' ? tasksOn(state.selectedDate).length : spaceTasks().length;
    els.empty.hidden = visibleCount !== 0;
    if (visibleCount === 0) {
      if (q) { els.emptyTitle.textContent = t('emptySearchTitle'); els.emptyMsg.textContent = t('emptySearchMsg', { q }); }
      else if (scopeTotal === 0) { els.emptyTitle.textContent = t(view === 'day' ? 'emptyDayTitle' : 'emptyAllTitle'); els.emptyMsg.textContent = t('emptyMsg'); }
      else if (state.ui.filter === 'active') { els.emptyTitle.textContent = t('emptyActiveTitle'); els.emptyMsg.textContent = t('emptyActiveMsg'); }
      else { els.emptyTitle.textContent = t('emptyDoneTitle'); els.emptyMsg.textContent = t('emptyDoneMsg'); }
    }
  }

  function historyDays() {
    const today = todayKey();
    const minKey = addDays(today, -HISTORY_DAYS);
    const days = {};
    const ensure = (k) => { if (!days[k]) days[k] = { tasks: [], goals: [], note: '' }; return days[k]; };
    for (const x of state.tasks) if (x.date < today && x.date >= minKey && inSpace(x)) ensure(x.date).tasks.push(x);
    for (const k of Object.keys(state.goals)) { const p = splitKey(k); if (p.space === curSpace() && p.date < today && p.date >= minKey && state.goals[k].length) ensure(p.date).goals = state.goals[k]; }
    for (const k of Object.keys(state.notes)) { const p = splitKey(k); if (p.space === curSpace() && p.date < today && p.date >= minKey && state.notes[k].trim()) ensure(p.date).note = state.notes[k]; }
    return days;
  }

  function renderHistorySummary() {
    if (!els.historySummary) return;
    const week = weekCounts();
    let n7 = 0;
    let best = null;
    for (const [k, n] of week) { n7 += n; if (n > 0 && (!best || n > best.n)) best = { k, n }; }
    let n30 = 0;
    for (const n of countsSince(30).values()) n30 += n;
    const frag = document.createDocumentFragment();
    const stat = (label, value) => {
      const el = document.createElement('div');
      el.className = 'hstat';
      const l = document.createElement('span'); l.className = 'eyebrow'; l.textContent = label;
      const v = document.createElement('span'); v.className = 'hstat__val'; v.textContent = value;
      el.append(l, v);
      return el;
    };
    frag.appendChild(stat(t('sumWeek'), String(n7)));
    frag.appendChild(stat(t('sumMonth'), String(n30)));
    frag.appendChild(stat(t('sumBest'), best ? `${L().weekdays[weekdayIndex(best.k)]} · ${best.n}` : '—'));
    frag.appendChild(stat(t('sumStreak'), String(streak())));
    els.historySummary.replaceChildren(frag);
  }

  function renderHistory() {
    const show = state.ui.view === 'history';
    els.history.hidden = !show;
    if (!show) return;
    renderHistorySummary();
    const q = state.query.trim().toLowerCase();
    const days = historyDays();
    const keys = Object.keys(days).sort().reverse();
    const frag = document.createDocumentFragment();
    let shown = 0;
    for (const k of keys) {
      const d = days[k];
      const hit = (s) => !q || s.toLowerCase().includes(q);
      const tasks = q ? d.tasks.filter((x) => hit(x.text) || x.subtasks.some((s) => hit(s.text))) : d.tasks;
      const goals = q ? d.goals.filter((g) => hit(g.text)) : d.goals;
      const note = hit(d.note) ? d.note : '';
      if (q && !tasks.length && !goals.length && !note) continue;
      shown++;
      const art = document.createElement('article');
      art.className = 'hday';
      const head = document.createElement('header');
      head.className = 'hday__head';
      const title = document.createElement('h3'); title.className = 'hday__title'; title.textContent = fullLabel(k);
      const rel = document.createElement('span'); rel.className = 'hday__rel'; rel.textContent = relLabel(k);
      const open = document.createElement('button'); open.type = 'button'; open.className = 'hday__open'; open.dataset.jump = k; open.textContent = t('histOpen');
      head.append(title, rel, open);
      art.appendChild(head);
      if (note) { const p = document.createElement('p'); p.className = 'hday__note'; setHighlighted(p, note); art.appendChild(p); }
      const section = (label, rows, textOf, doneOf) => {
        if (!rows.length) return;
        const sec = document.createElement('div'); sec.className = 'hday__section';
        const lab = document.createElement('span'); lab.className = 'eyebrow hday__label'; lab.textContent = label;
        sec.appendChild(lab);
        for (const r of rows) {
          const row = document.createElement('div'); row.className = 'hrow' + (doneOf(r) ? ' hrow--done' : '');
          const mark = document.createElement('span'); mark.className = 'hrow__mark'; mark.textContent = doneOf(r) ? '✓' : '';
          const text = document.createElement('span'); text.className = 'hrow__text'; setHighlighted(text, textOf(r));
          row.append(mark, text);
          sec.appendChild(row);
        }
        art.appendChild(sec);
      };
      section(t('histGoals'), goals, (g) => g.text, (g) => g.done);
      section(t('histTasks'), tasks, (x) => x.text, (x) => x.done);
      frag.appendChild(art);
    }
    if (!shown) {
      const p = document.createElement('p');
      p.className = 'history__empty';
      p.textContent = q ? t('histNotFound', { q: state.query.trim() }) : t('histEmpty');
      frag.appendChild(p);
    }
    els.historyList.replaceChildren(frag);
  }

  function renderMeta() {
    const view = state.ui.view;
    const scope = view === 'day' ? tasksOn(state.selectedDate) : spaceTasks();
    const total = scope.length;
    const doneCount = scope.filter((x) => x.done).length;
    const activeCount = total - doneCount;
    const counts = { all: total, active: activeCount, done: doneCount };
    for (const btn of els.filters) {
      const f = btn.dataset.filter;
      btn.setAttribute('aria-pressed', String(f === state.ui.filter));
      btn.querySelector('.count').textContent = String(counts[f]);
    }
    els.dateCount.textContent = view === 'history' ? '' : String(total);
    els.foot.hidden = total === 0 || view === 'history';
    els.clearBtn.hidden = doneCount === 0;
    els.counter.textContent = activeCount === 0 ? t('allDone') : tp('left', activeCount);
    const todayActive = tasksOn(todayKey()).filter((x) => !x.done).length;
    document.title = todayActive > 0 ? `(${todayActive}) ${t('docTitle')}` : t('docTitle');
  }

  function renderCalendar() {
    const [y, m] = state.month.split('-').map(Number);
    els.calMonth.textContent = `${L().months[m - 1]} ${y}`;
    if (!els.calWeekdays.childElementCount) {
      for (const wd of L().weekdays) { const s = document.createElement('span'); s.className = 'calendar__wd'; s.textContent = wd; els.calWeekdays.appendChild(s); }
    }
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const today = todayKey();
    const byDay = new Map();
    for (const x of spaceTasks()) {
      let e = byDay.get(x.date);
      if (!e) { e = { total: 0, done: 0, colors: [] }; byDay.set(x.date, e); }
      e.total++;
      if (x.done) e.done++;
      else if (e.colors.length < 3) e.colors.push(x.color);
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m - 1, 1 - offset + i);
      const k = keyOf(d);
      const info = byDay.get(k);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.dataset.date = k;
      if (d.getMonth() !== m - 1) btn.classList.add('cal-day--other');
      if (k === today) btn.classList.add('cal-day--today');
      if (k === state.selectedDate && state.ui.view === 'day') { btn.classList.add('cal-day--selected'); btn.setAttribute('aria-current', 'date'); }
      if (info && k < today && info.done < info.total) btn.classList.add('cal-day--overdue');
      if (dayClosed(k)) btn.classList.add('cal-day--closed');
      const num = document.createElement('span'); num.className = 'cal-day__num'; num.textContent = String(d.getDate());
      btn.appendChild(num);
      const dots = document.createElement('span'); dots.className = 'cal-day__dots';
      if (info) {
        const activeCount = info.total - info.done;
        if (activeCount === 0) { const dot = document.createElement('i'); dot.className = 'cal-day__dot'; dot.style.setProperty('--dot', 'var(--pos)'); dots.appendChild(dot); }
        else for (const c of info.colors) { const dot = document.createElement('i'); dot.className = 'cal-day__dot'; dot.style.setProperty('--dot', `var(--${c})`); dots.appendChild(dot); }
      }
      btn.appendChild(dots);
      const label = [fullLabel(k)];
      if (info) label.push(tp('calInfo', info.total, { d: info.done }));
      btn.setAttribute('aria-label', label.join('. '));
      frag.appendChild(btn);
    }
    els.calGrid.replaceChildren(frag);
  }

  function renderUpnext() {
    if (!els.upnext) return;
    const today = todayKey();
    const items = spaceTasks().filter((x) => !x.done && x.date > today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(0, 5);
    const frag = document.createDocumentFragment();
    if (!items.length) { const p = document.createElement('p'); p.className = 'upnext__empty'; p.textContent = t('upnextEmpty'); frag.appendChild(p); }
    for (const x of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'upnext__item';
      b.dataset.jump = x.date;
      const d = document.createElement('span'); d.className = 'upnext__date'; d.textContent = shortLabel(x.date);
      const tx = document.createElement('span'); tx.className = 'upnext__text'; tx.textContent = x.text;
      b.append(d, tx);
      frag.appendChild(b);
    }
    els.upnext.replaceChildren(frag);
  }

  /* ======================================================================
     Actions — tasks
     ====================================================================== */
  function shakeForm() { els.form.classList.remove('shake'); void els.form.offsetWidth; els.form.classList.add('shake'); }

  function updateAddHint() {
    if (!els.addHint) return;
    const { date, text } = parseSmartDate(els.input.value);
    state.addDate = date && text ? date : null;
    if (state.addDate) {
      els.addHint.textContent = `→ ${relLabel(state.addDate)} · ${fullLabel(state.addDate)}`;
      els.addHint.hidden = false;
    } else {
      els.addHint.hidden = true;
    }
  }

  function addTask(raw) {
    const parsed = parseSmartDate(raw);
    const text = (parsed.date ? parsed.text : raw.trim()).slice(0, MAX_LEN);
    if (!text) { els.input.value = ''; shakeForm(); els.input.focus(); return; }
    const base = state.ui.view === 'day' ? state.selectedDate : todayKey();
    const date = parsed.date || base;
    const task = {
      id: uid(), text, done: false, doneAt: null, createdAt: Date.now(),
      color: state.addColor === 'auto' ? randomColor() : state.addColor,
      date, important: state.addImportant, subtasks: [], repeat: null, seriesId: null, space: curSpace(),
    };
    if (task.important) state.tasks.unshift(task); else state.tasks.push(task);
    els.input.value = '';
    state.addDate = null;
    if (els.addHint) els.addHint.hidden = true;
    state.addImportant = false;
    els.addImportant.setAttribute('aria-pressed', 'false');
    if (state.ui.filter === 'done') state.ui.filter = 'all';
    if (state.query) { state.query = ''; els.search.value = ''; }
    save();
    pendingFocus = { kind: 'input' };
    render('add');
    if (state.ui.view === 'day' && date !== state.selectedDate) toast(t('toastAddedOn', { date: `${relLabel(date)} · ${fullLabel(date)}` }));
    emit('task-added', { task, el: nodeFor(task.id) });
  }

  function toggleTask(id) {
    const x = findTask(id);
    if (!x || leaving.has(id)) return;
    const willHide = (state.ui.filter === 'active' && !x.done) || (state.ui.filter === 'done' && x.done);
    x.done = !x.done;
    x.doneAt = x.done ? Date.now() : null;
    save();
    const li = nodeFor(id);
    const evt = x.done ? 'task-done' : 'task-undone';
    if (willHide && li) {
      const check = li.querySelector('.check');
      li.classList.toggle('done', x.done);
      check.setAttribute('aria-checked', String(x.done));
      check.classList.toggle('just-done', x.done);
      leaving.add(id);
      renderMeta();
      emit(evt, { task: x, el: li });
      setTimeout(() => li.classList.add('leaving'), 160);
      setTimeout(() => { leaving.delete(id); render('toggle'); afterToggle(x); }, 160 + EXIT_MS);
      return;
    }
    render('toggle');
    emit(evt, { task: x, el: nodeFor(id) });
    afterToggle(x);
  }
  function afterToggle(x) {
    const list = tasksOn(x.date);
    const key = x.date;
    if (list.length >= 2 && list.every((y) => y.done)) {
      if (!dayDoneToasted.has(key)) { dayDoneToasted.add(key); toast(t(x.date === todayKey() ? 'toastDayAllDone' : 'toastOtherDayDone')); emit('day-all-done', { date: key }); }
    } else {
      dayDoneToasted.delete(key);
    }
  }

  // Remove tasks with an exit animation and offer undo for a few seconds.
  function removeTasks(ids, msg) {
    const set = new Set(ids.filter((id) => findTask(id) && !leaving.has(id)));
    if (!set.size) return;
    if (state.editingId && set.has(state.editingId)) state.editingId = null;
    for (const id of set) { leaving.add(id); const li = nodeFor(id); if (li) li.classList.add('leaving'); emit('task-deleted', { task: findTask(id), el: li }); }
    setTimeout(() => {
      const removed = [];
      state.tasks.forEach((x, i) => { if (set.has(x.id)) removed.push({ task: x, index: i }); });
      state.tasks = state.tasks.filter((x) => !set.has(x.id));
      for (const id of set) { leaving.delete(id); seenIds.delete(id); seenDone.delete(id); expanded.delete(id); }
      undoRecord = removed;
      save();
      render('delete');
      toast(msg, { action: { label: t('undo'), fn: undoRemove }, ms: UNDO_MS });
    }, EXIT_MS);
  }
  function undoRemove() {
    if (!undoRecord) return;
    const rec = undoRecord;
    undoRecord = null;
    for (const { task, index } of rec) {
      if (findTask(task.id)) continue;
      state.tasks.splice(Math.min(index, state.tasks.length), 0, task);
    }
    save();
    render('undo');
    toast(t('toastRestored'));
  }
  const deleteTask = (id) => removeTasks([id], t('toastDeleted'));
  function clearCompleted() {
    if (flushEdit()) render('flush');
    const scope = state.ui.view === 'day' ? tasksOn(state.selectedDate) : spaceTasks();
    const ids = scope.filter((x) => x.done).map((x) => x.id);
    if (ids.length) removeTasks(ids, tp('cleared', ids.length));
  }

  function toggleImportant(id) {
    const x = findTask(id);
    if (!x) return;
    x.important = !x.important;
    if (x.important) {
      state.tasks = state.tasks.filter((y) => y.id !== id);
      const firstIdx = state.tasks.findIndex((y) => y.date === x.date);
      state.tasks.splice(firstIdx === -1 ? state.tasks.length : firstIdx, 0, x);
    }
    save();
    render('important');
  }
  function toggleSubtasks(id) {
    if (expanded.has(id)) expanded.delete(id);
    else { expanded.add(id); pendingFocus = { kind: 'subadd', id }; }
    render('subtasks');
  }
  function addSubtask(id, raw) {
    const x = findTask(id);
    const text = raw.trim().slice(0, MAX_LEN);
    if (!x || !text) return;
    x.subtasks.push({ id: uid(), text, done: false });
    save();
    pendingFocus = { kind: 'subadd', id };
    render('subadd');
  }
  function toggleSubtask(id, subId) {
    const x = findTask(id);
    const s = x && x.subtasks.find((y) => y.id === subId);
    if (!s) return;
    s.done = !s.done;
    save();
    render('subtoggle');
    if (x.subtasks.length > 1 && x.subtasks.every((y) => y.done) && !x.done) toast(t('toastSubsDone'));
  }
  function deleteSubtask(id, subId) {
    const x = findTask(id);
    if (!x) return;
    x.subtasks = x.subtasks.filter((y) => y.id !== subId);
    save();
    render('subdelete');
  }

  function moveTaskTo(id, key) {
    const x = findTask(id);
    if (!x || !DATE_RE.test(key) || leaving.has(id) || x.date === key) return;
    const apply = () => { x.date = key; save(); render('move'); toast(t('toastMoved', { date: shortLabel(key) })); };
    if (state.ui.view === 'day' && nodeFor(id)) {
      leaving.add(id);
      nodeFor(id).classList.add('leaving');
      setTimeout(() => { leaving.delete(id); apply(); }, EXIT_MS);
    } else {
      apply();
    }
  }
  function moveOverdueToToday() {
    const od = overdueTasks();
    if (!od.length) return;
    const today = todayKey();
    for (const x of od) x.date = today;
    const ids = new Set(od.map((x) => x.id));
    state.tasks = [...od, ...state.tasks.filter((x) => !ids.has(x.id))];
    save();
    if (state.ui.view === 'day') state.selectedDate = today;
    syncMonth();
    render('overdue');
    toast(t('toastMovedToday', { n: od.length }));
  }

  /* ---- Inline editing ------------------------------------------------ */
  function applyEdit(id, value) {
    const x = findTask(id);
    if (!x) return false;
    const text = value.trim().slice(0, MAX_LEN);
    if (!text || text === x.text) return false;
    x.text = text;
    save();
    return true;
  }
  function flushEdit() {
    if (!state.editingId) return false;
    const id = state.editingId;
    const input = els.listWrap.querySelector('.edit-input');
    state.editingId = null;
    if (input) applyEdit(id, input.value);
    return true;
  }
  function startEdit(id) {
    if (leaving.has(id) || !findTask(id) || state.editingId === id) return;
    flushEdit();
    state.editingId = id;
    render('edit');
  }
  function commitEdit(id, value) {
    if (state.editingId !== id) return;
    state.editingId = null;
    applyEdit(id, value);
    render('commit');
  }
  function cancelEdit() {
    if (!state.editingId) return;
    state.editingId = null;
    render('cancel');
  }

  /* ---- Popovers: move to date, repeat ---------------------------------- */
  function popBtn(pop, label, fn, selected) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popover__btn' + (selected ? ' popover__btn--on' : '');
    b.textContent = (selected ? '✓ ' : '') + label;
    b.addEventListener('click', () => { closePopover(); fn(); });
    pop.appendChild(b);
    return b;
  }
  function openMovePopover(anchor, id) {
    const x = findTask(id);
    if (!x) return;
    const today = todayKey();
    openPopover(anchor, (pop) => {
      const title = document.createElement('div'); title.className = 'popover__title eyebrow'; title.textContent = t('popMoveTitle');
      pop.appendChild(title);
      const quick = [[t('today'), today], [t('tomorrow'), addDays(today, 1)], [t('popWeek'), addDays(today, 7)]];
      for (const [label, key] of quick) if (key !== x.date) popBtn(pop, `${label} · ${fullLabel(key)}`, () => moveTaskTo(id, key));
      const row = document.createElement('div'); row.className = 'popover__date';
      const input = document.createElement('input');
      input.type = 'date'; input.className = 'popover__input'; input.value = x.date; input.setAttribute('aria-label', t('popDateAria'));
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'popover__btn'; ok.textContent = t('ok');
      const go = () => { if (input.value && DATE_RE.test(input.value)) { closePopover(); moveTaskTo(id, input.value); } };
      ok.addEventListener('click', go);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      row.append(input, ok);
      pop.appendChild(row);
    });
  }
  function openRepeatPopover(anchor, id) {
    const x = findTask(id);
    if (!x) return;
    openPopover(anchor, (pop) => {
      const title = document.createElement('div'); title.className = 'popover__title eyebrow'; title.textContent = t('repTitle');
      pop.appendChild(title);
      popBtn(pop, t('repDaily'), () => setRepeat(id, 'daily'), x.repeat === 'daily');
      popBtn(pop, t('repWeekdays'), () => setRepeat(id, 'weekdays'), x.repeat === 'weekdays');
      popBtn(pop, t('repWeekly', { day: L().weekdaysFull[weekdayIndex(x.repeat === 'weekly' ? seriesAnchor(x) : x.date)] }), () => setRepeat(id, 'weekly'), x.repeat === 'weekly');
      if (x.repeat) popBtn(pop, t('repOff'), () => setRepeat(id, null), false);
    });
  }

  /* ======================================================================
     Actions — goals, note, navigation
     ====================================================================== */
  function setGoalText(slot, raw) {
    const k = gk(state.selectedDate);
    const list = goalsOn(state.selectedDate).slice();
    const text = raw.trim().slice(0, MAX_LEN);
    const existing = list[slot];
    if (existing) {
      if (!text) list.splice(slot, 1);
      else if (text !== existing.text) existing.text = text;
      else return false;
    } else {
      if (!text) return false;
      list.push({ id: uid(), text, done: false, doneAt: null });
    }
    if (list.length) state.goals[k] = list; else delete state.goals[k];
    save();
    return true;
  }
  function toggleGoal(slot) {
    const k = state.selectedDate;
    const g = goalsOn(k)[slot];
    if (!g) return;
    g.done = !g.done;
    g.doneAt = g.done ? Date.now() : null;
    save();
    render('goal');
    if (dayClosed(k)) {
      if (!dayClosedToasted.has(k)) { dayClosedToasted.add(k); toast(t('toastDayClosed')); emit('day-closed', { date: k }); }
    } else {
      dayClosedToasted.delete(k);
    }
  }
  function setNote(value) {
    const k = els.note.dataset.date || gk(state.selectedDate);
    const v = value.slice(0, 2000);
    if (v.trim()) state.notes[k] = v; else delete state.notes[k];
    els.note.classList.toggle('note--empty', !v.trim());
    clearTimeout(noteTimer);
    noteTimer = setTimeout(save, 300);
  }
  function syncMonth() { state.month = monthOf(state.selectedDate); }

  function selectDate(key, opts = {}) {
    if (!DATE_RE.test(key)) return;
    const from = state.selectedDate;
    if (flushEdit()) render('flush');
    closePopover();
    const dir = key > from ? 'next' : (key < from ? 'prev' : null);
    state.selectedDate = key;
    if (state.ui.view !== 'day') state.ui.view = 'day';
    syncMonth();
    save();
    if (dir && !reducedMotion) {
      els.listWrap.classList.remove('list-wrap--next', 'list-wrap--prev');
      void els.listWrap.offsetWidth;
      els.listWrap.classList.add(dir === 'next' ? 'list-wrap--next' : 'list-wrap--prev');
    }
    if (!contextInline() && !opts.keepContext) closeContext();
    render('day');
    if (from !== key) emit('day-changed', { from, to: key, dir });
  }
  const shiftDay = (n) => selectDate(addDays(state.selectedDate, n), { keepContext: true });
  const goToday = () => selectDate(todayKey(), { keepContext: true });
  function shiftMonth(n) {
    const [y, m] = state.month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    state.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    renderCalendar();
  }
  function setView(v) {
    if (!VIEWS.includes(v) || v === state.ui.view) return;
    if (flushEdit()) render('flush');
    closePopover();
    state.ui.view = v;
    if (v === 'day') state.selectedDate = state.selectedDate || todayKey();
    save();
    render('view');
    emit('view-changed', { view: v });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
  function setFilter(f) {
    if (!FILTERS.includes(f) || f === state.ui.filter) return;
    flushEdit();
    state.ui.filter = f;
    save();
    render('filter');
  }
  function setQuery(q) {
    state.query = q.slice(0, 100);
    render('search');
  }

  /* ---- Spaces: switch / add --------------------------------------------- */
  function setSpace(id) {
    closeSpaceMenu();
    if (!state.spaces.some((s) => s.id === id) || id === curSpace()) return;
    if (flushEdit()) render('flush');
    closePopover();
    state.ui.space = id;
    state.query = '';
    els.search.value = '';
    save();
    render('space');
    emit('space-changed', { space: id });
  }
  function addSpace(rawName) {
    const name = rawName.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!name) return false;
    let id = 's-' + Date.now().toString(36);
    while (state.spaces.some((s) => s.id === id)) id += 'x';
    state.spaces.push({ id, name });
    save();
    setSpace(id);
    toast(t('toastSpaceAdded', { name }));
    return true;
  }
  function openSpaceMenu() {
    if (!els.spaceMenu) return;
    const menu = els.spaceMenu;
    menu.replaceChildren();
    for (const s of state.spaces) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'space__opt';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(s.id === curSpace()));
      const name = document.createElement('span'); name.textContent = spaceName(s);
      const n = state.tasks.filter((x) => spaceOf(x) === s.id && !x.done).length;
      const cnt = document.createElement('span'); cnt.className = 'space__count'; cnt.textContent = n ? String(n) : '';
      b.append(name, cnt);
      b.addEventListener('click', () => setSpace(s.id));
      menu.appendChild(b);
    }
    const form = document.createElement('form');
    form.className = 'space__add';
    form.autocomplete = 'off';
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'space__input'; input.maxLength = 40; input.placeholder = t('spaceNamePh'); input.setAttribute('aria-label', t('spaceAdd'));
    const btn = document.createElement('button'); btn.type = 'submit'; btn.className = 'space__addbtn'; btn.textContent = '+'; btn.setAttribute('aria-label', t('spaceAdd'));
    form.append(input, btn);
    form.addEventListener('submit', (e) => { e.preventDefault(); if (!addSpace(input.value)) input.focus(); });
    menu.appendChild(form);
    menu.hidden = false;
    els.spaceBtn.setAttribute('aria-expanded', 'true');
  }
  function closeSpaceMenu() {
    if (!els.spaceMenu || els.spaceMenu.hidden) return;
    els.spaceMenu.hidden = true;
    els.spaceBtn.setAttribute('aria-expanded', 'false');
  }

  /* ======================================================================
     Drag & drop: reorder in the day list, or drop onto a calendar day
     ====================================================================== */
  function clearDropIndicators() {
    for (const li of els.listWrap.querySelectorAll('.drop-before, .drop-after')) li.classList.remove('drop-before', 'drop-after');
  }
  function clearCalDrop() {
    for (const c of els.calGrid.querySelectorAll('.cal-day--drop')) c.classList.remove('cal-day--drop');
  }
  function nearestTask(y) {
    let best = null; let bestDist = Infinity; let before = false;
    for (const li of els.listWrap.querySelectorAll('.task:not(.dragging)')) {
      const r = li.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const d = Math.abs(y - mid);
      if (d < bestDist) { bestDist = d; best = li; before = y < mid; }
    }
    return best ? { li: best, before } : null;
  }
  function reorderTask(dragId, targetId, before) {
    if (dragId === targetId) return;
    const from = state.tasks.findIndex((x) => x.id === dragId);
    if (from === -1) return;
    const [item] = state.tasks.splice(from, 1);
    let to = state.tasks.findIndex((x) => x.id === targetId);
    if (to === -1) { state.tasks.splice(from, 0, item); return; }
    if (!before) to += 1;
    state.tasks.splice(to, 0, item);
    save();
    render('reorder');
  }
  function endDrag() {
    clearDropIndicators();
    clearCalDrop();
    const li = drag.id ? nodeFor(drag.id) : null;
    if (li) li.classList.remove('dragging');
    els.html.dataset.dragging = '0';
    drag.id = null; drag.overId = null; drag.before = false; drag.calDate = null;
  }

  /* ======================================================================
     Swipe on touch: right = done, left = delete (with undo)
     ====================================================================== */
  const swipe = { el: null, id: null, x0: 0, y0: 0, dx: 0, active: false, pid: null };
  function resetSwipe() {
    if (swipe.el) { swipe.el.classList.remove('card--swiping', 'card--swipe-right', 'card--swipe-left'); swipe.el.style.removeProperty('--swipe'); }
    swipe.el = null; swipe.id = null; swipe.active = false; swipe.pid = null; swipe.dx = 0;
  }
  function bindSwipe() {
    els.listWrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || state.editingId) return;
      const card = e.target.closest('.card');
      if (!card || e.target.closest('button, input, a')) return;
      const li = card.closest('.task');
      if (!li || leaving.has(li.dataset.id)) return;
      swipe.el = card; swipe.id = li.dataset.id; swipe.x0 = e.clientX; swipe.y0 = e.clientY; swipe.dx = 0; swipe.active = false; swipe.pid = e.pointerId;
    });
    els.listWrap.addEventListener('pointermove', (e) => {
      if (!swipe.el || e.pointerId !== swipe.pid) return;
      const dx = e.clientX - swipe.x0;
      const dy = e.clientY - swipe.y0;
      if (!swipe.active) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swipe.active = true;
          swipe.el.classList.add('card--swiping');
          try { swipe.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        } else if (Math.abs(dy) > 12) { resetSwipe(); return; } else return;
      }
      swipe.dx = Math.max(-140, Math.min(140, dx));
      swipe.el.style.setProperty('--swipe', swipe.dx + 'px');
      swipe.el.classList.toggle('card--swipe-right', swipe.dx > 70);
      swipe.el.classList.toggle('card--swipe-left', swipe.dx < -70);
    });
    const end = (e) => {
      if (!swipe.el || (e && e.pointerId !== swipe.pid)) return;
      const { id, dx, active } = swipe;
      resetSwipe();
      if (!active) return;
      if (dx > 80) toggleTask(id);
      else if (dx < -80) deleteTask(id);
    };
    els.listWrap.addEventListener('pointerup', end);
    els.listWrap.addEventListener('pointercancel', () => resetSwipe());
  }

  /* ======================================================================
     Events
     ====================================================================== */
  function bindEvents() {
    for (const b of els.navLinks) {
      b.addEventListener('click', () => {
        if (b.dataset.nav === 'calendar') { toggleContext(); return; }
        if (b.dataset.nav === 'day' && state.ui.view === 'day') { goToday(); return; }
        setView(b.dataset.nav);
      });
    }
    els.themeBtn.addEventListener('click', toggleTheme);
    for (const b of els.layoutBtns) b.addEventListener('click', () => setLayout(b.dataset.layout));
    for (const b of els.langBtns) b.addEventListener('click', () => setLang(b.dataset.lang));
    if (els.langBtn) {
      els.langBtn.addEventListener('click', () => { if (els.langMenu.hidden) openLangMenu(); else closeLangMenu(); });
      for (const o of els.langOpts) o.addEventListener('click', () => setLang(o.dataset.lang));
      document.addEventListener('pointerdown', (e) => { if (!els.lang.contains(e.target)) closeLangMenu(); }, true);
      els.lang.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeLangMenu(); els.langBtn.focus(); } });
    }
    if (els.contextClose) els.contextClose.addEventListener('click', closeContext);
    window.addEventListener('resize', () => { if (contextInline()) closeContext(); });
    if (els.spaceBtn) {
      els.spaceBtn.addEventListener('click', () => { if (els.spaceMenu.hidden) openSpaceMenu(); else closeSpaceMenu(); });
      document.addEventListener('pointerdown', (e) => { if (!els.space.contains(e.target)) closeSpaceMenu(); }, true);
      els.space.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeSpaceMenu(); els.spaceBtn.focus(); } });
    }

    els.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => setQuery(els.search.value), 120); });
    els.search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); els.search.value = ''; setQuery(''); els.search.blur(); } });
    els.searchClear.addEventListener('click', () => { els.search.value = ''; setQuery(''); els.search.focus(); });

    els.calGrid.addEventListener('click', (e) => { const btn = e.target.closest('.cal-day'); if (btn) selectDate(btn.dataset.date); });
    for (const b of $$('.cal-nav')) b.addEventListener('click', () => shiftMonth(b.dataset.cal === 'next' ? 1 : -1));
    els.calToday.addEventListener('click', () => selectDate(todayKey()));
    if (els.upnext) els.upnext.addEventListener('click', (e) => { const b = e.target.closest('[data-jump]'); if (b) selectDate(b.dataset.jump); });

    for (const b of $$('.date-nav')) b.addEventListener('click', () => shiftDay(b.dataset.day === 'next' ? 1 : -1));
    els.dateToday.addEventListener('click', goToday);

    els.bannerMove.addEventListener('click', moveOverdueToToday);
    els.bannerShow.addEventListener('click', () => setView('all'));

    els.goalsList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-goal-action="toggle"]');
      if (!btn || btn.disabled) return;
      toggleGoal(Number(btn.closest('.goal').dataset.slot));
    });
    els.goalsList.addEventListener('change', (e) => {
      const input = e.target.closest('[data-goal-action="text"]');
      if (!input) return;
      if (setGoalText(Number(input.closest('.goal').dataset.slot), input.value)) render('goaltext');
    });
    els.goalsList.addEventListener('keydown', (e) => {
      const input = e.target.closest('[data-goal-action="text"]');
      if (!input || e.isComposing) return;
      const slot = Number(input.closest('.goal').dataset.slot);
      if (e.key === 'Enter') {
        e.preventDefault();
        setGoalText(slot, input.value);
        pendingFocus = { kind: 'goal', slot: Math.min(slot + 1, MAX_GOALS - 1) };
        render('goaltext');
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        const g = goalsOn(state.selectedDate)[slot];
        input.value = g ? g.text : '';
        input.blur();
      }
    });

    els.note.addEventListener('input', () => { autoGrow(els.note); setNote(els.note.value); });
    els.note.addEventListener('focus', () => { els.note.classList.remove('note--empty'); autoGrow(els.note); });
    els.note.addEventListener('blur', () => { clearTimeout(noteTimer); save(); els.note.classList.toggle('note--empty', !els.note.value.trim()); autoGrow(els.note); });

    els.form.addEventListener('submit', (e) => { e.preventDefault(); addTask(els.input.value); });
    els.form.addEventListener('animationend', () => els.form.classList.remove('shake'));
    els.input.addEventListener('input', updateAddHint);
    for (const sw of els.swatches) {
      sw.addEventListener('click', () => {
        state.addColor = sw.dataset.color;
        for (const s of els.swatches) s.setAttribute('aria-checked', String(s === sw));
        els.input.focus();
      });
    }
    els.addImportant.addEventListener('click', () => {
      state.addImportant = !state.addImportant;
      els.addImportant.setAttribute('aria-pressed', String(state.addImportant));
      els.input.focus();
    });

    for (const btn of els.filters) btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    els.clearBtn.addEventListener('click', clearCompleted);
    els.historyList.addEventListener('click', (e) => { const b = e.target.closest('[data-jump]'); if (b) selectDate(b.dataset.jump); });

    els.listWrap.addEventListener('mousedown', (e) => {
      if (!state.editingId) return;
      if (e.target.closest('button, .text')) e.preventDefault();
    });
    els.listWrap.addEventListener('click', (e) => {
      const jump = e.target.closest('[data-jump]');
      if (jump) { selectDate(jump.dataset.jump); return; }
      const subBtn = e.target.closest('[data-sub-action]');
      if (subBtn) {
        const li = subBtn.closest('.task');
        const row = subBtn.closest('.sub');
        if (!li || !row) return;
        if (subBtn.dataset.subAction === 'toggle') toggleSubtask(li.dataset.id, row.dataset.subId);
        else if (subBtn.dataset.subAction === 'delete') deleteSubtask(li.dataset.id, row.dataset.subId);
        return;
      }
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const li = btn.closest('.task');
      if (!li) return;
      const id = li.dataset.id;
      if (flushEdit()) render('flush');
      switch (btn.dataset.action) {
        case 'toggle': toggleTask(id); break;
        case 'edit': startEdit(id); break;
        case 'delete': deleteTask(id); break;
        case 'important': toggleImportant(id); break;
        case 'subtasks': toggleSubtasks(id); break;
        case 'repeat': { const node = nodeFor(id); if (node) openRepeatPopover(node.querySelector('[data-action="repeat"]'), id); break; }
        case 'move': { const node = nodeFor(id); if (node) openMovePopover(node.querySelector('[data-action="move"]'), id); break; }
      }
    });
    els.listWrap.addEventListener('submit', (e) => {
      const form = e.target.closest('.subs__add');
      if (!form) return;
      e.preventDefault();
      const li = form.closest('.task');
      addSubtask(li.dataset.id, form.querySelector('.subs__input').value);
    });
    els.listWrap.addEventListener('dblclick', (e) => {
      const text = e.target.closest('.text');
      if (!text) return;
      const li = text.closest('.task');
      if (li) startEdit(li.dataset.id);
    });
    els.listWrap.addEventListener('keydown', (e) => {
      const input = e.target.closest('.edit-input');
      if (!input || e.isComposing) return;
      const li = input.closest('.task');
      const id = li ? li.dataset.id : null;
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(id, input.value); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
    });
    els.listWrap.addEventListener('focusout', (e) => {
      const input = e.target && e.target.closest ? e.target.closest('.edit-input') : null;
      if (!input) return;
      const li = input.closest('.task');
      const id = li ? li.dataset.id : null;
      if (state.editingId !== id) return;
      commitEdit(id, input.value);
    });

    // Drag & drop
    els.listWrap.addEventListener('dragstart', (e) => {
      const li = e.target.closest ? e.target.closest('.task') : null;
      if (!li || state.editingId || leaving.has(li.dataset.id) || state.ui.view !== 'day' || state.query.trim()) { e.preventDefault(); return; }
      drag.id = li.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', drag.id); } catch { /* ignore */ }
      els.html.dataset.dragging = '1';
      requestAnimationFrame(() => { if (drag.id === li.dataset.id) li.classList.add('dragging'); });
    });
    els.app.addEventListener('dragover', (e) => {
      if (!drag.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const cal = e.target.closest ? e.target.closest('.cal-day') : null;
      clearCalDrop();
      clearDropIndicators();
      if (cal) { cal.classList.add('cal-day--drop'); drag.calDate = cal.dataset.date; drag.overId = null; return; }
      drag.calDate = null;
      if (!els.listWrap.contains(e.target)) { drag.overId = null; return; }
      const hit = nearestTask(e.clientY);
      if (!hit) { drag.overId = null; return; }
      const draggingLi = nodeFor(drag.id);
      const noop = draggingLi && ((hit.before && hit.li.previousElementSibling === draggingLi) || (!hit.before && hit.li.nextElementSibling === draggingLi));
      drag.overId = hit.li.dataset.id;
      drag.before = hit.before;
      if (!noop) hit.li.classList.add(hit.before ? 'drop-before' : 'drop-after');
    });
    els.app.addEventListener('dragleave', (e) => {
      if (!drag.id) return;
      if (!e.relatedTarget || !els.app.contains(e.relatedTarget)) { clearDropIndicators(); clearCalDrop(); }
    });
    els.app.addEventListener('drop', (e) => {
      if (!drag.id) return;
      e.preventDefault();
      const { id, overId, before, calDate } = drag;
      endDrag();
      if (calDate) moveTaskTo(id, calDate);
      else if (overId) reorderTask(id, overId, before);
    });
    els.listWrap.addEventListener('dragend', endDrag);
    bindSwipe();

    document.addEventListener('keydown', (e) => {
      const tgt = e.target;
      const typing = tgt instanceof HTMLElement && (tgt.matches('input, textarea, select') || tgt.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      const isK = e.code === 'KeyK' || key === 'k' || key === 'л';
      const isZ = e.code === 'KeyZ' || key === 'z' || key === 'я';
      if (mod && !e.shiftKey && !e.altKey && isK) { e.preventDefault(); els.search.focus(); els.search.select(); return; }
      if (mod && !e.shiftKey && !e.altKey && isZ && !typing && undoRecord) { e.preventDefault(); undoRemove(); return; }
      if (e.key === '/' && !typing && !mod && !e.altKey) {
        e.preventDefault();
        if (state.ui.view === 'history') els.search.focus(); else { els.input.focus(); els.input.select(); }
        return;
      }
      if (e.key === 'Escape') {
        if (!els.popover.hidden) { closePopover(); return; }
        if (state.editingId) { cancelEdit(); return; }
        if (els.context.classList.contains('context--open')) { closeContext(); return; }
        if (tgt === els.input && els.input.value) { els.input.value = ''; updateAddHint(); }
        return;
      }
      if (typing || mod || e.altKey) return;
      if (e.code === 'BracketLeft' || e.key === '[') { e.preventDefault(); if (state.ui.view === 'day') shiftDay(-1); }
      else if (e.code === 'BracketRight' || e.key === ']') { e.preventDefault(); if (state.ui.view === 'day') shiftDay(1); }
      else if (!e.shiftKey && (e.code === 'KeyT' || key === 't' || key === 'е')) { e.preventDefault(); goToday(); }
      else if (e.shiftKey && (e.code === 'KeyD' || key === 'd' || key === 'в')) { e.preventDefault(); toggleTheme(); }
      else if (e.key === '1') setView('day');
      else if (e.key === '2') setView('all');
      else if (e.key === '3') setView('history');
    });

    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const loaded = load();
      if (loaded) {
        state.tasks = loaded.tasks; state.goals = loaded.goals; state.notes = loaded.notes; state.spaces = loaded.spaces;
        state.ui = { ...state.ui, ...loaded.ui };
        applyStatic(); applyTheme(); applyLayout();
        render('storage');
      }
    });

    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      setTimeout(() => { materializeRecurring(); render('midnight'); scheduleMidnight(); }, next - now);
    };
    scheduleMidnight();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && materializeRecurring()) render('recurring'); });
  }

  /* ======================================================================
     Init
     ====================================================================== */
  function init() {
    state.selectedDate = todayKey();
    syncMonth();
    const loaded = load();
    if (loaded === null) { if (/[?&]demo\b/.test(location.search)) seed(); save(); } // clean first start; ?demo shows sample data
    else { state.tasks = loaded.tasks; state.goals = loaded.goals; state.notes = loaded.notes; state.ui = loaded.ui; state.spaces = loaded.spaces; }
    state.ui.layout = 'dash'; // this variant has a single layout
    materializeRecurring();
    applyStatic();
    applyTheme();
    applyLayout();
    for (const s of els.swatches) s.setAttribute('aria-checked', String(s.dataset.color === state.addColor));
    bindEvents();
    render('init');
    emit('ready', {});
  }

  window.CalmApp = {
    get state() { return state; },
    todayKey, keyOf, parseKey, addDays, fullLabel, shortLabel, relLabel, toast, render, selectDate, setView, setLang, t, parseSmartDate, setRepeat, undoRemove, setSpace, addSpace,
  };

  init();
})();
