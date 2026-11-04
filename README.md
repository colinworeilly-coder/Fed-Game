# The Fed Game

A classroom monetary policy game. You chair the Fed for one four-year term. Each
quarter you set the federal funds rate and try to keep inflation near 2% and
unemployment near its natural rate while the economy is hit by a shock you have
to diagnose from the news and the data.

Behind the game is a quarterly version of the dynamic AD–AS model in Cowen &
Tabarrok, *Modern Principles of Economics* (ch. 13, 15, 16; macro ch. 32, 34,
35): AD from π + g = M̃ + ṽ, a vertical LRAS at the Solow growth rate, and an
SRAS curve indexed by expected inflation. The funds rate moves spending growth
through the real interest rate, with a lag.

The game is an independent teaching tool, inspired by the San Francisco Fed's
discontinued *Chair the Fed* game. It is not affiliated with the Federal
Reserve.

## What's on screen

* **Time-series chart** of inflation, unemployment and the funds rate, with the
  goals marked, and a hover readout for every quarter.
* **AD–AS diagram** for the current quarter in C&T's growth–inflation space,
  with last quarter's curves ghosted, so students see which curve moved and why.
* **Newspaper headlines** that describe the shock without naming it.
* **Data tiles**: inflation, unemployment, growth, the funds rate, expected
  inflation, the real rate, and a Fed credibility meter.
* **Results screen**: grade, the shock revealed with the textbook lesson, and a
  comparison with a Taylor rule and with never changing the rate, under the
  same shocks.
* **Data table** with copy and CSV export for homework.

## Running it

No build step and no dependencies. Either:

* open `index.html` in a browser, or
* serve the folder (for example with GitHub Pages) and share the link, or
* run `npm run build` and hand out the single file `dist/fed-game.html`.

## For instructors

* [`docs/CLASSROOM.md`](docs/CLASSROOM.md): a demo activity, a play session,
  discussion prompts, homework ideas and URL parameters.
* [`docs/MODEL.md`](docs/MODEL.md): equations, parameters, how they map to the
  textbook, the ten shocks, scoring, and a calibration check.
* The **Instructor** button sets the shock, its timing, the random seed, the
  natural rate, the Solow rate, the term length and a **policy lags** slider
  (from short and predictable to long and variable), and gives a link that
  recreates the same economy for the whole class.

## Development

```
npm test        # model tests (Node 18+)
npm run build   # writes dist/fed-game.html
```

| File | Contents |
|---|---|
| `js/model.js` | The model, shocks, benchmark rules and scoring (runs in browser and Node) |
| `js/news.js` | Headlines |
| `js/charts.js` | SVG charts, no libraries |
| `js/app.js` | Interface |
| `css/style.css` | Styles, light and dark |
| `tests/model.test.js` | Tests, including a calibration check |
