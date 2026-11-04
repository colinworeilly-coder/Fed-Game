'use strict';
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/model.js');
const News = require('../js/news.js');

const quiet = { noiseD: 0, noiseZ: 0, noiseC: 0 };
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test('with no shocks and a neutral rate the economy stays at the goals', () => {
  const g = new M.Game({ seed: 1, scenario: 'none', params: quiet });
  for (let q = 0; q < g.p.quarters; q++) g.play(g.p.rStar + g.p.piStar);
  for (const r of g.hist) {
    close(r.pi, g.p.piStar); close(r.u, g.p.uStar); close(r.g, g.p.gBar); close(r.S, g.p.piStar + g.p.gBar);
  }
});

test('every quarter satisfies the AD and SRAS equations', () => {
  const g = new M.Game({ seed: 42, scenario: 'oil' });
  while (!g.done()) g.play(3 + Math.sin(g.quarter()));
  for (const r of g.hist) {
    close(r.pi + r.g, r.S, 1e-9);                                     // AD: pi + g = M~ + v~
    close(r.pi, r.Ee + g.p.kappa * (r.g - r.gStar) + r.c, 1e-9);      // SRAS
  }
});

test('a higher funds rate lowers spending growth, inflation and growth', () => {
  const lo = new M.Game({ seed: 3, scenario: 'none', params: quiet });
  const hi = new M.Game({ seed: 3, scenario: 'none', params: quiet });
  lo.play(3); hi.play(5);
  assert.ok(hi.last().S < lo.last().S);
  assert.ok(hi.last().pi < lo.last().pi);
  assert.ok(hi.last().g < lo.last().g);
  assert.ok(hi.last().u > lo.last().u);
});

test('the policy lag spreads a rate change over several quarters', () => {
  const g = new M.Game({ seed: 3, scenario: 'none', params: quiet });
  const S = [];
  for (let q = 0; q < 4; q++) { g.play(5); S.push(g.last().S); }
  assert.ok(S[1] < S[0], 'second quarter bites harder than the first');
});

test('the funds rate cannot go below zero; QE adds weaker stimulus', () => {
  const noQE = new M.Game({ seed: 5, scenario: 'none', params: Object.assign({ qe: false }, quiet) });
  noQE.play(-2);
  assert.equal(noQE.last().i, 0); assert.equal(noQE.last().iEff, 0);
  const qe = new M.Game({ seed: 5, scenario: 'none', params: quiet });
  qe.play(-2);
  assert.equal(qe.last().i, 0); assert.equal(qe.last().qe, 2); close(qe.last().iEff, -1);
  assert.ok(qe.last().S > noQE.last().S);
});

test('the same seed reproduces the same economy', () => {
  const a = new M.Game({ seed: 99 }), b = new M.Game({ seed: 99 });
  assert.equal(a.scenarioKey, b.scenarioKey); assert.equal(a.onset, b.onset);
  for (let q = 0; q < 16; q++) { a.play(4); b.play(4); }
  assert.deepEqual(a.hist, b.hist);
});

test('counterfactuals use the same shocks as the player', () => {
  const g = new M.Game({ seed: 8, scenario: 'fear' });
  while (!g.done()) g.play(g.last().set);
  const hold = g.counterfactual('hold');
  hold.forEach((r, t) => close(r.pi, g.hist[t].pi, 1e-12));
});

test('calibration: doing nothing usually fails, the Taylor rule usually passes', () => {
  const N = 60;
  const summary = {};
  for (const k of M.SCENARIO_KEYS) {
    let holdOk = 0, taylorOk = 0, taylorBetter = 0;
    for (let s = 1; s <= N; s++) {
      const g = new M.Game({ seed: s, scenario: k });
      const h = M.score(g.p, g.counterfactual('hold').slice(g.p.history));
      const t = M.score(g.p, g.counterfactual('taylor').slice(g.p.history));
      holdOk += h.verdict.ok; taylorOk += t.verdict.ok; taylorBetter += t.dist < h.dist;
    }
    summary[k] = { holdOk, taylorOk, taylorBetter };
  }
  for (const k of ['fear', 'boom', 'financial', 'fiscal', 'austerity']) {
    assert.ok(summary[k].holdOk < N * 0.2, `${k}: holding the rate should usually fail`);
    assert.ok(summary[k].taylorBetter > N * 0.9, `${k}: the Taylor rule should beat doing nothing`);
  }
  for (const k of ['fear', 'boom', 'fiscal', 'austerity', 'pandemic', 'tech', 'exports'])
    assert.ok(summary[k].taylorOk > N * 0.9, `${k}: the Taylor rule should usually be reappointed`);
  assert.ok(summary.exports.holdOk > N * 0.8, 'a strong dollar is mild enough to ride out');
  assert.ok(summary.financial.taylorOk < N * 0.2, 'the financial crisis is the hard case');
});

test('every scenario produces headlines', () => {
  for (const k of M.SCENARIO_KEYS.concat(['none'])) {
    const g = new M.Game({ seed: 4, scenario: k });
    while (!g.done()) {
      g.play(g.last().set);
      const n = News.headline(g, g.hist.length - 1);
      assert.ok(n.head.length > 10 && n.deck.length > 10, k);
    }
  }
});

test('policy-lag setting: default level keeps the single-stage lag', () => {
  const p = M.mergeParams({});
  assert.equal(p.lags, 1); assert.equal(p.lagStages, 1); assert.equal(p.omega, 0.5); assert.equal(p.lagVar, 0);
  const q = M.mergeParams({ lags: 4, omega: 0.6 });
  assert.equal(q.omega, 0.6, 'an explicit omega overrides the preset');
  assert.equal(q.lagStages, M.LAG_PRESETS[4].lagStages);
});

test('higher lag settings delay the effect of a rate change', () => {
  let lastHalf = 0, lastFirst = Infinity;
  for (let L = 0; L < M.LAG_PRESETS.length; L++) {
    const p = M.mergeParams({ lags: L });
    const s = M.lagSummary(p);
    assert.ok(s.half >= lastHalf, `level ${L}: half-life should not shrink`);
    lastHalf = s.half;
    // Same hike, no noise and no lag randomness: first-quarter bite gets smaller.
    const g = new M.Game({ seed: 2, scenario: 'none', params: Object.assign({ lags: L, lagVar: 0 }, quiet) });
    g.play(6);
    const bite = (g.p.piStar + g.p.gBar) - g.last().S;
    assert.ok(bite > 0 && bite <= lastFirst + 1e-12, `level ${L}: first-quarter effect should shrink`);
    lastFirst = bite;
    // The full effect eventually arrives.
    const prof = M.lagProfile(p, 60);
    close(prof[59], 1, 1e-3);
  }
  assert.ok(lastHalf >= 5, 'the longest setting takes over a year to reach half its effect');
});

test('variable lags are random but reproducible, and do not change the shocks', () => {
  const a = new M.Game({ seed: 77, scenario: 'fear', params: { lags: 3 } });
  const b = new M.Game({ seed: 77, scenario: 'fear', params: { lags: 3 } });
  const c = new M.Game({ seed: 77, scenario: 'fear', params: { lags: 1 } });
  for (let q = 0; q < 16; q++) { a.play(2); b.play(2); c.play(2); }
  assert.deepEqual(a.hist, b.hist);
  const speeds = a.played().map(r => r.w);
  assert.ok(Math.max(...speeds) - Math.min(...speeds) > 0.1, 'speed should vary from quarter to quarter');
  assert.ok(c.played().every(r => r.w === 0.5), 'predictable lags have a constant speed');
  a.shocks.forEach((sh, t) => { assert.equal(sh.d, c.shocks[t].d); assert.equal(sh.z, c.shocks[t].z); });
  assert.equal(a.scenarioKey, c.scenarioKey); assert.equal(a.onset, c.onset);
});
