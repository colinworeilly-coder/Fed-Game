/*
 * Long and Variable: user interface
 */
(function () {
  'use strict';
  var M = window.FedModel, News = window.FedNews, C = window.FedCharts;
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    game: null,
    setting: 4,          // rate the player is about to choose
    opts: {},            // options used to create the current game
    demoTimer: null,
    ended: false
  };

  /* ------------------------------ helpers ------------------------------ */
  function f(x, d) { if (x < 0 && x > -0.005) x = 0; return x.toFixed(d === undefined ? 1 : d); }
  function signed(x, d) {
    var s = f(x, d);
    if (Number(s) === 0) return '\u00B10.0';
    return (Number(s) > 0 ? '+' : '') + s;
  }

  function qLabel(p, t) {
    // t: index into hist. Game quarters start at index p.history.
    var gq = t - p.history + 1;
    if (gq <= 0) {
      var back = 1 - gq; // 1 = last quarter before the term
      return { year: 0, q: 5 - back, text: back === 1 ? 'Quarter before your term' : back + ' quarters before your term' };
    }
    var year = Math.floor((gq - 1) / 4) + 1, q = ((gq - 1) % 4) + 1;
    return { year: year, q: q, text: 'Year ' + year + ', Q' + q };
  }

  function readParams() {
    var q = new URLSearchParams(location.search);
    var o = {};
    if (q.get('scenario')) o.scenario = q.get('scenario');
    if (q.get('seed')) o.seed = parseInt(q.get('seed'), 10);
    if (q.get('onset')) o.onset = parseInt(q.get('onset'), 10);
    var params = {};
    if (q.get('quarters')) params.quarters = clampInt(q.get('quarters'), 8, 40);
    if (q.get('ustar')) params.uStar = parseFloat(q.get('ustar'));
    if (q.get('gbar')) params.gBar = parseFloat(q.get('gbar'));
    if (q.get('qe') === '0') params.qe = false;
    if (q.get('cred') !== null && !isNaN(parseFloat(q.get('cred')))) params.cred0 = Math.max(0, Math.min(100, parseFloat(q.get('cred')))) / 100;
    if (q.get('lags') !== null) params.lags = clampInt(q.get('lags'), 0, M.LAG_PRESETS.length - 1);
    o.params = params;
    o.demo = q.get('demo') === '1';
    return o;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // Plain-language description of the policy-lag setting.
  function lagText(p) {
    var s = M.lagSummary(p);
    var speed = 'Half of a rate change is felt after about ' + plural(s.half, 'quarter') +
      ', and 90% after about ' + plural(s.most, 'quarter') + '.';
    var vary = p.lagVar <= 0 ? ' The timing is predictable.'
      : ' The timing is uncertain: some quarters policy bites faster, some slower' +
        (p.lagVar >= 0.7 ? ', by a wide margin.' : p.lagVar >= 0.5 ? ', often by a lot.' : '.');
    return { name: M.LAG_PRESETS[p.lags].name, speed: speed, vary: vary, all: speed + vary };
  }

  // Plain-language description of a starting credibility level (0..1).
  function credText(c, p) {
    var pct = Math.round(c * 100);
    var pull = p.anchor * c;
    var first;
    if (pct === 0) first = 'Expectations simply follow past inflation; nothing pulls them back toward 2% until the Fed earns credibility.';
    else if (pct === 100) first = 'Expectations are firmly anchored: each quarter about ' + Math.round(pull * 100) + '% of any gap between expected inflation and 2% closes on its own.';
    else first = 'Expectations are partly anchored: each quarter about ' + (Math.round(pull * 1000) / 10) + '% of any gap between expected inflation and 2% closes on its own (' + Math.round(p.anchor * 100) + '% at full credibility).';
    var rebuild = pct >= 100 ? '' : ' Credibility rises 3 points a quarter while inflation stays within 1 point of 2%, so reaching 100% takes ' + plural(Math.ceil((100 - pct) / 3), 'quarter') + '.';
    return first + rebuild;
  }

  function clampInt(v, lo, hi) { v = parseInt(v, 10); return isNaN(v) ? undefined : Math.max(lo, Math.min(hi, v)); }

  /* ----------------------------- new game ----------------------------- */
  function newGame(opts) {
    stopDemo();
    opts = opts || {};
    state.opts = opts;
    state.game = new M.Game({ seed: opts.seed, scenario: opts.scenario || 'random', onset: opts.onset, params: opts.params });
    state.setting = state.game.last().set;
    state.ended = false;
    $('dlgEnd').open && $('dlgEnd').close();
    var p = state.game.p;
    document.querySelectorAll('.goalPi').forEach(function (n) { n.textContent = f(p.piStar, 0) + '%'; });
    document.querySelectorAll('.goalU').forEach(function (n) { n.textContent = f(p.uStar, 1) + '%'; });
    document.querySelectorAll('.neutralI').forEach(function (n) { n.textContent = f(p.rStar + p.piStar, 0) + '%'; });
    $('noteGoalPi').textContent = f(p.piStar, 0) + '%';
    $('noteGoalU').textContent = f(p.uStar, 1) + '%';
    var lt = lagText(p);
    $('lagHelp').textContent = lt.all;
    $('lagNote').hidden = p.lags === M.DEFAULTS.lags;
    $('lagNote').textContent = 'Policy lags: ' + lt.name.toLowerCase() + '. ' + lt.speed;
    var head = 'New Fed chair takes office as the economy grows at a steady pace';
    var doubt = '';
    if (p.cred0 < 0.4) {
      head = 'New Fed chair takes office as markets doubt the Fed\'s commitment to 2% inflation';
      doubt = ' After years of broken promises, few believe inflation will stay at 2%.';
    } else if (p.cred0 < 0.75) {
      head = 'New Fed chair takes office facing questions about the Fed\'s inflation record';
      doubt = ' Some investors question whether the Fed will keep inflation at 2%.';
    }
    setNews({
      head: head,
      deck: 'Inflation is ' + f(state.game.last().pi) + '% and unemployment is ' + f(state.game.last().u) + '%.' + doubt + ' Markets wait for the new chair\'s first decision on the funds rate, now ' + f(state.game.last().i, 2) + '%.'
    }, 'Before your term');
    buildPips();
    renderAll();
    if (opts.demo) startDemo();
  }

  /* ------------------------------ playing ------------------------------ */
  function playQuarter() {
    var g = state.game;
    if (!g || g.done()) return;
    g.play(state.setting);
    var t = g.hist.length - 1;
    setNews(News.headline(g, t), qLabel(g.p, t).text);
    renderAll();
    if (g.done()) {
      state.ended = true;
      stopDemo();
      setTimeout(showEnd, 500);
    }
  }

  function nudge(dir) {
    var g = state.game; if (!g || g.done()) return;
    var p = g.p, lo = p.qe ? -p.qeMax : 0;
    state.setting = Math.max(lo, Math.min(p.iMax, M.roundStep(state.setting + dir * p.step, p.step)));
    renderDecision();
  }

  /* ------------------------------ rendering ------------------------------ */
  function renderAll() {
    renderTerm();
    renderDecision();
    renderTiles();
    renderCharts();
    renderTable();
  }

  function buildPips() {
    var ol = $('pips'); ol.textContent = '';
    for (var q = 1; q <= state.game.p.quarters; q++) {
      var li = document.createElement('li');
      if (q > 1 && (q - 1) % 4 === 0) li.className = 'year';
      ol.appendChild(li);
    }
  }

  function renderTerm() {
    var g = state.game, p = g.p, played = g.quarter();
    var lis = $('pips').children;
    for (var i = 0; i < lis.length; i++) {
      lis[i].classList.toggle('done', i < played);
      lis[i].classList.toggle('now', i === played && !g.done());
    }
    var nextLab = qLabel(p, g.hist.length);
    $('termLabel').textContent = g.done() ? 'Term complete' : nextLab.text;
    var left = p.quarters - played;
    $('termLeft').textContent = g.done() ? '' : left + (left === 1 ? ' quarter left' : ' quarters left');
    $('decideTitle').textContent = g.done() ? 'Your term is over' : 'Your decision for ' + nextLab.text;
    $('statsQ').textContent = qLabel(p, g.hist.length - 1).text.replace('Quarter before your term', 'before your term');
  }

  function renderDecision() {
    var g = state.game, p = g.p, cur = g.last().set, s = state.setting;
    var out = $('rateOut'), sub = $('rateSub'), d = s - cur, txt;
    var same = Math.abs(d) < 1e-9;
    if (s < 0) {
      var rounds = Math.round(-s / p.step);
      out.textContent = '0.00%';
      txt = 'plus QE: ' + rounds + (rounds === 1 ? ' round' : ' rounds') + ' of bond buying' + (same ? ' (unchanged)' : '');
    } else {
      out.textContent = f(s, 2) + '%';
      if (cur < 0) txt = s === 0 ? 'End QE; the rate stays at zero' : 'End QE and raise the rate';
      else if (same) txt = 'Hold at current rate';
      else txt = (d > 0 ? 'Raise by ' : 'Cut by ') + f(Math.abs(d), 2) + ' points';
    }
    sub.textContent = txt;
    sub.className = 'rate-sub' + (d > 1e-9 ? ' up' : d < -1e-9 ? ' down' : '');
    var done = g.done();
    // Zero lower bound: the next cut is QE, so flag the button (and the
    // readout once QE is selected) in red.
    var atZlb = p.qe && s <= 0 && !done;
    $('btnCut').classList.toggle('qe', atZlb);
    $('btnCut').title = atZlb ? 'The funds rate is at zero. Pressing this adds a round of quantitative easing.' : '';
    out.parentNode.classList.toggle('qe', s < 0);
    $('btnGo').disabled = done || !!state.demoTimer;
    $('btnCut').disabled = done || s <= (p.qe ? -p.qeMax : 0);
    $('btnRaise').disabled = done || s >= p.iMax;
    $('btnCut').querySelector('small').textContent = (s <= 0 && p.qe) ? 'QE' : 'Cut';
    $('btnCut').setAttribute('aria-label', (s <= 0 && p.qe) ? 'Add a round of quantitative easing' : 'Cut the rate by a quarter point');
    $('btnGo').textContent = done ? 'Term complete' : state.demoTimer ? 'Demo running\u2026' :
      (same ? 'Hold the rate and run the quarter' : 'Set rate and run the quarter');
  }

  var ICON = {
    good: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 5v2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    crit: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 3.4v3M6 8.4v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  function chipFor(gap, unit) {
    var a = Math.abs(gap);
    var cls = a < 0.5 ? 'good' : a < 1.5 ? 'warn' : 'crit';
    var txt = a < 0.5 ? 'On target' : f(a) + ' ' + (gap > 0 ? 'above' : 'below') + ' ' + unit;
    return { cls: cls, html: ICON[cls], text: txt };
  }

  function tile(dl, opt) {
    var d = document.createElement('div'); d.className = 'tile' + (opt.minor ? ' minor' : '');
    var dt = document.createElement('dt');
    if (opt.color) { var sw = document.createElement('span'); sw.className = 'swatch'; sw.style.borderColor = 'var(' + opt.color + ')'; dt.appendChild(sw); }
    dt.appendChild(document.createTextNode(opt.label));
    var dd = document.createElement('dd');
    var v = document.createElement('span'); v.className = 'v'; v.textContent = opt.value; dd.appendChild(v);
    if (opt.delta !== undefined) { var dl2 = document.createElement('span'); dl2.className = 'dlt'; dl2.textContent = opt.delta; dd.appendChild(dl2); }
    d.appendChild(dt); d.appendChild(dd);
    if (opt.chip) {
      var c = document.createElement('span'); c.className = 'chip ' + opt.chip.cls;
      c.innerHTML = opt.chip.html; c.appendChild(document.createTextNode(opt.chip.text));
      d.appendChild(c);
    }
    dl.appendChild(d);
  }

  function renderTiles() {
    var g = state.game, p = g.p, r = g.last(), prev = g.hist[g.hist.length - 2];
    var dl = $('tiles'); dl.textContent = '';
    tile(dl, { label: 'Inflation', color: '--pi', value: f(r.pi) + '%', delta: prev ? signed(r.pi - prev.pi) : undefined, chip: chipFor(r.pi - p.piStar, 'goal') });
    tile(dl, { label: 'Unemployment', color: '--u', value: f(r.u) + '%', delta: prev ? signed(r.u - prev.u) : undefined, chip: chipFor(r.u - p.uStar, 'natural') });
    tile(dl, { label: 'Real GDP growth', value: f(r.g) + '%', delta: 'Solow rate ' + f(p.gBar) + '%', minor: true });
    tile(dl, { label: 'Fed funds rate', color: '--i', value: f(r.i, 2) + '%', delta: r.qe > 0 ? '+ QE' : undefined, minor: true });
    tile(dl, { label: 'Expected inflation', value: f(r.EeNext) + '%', delta: 'for next quarter', minor: true });
    tile(dl, { label: 'Real interest rate', value: f(r.r) + '%', delta: 'neutral ' + f(p.rStar) + '%', minor: true });
    var pct = Math.round(r.cred * 100);
    $('credVal').textContent = pct + '%';
    $('credBar').style.width = pct + '%';
  }

  function renderCharts() {
    var g = state.game, p = g.p;
    var n = p.history + p.quarters;
    var labels = [];
    for (var t = 0; t < n; t++) labels.push(qLabel(p, t));
    var data = g.hist.map(function (h) { return { pi: h.pi, u: h.u, i: h.i, qe: h.qe, iEff: h.iEff, g: h.g }; });
    var shock = null;
    if (g.done() && g.scenarioKey !== 'none') shock = { index: p.history + g.onset - 1, name: g.scenario.name };
    C.timeSeries($('tsChart'), { n: n, historyLen: p.history, labels: labels, data: data, goalPi: p.piStar, goalU: p.uStar, shock: shock });

    var cur = g.last(), prev = g.hist[g.hist.length - 2];
    var pack = function (h) { return { S: h.S, Ee: h.Ee, gStar: h.gStar, c: h.c, g: h.g, pi: h.pi }; };
    var trail = g.hist.slice(-6).map(function (h) { return { g: h.g, pi: h.pi }; });
    C.adas($('adasChart'), { cur: pack(cur), prev: prev ? pack(prev) : null, trail: trail, kappa: p.kappa, goal: { g: p.gBar, pi: p.piStar } });
    renderCurves(cur, prev);
  }

  function renderCurves(cur, prev) {
    var p = state.game.p;
    var dl = $('curves'); dl.textContent = '';
    function row(cls, name, html) {
      var d = document.createElement('div');
      var dt = document.createElement('dt'); dt.className = cls; dt.textContent = name;
      var dd = document.createElement('dd'); dd.innerHTML = html;
      d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    }
    row('ad', 'AD', 'Spending growth <i>M&#771;</i> + <i>v&#771;</i> = <b>' + f(cur.S) + '%</b>' + (prev ? ' (' + signed(cur.S - prev.S) + ')' : ''));
    row('sras', 'SRAS', 'Drawn for expected inflation E(&pi;) = <b>' + f(cur.Ee) + '%</b>' + (prev ? ' (' + signed(cur.Ee - prev.Ee) + ')' : ''));
    row('lras', 'LRAS', 'Solow growth rate = <b>' + f(cur.gStar) + '%</b>' + (prev ? ' (' + signed(cur.gStar - prev.gStar) + ')' : ''));
    $('shiftNote').textContent = describeShift(cur, prev, p);
  }

  function describeShift(cur, prev, p) {
    if (!prev) return 'The economy starts close to the goal point, where AD crosses LRAS at 2% inflation.';
    var parts = [];
    var dS = cur.S - prev.S, dZ = cur.gStar - prev.gStar, dE = cur.Ee - prev.Ee;
    if (Math.abs(dS) >= 0.4) parts.push('AD shifted ' + (dS > 0 ? 'right' : 'left') + ' as spending growth ' + (dS > 0 ? 'rose' : 'fell') + ' by ' + f(Math.abs(dS)) + ' points.');
    if (Math.abs(dZ) >= 0.6) parts.push('LRAS shifted ' + (dZ > 0 ? 'right' : 'left') + ': a real shock ' + (dZ > 0 ? 'raised' : 'lowered') + ' the Solow growth rate to ' + f(cur.gStar) + '%.');
    if (Math.abs(dE) >= 0.15) parts.push('SRAS shifted ' + (dE > 0 ? 'up' : 'down') + ' because expected inflation ' + (dE > 0 ? 'rose' : 'fell') + ' to ' + f(cur.Ee) + '%.');
    if (Math.abs(cur.c) >= 0.8) parts.push('Higher costs pushed SRAS ' + (cur.c > 0 ? 'up' : 'down') + ' this quarter.');
    if (!parts.length) parts.push('The curves barely moved this quarter.');
    var gap = cur.g - cur.gStar;
    if (gap > 0.5) parts.push('Growth is above the Solow rate, so inflation is running above expectations.');
    else if (gap < -0.5) parts.push('Growth is below the Solow rate, so inflation is running below expectations.');
    return parts.join(' ');
  }

  function renderTable() {
    var g = state.game, p = g.p, tb = $('dataTable').tBodies[0];
    tb.textContent = '';
    g.hist.forEach(function (h, t) {
      var tr = document.createElement('tr');
      if (t < p.history) tr.className = 'pre';
      var cells = [qLabel(p, t).text, f(h.i, 2) + (h.qe > 0 ? ' + QE' : ''), f(h.pi, 2), f(h.u, 2), f(h.g, 2), f(h.Ee, 2), f(h.r, 2), f(h.S, 2)];
      cells.forEach(function (c, j) {
        var td = document.createElement(j === 0 ? 'th' : 'td');
        if (j === 0) td.scope = 'row';
        td.textContent = c; tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }

  function setNews(n, when) {
    $('newsHead').textContent = n.head;
    $('newsDeck').textContent = n.deck;
    $('newsDate').textContent = when;
    var band = document.querySelector('.news');
    band.classList.remove('flash'); void band.offsetWidth; band.classList.add('flash');
  }

  /* ------------------------------ end of game ------------------------------ */
  function showEnd() {
    var g = state.game, p = g.p;
    var you = g.played(), taylor = g.counterfactual('taylor').slice(p.history), hold = g.counterfactual('hold').slice(p.history);
    var s = M.score(p, you), sT = M.score(p, taylor), sH = M.score(p, hold);
    var v = s.verdict;
    $('endGrade').textContent = v.grade;
    $('endGrade').classList.toggle('bad', !v.ok);
    $('endTitle').textContent = v.title;
    var parts = ['Over your term, inflation averaged ' + f(avg(you, 'pi')) + '% and unemployment ' + f(avg(you, 'u')) + '%.',
      'Your distance from the goals was ' + f(s.dist, 2) + ' points.'];
    parts.push('Fed credibility started at ' + Math.round(p.cred0 * 100) + '% and ended at ' + Math.round(g.last().cred * 100) + '%.');
    if (p.lags !== M.DEFAULTS.lags) parts.push('Policy lags in this game: ' + lagText(p).name.toLowerCase() + '.');
    parts.push(v.ok ? 'The President is pleased and sends your name to the Senate for another term.'
      : 'The President has decided to nominate someone else.');
    $('endSummary').textContent = parts.join(' ');
    var sc = g.scenario;
    $('shockName').textContent = sc.name + (g.scenarioKey !== 'none' ? ' (hit in ' + qLabel(p, p.history + g.onset - 1).text + ')' : '');
    $('shockKind').textContent = sc.kind + ': ' + sc.curve + '.';
    $('shockBlurb').textContent = sc.blurb;
    $('shockLesson').textContent = sc.lesson;

    var labels = you.map(function (_, i) { return qLabel(p, p.history + i).text; });
    var cmp = $('compare'); cmp.textContent = '';
    [['pi', 'Inflation', p.piStar], ['u', 'Unemployment', p.uStar], ['i', 'Fed funds rate', null]].forEach(function (spec) {
      var fig = document.createElement('figure');
      var cap = document.createElement('figcaption'); cap.textContent = spec[1] + ' (%)';
      var box = document.createElement('div'); box.className = 'chart';
      fig.appendChild(cap); fig.appendChild(box); cmp.appendChild(fig);
      fig._spec = spec;
    });
    var dlg = $('dlgEnd');
    if (!dlg.open) dlg.showModal();
    Array.prototype.forEach.call(cmp.children, function (fig) {
      var spec = fig._spec;
      C.compare(fig.querySelector('.chart'), { title: spec[1], key: spec[0], goal: spec[2], runs: { you: you, taylor: taylor, hold: hold }, labels: labels });
    });

    var tbl = $('scoreTable'); tbl.textContent = '';
    var head = tbl.createTHead().insertRow();
    ['Policy', 'Distance from goals', 'Inflation gap (RMS)', 'Unemployment gap (RMS)', 'Peak inflation', 'Peak unemployment', 'Grade'].forEach(function (h) {
      var th = document.createElement('th'); th.scope = 'col'; th.textContent = h; head.appendChild(th);
    });
    var body = tbl.createTBody();
    var best = Math.min(s.dist, sT.dist, sH.dist);
    [['Your policy', s, you], ['Taylor rule', sT, taylor], ['Never change the rate', sH, hold]].forEach(function (row) {
      var tr = body.insertRow();
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = row[0]; tr.appendChild(th);
      var sc2 = row[1], recs = row[2];
      var cells = [f(sc2.dist, 2), f(sc2.rmsPi, 2), f(sc2.rmsU, 2), f(max(recs, 'pi')) + '%', f(max(recs, 'u')) + '%', sc2.verdict.grade];
      cells.forEach(function (c, j) { var td = tr.insertCell(); td.textContent = c; if (j === 0 && sc2.dist === best) td.className = 'best'; });
    });
    renderCharts();
  }
  function avg(a, k) { return a.reduce(function (s, r) { return s + r[k]; }, 0) / a.length; }
  function max(a, k) { return Math.max.apply(null, a.map(function (r) { return r[k]; })); }

  /* ------------------------------ demo mode ------------------------------ */
  function startDemo() {
    stopDemo();
    state.demoTimer = setInterval(function () {
      if (!state.game || state.game.done()) { stopDemo(); return; }
      state.setting = state.game.last().set;
      playQuarter();
    }, 2200);
    renderDecision();
  }
  function stopDemo() {
    if (state.demoTimer) { clearInterval(state.demoTimer); state.demoTimer = null; }
    if (state.game) renderDecision();
  }

  /* ------------------------------ data export ------------------------------ */
  function tableRows() {
    var g = state.game, p = g.p;
    var rows = [['Quarter', 'Fed funds rate', 'QE (rate equivalent)', 'Inflation', 'Unemployment', 'Real GDP growth', 'Expected inflation', 'Real rate', 'Spending growth', 'Solow growth rate', 'Credibility']];
    g.hist.forEach(function (h, t) {
      rows.push([qLabel(p, t).text, f(h.i, 2), h.qe > 0 ? f(h.iEff, 2) : '', f(h.pi, 2), f(h.u, 2), f(h.g, 2), f(h.Ee, 2), f(h.r, 2), f(h.S, 2), f(h.gStar, 2), f(h.cred * 100, 0)]);
    });
    if (g.done()) { rows.push([]); rows.push(['Shock', g.scenario.name]); rows.push(['Seed', String(g.seed)]); }
    return rows;
  }
  function copyTable() {
    var text = tableRows().map(function (r) { return r.join('\t'); }).join('\n');
    var msg = $('copyMsg');
    var done = function () { msg.textContent = 'Copied. Paste into a spreadsheet.'; setTimeout(function () { msg.textContent = ''; }, 3000); };
    try {
      navigator.clipboard.writeText(text).then(done, fallback);
    } catch (e) { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e2) { msg.textContent = 'Select the table and copy it by hand.'; }
      document.body.removeChild(ta);
    }
  }
  function downloadCsv() {
    var csv = tableRows().map(function (r) { return r.map(function (c) { return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'long-and-variable-' + state.game.seed + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    $('copyMsg').textContent = 'If no download started, use Copy table instead.';
    setTimeout(function () { $('copyMsg').textContent = ''; }, 4000);
  }

  /* ------------------------------ dialogs ------------------------------ */
  function fillParamTable() {
    var p = state.game ? state.game.p : M.DEFAULTS, tb = $('paramTable').tBodies[0];
    tb.textContent = '';
    [
      ['ḡ', p.gBar + '%', 'Normal Solow growth rate (LRAS)'],
      ['π*', p.piStar + '%', 'Inflation goal'],
      ['u*', p.uStar + '%', 'Natural rate of unemployment'],
      ['r*', p.rStar + '%', 'Neutral real interest rate; neutral funds rate = r* + E(π)'],
      ['κ', p.kappa, 'Slope of SRAS'],
      ['α', p.alpha, 'Effect of the real-rate gap on spending growth'],
      ['ω', p.omega, 'Average share of the rate gap passed through each stage per quarter'],
      ['k', p.lagStages, 'Number of lag stages (policy-lag setting: ' + M.LAG_PRESETS[p.lags].name.toLowerCase() + ')'],
      ['σ', p.lagVar, 'Variability of the lag: s.d. of the log of ω each quarter (0 = predictable)'],
      ['γ', p.gamma, 'Self-correction of spending when unemployment is high'],
      ['λ', p.lambda, 'Speed of adaptive expectations (per quarter)'],
      ['a', '0 to ' + p.anchor, 'Pull of expectations toward 2%, scaled by credibility'],
      ['cred\u2080', Math.round(p.cred0 * 100) + '%', 'Credibility at the start of the term (instructor setting)'],
      ['β', p.okun, "Okun's law coefficient"],
      ['θ', p.theta, 'Share of a real shock that changes output per worker, not jobs'],
      ['QE', p.qe ? 'on' : 'off', 'Each QE round works like a ' + (p.qeEff * p.step).toFixed(3) + '-point rate cut']
    ].forEach(function (r) {
      var tr = tb.insertRow();
      r.forEach(function (c) { var td = tr.insertCell(); td.textContent = c; });
    });
  }

  function fillSettings() {
    var sel = $('setScenario');
    if (!sel.options.length) {
      var o = document.createElement('option'); o.value = 'random'; o.textContent = 'Random (students don\'t know)'; sel.appendChild(o);
      M.SCENARIO_KEYS.concat(['none']).forEach(function (k) {
        var op = document.createElement('option'); op.value = k; op.textContent = M.SCENARIOS[k].name + ' — ' + M.SCENARIOS[k].kind.toLowerCase();
        sel.appendChild(op);
      });
    }
    var o2 = state.opts, p = state.game.p;
    sel.value = o2.scenario || 'random';
    $('setOnset').value = o2.onset ? String(o2.onset) : '';
    $('setSeed').value = o2.seed || '';
    $('setQuarters').value = p.quarters;
    $('setUstar').value = p.uStar;
    $('setGbar').value = p.gBar;
    $('setQE').checked = p.qe;
    $('setLags').value = p.lags;
    $('setCred').value = Math.round(p.cred0 * 100);
    $('setDemo').checked = !!o2.demo;
    updateShare();
  }
  function settingsFromForm() {
    var seed = parseInt($('setSeed').value, 10);
    var onset = parseInt($('setOnset').value, 10);
    var params = {
      quarters: clampInt($('setQuarters').value, 8, 40) || 16,
      uStar: parseFloat($('setUstar').value) || M.DEFAULTS.uStar,
      gBar: isNaN(parseFloat($('setGbar').value)) ? M.DEFAULTS.gBar : parseFloat($('setGbar').value),
      qe: $('setQE').checked,
      lags: parseInt($('setLags').value, 10),
      cred0: parseInt($('setCred').value, 10) / 100
    };
    return {
      scenario: $('setScenario').value,
      seed: isNaN(seed) ? undefined : seed,
      onset: isNaN(onset) ? undefined : onset,
      params: params,
      demo: $('setDemo').checked
    };
  }
  function updateShare() {
    var o = settingsFromForm();
    var q = new URLSearchParams();
    if (o.scenario && o.scenario !== 'random') q.set('scenario', o.scenario);
    q.set('seed', String(o.seed || state.game.seed));
    if (o.onset) q.set('onset', o.onset);
    if (o.params.quarters !== 16) q.set('quarters', o.params.quarters);
    if (o.params.uStar !== M.DEFAULTS.uStar) q.set('ustar', o.params.uStar);
    if (o.params.gBar !== M.DEFAULTS.gBar) q.set('gbar', o.params.gBar);
    if (!o.params.qe) q.set('qe', '0');
    if (o.params.lags !== M.DEFAULTS.lags) q.set('lags', o.params.lags);
    if (o.params.cred0 !== M.DEFAULTS.cred0) q.set('cred', Math.round(o.params.cred0 * 100));
    var cOut = $('credOut'), cb = document.createElement('b');
    cOut.textContent = '';
    cb.textContent = Math.round(o.params.cred0 * 100) + '%. ';
    cOut.appendChild(cb); cOut.appendChild(document.createTextNode(credText(o.params.cred0, M.DEFAULTS)));
    var lt = lagText(M.mergeParams({ lags: o.params.lags })), out = $('lagOut');
    out.textContent = '';
    var b = document.createElement('b'); b.textContent = lt.name + '. ';
    out.appendChild(b); out.appendChild(document.createTextNode(lt.all));
    if (o.demo) q.set('demo', '1');
    $('shareLink').textContent = '?' + q.toString();
  }

  /* ------------------------------ wiring ------------------------------ */
  function wire() {
    $('btnCut').addEventListener('click', function () { nudge(-1); });
    $('btnRaise').addEventListener('click', function () { nudge(1); });
    $('btnGo').addEventListener('click', playQuarter);
    $('btnNew').addEventListener('click', function () { newGame({ params: state.opts.params }); });
    $('btnHelp').addEventListener('click', function () { $('dlgHelp').showModal(); });
    $('btnModel').addEventListener('click', function () {
      fillParamTable();
      $('lagModel').textContent = 'In this game: ' + lagText(state.game.p).all;
      $('dlgModel').showModal();
    });
    $('btnSettings').addEventListener('click', function () { fillSettings(); $('dlgSettings').showModal(); });
    $('settingsForm').addEventListener('input', updateShare);
    $('btnCopy').addEventListener('click', copyTable);
    $('btnCsv').addEventListener('click', downloadCsv);

    $('dlgSettings').addEventListener('close', function () {
      if ($('dlgSettings').returnValue === 'apply') newGame(settingsFromForm());
    });
    $('dlgEnd').addEventListener('close', function () {
      var v = $('dlgEnd').returnValue;
      C.hideTip();
      if (v === 'new') newGame({ params: state.opts.params, scenario: state.opts.scenario, onset: state.opts.onset });
      else if (v === 'replay') newGame({ params: state.opts.params, scenario: state.game.scenarioKey, onset: state.game.onset, seed: state.game.seed });
    });
    $('dlgEnd').addEventListener('cancel', function () { C.hideTip(); });

    // After any dialog closes, put focus back on the main action so Enter keeps working.
    ['dlgHelp', 'dlgModel', 'dlgSettings', 'dlgEnd'].forEach(function (id) {
      $(id).addEventListener('close', function () {
        setTimeout(function () {
          if (document.querySelector('dialog[open]')) return;
          var go = $('btnGo');
          if (!go.disabled) go.focus({ preventScroll: true });
          else document.activeElement && document.activeElement.blur && document.activeElement.blur();
        }, 0);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (document.querySelector('dialog[open]')) return;
      var tag = (e.target && e.target.tagName) || '';
      if (e.target && e.target.closest && e.target.closest('dialog')) tag = '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
      else if (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'SUMMARY') { e.preventDefault(); playQuarter(); }
    });

    var rt = null;
    var redraw = function () { clearTimeout(rt); rt = setTimeout(function () { if (state.game) { renderCharts(); if ($('dlgEnd').open) showEnd(); } }, 120); };
    if (window.ResizeObserver) new ResizeObserver(redraw).observe($('tsChart').parentNode);
    else window.addEventListener('resize', redraw);
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', redraw);
    }
  }

  wire();
  var opts = readParams();
  newGame(opts);
  if (!opts.demo) {
    var seen = false;
    try { seen = sessionStorage.getItem('lav-help') === '1'; sessionStorage.setItem('lav-help', '1'); } catch (e) { seen = false; }
    if (!seen) $('dlgHelp').showModal();
  }
})();
