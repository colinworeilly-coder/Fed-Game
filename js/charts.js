/*
 * Long and Variable: SVG charts (no libraries)
 *   FedCharts.timeSeries  - inflation, unemployment and the funds rate by quarter
 *   FedCharts.adas        - the Cowen-Tabarrok AD-AS diagram for the current quarter
 *   FedCharts.compare     - small multiples for the end-of-game comparison
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fmt(x, d) { return (x < 0 && x > -0.005 ? 0 : x).toFixed(d === undefined ? 1 : d); }
  function path(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }
  function niceStep(range, target) {
    var raw = range / target, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  function svgFor(container, w, h) {
    container.textContent = '';
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, preserveAspectRatio: 'xMidYMid meet' }, container);
  }

  /* ------------------------------ tooltip ------------------------------ */
  var tip = null;
  function tooltip() { return tip || (tip = document.getElementById('tooltip')); }
  function showTip(evt, title, rows) {
    var t = tooltip(); if (!t) return;
    t.textContent = '';
    var h = document.createElement('div'); h.className = 'tt-h'; h.textContent = title; t.appendChild(h);
    rows.forEach(function (r) {
      var row = document.createElement('div'); row.className = 'tt-row';
      var k = document.createElement('span'); k.className = 'tt-key'; k.style.borderColor = r.color || 'transparent';
      var n = document.createElement('span'); n.textContent = r.name;
      var v = document.createElement('b'); v.textContent = r.value;
      row.appendChild(k); row.appendChild(n); row.appendChild(v); t.appendChild(row);
    });
    t.hidden = false;
    var pad = 14, vw = window.innerWidth, vh = window.innerHeight;
    var bw = t.offsetWidth, bh = t.offsetHeight;
    var x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + bw > vw - 8) x = evt.clientX - bw - pad;
    if (y + bh > vh - 8) y = evt.clientY - bh - pad;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { var t = tooltip(); if (t) t.hidden = true; }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  // Push labels apart vertically so they never overlap.
  function spread(items, minGap, lo, hi) {
    items.sort(function (a, b) { return a.y - b.y; });
    for (var k = 0; k < 4; k++) {
      for (var i = 1; i < items.length; i++) {
        if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
      }
      var over = items.length ? items[items.length - 1].y - hi : 0;
      if (over > 0) for (i = 0; i < items.length; i++) items[i].y -= over;
      if (items.length && items[0].y < lo) {
        var d = lo - items[0].y; for (i = 0; i < items.length; i++) items[i].y += d;
      }
    }
    return items;
  }

  /* ---------------------------- time series ---------------------------- */
  // opts: { n, historyLen, labels[], data[{pi,u,i,qe,iEff,g}], goalPi, goalU, shock:{index,name}|null }
  function timeSeries(container, opts) {
    var W = Math.max(300, container.clientWidth || 600);
    var narrow = W < 520;
    var H = Math.round(clamp(W * 0.42, 250, 390));
    var m = { l: 34, r: narrow ? 92 : 128, t: 22, b: 26 };
    var svg = svgFor(container, W, H);
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = opts.n, data = opts.data;

    var vals = [opts.goalPi, opts.goalU, 0];
    data.forEach(function (d) { vals.push(d.pi, d.u, d.i, d.iEff); });
    var lo = Math.min(-1, Math.floor(Math.min.apply(null, vals) - 0.5));
    var hi = Math.max(8, Math.ceil(Math.max.apply(null, vals) + 0.5));
    var st = niceStep(hi - lo, 6);
    lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    var X = function (i) { return m.l + (n > 1 ? i * pw / (n - 1) : 0); };
    var Y = function (v) { return m.t + (hi - v) * ph / (hi - lo); };

    var ax = el('g', { 'class': 'ax' }, svg);
    // your term
    var x0 = X(opts.historyLen - 0.5);
    el('rect', { 'class': 'term-shade', x: x0, y: m.t, width: X(n - 1) - x0 + 6, height: ph }, svg);
    el('text', { 'class': 'term-tag', x: x0 + 6, y: m.t - 8 }, svg, 'YOUR TERM');
    // grid + y labels
    for (var v = lo; v <= hi + 1e-9; v += st) {
      el('line', { 'class': Math.abs(v) < 1e-9 ? 'base' : 'grid', x1: m.l, x2: m.l + pw + 6, y1: Y(v), y2: Y(v) }, ax);
      el('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, ax, fmt(v, 0) + (v === hi ? '%' : ''));
    }
    // x labels: start of each year
    opts.labels.forEach(function (lab, i) {
      if (i === 0) el('text', { x: X(i), y: H - 8, 'text-anchor': 'start' }, ax, 'Before');
      else if (lab.year > 0 && lab.q === 1) el('text', { x: X(i), y: H - 8, 'text-anchor': 'middle' }, ax, (narrow ? 'Y' : 'Year ') + lab.year);
    });

    // goals
    el('line', { 'class': 'goal pi', x1: m.l, x2: m.l + pw + 6, y1: Y(opts.goalPi), y2: Y(opts.goalPi) }, svg);
    el('line', { 'class': 'goal u', x1: m.l, x2: m.l + pw + 6, y1: Y(opts.goalU), y2: Y(opts.goalU) }, svg);

    // shock marker (shown at the end of the game)
    if (opts.shock) {
      var sx = X(opts.shock.index);
      el('line', { 'class': 'shock-line', x1: sx, x2: sx, y1: m.t, y2: m.t + ph }, svg);
      el('text', { 'class': 'shock-lbl', x: sx + 4, y: m.t + 12 }, svg, opts.shock.name);
    }

    // QE: dotted line for the rate-equivalent stance below zero
    var qeRuns = [], run = null;
    data.forEach(function (d, i) {
      if (d.qe > 0) { if (!run) { run = []; if (i > 0) run.push([X(i - 1), Y(data[i - 1].iEff)]); } run.push([X(i), Y(d.iEff)]); }
      else if (run) { run.push([X(i), Y(d.iEff)]); qeRuns.push(run); run = null; }
    });
    if (run) qeRuns.push(run);
    qeRuns.forEach(function (r, k) {
      el('path', { 'class': 'series i', d: path(r), 'stroke-dasharray': '2 4', 'stroke-width': 2 }, svg);
      if (k === 0) {
        var low = r.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, r[0]);
        el('text', { 'class': 'qe-lbl', x: low[0] + 4, y: low[1] + 13 }, svg, 'QE');
      }
    });

    var series = [
      { key: 'pi', name: 'Inflation' },
      { key: 'u', name: 'Unemployment' },
      { key: 'i', name: 'Fed funds' }
    ];
    if (data.length) {
      series.forEach(function (s) {
        var pts = data.map(function (d, i) { return [X(i), Y(d[s.key])]; });
        el('path', { 'class': 'series ' + s.key, d: path(pts) }, svg);
      });
      var li = data.length - 1, lx = X(li);
      var labs = series.map(function (s) { return { s: s, y: Y(data[li][s.key]), y0: Y(data[li][s.key]) }; });
      spread(labs, 15, m.t + 4, m.t + ph);
      labs.forEach(function (L) {
        el('circle', { 'class': 'dot ' + L.s.key, cx: lx, cy: L.y0, r: 4.5 }, svg);
        var t = el('text', { 'class': 'endlbl', x: lx + 9, y: L.y + 4 }, svg);
        el('tspan', null, t, fmt(data[li][L.s.key], narrow ? 1 : 2) + '%');
        if (!narrow || li < n - 3) el('tspan', { 'class': 'nm', dx: 4 }, t, L.s.name);
      });
    }

    // crosshair + tooltip
    var cross = el('line', { 'class': 'cross', y1: m.t, y2: m.t + ph, visibility: 'hidden' }, svg);
    var hit = el('rect', { 'class': 'hit', x: m.l - 6, y: m.t, width: pw + 12, height: ph }, svg);
    function onMove(evt) {
      if (!data.length) return;
      var r = svg.getBoundingClientRect();
      var px = (evt.clientX - r.left) * W / r.width;
      var i = clamp(Math.round((px - m.l) / (pw / (n - 1))), 0, data.length - 1);
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      var d = data[i], lab = opts.labels[i];
      var rows = [
        { name: 'Inflation', value: fmt(d.pi, 2) + '%', color: cssVar('--pi') },
        { name: 'Unemployment', value: fmt(d.u, 2) + '%', color: cssVar('--u') },
        { name: 'Fed funds rate', value: fmt(d.i, 2) + '%', color: cssVar('--i') }
      ];
      if (d.qe > 0) rows.push({ name: 'QE (rate equivalent)', value: fmt(d.iEff, 2) + '%' });
      rows.push({ name: 'Real GDP growth', value: fmt(d.g, 1) + '%' });
      showTip(evt, lab.text, rows);
    }
    hit.addEventListener('pointermove', onMove);
    hit.addEventListener('pointerdown', onMove);
    hit.addEventListener('pointerleave', function () { cross.setAttribute('visibility', 'hidden'); hideTip(); });
  }

  /* ------------------------------- AD-AS ------------------------------- */
  // opts: { cur:{S,Ee,gStar,c,g,pi}, prev, trail:[{g,pi}], kappa, goal:{g,pi} }
  function adas(container, opts) {
    var W = Math.max(280, container.clientWidth || 420);
    var H = Math.round(clamp(W * 0.78, 270, 420));
    var m = { l: 40, r: 14, t: 14, b: 40 };
    var svg = svgFor(container, W, H);
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var cur = opts.cur, prev = opts.prev, k = opts.kappa;

    var xs = [cur.g, cur.gStar, opts.goal.g], ys = [cur.pi, opts.goal.pi];
    if (prev) { xs.push(prev.g, prev.gStar); ys.push(prev.pi); }
    (opts.trail || []).forEach(function (p) { xs.push(p.g); ys.push(p.pi); });
    var xlo = Math.min(-4, Math.floor(Math.min.apply(null, xs) - 2)), xhi = Math.max(8, Math.ceil(Math.max.apply(null, xs) + 2));
    var ylo = Math.min(-2, Math.floor(Math.min.apply(null, ys) - 2)), yhi = Math.max(8, Math.ceil(Math.max.apply(null, ys) + 2));
    var sx = niceStep(xhi - xlo, 7), sy = niceStep(yhi - ylo, 6);
    xlo = Math.floor(xlo / sx) * sx; xhi = Math.ceil(xhi / sx) * sx;
    ylo = Math.floor(ylo / sy) * sy; yhi = Math.ceil(yhi / sy) * sy;
    var X = function (g) { return m.l + (g - xlo) * pw / (xhi - xlo); };
    var Y = function (p) { return m.t + (yhi - p) * ph / (yhi - ylo); };

    var clipId = 'adclip' + Math.floor(Math.random() * 1e6);
    var defs = el('defs', null, svg);
    var cp = el('clipPath', { id: clipId }, defs);
    el('rect', { x: m.l, y: m.t, width: pw, height: ph }, cp);

    var ax = el('g', { 'class': 'ax' }, svg);
    var v;
    for (v = xlo; v <= xhi + 1e-9; v += sx) {
      el('line', { 'class': Math.abs(v) < 1e-9 ? 'base' : 'grid', x1: X(v), x2: X(v), y1: m.t, y2: m.t + ph }, ax);
      el('text', { x: X(v), y: m.t + ph + 15, 'text-anchor': 'middle' }, ax, fmt(v, 0));
    }
    for (v = ylo; v <= yhi + 1e-9; v += sy) {
      el('line', { 'class': Math.abs(v) < 1e-9 ? 'base' : 'grid', x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v) }, ax);
      el('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, ax, fmt(v, 0));
    }
    el('text', { 'class': 'title', x: m.l + pw / 2, y: H - 6, 'text-anchor': 'middle' }, ax, 'Real GDP growth rate (%)');
    el('text', { 'class': 'title', x: 12, y: m.t + ph / 2, transform: 'rotate(-90 12 ' + (m.t + ph / 2) + ')', 'text-anchor': 'middle' }, ax, 'Inflation rate (%)');

    var g = el('g', { 'clip-path': 'url(#' + clipId + ')' }, svg);
    function curves(s, ghost) {
      var cls = ghost ? ' ghost' : '';
      el('line', { 'class': 'curve lras' + cls, x1: X(s.gStar), x2: X(s.gStar), y1: m.t, y2: m.t + ph }, g);
      el('line', { 'class': 'curve ad' + cls, x1: X(xlo), y1: Y(s.S - xlo), x2: X(xhi), y2: Y(s.S - xhi) }, g);
      var sr = function (gg) { return s.Ee + s.c + k * (gg - s.gStar); };
      el('line', { 'class': 'curve sras' + cls, x1: X(xlo), y1: Y(sr(xlo)), x2: X(xhi), y2: Y(sr(xhi)) }, g);
    }
    if (prev) curves(prev, true);
    curves(cur, false);

    // trail of recent outcomes
    var trail = opts.trail || [];
    if (trail.length > 1) {
      el('path', { 'class': 'trail-line', d: path(trail.map(function (p) { return [X(p.g), Y(p.pi)]; })) }, g);
      trail.slice(0, -1).forEach(function (p, i) {
        el('circle', { 'class': 'trail', cx: X(p.g), cy: Y(p.pi), r: 2.5, opacity: (0.25 + 0.6 * (i + 1) / trail.length).toFixed(2) }, g);
      });
    }
    // goal point
    el('circle', { 'class': 'goalpt', cx: X(opts.goal.g), cy: Y(opts.goal.pi), r: 7 }, svg);
    el('text', { 'class': 'goalpt-lbl', x: X(opts.goal.g) - 10, y: Y(opts.goal.pi) + 18, 'text-anchor': 'end' }, svg, 'Goal');

    // labels for the current curves
    var adLx = xhi - 0.4, adLy = cur.S - adLx;
    if (adLy < ylo + 0.8) { adLy = ylo + 0.8; adLx = cur.S - adLy; }
    el('text', { 'class': 'curve-lbl ad', x: X(adLx) + 4, y: Y(adLy) - 6, 'text-anchor': adLx > xhi - 1.5 ? 'end' : 'start' }, svg, 'AD');
    var srLx = xhi - 0.4, srLy = cur.Ee + cur.c + k * (srLx - cur.gStar);
    if (srLy > yhi - 0.6) { srLy = yhi - 0.6; srLx = cur.gStar + (srLy - cur.Ee - cur.c) / k; }
    el('text', { 'class': 'curve-lbl sras', x: X(srLx) - 2, y: Y(srLy) + 16, 'text-anchor': 'end' }, svg, 'SRAS');
    el('text', { 'class': 'curve-lbl lras', x: X(cur.gStar) + 5, y: m.t + 13 }, svg, 'LRAS');

    // equilibrium
    var ex = X(cur.g), ey = Y(cur.pi);
    el('circle', { 'class': 'eqm', cx: ex, cy: ey, r: 6 }, svg);
    var right = ex < m.l + pw - 90;
    el('text', { 'class': 'eqm-lbl', x: right ? ex + 10 : ex - 10, y: ey - 9, 'text-anchor': right ? 'start' : 'end' }, svg,
      'g ' + fmt(cur.g) + '%, π ' + fmt(cur.pi) + '%');
  }

  /* ------------------------------ compare ------------------------------ */
  // opts: { title, key, goal, runs:{you,taylor,hold}, labels }
  function compare(container, opts) {
    var W = Math.max(240, container.clientWidth || 300);
    var H = Math.round(clamp(W * 0.62, 170, 230));
    var m = { l: 30, r: 10, t: 10, b: 22 };
    var svg = svgFor(container, W, H);
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var runs = opts.runs, key = opts.key, n = runs.you.length;
    var vals = [opts.goal === null ? 0 : opts.goal];
    ['you', 'taylor', 'hold'].forEach(function (r) { runs[r].forEach(function (d) { vals.push(d[key]); }); });
    var lo = Math.floor(Math.min.apply(null, vals) - 0.3), hi = Math.ceil(Math.max.apply(null, vals) + 0.3);
    var st = niceStep(hi - lo, 4); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    var X = function (i) { return m.l + i * pw / Math.max(1, n - 1); };
    var Y = function (v) { return m.t + (hi - v) * ph / (hi - lo); };
    var ax = el('g', { 'class': 'ax' }, svg);
    for (var v = lo; v <= hi + 1e-9; v += st) {
      el('line', { 'class': Math.abs(v) < 1e-9 ? 'base' : 'grid', x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v) }, ax);
      el('text', { x: m.l - 5, y: Y(v) + 4, 'text-anchor': 'end' }, ax, fmt(v, 0));
    }
    for (var q = 0; q < n; q += 4) el('text', { x: X(q), y: H - 6, 'text-anchor': q === 0 ? 'start' : 'middle' }, ax, 'Y' + (q / 4 + 1));
    if (opts.goal !== null) el('line', { 'class': 'cmp-goal', x1: m.l, x2: m.l + pw, y1: Y(opts.goal), y2: Y(opts.goal) }, svg);
    ['hold', 'taylor', 'you'].forEach(function (r) {
      el('path', { 'class': 'cmp-' + r, d: path(runs[r].map(function (d, i) { return [X(i), Y(d[key])]; })) }, svg);
    });
    var hit = el('rect', { 'class': 'hit', x: m.l, y: m.t, width: pw, height: ph }, svg);
    var cross = el('line', { 'class': 'cross', y1: m.t, y2: m.t + ph, visibility: 'hidden' }, svg);
    hit.addEventListener('pointermove', function (evt) {
      var r = svg.getBoundingClientRect();
      var i = clamp(Math.round(((evt.clientX - r.left) * W / r.width - m.l) / (pw / Math.max(1, n - 1))), 0, n - 1);
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      showTip(evt, opts.title + ', ' + opts.labels[i], [
        { name: 'Your policy', value: fmt(runs.you[i][key], 2) + '%', color: cssVar('--ink') },
        { name: 'Taylor rule', value: fmt(runs.taylor[i][key], 2) + '%', color: cssVar('--accent') },
        { name: 'No change', value: fmt(runs.hold[i][key], 2) + '%', color: cssVar('--muted') }
      ]);
    });
    hit.addEventListener('pointerleave', function () { cross.setAttribute('visibility', 'hidden'); hideTip(); });
  }

  root.FedCharts = { timeSeries: timeSeries, adas: adas, compare: compare, hideTip: hideTip };
})(window);
