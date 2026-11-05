# The model behind Long and Variable

The game runs a quarterly, discrete-time version of the dynamic AD–AS model in
Cowen & Tabarrok, *Modern Principles of Economics* (4th ed.):

* ch. 13 (macro ch. 32), *Business Fluctuations: Aggregate Demand and Supply*:
  the AD curve from the dynamic quantity theory, the vertical LRAS curve at the
  Solow growth rate, and the upward-sloping SRAS curve indexed by expected
  inflation;
* ch. 15 (macro ch. 34), *The Federal Reserve System and Open Market
  Operations*: the federal funds rate as the operating target, open market
  operations, quantitative easing at the zero lower bound;
* ch. 16 (macro ch. 35), *Monetary Policy*: the "best case" of an AD shock, the
  negative-real-shock dilemma, lags and uncertainty, credibility and
  disinflation.

Everything is in percent per year. A period is one quarter; flows are
annualized. The code is in [`js/model.js`](../js/model.js).

## Equations

| Block | Equation | C&T counterpart |
|---|---|---|
| Aggregate demand | π<sub>t</sub> + g<sub>t</sub> = S<sub>t</sub> | AD: inflation + real growth = M̃ + ṽ. A line with slope −1 in (g, π) space. |
| Spending growth | S<sub>t</sub> = E<sub>t</sub>π + ḡ − α·m<sub>t</sub> + γ·(u<sub>t−1</sub> − u\*) + d<sub>t</sub> | What shifts AD: monetary policy (via m), confidence, wealth, taxes, government spending, net exports (via d). |
| Policy transmission | m<sub>t</sub> = (1 − ω<sub>t</sub>)·m<sub>t−1</sub> + ω<sub>t</sub>·(i<sup>eff</sup><sub>t</sub> − E<sub>t</sub>π − r\*), passed through k stages | "Uncertain lags": the real-rate gap reaches spending gradually, and with variable lags at an uncertain speed. See [Policy lags](#policy-lags). |
| Long-run aggregate supply | g\*<sub>t</sub> = ḡ + z<sub>t</sub> | LRAS is vertical at the Solow growth rate; real shocks z move it. |
| Short-run aggregate supply | π<sub>t</sub> = E<sub>t</sub>π + κ·(g<sub>t</sub> − g\*<sub>t</sub>) + φ·(u\* − u<sub>t−1</sub>) + c<sub>t</sub> | SRAS passes through LRAS at expected inflation; sticky wages and prices give it a positive slope. While unemployment is below its natural rate, workers push for raises to catch up with prices, so SRAS keeps shifting up (the φ term). c is a cost shock. |
| Expectations | E<sub>t+1</sub>π = (1 − a<sub>t</sub>)·[E<sub>t</sub>π + λ·(π<sub>t</sub> − E<sub>t</sub>π)] + a<sub>t</sub>·π\* | Expectations adjust toward actual inflation ("eventually inflation expectations adjust"). A credible Fed anchors them; with anchoring switched off, a = 0 and expectations are purely adaptive. |
| Credibility | a<sub>t</sub> = anchor · cred<sub>t</sub>; cred starts the term at the instructor's setting, then rises 0.03 a quarter when \|π − π\*\| < 1 and falls 0.03·(\|π − π\*\| − 1) otherwise | Credible monetary policy. See [Credibility](#credibility). |
| Unemployment (Okun) | u<sub>t</sub> = u<sub>t−1</sub> − β·(g<sub>t</sub> − ḡ − θ·z<sub>t</sub>)/4 | Recessions are periods of growth below normal, when unemployment rises. |
| Policy rate | i<sub>t</sub> = max(set<sub>t</sub>, 0); i<sup>eff</sup><sub>t</sub> = i<sub>t</sub> − ψ·QE<sub>t</sub> | The funds rate has a zero lower bound; QE is a weaker substitute below it. |

Solving AD and SRAS together each quarter:

g<sub>t</sub> = (S<sub>t</sub> − E<sub>t</sub>π − φ·(u\* − u<sub>t−1</sub>) − c<sub>t</sub> + κ·g\*<sub>t</sub>) / (1 + κ),  π<sub>t</sub> = S<sub>t</sub> − g<sub>t</sub>.

So a one-point increase in spending growth raises growth by 1/(1+κ) = 0.67
points and inflation by κ/(1+κ) = 0.33 points on impact, which is C&T's
statement that "in the short run, an increase in spending will be split between
increases in inflation and increases in real growth."

### Why these choices

* **The interest rate enters through spending growth.** C&T express monetary
  policy as a change in M̃ that shifts AD. Ch. 15 explains that in practice the
  Fed buys or sells bonds until the funds rate hits its target. The game turns
  that around: the player chooses the funds rate, and the real-rate gap moves
  S = M̃ + ṽ. When the real rate equals its neutral value r\*, spending grows at
  expected inflation plus normal real growth, so the economy stays put.
* **Real rates matter.** Spending depends on i − E(π). If expectations drift up
  and the funds rate is left alone, policy loosens. Players have to move the
  funds rate more than one-for-one with inflation to stabilize it (the Taylor
  principle). Leaving the rate unchanged is therefore not neutral; it is the
  "Fed does too much" or "too little" case, depending on the shock.
* **Self-correction (γ).** Under a fixed money-growth rule, C&T's model returns
  to the Solow rate on its own as expectations adjust. Under a fixed *interest
  rate* that mechanism is missing, so the γ term stands in for the slow natural
  recovery of spending when slack is large (pent-up demand for durables and
  investment). Without policy help, recovery is slow.
* **Okun's law with θ.** C&T describe both AD shocks and real shocks as causing
  recessions. Unemployment therefore responds to growth relative to its normal
  pace ḡ. When growth changes because of a real shock, half of the change
  (θ = 0.5) is in output per worker rather than in jobs. This lets a negative
  real shock raise both inflation and unemployment (the ch. 16 dilemma) and a
  productivity boom lower inflation without an unemployment collapse.
* **Labor-market pressure in SRAS (φ).** Without the φ term, SRAS responds
  only to growth relative to the Solow rate. Expected inflation and
  unemployment are then running totals of the same growth gaps:
  ΔE(π) = λκ(g − g\*) and Δu = −(β/4)(g − ḡ), so with anchoring off
  E(π) − 2 = −1.2·(u − u\*). Bringing unemployment back to its natural rate
  after a boom takes a spell of below-Solow growth, which undoes exactly the
  rise in expectations, so inflation always drifts back to its starting rate.
  The φ term makes inflation depend on the *level* of slack as well. Over an
  episode, E(π)<sub>end</sub> − E(π)<sub>start</sub> = −1.2·(u<sub>end</sub> −
  u<sub>start</sub>) + λφ·(point-quarters of unemployment below its natural
  rate). Once unemployment is back at its natural rate the first term is zero
  and the second remains, so a lasting stimulus can leave the economy on LRAS
  at a higher inflation rate, as in C&T's long-run analysis. This is the
  standard expectations-augmented Phillips curve, and C&T's own account of
  SRAS shifting up as "workers demand even higher wages to catch up."

## Parameters

| Symbol | Value | Meaning |
|---|---|---|
| ḡ | 3.0% | Normal Solow growth rate (C&T's running example) |
| π\* | 2.0% | Inflation goal |
| u\* | 4.5% | Natural rate of unemployment |
| r\* | 2.0% | Neutral real rate; neutral funds rate is about 4% when E(π) = 2% |
| κ | 0.5 | SRAS slope |
| φ | 0.3 | SRAS shift per point of unemployment below its natural rate |
| α | 1.0 | Spending-growth response to the real-rate gap |
| ω | 0.5 | Share of the gap passed through each stage per quarter (set by the lag slider) |
| k | 1 | Number of lag stages (set by the lag slider) |
| σ | 0 | Variability of the lag (set by the lag slider) |
| γ | 0.6 | Self-correction of spending to unemployment slack |
| λ | 0.3 | Adaptive-expectations speed per quarter |
| anchor | 0.12 | Maximum quarterly pull of expectations toward π\* (0 when anchoring is switched off) |
| β | 0.5 | Okun coefficient |
| θ | 0.5 | Share of a real shock that shows up as productivity, not jobs |
| ψ | 0.5 | A QE "round" is half as strong as an equal rate cut |
| step | 0.25 | Size of one rate move |

Small random disturbances hit AD (an AR(1) with persistence 0.5, s.d. 0.5),
LRAS (s.d. 0.25) and SRAS (s.d. 0.2) every quarter. Instructors can change the
natural rate, the Solow rate, the term length and the QE option from the
**Instructor** panel or the URL.

## Policy lags

The **Policy lags** slider in the Instructor panel (URL parameter `lags=0…4`)
sets how long monetary policy takes to work and how predictable that timing
is, in the spirit of Friedman's "long and variable lags" and C&T's warning that
the Fed's control is "subject to uncertain lags."

*Length.* The real-rate gap passes through k first-order smoothing stages, each
with speed ω. With one stage the effect starts at once and decays
geometrically; with two or three stages the response is hump-shaped and builds
over several quarters. The mean lag is k(1 − ω)/ω quarters.

*Variability.* Each quarter the speed is ω<sub>t</sub> = ω·exp(σε<sub>t</sub> −
σ²/2), with ε<sub>t</sub> ~ N(0,1), clipped to [0.05, 0.95]. The same rate
move can therefore bite quickly in one game and slowly in another. The lag
draws come from their own random stream, so changing the slider does not
change the shocks a given seed produces, and the end-of-game benchmarks face
the same lag draws as the player.

| Level | Setting | k | ω | σ | Half of effect after | 90% after | AD shocks: never change (median) | AD shocks: Taylor rule (median) | Taylor rule reappointed, all shocks |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Short and predictable | 1 | 0.8 | 0 | 1 qtr | 2 qtrs | 2.68 | 0.96 | 90% |
| 1 | Moderate and predictable (default) | 1 | 0.5 | 0 | 1 qtr | 4 qtrs | 2.53 | 1.01 | 89% |
| 2 | Longer and somewhat variable | 2 | 0.5 | 0.35 | 2 qtrs | 6 qtrs | 2.37 | 1.07 | 86% |
| 3 | Long and variable | 2 | 0.35 | 0.55 | 4 qtrs | 9 qtrs | 2.20 | 1.17 | 78% |
| 4 | Very long and variable | 3 | 0.35 | 0.75 | 6 qtrs | 12 qtrs | 2.09 | 1.26 | 69% |

(200 seeds per shock; "AD shocks" are fear, boom, fiscal expansion and fiscal
tightening.) As lags lengthen, a rule that reacts to last quarter's data does
worse, and the gap between active policy and doing nothing narrows. That is the
classic argument for caution, or for rules, when lags are long and variable.
At the default setting the lag is the original single-stage lag.

## Credibility

Credibility (0–100%) measures how firmly the public expects 2% inflation. It
enters only through the expectations equation, as the weight a = 0.12 × cred
that pulls expected inflation toward 2% each quarter:

* At 100%, about 12% of any gap between expected inflation and 2% closes each
  quarter on its own (a half-life of about five quarters), so SRAS drifts back
  toward 2% without the Fed having to create as much slack.
* At 0%, expectations are purely adaptive: they follow realized inflation and
  nothing pulls them back to target.

It rises 3 points a quarter while inflation is within 1 point of 2%, and
falls 3 points for each point of miss beyond that band (undershooting counts
the same as overshooting). It is quick to lose and slow to rebuild: from zero
to 100% takes 34 on-target quarters.

The **Starting credibility** slider in the Instructor panel (URL parameter
`cred=0…100`, default 100) sets credibility at the start of the term; it is
held at that level through the pre-game quarters. Starting expectations are
2% at every setting, so a low setting gives a Fed whose 2% target is not yet
believed, not an economy that has already inherited high inflation. The
opening headline tells players when markets doubt the Fed.

Starting credibility at 0% does not switch anchoring off for the whole game:
credibility rebuilds whenever inflation is within a point of 2%. To make
expectations purely adaptive throughout, untick **Anchor expectations to 2%**
in the Instructor panel (URL parameter `anchor=0`). The credibility meter then
reads "Off."

| Starting credibility | AD shocks: never change (median) | AD shocks: Taylor rule (median) | Taylor rule reappointed, all shocks | Never change reappointed, all shocks | Oil shock: Taylor / never change |
|---|---|---|---|---|---|
| 100% (default) | 2.53 | 1.01 | 89% | 25% | 1.14 / 1.37 |
| 75% | 2.72 | 1.03 | 88% | 22% | 1.15 / 1.49 |
| 50% | 3.11 | 1.09 | 83% | 17% | 1.18 / 1.78 |
| 25% | 3.56 | 1.18 | 73% | 14% | 1.23 / 2.24 |
| 0% | 3.85 | 1.29 | 57% | 13% | 1.31 / 2.51 |
| Anchoring off | 3.89 | 1.32 | 54% | 12% | 1.32 / 2.52 |

(200 seeds per shock; "AD shocks" are fear, boom, fiscal expansion and fiscal
tightening.) Without credibility every shock leaves a longer trail in
expectations. Passive policy suffers most, because a fixed funds rate lets the
real rate fall as expectations rise. Supply shocks such as oil become much
harder, which is C&T's point that credible policy makes disinflation cheaper.

## A lasting stimulus: moving up LRAS

C&T's long-run experiment is a permanent rise in money growth: AD shifts right
once, expectations catch up, and the economy returns to the Solow growth rate
at a higher inflation rate. Two things matter for reproducing it in the game.

1. **Policy.** Holding the funds rate low is not a one-time rise in money
   growth. As expected inflation rises the real rate keeps falling, so AD keeps
   shifting right and inflation accelerates without limit (Wicksell's
   cumulative process; Friedman's point that the Fed cannot peg the interest
   rate). The game's version of a one-time increase is to cut for a while and
   then raise the funds rate one-for-one with expected inflation, keeping the
   real rate at its neutral 2% (the "Real interest rate" tile shows it).
2. **Settings.** Switch anchoring off; otherwise expectations are pulled back
   to 2%, which is the point of a credible inflation target.

With anchoring off, the funds rate at 0% for six quarters and then a neutral
real rate (no random shocks):

| φ | Inflation after 6 years | Inflation after 12 years | Expected inflation, 12 years | Growth / unemployment, 12 years |
|---|---|---|---|---|
| 0 | 2.9% | 2.3% (drifting back to 2%) | 2.3% | 2.9% / 4.2% |
| 0.15 | 4.0% | 3.9% | 3.9% | 3.0% / 4.3% |
| 0.3 (default) | 4.9% | 4.9% | 4.9% | 3.0% / 4.4% |

With the default φ, about 31 point-quarters of unemployment below its natural
rate leave expectations λφ × 31 ≈ 2.8 points higher, and the economy settles on
LRAS with inflation near 5%. Use `?scenario=none&quarters=24&anchor=0` for a
classroom demonstration.

## Shocks

One major shock hits each game, in a random quarter between 2 and 5. Students
are not told which. The categories follow C&T's tables of factors that shift
AD and LRAS.

| Shock | Curve | Profile |
|---|---|---|
| A wave of fear | AD left | −4.5 points of spending growth, decaying at 0.82 a quarter |
| Stock market and housing boom | AD right | +3.8, decaying at 0.9 |
| Financial crisis | AD far left, LRAS left | −7, decaying at 0.9; LRAS −1, decaying at 0.8 |
| Oil price shock | LRAS and SRAS left, AD slightly left | LRAS −4, −3, −1.5, then a partial rebound; cost shock +2, +1.5, +1, +0.5 |
| Productivity boom | LRAS right | +2.5 for two years, plus a small investment boost to AD |
| Fiscal expansion | AD right | +3, decaying slowly (0.94) |
| Strong dollar | AD left, mild | −2, decaying at 0.7 |
| Fiscal tightening | AD left | −3, decaying at 0.92 |
| Pandemic | LRAS and AD collapse, then rebound | AD −7 then a sustained rebound; LRAS −6 then recovers |
| Trade war | LRAS left, AD slightly left | LRAS −2.5 for a year; cost shock; retaliation trims AD |

## Scoring

Each quarter's miss is (π − 2)² + (u − u\*)². The **distance from goals** is the
square root of the average miss over the term, in percentage points.

| Distance | Grade | Outcome |
|---|---|---|
| < 0.7 | A | Reappointed with acclaim |
| 0.7 – 1.0 | B | Reappointed |
| 1.0 – 1.3 | C | Narrowly reappointed |
| 1.3 – 2.0 | D | Not reappointed |
| ≥ 2.0 | F | Not reappointed |

At the end of the game the same shocks are replayed under two benchmark
policies so students can compare:

* **Never change the rate**: the funds rate stays where it started.
* **Taylor rule**: i = r\* + π̄ + 0.5(π̄ − 2) + 0.5·gap, where π̄ is inflation
  over the past four quarters and the output gap is −2(u − u\*) from Okun's law.

### Calibration check

Median distance and share of games reappointed, 200 random seeds per shock
(`npm test` checks the main patterns):

| Shock | Never change: median | reappointed | Taylor rule: median | reappointed |
|---|---|---|---|---|
| A wave of fear | 2.49 | 0% | 1.01 | 100% |
| Stock market and housing boom | 2.74 | 0% | 1.07 | 97% |
| Financial crisis | 5.42 | 0% | 1.89 | 0% |
| Oil price shock | 1.37 | 43% | 1.14 | 99% |
| Productivity boom | 1.23 | 57% | 0.75 | 100% |
| Fiscal expansion | 2.53 | 0% | 1.00 | 99% |
| Strong dollar | 0.81 | 90% | 0.44 | 100% |
| Fiscal tightening | 2.42 | 0% | 0.96 | 100% |
| Pandemic | 1.60 | 16% | 1.03 | 99% |
| Trade war | 1.38 | 44% | 1.06 | 100% |

Patterns worth pointing out in class:

* AD shocks are the "best case" (ch. 16): a timely response gets both goals
  back, and the Taylor rule does far better than doing nothing.
* Real shocks (oil, trade war) are the dilemma: no policy keeps both goals
  close. The Taylor rule usually scrapes by with a C, and doing nothing fails
  more often than not.
* The financial crisis drives the right rate below zero. The Taylor rule hits
  the zero lower bound; a player who cuts early and adds QE can do better than
  the rule, but rarely gets an A.
* Two shocks (strong dollar, productivity boom) can often be ridden out without
  any change, as in the original San Francisco Fed game. Not every shock needs
  a response.
