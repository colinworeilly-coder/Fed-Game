/*
 * Long and Variable: news headlines
 * Each quarter the game prints a headline. When a shock first hits (and
 * for two quarters after) the headline describes it, without naming the
 * shock's category. Otherwise the headline reports the data.
 */
(function (root) {
  'use strict';

  var SHOCK_NEWS = {
    fear: [
      ['Consumer confidence plunges to its lowest level in a decade', 'Households put off buying cars and homes, and firms shelve expansion plans.'],
      ['Retailers report weak sales as shoppers stay cautious', 'Surveys show families saving more and worrying about their jobs.'],
      ['Business investment falls again', 'Executives say they will wait for "more clarity" before hiring or building.']
    ],
    boom: [
      ['Stocks hit record highs as home prices soar', 'Rising wealth sends shoppers to car dealers and furniture stores.'],
      ['Mortgage applications jump as buyers bid over asking price', 'Homeowners tap rising equity to fund renovations and vacations.'],
      ['Spending stays hot; help-wanted signs everywhere', 'Restaurants and builders say they cannot hire fast enough.']
    ],
    financial: [
      ['Major lender collapses as the housing market crashes', 'Banks stop lending to each other. Credit dries up for households and firms.'],
      ['Bank failures spread; stocks fall sharply', 'Depositors line up to withdraw cash. Firms cannot roll over their loans.'],
      ['Credit stays frozen as fear grips markets', 'Lenders demand far higher rates on anything but government bonds.']
    ],
    oil: [
      ['Oil prices double as conflict cuts world supply', 'Gasoline prices spike. Airlines and truckers raise fares.'],
      ['Factories cut shifts as energy costs bite', 'Higher fuel bills leave consumers less to spend on everything else.'],
      ['Oil eases from its peak but stays high', 'Firms keep passing higher energy costs on to customers.']
    ],
    tech: [
      ['New technology sparks a surge in productivity', 'Firms report big gains in output per worker as new tools spread.'],
      ['Productivity growth hits its fastest pace in 20 years', 'Prices of many goods and services fall as costs drop.'],
      ['Investment boom continues as firms race to adopt new tools', 'Analysts debate how long the faster growth can last.']
    ],
    fiscal: [
      ['Congress passes major tax cut and spending package', 'Checks reach households and new projects begin. Spending jumps.'],
      ['Government spending surge lifts orders for builders', 'Contractors add shifts to meet new public projects.'],
      ['Deficit widens as stimulus keeps flowing', 'Economists say the package will boost demand for several years.']
    ],
    exports: [
      ['Dollar soars to a multi-year high', 'U.S. goods get pricier abroad. Exporters warn of lost sales.'],
      ['Exports slip as the strong dollar bites', 'Farmers and manufacturers report fewer foreign orders.'],
      ['Cheap imports pressure domestic manufacturers', 'Shoppers switch to foreign goods as their prices fall.']
    ],
    austerity: [
      ['Congress raises taxes and cuts spending to trim the deficit', 'Agencies freeze hiring. Households face smaller paychecks.'],
      ['Government contractors announce layoffs', 'Cuts to public projects ripple through local economies.'],
      ['Consumers tighten belts after the tax increase', 'Retailers lower their sales forecasts for the year.']
    ],
    pandemic: [
      ['New virus forces shutdowns nationwide', 'Offices, schools and factories close. Spending collapses.'],
      ['Economy begins to reopen, but supply chains stay snarled', 'Factories restart slowly; shipping costs soar.'],
      ['Pent-up demand surges as shoppers return', 'Shortages spread as orders outrun what factories can make.']
    ],
    tariffs: [
      ['Sweeping new tariffs take effect; trading partners retaliate', 'Imported parts and materials cost more. Farm exports face new barriers.'],
      ['Manufacturers pass higher input costs on to customers', 'Firms reroute supply chains, at a cost.'],
      ['Retaliation hits farm exports', 'Grain and soybean sales abroad fall sharply.']
    ],
    none: []
  };

  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

  function fedLine(prevSet, set) {
    var d = set - prevSet;
    var lvl = set >= 0 ? set.toFixed(2) + '%' : '0.00% and expanded bond purchases';
    if (set < 0 && prevSet < 0 && Math.abs(d) < 1e-9) return 'The Fed kept the funds rate at zero and held its bond purchases steady.';
    if (set < 0 && d < 0) return 'The Fed held the funds rate at zero and stepped up quantitative easing.';
    if (prevSet < 0 && d > 0) return set <= 0 ? 'The Fed scaled back its bond purchases.' : 'The Fed ended quantitative easing and raised the funds rate to ' + lvl + '.';
    if (Math.abs(d) < 1e-9) return 'The Fed held the funds rate at ' + lvl + '.';
    var size = Math.abs(d);
    var big = size >= 0.75 ? ' In a surprise move, the' : ' The';
    var verb = d > 0 ? 'raised' : 'cut';
    return big + ' Fed ' + verb + ' the funds rate by ' + size.toFixed(2) + ' points to ' + lvl + '.';
  }

  // hist: full history array; t: index of the quarter just played;
  // game: the Game object (for scenario, onset, params).
  function headline(game, t) {
    var p = game.p, h = game.hist, r = h[t], prev = h[t - 1];
    var gq = t - p.history + 1;
    var k = gq - game.onset;
    var items = SHOCK_NEWS[game.scenarioKey] || [];
    var fed = prev ? fedLine(prev.set, r.set) : '';
    if (k >= 0 && k < items.length) {
      return { head: items[k][0], deck: items[k][1] + ' ' + fed.trim() };
    }
    var dU = prev ? r.u - prev.u : 0;
    var head, deck;
    if (r.pi < 0) {
      head = 'Prices fall for the first time in decades';
      deck = 'Inflation is ' + f1(r.pi) + '%. Falling prices make debts harder to repay.';
    } else if (r.pi > 5) {
      head = 'Inflation reaches ' + f1(r.pi) + '%, the highest in years';
      deck = 'Workers press for bigger raises to keep up with rising prices.';
    } else if (r.u > p.uStar + 1.5 && dU > 0.05) {
      head = 'Unemployment climbs to ' + f1(r.u) + '% as layoffs spread';
      deck = 'Job seekers outnumber openings in most industries.';
    } else if (r.u > p.uStar + 1 && dU < -0.05) {
      head = 'Hiring picks up; unemployment eases to ' + f1(r.u) + '%';
      deck = 'The recovery is gaining strength, though many are still out of work.';
    } else if (r.pi > p.piStar + 1.5) {
      head = 'Inflation runs hot at ' + f1(r.pi) + '%';
      deck = 'Shoppers notice higher prices at the grocery store and the gas pump.';
    } else if (r.u < p.uStar - 1) {
      head = 'Labor shortage: unemployment falls to ' + f1(r.u) + '%';
      deck = 'Employers raise wages to attract workers.';
    } else if (r.pi < p.piStar - 1.2) {
      head = 'Inflation slows to ' + f1(r.pi) + '%, well below the Fed\'s goal';
      deck = 'Some economists warn of deflation if spending stays weak.';
    } else if (r.g < 0) {
      head = 'Economy shrinks at a ' + f1(-r.g) + '% annual rate';
      deck = 'Two quarters like this would meet the popular definition of a recession.';
    } else if (r.g > p.gBar + 1.5) {
      head = 'Economy grows at a brisk ' + f1(r.g) + '% pace';
      deck = 'Strong spending lifts sales and hiring.';
    } else if (r.u > p.uStar + 0.6) {
      head = 'Unemployment stuck at ' + f1(r.u) + '%';
      deck = 'Growth is too slow to bring many people back to work.';
    } else {
      head = 'Economy grows at a steady ' + f1(r.g) + '% pace';
      deck = 'Inflation is ' + f1(r.pi) + '% and unemployment ' + f1(r.u) + '%.';
    }
    if (r.cred < 0.35) deck += ' Markets doubt the Fed will bring inflation back to 2%.';
    return { head: head, deck: deck + ' ' + fed.trim() };
  }

  var api = { headline: headline, SHOCK_NEWS: SHOCK_NEWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FedNews = api;
})(typeof window !== 'undefined' ? window : this);
