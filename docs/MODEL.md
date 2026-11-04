# The model behind the Fed Game

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
| Short-run aggregate supply | π<sub>t</sub> = E<sub>t</sub>π + κ·(g<sub>t</sub> − g\*<sub>t</sub>) + c<sub>t</sub> | SRAS passes through LRAS at expected inflation; sticky wages and prices give it a positive slope. c is a cost shock (shifts SRAS). |
| Expectations | E<sub>t+1</sub>π = (1 − a<sub>t</sub>)·[E<sub>t</sub>π + λ·(π<sub>t</sub> − E<sub>t</sub>π)] + a<sub>t</sub>·π\* | Expectations adjust toward actual inflation ("eventually inflation expectations adjust"). A credible Fed anchors them. |
| Credibility | a<sub>t</sub> = anchor · cred<sub>t</sub>; cred rises 0.03 a quarter when \|π − π\*\| < 1, falls 0.03·(\|π − π\*\| − 1) otherwise | Credible monetary policy. |
| Unemployment (Okun) | u<sub>t</sub> = u<sub>t−1</sub> − β·(g<sub>t</sub> − ḡ − θ·z<sub>t</sub>)/4 | Recessions are periods of growth below normal, when unemployment rises. |
| Policy rate | i<sub>t</sub> = max(set<sub>t</sub>, 0); i<sup>eff</sup><sub>t</sub> = i<sub>t</sub> − φ·QE<sub>t</sub> | The funds rate has a zero lower bound; QE is a weaker substitute below it. |

Solving AD and SRAS together each quarter:

g<sub>t</sub> = (S<sub>t</sub> − E<sub>t</sub>π − c<sub>t</sub> + κ·g\*<sub>t</sub>) / (1 + κ),  π<sub>t</sub> = S<sub>t</sub> − g<sub>t</sub>.

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

## Parameters

| Symbol | Value | Meaning |
|---|---|---|
| ḡ | 3.0% | Normal Solow growth rate (C&T's running example) |
| π\* | 2.0% | Inflation goal |
| u\* | 4.5% | Natural rate of unemployment |
| r\* | 2.0% | Neutral real rate; neutral funds rate is about 4% when E(π) = 2% |
| κ | 0.5 | SRAS slope |
| α | 1.0 | Spending-growth response to the real-rate gap |
| ω | 0.5 | Share of the gap passed through each stage per quarter (set by the lag slider) |
| k | 1 | Number of lag stages (set by the lag slider) |
| σ | 0 | Variability of the lag (set by the lag slider) |
| γ | 0.6 | Self-correction of spending to unemployment slack |
| λ | 0.3 | Adaptive-expectations speed per quarter |
| anchor | 0.12 | Maximum quarterly pull of expectations toward π\* |
| β | 0.5 | Okun coefficient |
| θ | 0.5 | Share of a real shock that shows up as productivity, not jobs |
| φ | 0.5 | A QE "round" is half as strong as an equal rate cut |
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
| 0 | Short and predictable | 1 | 0.8 | 0 | 1 qtr | 2 qtrs | 2.15 | 0.92 | 87% |
| 1 | Moderate and predictable (default) | 1 | 0.5 | 0 | 1 qtr | 4 qtrs | 2.07 | 0.96 | 86% |
| 2 | Longer and somewhat variable | 2 | 0.5 | 0.35 | 2 qtrs | 6 qtrs | 1.98 | 1.02 | 84% |
| 3 | Long and variable | 2 | 0.35 | 0.55 | 4 qtrs | 9 qtrs | 1.87 | 1.11 | 79% |
| 4 | Very long and variable | 3 | 0.35 | 0.75 | 6 qtrs | 12 qtrs | 1.79 | 1.19 | 71% |

(200 seeds per shock; "AD shocks" are fear, boom, fiscal expansion and fiscal
tightening.) As lags lengthen, a rule that reacts to last quarter's data does
worse, and the gap between active policy and doing nothing narrows. That is the
classic argument for caution, or for rules, when lags are long and variable.
At the default setting the game is identical to earlier versions.

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
| A wave of fear | 2.04 | 2% | 0.98 | 100% |
| Stock market and housing boom | 2.22 | 0% | 1.02 | 100% |
| Financial crisis | 4.12 | 0% | 1.78 | 0% |
| Oil price shock | 1.43 | 29% | 1.20 | 81% |
| Productivity boom | 1.20 | 65% | 0.79 | 100% |
| Fiscal expansion | 2.05 | 1% | 0.95 | 100% |
| Strong dollar | 0.72 | 97% | 0.45 | 100% |
| Fiscal tightening | 1.97 | 3% | 0.92 | 100% |
| Pandemic | 1.51 | 17% | 1.01 | 100% |
| Trade war | 1.49 | 17% | 1.19 | 83% |

Patterns worth pointing out in class:

* AD shocks are the "best case" (ch. 16): a timely response gets both goals
  back, and the Taylor rule does far better than doing nothing.
* Real shocks (oil, trade war) are the dilemma: no policy keeps both goals
  close, and even the Taylor rule only scrapes by.
* The financial crisis drives the right rate below zero. The Taylor rule hits
  the zero lower bound; a player who cuts early and adds QE can do better than
  the rule, but rarely gets an A.
* Two shocks (strong dollar, productivity boom) can often be ridden out without
  any change, as in the original San Francisco Fed game. Not every shock needs
  a response.
