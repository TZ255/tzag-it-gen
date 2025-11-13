/**
 * Compute itinerary totals from selected days.
 * Fees are treated as flat per-day amounts from Route.
 * @param {Array} routes - array of Route docs (lean), must include _id and fee fields
 * @param {Array} days - array of { routeId, accomodation: { name, price } }
 */
function computeItineraryTotals(routes, days, pax) {
  const byId = new Map(routes.map(r => [String(r._id), r]));
  let accomodation = 0, vehicle = 0, park = 0, transit = 0;
  const dayTotals = [];

  days.forEach((d, idx) => {
    const route = byId.get(String(d.routeId));
    if (!route) return;
    const baseAccPrice = Number(d.accomodation?.price || 0) || 0;
    const concession = Number(d.accomodation?.concession_fee || 0) || 0;
    const accPrice = baseAccPrice + concession;
    const v = Number(route.vehicle_fee || 0) || 0;
    let p = 0;
    if (typeof route.park_fee_adult !== 'undefined' || typeof route.park_fee_child !== 'undefined') {
      const a = Number(route.park_fee_adult || 0);
      const c = Number(route.park_fee_child || 0);
      const adults = Number(pax?.adults || 0);
      const children = Number(pax?.children || 0);
      p = a * adults + c * children;
    } else {
      p = Number(route.park_fee || 0) || 0; // fallback for legacy data
    }
    const t = Number(route.transit_fee || 0) || 0;
    const total = accPrice + v + p + t;
    dayTotals.push({ index: idx + 1, routeName: route.name, total });
    accomodation += accPrice; vehicle += v; park += p; transit += t;
  });
  const grand = accomodation + vehicle + park + transit;
  return { totals: { accomodation, vehicle, park, transit, grand }, dayTotals };
}

module.exports = { computeItineraryTotals };
