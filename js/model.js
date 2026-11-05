/*
 * Long and Variable: model engine
 * ----------------------
 * A quarterly version of the dynamic AD-AS model in Cowen & Tabarrok,
 * Modern Principles of Economics, ch. 13 (32), 15 (34) and 16 (35).
 *
 * All rates are in percent per year (quarterly observations, annualized).
 *
 *   AD    :  pi_t + g_t = S_t                         (spending growth = M~ + v~)
 *   Spend :  S_t = Ee_t + gBar - alpha*m_t + gamma*(u_{t-1} - uStar) + d_t
 *   Lag   :  m_t = (1-w_t)*m_{t-1} + w_t*(i_t - Ee_t - rStar), applied in
 *            lagStages successive stages (more stages = longer, hump-shaped
 *            lag); w_t = omega, or omega times a random factor when lags
 *            are variable (lagVar > 0).
 *   LRAS  :  gStar_t = gBar + z_t                       (Solow growth rate)
 *   SRAS  :  pi_t = Ee_t + kappa*(g_t - gStar_t) + c_t
 *   Okun  :  u_t = u_{t-1} - okun*(g_t - gBar - theta*z_t)/4
 *   Expect:  Ee_{t+1} = (1-a_t)*[Ee_t + lambda*(pi_t - Ee_t)] + a_t*piStar,
 *            a_t = anchor * credibility_t
 *   Cred  :  credibility starts the term at cred0 (the instructor's setting)
 *            and then rises 0.03 a quarter when |pi - piStar| < 1, and falls
 *            0.03*(|pi - piStar| - 1) otherwise.
 *
 * i_t is the federal funds rate chosen by the player, bounded below by zero.
 * At zero the player can add quantitative easing (QE): each "round" of QE
 * works like a cut of qeEff*step in the rate that enters the spending
 * equation (C&T ch. 15: QE is used when the funds rate is near zero).
 * d_t are aggregate-demand shocks (shifts of AD), z_t are real shocks
 * (shifts of LRAS), c_t is a small price-level noise term.
 *
 * The file works both in the browser (window.FedModel) and in Node
 * (module.exports) so the same code runs in the tests.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    gBar: 3.0,      // normal Solow growth rate (LRAS), %/yr
    piStar: 2.0,    // inflation goal, %/yr
    uStar: 4.5,     // natural rate of unemployment, %
    rStar: 2.0,     // neutral real interest rate, %
    kappa: 0.5,     // SRAS slope: extra inflation per point of growth above Solow
    alpha: 1.0,     // spending-growth response to the real-rate gap
    lags: 1,        // policy-lag setting, 0 (short) to 4 (long and variable); sets the next three
    omega: 0.5,     // speed at which a rate change reaches spending (per quarter, per stage)
    lagStages: 1,   // number of stages the rate change passes through
    lagVar: 0,      // variability of the lag: s.d. of the log of the quarterly speed
    gamma: 0.6,     // self-correction: slack slowly revives spending
    okun: 0.5,      // Okun's law coefficient
    theta: 0.5,     // share of a real shock that changes output per worker rather than jobs
    lambda: 0.3,    // adaptive-expectations speed (per quarter)
    anchor: 0.12,   // max pull of expectations toward the goal (at full credibility)
    cred0: 1.0,     // credibility at the start of the term, 0..1 (held through the pre-game quarters)
    quarters: 16,   // length of the term (4 years)
    history: 6,     // quarters of pre-game history shown on the chart
    iMax: 20,       // highest rate allowed
    step: 0.25,     // size of one rate move
    qe: true,       // allow quantitative easing at the zero lower bound
    qeMax: 3,       // QE rounds are entered as a "rate" below zero, down to -qeMax
    qeEff: 0.5,     // a QE round is half as powerful as an equal rate cut
    noiseD: 0.5,    // s.d. of AD noise innovations
    rhoD: 0.5,      // persistence of AD noise
    noiseZ: 0.25,   // s.d. of LRAS noise
    noiseC: 0.2     // s.d. of price noise
  };

  // Policy-lag settings for the instructor slider. Level 1 is the default.
  var LAG_PRESETS = [
    { name: 'Short and predictable', omega: 0.8, lagStages: 1, lagVar: 0 },
    { name: 'Moderate and predictable', omega: 0.5, lagStages: 1, lagVar: 0 },
    { name: 'Longer and somewhat variable', omega: 0.5, lagStages: 2, lagVar: 0.35 },
    { name: 'Long and variable', omega: 0.35, lagStages: 2, lagVar: 0.55 },
    { name: 'Very long and variable', omega: 0.35, lagStages: 3, lagVar: 0.75 }
  ];

  // Share of a permanent change in the real rate that has reached spending
  // after each quarter, at the average speed (no randomness).
  function lagProfile(p, quarters) {
    var ms = [], out = [];
    for (var j = 0; j < p.lagStages; j++) ms.push(0);
    for (var q = 0; q < (quarters || 16); q++) {
      var input = 1;
      for (j = 0; j < p.lagStages; j++) { ms[j] = (1 - p.omega) * ms[j] + p.omega * input; input = ms[j]; }
      out.push(input);
    }
    return out;
  }
  function lagSummary(p) {
    var prof = lagProfile(p, 40), half = 0, most = 0;
    for (var q = 0; q < prof.length; q++) {
      if (!half && prof[q] >= 0.5) half = q + 1;
      if (!most && prof[q] >= 0.9) most = q + 1;
    }
    return { half: half, most: most, mean: p.lagStages * (1 - p.omega) / p.omega, variable: p.lagVar > 0 };
  }

  /* ---------------- random numbers (seeded, reproducible) ---------------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function roundStep(x, step) { return Math.round(x / step) * step; }

  /* ---------------------------- scenarios ---------------------------- */
  // Each scenario returns its contribution to the AD shift (d), the LRAS
  // shift (z) and a cost-push term (c, which shifts SRAS) k quarters after it hits.
  // Categories follow C&T's table of factors that shift AD and LRAS.

  function geo(size, rho) { return function (k) { return size * Math.pow(rho, k); }; }
  function seq(arr, tail) {
    return function (k) { return k < arr.length ? arr[k] : (tail || 0); };
  }

  var SCENARIOS = {
    fear: {
      name: 'A wave of fear',
      kind: 'Negative aggregate demand shock',
      curve: 'AD shifts left',
      blurb: 'Consumers and businesses turn pessimistic ("animal spirits"). Households postpone big purchases and firms shelve investment plans, so spending growth falls.',
      lesson: 'This is C&T\'s "best case" for monetary policy: a fall in AD lowers both inflation and growth, so cutting rates pushes both back toward the goals.',
      d: geo(-4.5, 0.82), z: null
    },
    boom: {
      name: 'Stock market and housing boom',
      kind: 'Positive aggregate demand shock',
      curve: 'AD shifts right',
      blurb: 'Rising stock and house prices make people feel wealthier and more confident. Spending growth surges.',
      lesson: 'An increase in AD raises growth in the short run but mostly raises inflation in the long run. Letting the boom run feeds higher inflation expectations.',
      d: geo(3.8, 0.9), z: null
    },
    financial: {
      name: 'Financial crisis',
      kind: 'Large negative AD shock, plus a smaller real shock',
      curve: 'AD shifts far left; LRAS shifts left a little',
      blurb: 'A collapse in house prices triggers bank failures. Lending freezes, wealth falls and fear spreads. Broken financial intermediation also makes the economy less productive for a while.',
      lesson: 'A very large drop in AD can push the right interest rate below zero. At the zero lower bound the Fed cannot cut further, so recovery is slower.',
      d: geo(-7.0, 0.9), z: geo(-1.0, 0.8)
    },
    oil: {
      name: 'Oil price shock',
      kind: 'Negative real shock',
      curve: 'LRAS (and SRAS) shift left',
      blurb: 'A war in a major producing region cuts world oil supply and the price of oil more than doubles. Machines and workers become less productive, and consumers have less to spend on other goods.',
      lesson: 'C&T\'s monetary policy dilemma: after a real shock the Fed can fight inflation or unemployment, but not both at once.',
      d: geo(-1.0, 0.75),
      z: seq([-4, -3, -1.5, 0, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75]),
      c: seq([2, 1.5, 1, 0.5])
    },
    tech: {
      name: 'Productivity boom',
      kind: 'Positive real shock',
      curve: 'LRAS shifts right',
      blurb: 'New technology spreads quickly through offices and factories. Each worker produces more, and firms invest to adopt the new tools.',
      lesson: 'A positive real shock raises growth and lowers inflation. The Fed can let the economy grow faster without stoking inflation.',
      d: geo(1.0, 0.9), z: seq([2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5])
    },
    fiscal: {
      name: 'Fiscal expansion',
      kind: 'Positive aggregate demand shock',
      curve: 'AD shifts right',
      blurb: 'Congress passes large tax cuts together with a rise in government spending. Spending growth jumps and stays high.',
      lesson: 'Faster growth of government spending and lower taxes shift AD right. With the economy already near its Solow rate, the extra spending mostly becomes inflation.',
      d: geo(3.0, 0.94), z: null
    },
    exports: {
      name: 'Strong dollar',
      kind: 'Mild negative aggregate demand shock',
      curve: 'AD shifts left a little',
      blurb: 'The dollar rises sharply against other currencies. U.S. exports become more expensive abroad and imports cheaper at home.',
      lesson: 'Lower export growth and higher import growth reduce AD. A small, short shock may need little response.',
      d: geo(-2.0, 0.7), z: null
    },
    austerity: {
      name: 'Fiscal tightening',
      kind: 'Negative aggregate demand shock',
      curve: 'AD shifts left',
      blurb: 'To cut the deficit, Congress raises taxes and slows the growth of government spending.',
      lesson: 'Higher taxes and slower growth of government spending shift AD left. Monetary policy can offset much of the drag.',
      d: geo(-3.0, 0.92), z: null
    },
    pandemic: {
      name: 'Pandemic',
      kind: 'Real shock followed by a demand rebound',
      curve: 'LRAS and AD shift left, then both rebound',
      blurb: 'A new virus forces offices, schools and factories to close. Production and spending both collapse. When the economy reopens, pent-up demand floods back while supply chains are still tangled.',
      lesson: 'Shocks can hit both curves at once and reverse. Policy that is right for the collapse can be too loose for the rebound.',
      d: seq([-7, -2, 3, 3.5, 3.5, 3, 2.5, 2, 1.5, 1]),
      z: seq([-6, -1, 3, 1.5, -1.5, -1.5, -0.5])
    },
    tariffs: {
      name: 'Trade war',
      kind: 'Negative real shock with a small demand effect',
      curve: 'LRAS shifts left; AD shifts left a little',
      blurb: 'Steep new tariffs raise the cost of imported parts and materials, and trading partners retaliate against U.S. exports.',
      lesson: 'Higher taxes on inputs work like a negative real shock: inflation up, growth down. Retaliation also trims AD.',
      d: geo(-1.5, 0.85), z: seq([-2.5, -2.5, -2.5, -2, -1.5, -1, -0.5]),
      c: seq([1.5, 1.5, 1, 0.5])
    },
    none: {
      name: 'No major shock',
      kind: 'Only small random disturbances',
      curve: 'Small shifts in AD and LRAS',
      blurb: 'The economy is buffeted only by ordinary, small surprises.',
      lesson: 'Even without a big shock, overreacting to noise can create the instability you are trying to avoid.',
      d: null, z: null
    }
  };

  var SCENARIO_KEYS = ['fear', 'boom', 'financial', 'oil', 'tech', 'fiscal', 'exports', 'austerity', 'pandemic', 'tariffs'];

  /* ----------------------------- the game ----------------------------- */

  function mergeParams(over) {
    var p = {}, k;
    for (k in DEFAULTS) p[k] = DEFAULTS[k];
    if (over) for (k in over) if (over[k] !== undefined && over[k] !== null) p[k] = over[k];
    // The lag setting fills in omega, lagStages and lagVar unless they were given directly.
    p.lags = Math.max(0, Math.min(LAG_PRESETS.length - 1, Math.round(p.lags)));
    p.cred0 = clamp(Number(p.cred0), 0, 1);
    if (isNaN(p.cred0)) p.cred0 = DEFAULTS.cred0;
    var pre = LAG_PRESETS[p.lags];
    ['omega', 'lagStages', 'lagVar'].forEach(function (k2) {
      if (!over || over[k2] === undefined || over[k2] === null) p[k2] = pre[k2];
    });
    return p;
  }

  // Draw every random number for a game up front, so the same seed gives
  // identical shocks for the player's path and the counterfactual paths.
  function drawShocks(p, seed, scenarioKey, onset) {
    var rand = mulberry32(seed);
    var n = p.history + p.quarters;
    var raw = [];
    var dn = 0;
    for (var t = 0; t < n; t++) {
      dn = p.rhoD * dn + p.noiseD * gaussian(rand);
      raw.push({ dn: dn, zn: p.noiseZ * gaussian(rand), cn: p.noiseC * gaussian(rand) });
    }
    // Lag surprises come from a separate stream so that the lag setting does
    // not change the economy a given seed produces.
    var lr = mulberry32((seed ^ 0x5bd1e995) >>> 0), lagRand = [];
    for (t = 0; t < n; t++) lagRand.push(gaussian(lr));
    var key = scenarioKey;
    if (!key || key === 'random') key = SCENARIO_KEYS[Math.floor(rand() * SCENARIO_KEYS.length)];
    if (!SCENARIOS[key]) key = 'none';
    if (onset === undefined || onset === null) onset = 2 + Math.floor(rand() * 4); // game quarter 2-5
    var sc = SCENARIOS[key];
    var shocks = raw.map(function (r, t) {
      var gq = t - p.history + 1;      // game quarter number (1..quarters); <=0 is history
      var k = gq - onset;
      var d = r.dn, z = r.zn, c = r.cn;
      if (k >= 0) {
        if (sc.d) d += sc.d(k);
        if (sc.z) z += sc.z(k);
        if (sc.c) c += sc.c(k);
      }
      return { d: d, z: z, c: c, lag: lagRand[t] };
    });
    return { key: key, onset: onset, shocks: shocks };
  }

  function initialState(p) {
    return {
      i: p.rStar + p.piStar, m: 0, Ee: p.piStar, u: p.uStar, cred: p.cred0,
      pi: p.piStar, g: p.gBar, S: p.piStar + p.gBar, gStar: p.gBar
    };
  }

  // One quarter. `prev` is last quarter's record, `i` the rate chosen for
  // this quarter, `sh` this quarter's shocks.
  // `set` is the player's setting: >= 0 is the funds rate, < 0 means the
  // funds rate is 0 plus QE. `holdCred` keeps credibility fixed (used for the
  // pre-game quarters, so the term starts at the instructor's setting).
  function step(p, prev, set, sh, holdCred) {
    set = clamp(set, p.qe ? -p.qeMax : 0, p.iMax);
    var i = Math.max(set, 0);
    var qe = Math.max(-set, 0);
    var iEff = i - p.qeEff * qe;
    var Ee = prev.EeNext !== undefined ? prev.EeNext : prev.Ee;
    var rgap = iEff - Ee - p.rStar;
    // Policy lag: the real-rate gap passes through lagStages smoothing
    // stages. With variable lags the speed w differs from quarter to quarter.
    var w = p.omega;
    if (p.lagVar > 0) w = clamp(p.omega * Math.exp(p.lagVar * (sh.lag || 0) - p.lagVar * p.lagVar / 2), 0.05, 0.95);
    var ms = [], input = rgap;
    for (var j = 0; j < p.lagStages; j++) {
      var before = prev.ms ? prev.ms[j] : (j === p.lagStages - 1 ? prev.m || 0 : 0);
      ms.push((1 - w) * before + w * input);
      input = ms[j];
    }
    var m = input;
    var gStar = p.gBar + sh.z;
    var S = Ee + p.gBar - p.alpha * m + p.gamma * (prev.u - p.uStar) + sh.d;
    // Solve AD (pi = S - g) with SRAS (pi = Ee + kappa*(g - gStar) + c)
    var g = (S - Ee - sh.c + p.kappa * gStar) / (1 + p.kappa);
    var pi = S - g;
    var u = Math.max(0.5, prev.u - p.okun * (g - p.gBar - p.theta * sh.z) / 4);
    var miss = Math.abs(pi - p.piStar);
    var cred = holdCred ? prev.cred : clamp(prev.cred + (miss < 1 ? 0.03 : -0.03 * (miss - 1)), 0, 1);
    var a = p.anchor * cred;
    var EeNext = (1 - a) * (Ee + p.lambda * (pi - Ee)) + a * p.piStar;
    return {
      set: set, i: i, qe: qe, iEff: iEff, m: m, ms: ms, w: w, rgap: rgap, Ee: Ee, EeNext: EeNext, S: S, g: g,
      gStar: gStar, pi: pi, u: u, cred: cred, r: iEff - Ee, d: sh.d, z: sh.z, c: sh.c
    };
  }

  /* ------------------------- benchmark policies ------------------------- */

  var RULES = {
    // Leave the rate where it started.
    hold: function (p, hist) { return hist[p.history - 1].set; },
    // The Taylor rule, using the data the Fed has when it meets: inflation
    // over the past four quarters and last quarter's unemployment rate.
    taylor: function (p, hist) {
      var last = hist[hist.length - 1];
      var n = Math.min(4, hist.length), pi4 = 0;
      for (var j = 1; j <= n; j++) pi4 += hist[hist.length - j].pi / n;
      var gap = -2 * (last.u - p.uStar);  // output gap via Okun's law
      var i = p.rStar + pi4 + 0.5 * (pi4 - p.piStar) + 0.5 * gap;
      return clamp(roundStep(i, p.step), p.qe ? -p.qeMax : 0, p.iMax);
    }
  };

  /* ----------------------------- Game object ----------------------------- */

  function Game(opts) {
    opts = opts || {};
    this.p = mergeParams(opts.params);
    this.seed = (opts.seed === undefined || opts.seed === null) ? Math.floor(Math.random() * 1e9) : opts.seed >>> 0;
    var drawn = drawShocks(this.p, this.seed, opts.scenario, opts.onset);
    this.scenarioKey = drawn.key;
    this.scenario = SCENARIOS[drawn.key];
    this.onset = drawn.onset;
    this.shocks = drawn.shocks;
    this.hist = [];
    // Pre-game history: the Fed holds the neutral rate and credibility stays
    // at its starting level.
    var s = initialState(this.p);
    var prev = { m: 0, Ee: s.Ee, u: s.u, cred: s.cred };
    for (var t = 0; t < this.p.history; t++) {
      prev = step(this.p, prev, s.i, this.shocks[t], true);
      this.hist.push(prev);
    }
  }

  Game.prototype.quarter = function () { return this.hist.length - this.p.history; }; // quarters played
  Game.prototype.done = function () { return this.quarter() >= this.p.quarters; };
  Game.prototype.last = function () { return this.hist[this.hist.length - 1]; };
  Game.prototype.play = function (i) {
    if (this.done()) return null;
    var t = this.hist.length;
    var rec = step(this.p, this.last(), roundStep(i, 0.01), this.shocks[t]);
    this.hist.push(rec);
    return rec;
  };
  Game.prototype.played = function () { return this.hist.slice(this.p.history); };

  // Run the same shocks under a benchmark policy.
  Game.prototype.counterfactual = function (rule) {
    var p = this.p, f = typeof rule === 'function' ? rule : RULES[rule];
    var hist = this.hist.slice(0, p.history);
    for (var t = p.history; t < p.history + p.quarters; t++) {
      hist.push(step(p, hist[hist.length - 1], f(p, hist), this.shocks[t]));
    }
    return hist;
  };

  function score(p, records) {
    var n = records.length;
    if (!n) return null;
    var sPi = 0, sU = 0, worstPi = records[0], worstU = records[0];
    records.forEach(function (r) {
      sPi += Math.pow(r.pi - p.piStar, 2);
      sU += Math.pow(r.u - p.uStar, 2);
      if (Math.abs(r.pi - p.piStar) > Math.abs(worstPi.pi - p.piStar)) worstPi = r;
      if (Math.abs(r.u - p.uStar) > Math.abs(worstU.u - p.uStar)) worstU = r;
    });
    var rmsPi = Math.sqrt(sPi / n), rmsU = Math.sqrt(sU / n);
    var dist = Math.sqrt((sPi + sU) / n);
    return { rmsPi: rmsPi, rmsU: rmsU, dist: dist, worstPi: worstPi.pi, worstU: worstU.u, verdict: verdict(dist) };
  }

  function verdict(dist) {
    if (dist < 0.7) return { grade: 'A', title: 'Reappointed with acclaim', ok: true };
    if (dist < 1.0) return { grade: 'B', title: 'Reappointed', ok: true };
    if (dist < 1.3) return { grade: 'C', title: 'Narrowly reappointed', ok: true };
    if (dist < 2.0) return { grade: 'D', title: 'Not reappointed', ok: false };
    return { grade: 'F', title: 'Not reappointed', ok: false };
  }

  Game.prototype.score = function (records) { return score(this.p, records || this.played()); };

  var api = {
    DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, SCENARIO_KEYS: SCENARIO_KEYS, RULES: RULES,
    LAG_PRESETS: LAG_PRESETS, lagProfile: lagProfile, lagSummary: lagSummary,
    Game: Game, step: step, score: score, verdict: verdict, mergeParams: mergeParams,
    mulberry32: mulberry32, roundStep: roundStep
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FedModel = api;
})(typeof window !== 'undefined' ? window : this);
