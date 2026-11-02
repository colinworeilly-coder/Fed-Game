# Using the Fed Game in class

These activities assume students have seen the AD–AS model (C&T ch. 13) and
are starting, or have finished, the chapters on the Fed and monetary policy
(ch. 15–16).

## 1. Demo: what happens if the Fed does nothing (15 minutes)

1. Open **Instructor**, leave the shock on *Random*, tick **Classroom demo**,
   and start. The game holds the funds rate and plays a quarter every two
   seconds. (Or use a link such as `index.html?demo=1&seed=2027`.)
2. Point out the goals on the chart: 2% inflation (orange dashed line) and the
   natural rate of unemployment (blue dashed line). Point out the funds rate
   (green line) and that it starts near its neutral level of about 4%.
3. Have students record each quarter's inflation, unemployment and funds rate,
   and the headline.
4. At the end, the results screen names the shock and shows what a Taylor rule
   would have done with the same shocks.

Debrief questions:

* Which curve did the shock move first, AD or LRAS? How could you tell from the
  headlines and from the AD–AS panel?
* What were the worst values of inflation and unemployment?
* Why did inflation expectations (SRAS) keep moving even after the shock faded?
* What should the Fed have done, and when?

## 2. Students play (20–30 minutes, pairs work well)

Each pair plays at least two games. Ask them to keep a one-line log per
quarter: the rate they chose and why.

To give the whole class the **same economy**, choose a shock and a seed in the
**Instructor** panel and share the link it shows (for example
`index.html?scenario=oil&seed=31`). Results are then directly comparable, and
the class can discuss why some pairs did better.

Suggested assignment of shocks:

| Goal | Shocks |
|---|---|
| The "best case" for monetary policy | `fear`, `austerity`, `boom`, `fiscal` |
| The real-shock dilemma | `oil`, `tariffs` |
| Zero lower bound and QE | `financial` |
| Not every shock needs a response | `exports`, `tech` |
| Two-sided shocks | `pandemic` |

## 3. Discussion prompts

* **Lags.** Rate changes take a few quarters to work (C&T: "uncertain lags").
  Did you overreact? Did you wait too long?
* **Real rates.** When inflation expectations rose, what happened to the real
  interest rate if you left the funds rate alone? Why must the funds rate rise
  by more than inflation to cool the economy?
* **The dilemma.** In the oil-shock game, could any policy have kept both
  inflation and unemployment on target? Which goal did you prioritize?
* **Credibility.** What happened to the credibility meter when inflation stayed
  high? How did that change the cost of bringing inflation down?
* **Rules vs. discretion.** Did you beat the Taylor rule? In which shocks did
  discretion help, and where did the rule do better?
* **The zero lower bound.** In the financial crisis, what happened when the
  rate hit zero? How effective was QE compared with a rate cut?

## 4. Homework ideas

1. Play three games. Attach the results screen (or the copied data table) and
   answer: which shock hit, which curve moved, what you did, and what you would
   do differently.
2. Using the data table from one game, plot inflation against real GDP growth
   quarter by quarter. Identify the quarters where AD shifted and where SRAS
   shifted.
3. Play the oil shock twice with the same seed: once fighting inflation hard,
   once keeping unemployment low. Compare the two outcomes and relate them to
   C&T's discussion of the negative real shock dilemma.

## URL parameters

| Parameter | Example | Effect |
|---|---|---|
| `scenario` | `oil` | Fix the shock: `fear`, `boom`, `financial`, `oil`, `tech`, `fiscal`, `exports`, `austerity`, `pandemic`, `tariffs`, `none` |
| `seed` | `2027` | Fix the random numbers (same seed and shock = same economy) |
| `onset` | `3` | Quarter in which the shock hits |
| `quarters` | `20` | Length of the term |
| `ustar` | `5` | Natural rate of unemployment |
| `gbar` | `2.5` | Solow growth rate |
| `qe` | `0` | Disable quantitative easing |
| `demo` | `1` | Classroom demo: hold the rate and auto-play |
